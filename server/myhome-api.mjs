import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const API_BASE_URL = 'https://apis.data.go.kr/1613000/HWSPR03/moveWaitStsList';
const rowsCache = new Map();
const rowsCacheTtlMs = 10 * 60 * 1000;

function readDotEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
      }),
  );
}

function getServiceKey() {
  const key = process.env.MYHOME_API_KEY || readDotEnv().MYHOME_API_KEY;
  if (!key) throw new Error('MYHOME_API_KEY가 설정되지 않았습니다.');
  return key;
}

function asList(item) {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('마이홈 API 응답이 늦어 조회 시간이 초과됐어요. 잠시 후 다시 확인해주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(url, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchWithTimeout(url);
    if (response.status < 500 || attempt === attempts) return response;
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
}

export async function fetchWaitingRows({ brtcCode, signguCode, suplyTy, houseTy, complexName, housingType }) {
  if (!brtcCode) throw new Error('광역시도 코드(brtcCode)가 필요합니다.');

  const cacheKey = [brtcCode, signguCode || '', suplyTy || '', houseTy || '', normalizeName(complexName)].join('|');
  const cached = rowsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;

  const rows = [];
  // 경기도처럼 데이터가 많은 지역은 큰 페이지 요청 시 API 게이트웨이가 504를 반환할 수 있어요.
  // 300건씩 나눠 요청하고 일시적인 5xx 응답은 재시도합니다.
  const numOfRows = 300;
  let pageNo = 1;

  while (pageNo <= 20) {
    const url = new URL(API_BASE_URL);
    url.searchParams.set('serviceKey', getServiceKey());
    url.searchParams.set('brtcCode', brtcCode);
    url.searchParams.set('numOfRows', String(numOfRows));
    url.searchParams.set('pageNo', String(pageNo));
    if (signguCode) url.searchParams.set('signguCode', signguCode);
    if (suplyTy) url.searchParams.set('suplyTy', suplyTy);
    if (houseTy) url.searchParams.set('houseTy', houseTy);

    const response = await fetchWithRetry(url);
    if (!response.ok) {
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error('마이홈 공개 현황 서버가 잠시 응답하지 않았어요. 잠시 후 다시 확인해주세요.');
      }
      throw new Error(`마이홈 API HTTP 오류: ${response.status}`);
    }
    const payload = await response.json();
    const header = payload?.response?.header;
    if (header?.resultCode !== '00') throw new Error(`마이홈 API 오류: ${header?.resultMsg || header?.resultCode || '알 수 없는 오류'}`);

    const body = payload?.response?.body ?? {};
    const pageItems = asList(body.item);
    rows.push(...pageItems);
    if (complexName && housingType && findMatchingRows(rows, { complexName, suplyTy, houseTy, housingType }).length > 0) break;
    if (rows.length >= Number(body.totalCount || 0) || pageItems.length < numOfRows) break;
    pageNo += 1;
  }

  rowsCache.set(cacheKey, { rows, expiresAt: Date.now() + rowsCacheTtlMs });
  return rows;
}

export function normalizeName(value = '') {
  return String(value).toLowerCase().replace(/[\s·_\-/()[\]]/g, '');
}

function getNameCandidates(complexName) {
  const normalizedName = normalizeName(complexName);
  const candidates = [normalizedName];

  // 공고의 블록명과 마이홈 API의 공급단지명이 다른 경우를 연결합니다.
  if (normalizedName.includes('성남재생산단') && normalizedName.includes('a3블록')) {
    candidates.push(normalizedName.replace('성남재생산단', '성남산단').replace('a3블록', '3단지'));
  }

  return candidates.filter(Boolean);
}

export function findMatchingRows(rows, { complexName, suplyTy, houseTy, housingType }) {
  const nameCandidates = getNameCandidates(complexName);
  if (nameCandidates.length === 0) return [];
  const normalizedHousingType = normalizeName(housingType);

  return rows.filter((row) => {
    const normalizedName = normalizeName(row.hsmpNm);
    const nameMatches = nameCandidates.some((candidate) => normalizedName === candidate || normalizedName.includes(candidate) || candidate.includes(normalizedName));
    const supplyMatches = !suplyTy || normalizeName(row.suplyTyNm).includes(normalizeName(suplyTy));
    const houseMatches = !houseTy || normalizeName(row.houseTyNm).includes(normalizeName(houseTy));
    const rowHousingTypes = [row.drwtUnit, row.styleNm].map(normalizeName).filter(Boolean);
    const housingTypeMatches = !normalizedHousingType || rowHousingTypes.some((value) => value === normalizedHousingType || value.includes(normalizedHousingType) || normalizedHousingType.includes(value));
    return nameMatches && supplyMatches && houseMatches && housingTypeMatches;
  });
}

export { API_BASE_URL };
