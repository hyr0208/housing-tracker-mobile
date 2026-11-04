import type { NoticeAlertSettings } from '@/data/storage';

export type HousingNotice = {
  id: string;
  title: string;
  status: string;
  institution: string;
  supplyType: string;
  supplyTypeKey: string;
  region: string;
  regionKeys: string[];
  districts: string[];
  complexes: string[];
  announcedAt: string;
  applyBegin: string;
  applyEnd: string;
  url: string;
};

export const NOTICE_REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
// 서버(notice-api.mjs)의 공급유형 묶음과 같아야 한다.
export const NOTICE_SUPPLY_TYPES = ['국민임대', '영구임대', '행복주택', '통합공공임대', '매입임대', '전세임대', '기타'];

const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export async function fetchNotices(): Promise<HousingNotice[]> {
  const response = await fetch(`${syncServerUrl}/api/notices`);
  const body = await response.json().catch(() => ({})) as { notices?: HousingNotice[]; error?: string };
  if (!response.ok || !body.notices) throw new Error(body.error || '모집공고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
  return body.notices;
}

export async function saveNoticeAlert(pushToken: string, settings: NoticeAlertSettings) {
  const response = await fetch(`${syncServerUrl}/api/notice-alerts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pushToken, ...settings }),
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || '알림 설정을 저장하지 못했어요.');
}

// 지역을 고르지 않았으면 전체 공고를, 공급유형을 고르지 않았으면 모든 유형을 보여준다.
export function matchesNoticeSettings(notice: HousingNotice, settings: NoticeAlertSettings) {
  if (settings.regions.length > 0 && !notice.regionKeys.some((key) => settings.regions.includes(key))) return false;
  return settings.supplyTypes.length === 0 || settings.supplyTypes.includes(notice.supplyTypeKey);
}

export type NoticeSort = 'latest' | 'closing' | 'opening';
export const NOTICE_SORTS: { key: NoticeSort; label: string }[] = [
  { key: 'latest', label: '최신 공고순' },
  { key: 'closing', label: '마감 임박순' },
  { key: 'opening', label: '접수 시작순' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function dayDiff(from: string, to: string) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
}

export type ApplyPhase = { phase: 'upcoming' | 'open' | 'closed' | 'unknown'; label: string };

// 오늘(YYYY-MM-DD) 기준으로 접수 예정·접수 중·마감을 나눈다.
export function applyPhaseOf(notice: HousingNotice, today: string): ApplyPhase {
  if (!notice.applyBegin || !notice.applyEnd) return { phase: 'unknown', label: '' };
  if (today < notice.applyBegin) return { phase: 'upcoming', label: `접수 D-${dayDiff(today, notice.applyBegin)}` };
  if (today <= notice.applyEnd) {
    const left = dayDiff(today, notice.applyEnd);
    return { phase: 'open', label: left === 0 ? '오늘 마감' : `마감 D-${left}` };
  }
  return { phase: 'closed', label: '접수 마감' };
}

/**
 * 마감 임박순: 접수 중인 공고를 마감일이 가까운 순으로, 그다음 접수 예정, 마감된 공고는 맨 뒤.
 * 접수 시작순: 아직 시작 안 한 공고를 시작일이 가까운 순으로, 그다음 접수 중, 마감은 맨 뒤.
 */
export function sortNotices(notices: HousingNotice[], sort: NoticeSort, today: string) {
  if (sort === 'latest') return [...notices].sort((a, b) => b.announcedAt.localeCompare(a.announcedAt));
  const order = sort === 'closing'
    ? { open: 0, upcoming: 1, unknown: 2, closed: 3 }
    : { upcoming: 0, open: 1, unknown: 2, closed: 3 };
  const keyOf = (notice: HousingNotice) => (sort === 'closing' ? notice.applyEnd : notice.applyBegin) || '9999-12-31';
  return [...notices].sort((a, b) => {
    const phaseDiff = order[applyPhaseOf(a, today).phase] - order[applyPhaseOf(b, today).phase];
    return phaseDiff || keyOf(a).localeCompare(keyOf(b)) || b.announcedAt.localeCompare(a.announcedAt);
  });
}
