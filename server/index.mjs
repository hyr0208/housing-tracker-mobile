import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAllWaitingRows, fetchWaitingRows, findMatchingRows, searchComplexRows } from './myhome-api.mjs';
import { fetchVacancyStatus } from './lh-vacancy-api.mjs';
import { createSessionToken, exchangeAuthorizationCode, revokeAppleToken, verifyAppleIdentityToken, verifySessionToken } from './apple-auth.mjs';
import { verifyReviewAccount } from './review-auth.mjs';
import { fetchNotices, matchesNoticeAlert } from './notice-api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateDir = path.join(__dirname, 'data');
const statePath = path.join(stateDir, 'sync-state.json');
const accountsPath = path.join(stateDir, 'account-data.json');
const appleTokensPath = path.join(stateDir, 'apple-tokens.json');
const publicDir = path.join(__dirname, 'public');
// 앱스토어·플레이스토어에 등록하는 개인정보 처리방침과 계정 삭제 안내 페이지
const publicPages = {
  '/privacy': ['privacy.html', 'text/html; charset=utf-8'],
  '/account-deletion': ['account-deletion.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
};
const port = Number(process.env.PORT || 8787);
const syncIntervalMs = Number(process.env.SYNC_INTERVAL_MINUTES || 60) * 60 * 1000;
const runOnce = process.argv.includes('--once');

async function readState() {
  try {
    return JSON.parse(await fs.readFile(statePath, 'utf8'));
  } catch {
    return { applications: {} };
  }
}

async function writeState(state) {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

async function readAccounts() {
  try {
    return JSON.parse(await fs.readFile(accountsPath, 'utf8'));
  } catch {
    return {};
  }
}

async function writeAccounts(accounts) {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(accountsPath, JSON.stringify(accounts, null, 2));
}

async function readAppleTokens() {
  try {
    return JSON.parse(await fs.readFile(appleTokensPath, 'utf8'));
  } catch {
    return {};
  }
}

async function writeAppleTokens(tokens) {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(appleTokensPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

// Apple 로그인 사용자는 서버 로그인 토큰('hts.'), 카카오 사용자는 카카오 access token으로 확인한다.
// 카카오 계정 ID는 기존 데이터와 호환되도록 접두어 없이, Apple 계정은 'apple:<sub>'로 구분한다.
async function getUserId(request) {
  const authorization = request.headers.authorization || '';
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return null;
  if (accessToken.startsWith('hts.')) return verifySessionToken(stateDir, accessToken);
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user.id ? String(user.id) : null;
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function sendExpoPush(token, title, body) {
  if (!token || !token.startsWith('ExponentPushToken')) return false;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default', priority: 'high' }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function syncApplication(application) {
  const state = await readState();
  const incoming = Object.fromEntries(Object.entries(application).filter(([, value]) => value !== undefined));
  const current = state.applications[application.id] ?? incoming;
  const rows = await fetchWaitingRows(incoming);
  const allMatches = findMatchingRows(rows, { ...incoming, housingType: undefined });
  const matches = findMatchingRows(rows, incoming);

  if (matches.length === 0) {
    state.applications[application.id] = { ...current, ...incoming, status: 'no_match', checkedAt: new Date().toISOString() };
    await writeState(state);
    return {
      id: application.id,
      status: 'no_match',
      matches: [],
      message: allMatches.length > 0
        ? '단지는 찾았지만 등록한 주택형의 공개 현황이 없어요. 주택형 표기를 확인해주세요.'
        : '공개 대기현황 API에서 일치하는 단지를 찾지 못했어요. 공식 단지명을 확인해주세요.',
    };
  }

  const row = matches[0];
  const housingTypeLabel = incoming.housingType || row.drwtUnit || row.styleNm;
  const housingTypeText = housingTypeLabel ? `${housingTypeLabel}${String(housingTypeLabel).endsWith('형') ? '' : '형'}` : '공개 대기인원';
  const nextWaitCount = Number(row.waitCo ?? 0);
  const publicWaitBreakdown = allMatches.reduce((groups, item) => {
    const label = item.drwtUnit || item.styleNm || '주택형 미상';
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.count += Number(item.waitCo ?? 0);
    else groups.push({ label, count: Number(item.waitCo ?? 0) });
    return groups;
  }, []);
  const previousWaitCount = current.publicWaitCount;
  const changed = typeof previousWaitCount === 'number' && previousWaitCount !== nextWaitCount;
  const checkedAt = new Date().toISOString();
  // 대기인원이 바뀔 때만 기록해 앱이 입주까지 예상 기간을 계산하게 한다. 단지·주택형이 바뀌면 처음부터 다시 쌓는다.
  const sameTarget = current.complexName === incoming.complexName && current.housingType === incoming.housingType;
  const previousHistory = sameTarget && Array.isArray(current.publicWaitHistory) ? current.publicWaitHistory : [];
  const lastSnapshot = previousHistory[previousHistory.length - 1];
  const publicWaitHistory = lastSnapshot?.count === nextWaitCount
    ? previousHistory
    : [...previousHistory, { count: nextWaitCount, recordedAt: checkedAt }].slice(-120);
  const next = {
    ...current,
    ...incoming,
    status: 'synced',
    publicWaitCount: nextWaitCount,
    publicWaitBreakdown,
    publicWaitPreviousCount: previousWaitCount,
    publicWaitHistory,
    publicWaitUpdatedAt: checkedAt,
    checkedAt,
    matched: row,
  };
  state.applications[application.id] = next;
  await writeState(state);

  if (changed) {
    const decrease = previousWaitCount - nextWaitCount;
    const body = decrease > 0
      ? `${housingTypeText} 대기인원이 ${previousWaitCount}명 → ${nextWaitCount}명으로 줄었어요. 내 순번도 최대 ${decrease}칸 앞당겨졌을 수 있어요.`
      : `${housingTypeText} 대기인원이 ${previousWaitCount}명 → ${nextWaitCount}명으로 변경됐어요.`;
    await sendExpoPush(incoming.pushToken, `${row.hsmpNm} ${housingTypeText} 대기현황 변동`, body);
  }

  return { id: application.id, status: 'synced', changed, publicWaitCount: nextWaitCount, previousWaitCount, publicWaitBreakdown, publicWaitHistory, matched: row };
}

function formatVacancyLabel(label) {
  // '21A(지역전략산업종사자)' → '21A형(지역전략산업종사자)'
  return String(label).replace(/^(\d+[A-Za-z0-9]*)(?![A-Za-z0-9형])/, '$1형');
}

function describeVacancyChanges(previousRows, nextRows) {
  const previous = new Map(previousRows.map((row) => [row.label, row.count]));
  const next = new Map(nextRows.map((row) => [row.label, row.count]));
  const labels = [...new Set([...previous.keys(), ...next.keys()])];
  return labels
    .filter((label) => (previous.get(label) ?? 0) !== (next.get(label) ?? 0))
    .map((label) => `${formatVacancyLabel(label)} ${previous.get(label) ?? 0}호 → ${next.get(label) ?? 0}호`);
}

async function syncVacancy(application) {
  const result = await fetchVacancyStatus(application);
  if (result.status === 'no_match') return { id: application.id, status: 'no_match', changed: false };

  const state = await readState();
  const current = state.applications[application.id];
  if (!current) return { id: application.id, status: 'removed', changed: false };

  const previousRows = current.vacancyRows;
  const changes = Array.isArray(previousRows) ? describeVacancyChanges(previousRows, result.rows) : [];
  state.applications[application.id] = {
    ...current,
    vacancyRows: result.rows,
    vacancyPreviousRows: previousRows,
    vacancyCheckedAt: new Date().toISOString(),
  };
  await writeState(state);

  if (changes.length > 0) {
    const summary = changes.length > 2 ? `${changes.slice(0, 2).join(', ')} 외 ${changes.length - 2}건` : changes.join(', ');
    const body = `공가 호수가 바뀌었어요: ${summary}`;
    await sendExpoPush(current.pushToken, `${result.complexName} 공가현황 변동`, body);
  }

  return { id: application.id, status: result.status, changed: changes.length > 0, changes };
}

async function syncAll() {
  const state = await readState();
  const registrations = Object.values(state.applications);
  const results = [];
  for (const application of registrations) {
    try {
      results.push(await syncApplication(application));
    } catch (error) {
      results.push({ id: application.id, status: 'error', message: error instanceof Error ? error.message : '동기화 오류' });
    }
    // 공가현황은 대기현황 조회 실패와 별개로 확인한다.
    try {
      const vacancy = await syncVacancy(application);
      results.push({ ...vacancy, type: 'vacancy' });
    } catch (error) {
      results.push({ id: application.id, type: 'vacancy', status: 'error', message: error instanceof Error ? error.message : '공가현황 확인 오류' });
    }
  }
  try {
    results.push(await syncNotices());
  } catch (error) {
    results.push({ type: 'notices', status: 'error', message: error instanceof Error ? error.message : '모집공고 확인 오류' });
  }
  return results;
}

// 새로 올라온 모집공고를 찾아, 관심 지역·공급유형을 등록한 기기에 알린다.
// 처음 실행할 때는 이미 올라와 있던 공고를 모두 본 것으로 기록만 하고 알리지 않는다.
async function syncNotices() {
  const notices = await fetchNotices({ force: true });
  const state = await readState();
  const isFirstRun = !Array.isArray(state.seenNoticeIds);
  const seen = new Set(state.seenNoticeIds ?? []);
  const fresh = isFirstRun ? [] : notices.filter((notice) => !seen.has(notice.id));
  let sent = 0;
  for (const [pushToken, alert] of Object.entries(state.noticeAlerts ?? {})) {
    const matched = fresh.filter((notice) => matchesNoticeAlert(notice, alert));
    if (matched.length === 0) continue;
    const [first] = matched;
    const where = [first.region, first.districts[0]].filter(Boolean).join(' ');
    const title = matched.length > 1 ? `새 모집공고 ${matched.length}건` : `새 모집공고 · ${first.supplyType}`;
    const period = first.applyBegin ? ` · 접수 ${first.applyBegin.slice(5).replace('-', '.')}~${first.applyEnd.slice(5).replace('-', '.')}` : '';
    const body = matched.length > 1 ? `${first.title} 외 ${matched.length - 1}건이 올라왔어요.` : `${first.title} (${where}${period})`;
    if (await sendExpoPush(pushToken, title, body)) sent += 1;
  }
  // 목록에서 내려간 공고 ID가 끝없이 쌓이지 않도록 최근 것만 남긴다.
  const nextSeen = [...new Set([...notices.map((notice) => notice.id), ...seen])].slice(0, 3000);
  const latest = await readState();
  latest.seenNoticeIds = nextSeen;
  await writeState(latest);
  return { type: 'notices', status: 'synced', total: notices.length, fresh: fresh.length, sent };
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' });
    response.end();
    return;
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  try {
    const page = publicPages[url.pathname.replace(/\/$/, '')];
    if (request.method === 'GET' && page) {
      const [file, contentType] = page;
      response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=300' });
      response.end(await fs.readFile(path.join(publicDir, file)));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, { ok: true, service: 'public-waiting-sync' });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/apple') {
      const { identityToken, authorizationCode } = await readBody(request);
      let apple;
      try {
        apple = await verifyAppleIdentityToken(identityToken);
      } catch (error) {
        sendJson(response, 401, { error: error instanceof Error ? error.message : 'Apple 로그인 확인에 실패했어요.' });
        return;
      }
      const userId = `apple:${apple.sub}`;
      const refreshToken = await exchangeAuthorizationCode(stateDir, authorizationCode).catch(() => null);
      if (refreshToken) {
        const appleTokens = await readAppleTokens();
        appleTokens[userId] = refreshToken;
        await writeAppleTokens(appleTokens);
      }
      sendJson(response, 200, { token: await createSessionToken(stateDir, userId), userId });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/review') {
      const { username, password } = await readBody(request);
      const userId = await verifyReviewAccount(stateDir, username, password);
      if (!userId) {
        sendJson(response, 401, { error: '아이디 또는 비밀번호가 맞지 않아요.' });
        return;
      }
      sendJson(response, 200, { token: await createSessionToken(stateDir, userId), userId });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/notices') {
      sendJson(response, 200, { notices: await fetchNotices() });
      return;
    }

    // 새 공고 알림 조건은 로그인 없이도 쓸 수 있게 푸시 토큰 단위로 저장한다.
    if (request.method === 'PUT' && url.pathname === '/api/notice-alerts') {
      const { pushToken, enabled, regions, supplyTypes } = await readBody(request);
      if (typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken')) {
        sendJson(response, 400, { error: '알림을 받을 기기 정보가 없어요. 알림 권한을 확인해주세요.' });
        return;
      }
      const state = await readState();
      state.noticeAlerts = state.noticeAlerts ?? {};
      const cleanList = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 30) : []);
      if (enabled && cleanList(regions).length > 0) {
        state.noticeAlerts[pushToken] = { regions: cleanList(regions), supplyTypes: cleanList(supplyTypes), updatedAt: new Date().toISOString() };
      } else {
        delete state.noticeAlerts[pushToken];
      }
      await writeState(state);
      sendJson(response, 200, { ok: true, enabled: Boolean(state.noticeAlerts[pushToken]) });
      return;
    }

    if ((request.method === 'GET' || request.method === 'PUT' || request.method === 'DELETE') && url.pathname === '/api/account') {
      const userId = await getUserId(request);
      if (!userId) {
        sendJson(response, 401, { error: '유효한 로그인이 필요합니다.' });
        return;
      }
      const accounts = await readAccounts();
      if (request.method === 'GET') {
        sendJson(response, 200, { data: accounts[userId] ?? null });
        return;
      }
      if (request.method === 'DELETE') {
        // 계정 데이터와 함께, 알림용으로 등록된 신청 정보(푸시 토큰 포함)도 지운다.
        const applicationIds = (accounts[userId]?.applications ?? []).map((application) => application.id).filter(Boolean);
        const pushToken = accounts[userId]?.pushToken;
        delete accounts[userId];
        await writeAccounts(accounts);
        if (userId.startsWith('apple:')) {
          const appleTokens = await readAppleTokens();
          await revokeAppleToken(stateDir, appleTokens[userId]).catch(() => false);
          delete appleTokens[userId];
          await writeAppleTokens(appleTokens);
        }
        if (applicationIds.length > 0 || pushToken) {
          const state = await readState();
          for (const id of applicationIds) delete state.applications[id];
          if (pushToken && state.noticeAlerts) delete state.noticeAlerts[pushToken];
          await writeState(state);
        }
        sendJson(response, 200, { ok: true, removedApplications: applicationIds.length });
        return;
      }
      const data = await readBody(request);
      if (!Array.isArray(data.applications) || !Array.isArray(data.tasks) || !Array.isArray(data.notifications)) {
        sendJson(response, 400, { error: '저장할 계정 정보 형식이 올바르지 않습니다.' });
        return;
      }
      accounts[userId] = data;
      await writeAccounts(accounts);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/waiting-status') {
      const application = {
        brtcCode: url.searchParams.get('brtcCode'),
        signguCode: url.searchParams.get('signguCode') || undefined,
        suplyTy: url.searchParams.get('suplyTy') || undefined,
        houseTy: url.searchParams.get('houseTy') || undefined,
        complexName: url.searchParams.get('complexName') || '',
      };
      const rows = await fetchWaitingRows(application);
      sendJson(response, 200, { rows: findMatchingRows(rows, application), totalCount: rows.length });
      return;
    }

    // 지역의 모든 단지를 대기인원이 적은 순으로 묶어 보여준다(로그인 없이 쓰는 대기현황 탐색).
    if (request.method === 'GET' && url.pathname === '/api/waiting-explore') {
      const brtcCode = url.searchParams.get('brtcCode') || '';
      if (!brtcCode) {
        sendJson(response, 400, { error: '지역을 골라 주세요.' });
        return;
      }
      const rows = await fetchAllWaitingRows(brtcCode);
      const complexes = new Map();
      for (const row of rows) {
        const id = String(row.hsmpSn ?? `${row.hsmpNm}|${row.suplyTyNm}`);
        const complex = complexes.get(id) ?? {
          id,
          complexName: row.hsmpNm,
          region: row.brtcNm,
          district: row.signguNm,
          address: row.rnAdres,
          supplyType: row.suplyTyNm,
          institution: row.rtsInsttNm,
          totalWait: 0,
          types: [],
        };
        const count = Number(row.waitCo ?? 0);
        complex.totalWait += count;
        complex.types.push({ label: row.drwtUnit || row.styleNm || '주택형 미상', count });
        complexes.set(id, complex);
      }
      const list = [...complexes.values()].sort((a, b) => a.totalWait - b.totalWait || a.complexName.localeCompare(b.complexName, 'ko'));
      sendJson(response, 200, { complexes: list });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/complex-search') {
      const keyword = url.searchParams.get('keyword')?.trim() || '';
      const brtcCode = url.searchParams.get('brtcCode') || '';
      if (!keyword || !brtcCode) {
        sendJson(response, 400, { error: '검색어와 지역 정보가 필요합니다.' });
        return;
      }
      const rows = await fetchWaitingRows({ brtcCode, searchKeyword: keyword });
      sendJson(response, 200, { results: searchComplexRows(rows, { keyword, brtcCode }) });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/vacancy-status') {
      const application = {
        complexName: url.searchParams.get('complexName') || '',
        title: url.searchParams.get('title') || '',
        area: url.searchParams.get('area') || '',
        brtcCode: url.searchParams.get('brtcCode') || '',
      };
      if (!application.complexName || !application.brtcCode) {
        sendJson(response, 400, { error: '단지명과 지역 정보가 필요합니다.' });
        return;
      }
      sendJson(response, 200, await fetchVacancyStatus(application));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/applications/register') {
      const application = await readBody(request);
      if (!application.id || !application.brtcCode || !application.complexName) {
        sendJson(response, 400, { error: 'id, brtcCode, complexName이 필요합니다.' });
        return;
      }
      const state = await readState();
      state.applications[application.id] = { ...state.applications[application.id], ...application };
      await writeState(state);
      sendJson(response, 200, { ok: true, id: application.id });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/sync') {
      const application = await readBody(request);
      if (application.id) {
        sendJson(response, 200, await syncApplication(application));
      } else {
        sendJson(response, 200, { results: await syncAll() });
      }
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : '서버 오류' });
  }
});

if (runOnce) {
  void syncAll().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  server.listen(port, () => {
    console.log(`공개 대기현황 서버 실행: http://localhost:${port}`);
    console.log(`자동 확인 주기: ${Math.round(syncIntervalMs / 60000)}분`);
  });
  void syncAll().catch(() => undefined);
  setInterval(() => { void syncAll(); }, syncIntervalMs);
}
