import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWaitingRows, findMatchingRows, searchComplexRows } from './myhome-api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateDir = path.join(__dirname, 'data');
const statePath = path.join(stateDir, 'sync-state.json');
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

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
  const next = {
    ...current,
    ...incoming,
    status: 'synced',
    publicWaitCount: nextWaitCount,
    publicWaitBreakdown,
    publicWaitPreviousCount: previousWaitCount,
    publicWaitUpdatedAt: new Date().toISOString(),
    checkedAt: new Date().toISOString(),
    matched: row,
  };
  state.applications[application.id] = next;
  await writeState(state);

  if (changed) {
    await sendExpoPush(incoming.pushToken, `${row.hsmpNm} ${housingTypeText} 대기현황 변동`, `${housingTypeText} 대기인원이 ${previousWaitCount}명 → ${nextWaitCount}명으로 변경됐어요.`);
  }

  return { id: application.id, status: 'synced', changed, publicWaitCount: nextWaitCount, previousWaitCount, publicWaitBreakdown, matched: row };
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
  }
  return results;
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    response.end();
    return;
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  try {
    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, { ok: true, service: 'public-waiting-sync' });
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
