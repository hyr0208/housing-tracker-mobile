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
