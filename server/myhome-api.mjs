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

export function getServiceKey() {
  const key = process.env.MYHOME_API_KEY || readDotEnv().MYHOME_API_KEY;
  if (!key) throw new Error('MYHOME_API_KEY가 설정되지 않았습니다.');
  return key;
}

function asList(item) {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function isApiCode(value) {
  return /^\d+$/.test(String(value || '').trim());
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

export async function fetchWaitingRows({ brtcCode: requestedBrtcCode, signguCode, suplyTy, houseTy, complexName, housingType, searchKeyword }) {
  const brtcCode = currentBrtcCode(requestedBrtcCode);
  if (!brtcCode) throw new Error('광역시도 코드(brtcCode)가 필요합니다.');

  const cacheKey = [brtcCode, signguCode || '', suplyTy || '', houseTy || '', normalizeName(complexName), normalizeName(searchKeyword)].join('|');
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
    // 검색 결과에 표시되는 '국민임대', '아파트' 같은 값은 이름이고,
    // 마이홈 API의 필터는 숫자 코드만 받습니다. 이름은 아래 매칭 단계에서 비교합니다.
    if (suplyTy && isApiCode(suplyTy)) url.searchParams.set('suplyTy', suplyTy);
    if (houseTy && isApiCode(houseTy)) url.searchParams.set('houseTy', houseTy);

    const response = await fetchWithRetry(url);
    if (!response.ok) {
      if ([429, 502, 503, 504].includes(response.status)) throw quotaAwareError(response);
      throw new Error(`마이홈 API HTTP 오류: ${response.status}`);
    }
    const payload = await response.json();
    const header = payload?.response?.header;
    if (header?.resultCode !== '00') throw new Error(`마이홈 API 오류: ${header?.resultMsg || header?.resultCode || '알 수 없는 오류'}`);

    const body = payload?.response?.body ?? {};
    const pageItems = asList(body.item);
    rows.push(...pageItems);
    if (complexName && housingType && findMatchingRows(rows, { complexName, suplyTy, houseTy, housingType }).length > 0) break;
    if (searchKeyword && rows.some((row) => [row.hsmpNm, row.rnAdres, row.signguNm, row.brtcNm].some((value) => normalizeName(value).includes(normalizeName(searchKeyword))))) break;
    if (rows.length >= Number(body.totalCount || 0) || pageItems.length < numOfRows) break;
    pageNo += 1;
  }

  rowsCache.set(cacheKey, { rows, expiresAt: Date.now() + rowsCacheTtlMs });
  return rows;
}

const allRowsCache = new Map();
// 대기인원은 하루에 몇 번 바뀌지 않으므로 지역 전체 목록은 길게 캐시한다.
const allRowsCacheTtlMs = 6 * 60 * 60 * 1000;
// 마이홈 API는 하루 요청 수가 정해져 있어서, 서버를 다시 띄워도 처음부터 다시 받지 않게 목록을 파일로도 남긴다.
let allRowsCachePath = '';

export function useWaitingRowsCacheFile(filePath) {
  allRowsCachePath = filePath;
  try {
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const [brtcCode, entry] of Object.entries(saved)) {
      if (Array.isArray(entry?.rows) && entry.fetchedAt) allRowsCache.set(brtcCode, entry);
    }
  } catch {
    // 처음 실행이거나 파일이 깨졌으면 비어 있는 채로 시작한다.
  }
}

function saveAllRowsCache() {
  if (!allRowsCachePath) return;
  fs.promises.writeFile(allRowsCachePath, JSON.stringify(Object.fromEntries(allRowsCache))).catch(() => undefined);
}

function quotaAwareError(response) {
  if (response.status === 429) return new Error('오늘 마이홈 조회 한도를 다 썼어요. 내일 다시 확인해주세요.');
  return new Error('마이홈 공개 현황 서버가 잠시 응답하지 않았어요. 잠시 후 다시 확인해주세요.');
}

async function fetchWaitingPage(brtcCode, pageNo, numOfRows) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('serviceKey', getServiceKey());
  url.searchParams.set('brtcCode', brtcCode);
  url.searchParams.set('numOfRows', String(numOfRows));
  url.searchParams.set('pageNo', String(pageNo));
  const response = await fetchWithRetry(url);
  if (!response.ok) throw quotaAwareError(response);
  const payload = await response.json();
  const header = payload?.response?.header;
  if (header?.resultCode !== '00') throw new Error(`마이홈 API 오류: ${header?.resultMsg || header?.resultCode || '알 수 없는 오류'}`);
  const body = payload?.response?.body ?? {};
  return { items: asList(body.item), totalCount: Number(body.totalCount || 0) };
}

// 한 지역의 대기현황 전체. 요청 한 번이 크기와 상관없이 몇 초씩 걸려서, 첫 페이지로 전체 건수를 알아낸 뒤 나머지를 동시에 받는다.
async function loadAllWaitingRows(brtcCode) {
  const numOfRows = 500;
  const first = await fetchWaitingPage(brtcCode, 1, numOfRows);
  const pageCount = Math.min(20, Math.ceil(first.totalCount / numOfRows));
  const rest = [];
  for (let start = 2; start <= pageCount; start += 4) {
    const batch = Array.from({ length: Math.min(4, pageCount - start + 1) }, (_, index) => fetchWaitingPage(brtcCode, start + index, numOfRows));
    rest.push(...await Promise.all(batch));
  }
  const rows = [first, ...rest].flatMap((page) => page.items);
  allRowsCache.set(brtcCode, { rows, fetchedAt: Date.now() });
  saveAllRowsCache();
  return rows;
}

const allRowsInFlight = new Map();

function refreshAllWaitingRows(brtcCode) {
  // 같은 지역을 여러 사람이 동시에 찾아도 마이홈에는 한 번만 요청한다.
  if (!allRowsInFlight.has(brtcCode)) {
    allRowsInFlight.set(brtcCode, loadAllWaitingRows(brtcCode).finally(() => allRowsInFlight.delete(brtcCode)));
  }
  return allRowsInFlight.get(brtcCode);
}

/**
 * 지역 전체 대기현황. maxAgeMs보다 오래된 목록은 새로 받는다.
 * 화면용 조회(maxAgeMs 생략)는 오래된 목록을 바로 돌려주고 뒤에서 새로 받고,
 * 변동 알림용 조회(maxAgeMs 지정)는 새로 받을 때까지 기다리되 실패하면 갖고 있던 목록을 쓴다.
 */
export async function fetchAllWaitingRows(requestedBrtcCode, { maxAgeMs } = {}) {
  const brtcCode = currentBrtcCode(requestedBrtcCode);
  const cached = allRowsCache.get(brtcCode);
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  if (cached && age < (maxAgeMs ?? allRowsCacheTtlMs)) return cached.rows;
  if (!cached) return refreshAllWaitingRows(brtcCode);
  if (maxAgeMs !== undefined) return refreshAllWaitingRows(brtcCode).catch(() => cached.rows);
  void refreshAllWaitingRows(brtcCode).catch(() => undefined);
  return cached.rows;
}

export const BRTC_CODES = ['11', '26', '27', '28', '29', '30', '31', '36', '41', '51', '43', '44', '52', '46', '47', '48', '50'];

// 강원(2023)·전북(2024)이 특별자치도가 되면서 마이홈 코드가 51·52로 바뀌었다. 예전 코드로 저장된 신청 건도 그대로 조회되게 바꿔 준다.
const RENAMED_BRTC_CODES = { 42: '51', 45: '52' };
export function currentBrtcCode(brtcCode) {
  return RENAMED_BRTC_CODES[brtcCode] ?? brtcCode;
}

// 모든 지역 목록을 미리 받아 둬서 단지 검색과 대기현황 탐색이 바로 뜨게 한다.
// 아직 신선한 지역은 건너뛰고, 마이홈 API에 몰리지 않게 지역을 하나씩 받는다.
export async function warmAllWaitingRows() {
  for (const brtcCode of BRTC_CODES) {
    const cached = allRowsCache.get(brtcCode);
    if (cached && Date.now() - cached.fetchedAt < allRowsCacheTtlMs) continue;
    try {
      await refreshAllWaitingRows(brtcCode);
    } catch {
      // 하루 한도를 넘겼으면 나머지 지역도 실패하니 다음 주기에 다시 시도한다.
      return;
    }
  }
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

// 마이홈은 공급 단위(drwtUnit)가 없을 때 빈 문자열 대신 공백(' ')을 보내므로, 공백이면 주택형(styleNm)을 쓴다.
export function housingTypeOf(row) {
  return String(row.drwtUnit ?? '').trim() || String(row.styleNm ?? '').trim() || '주택형 미상';
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

export function searchComplexRows(rows, { keyword, brtcCode }) {
  const normalizedKeyword = normalizeName(keyword);
  if (!normalizedKeyword) return [];

  const results = new Map();
  rows.forEach((row) => {
    const searchable = [row.hsmpNm, row.rnAdres, row.signguNm, row.brtcNm]
      .map((value) => normalizeName(value))
      .filter(Boolean)
      .join(' ');
    if (!searchable.includes(normalizedKeyword)) return;

    const key = `${row.hsmpSn || row.hsmpNm || 'unknown'}|${row.suplyTyNm || ''}`;
    const existing = results.get(key) || {
      id: key,
      complexName: row.hsmpNm || '',
      area: [row.brtcNm, row.signguNm].filter(Boolean).join(' '),
      brtcCode,
      suplyTy: row.suplyTyNm || undefined,
      houseTy: row.houseTyNm || undefined,
      address: row.rnAdres || undefined,
      housingTypes: [],
    };

    [row.drwtUnit, row.styleNm].map((label) => String(label ?? '').trim()).filter(Boolean).forEach((label) => {
      if (!existing.housingTypes.includes(label)) existing.housingTypes.push(label);
    });
    results.set(key, existing);
  });

  return [...results.values()]
    .sort((left, right) => left.complexName.localeCompare(right.complexName, 'ko'))
    .slice(0, 30);
}

export { API_BASE_URL };
