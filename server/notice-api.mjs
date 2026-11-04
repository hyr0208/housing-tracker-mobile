import { getServiceKey } from './myhome-api.mjs';

// 마이홈포털 공공임대주택 모집공고 조회 (국토교통부_마이홈포털 공공주택 모집공고 조회 서비스)
const NOTICE_API_URL = 'https://apis.data.go.kr/1613000/HWSPR02/rsdtRcritNtcList';
const cacheTtlMs = 30 * 60 * 1000;
let cache = null;

// 광역시도 이름이 바뀌거나 합쳐져도(예: 전남광주통합특별시) 앱의 지역 선택과 맞춰지도록 짧은 이름으로 바꾼다.
const REGION_RULES = [
  ['서울', /서울/], ['부산', /부산/], ['대구', /대구/], ['인천', /인천/], ['광주', /광주/], ['대전', /대전/],
  ['울산', /울산/], ['세종', /세종/], ['경기', /경기/], ['강원', /강원/], ['충북', /충청북|충북/], ['충남', /충청남|충남/],
  ['전북', /전라북|전북/], ['전남', /전라남|전남/], ['경북', /경상북|경북/], ['경남', /경상남|경남/], ['제주', /제주/],
];
// 앱에서 고를 수 있는 공급유형. 나머지(10년임대, 장기전세 등)는 '기타'로 묶는다.
const MAIN_SUPPLY_TYPES = ['국민임대', '영구임대', '행복주택', '통합공공임대', '매입임대', '전세임대'];

export function regionKeysOf(regionName = '') {
  return REGION_RULES.filter(([, pattern]) => pattern.test(regionName)).map(([key]) => key);
}

export function supplyTypeKeyOf(supplyType = '') {
  return MAIN_SUPPLY_TYPES.includes(supplyType) ? supplyType : '기타';
}

// 지역은 하나 이상 골라야 알림을 받는다. 공급유형을 고르지 않으면 모든 유형을 받는다.
export function matchesNoticeAlert(notice, alert) {
  if (!alert?.regions?.length) return false;
  if (!notice.regionKeys.some((key) => alert.regions.includes(key))) return false;
  return !alert.supplyTypes?.length || alert.supplyTypes.includes(notice.supplyTypeKey);
}

function formatDay(value = '') {
  return /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : '';
}

// 같은 공고가 단지·주택형별로 여러 줄로 오므로 공고 ID로 묶는다.
function groupNotices(items) {
  const notices = new Map();
  for (const item of items) {
    const id = String(item.pblancId);
    const existing = notices.get(id);
    if (existing) {
      if (item.signguNm && !existing.districts.includes(item.signguNm)) existing.districts.push(item.signguNm);
      if (item.hsmpNm && !existing.complexes.includes(item.hsmpNm)) existing.complexes.push(item.hsmpNm);
      continue;
    }
    notices.set(id, {
      id,
      title: item.pblancNm,
      status: item.sttusNm,
      institution: item.suplyInsttNm,
      supplyType: item.suplyTyNm,
      supplyTypeKey: supplyTypeKeyOf(item.suplyTyNm),
      houseType: item.houseTyNm,
      region: item.brtcNm,
      regionKeys: regionKeysOf(item.brtcNm),
      districts: item.signguNm ? [item.signguNm] : [],
      complexes: item.hsmpNm ? [item.hsmpNm] : [],
      announcedAt: formatDay(item.rcritPblancDe),
      applyBegin: formatDay(item.beginDe),
      applyEnd: formatDay(item.endDe),
      url: item.mobileUrl || item.url || item.pcUrl,
    });
  }
  return [...notices.values()].sort((a, b) => b.announcedAt.localeCompare(a.announcedAt));
}

export async function fetchNotices({ force = false } = {}) {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.notices;
  const items = [];
  for (let pageNo = 1; pageNo <= 10; pageNo += 1) {
    const url = new URL(NOTICE_API_URL);
    url.searchParams.set('serviceKey', getServiceKey());
    url.searchParams.set('pageNo', String(pageNo));
    url.searchParams.set('numOfRows', '500');
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`모집공고 API 응답 오류 (${response.status})`);
    const body = (await response.json())?.response?.body;
    if (!body) throw new Error('모집공고 API 응답을 해석하지 못했어요.');
    const page = Array.isArray(body.item) ? body.item : body.item ? [body.item] : [];
    items.push(...page);
    if (items.length >= Number(body.totalCount || 0) || page.length === 0) break;
  }
  const notices = groupNotices(items);
  cache = { notices, expiresAt: Date.now() + cacheTtlMs };
  return notices;
}
