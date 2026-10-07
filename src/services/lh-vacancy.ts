import type { VacancyBreakdown } from '@/data/storage';

export type VacancyStatusResult = {
  status: 'synced' | 'no_data' | 'no_match';
  complexName: string;
  rows: VacancyBreakdown[];
  checkedAt?: string;
  note?: string;
  message?: string;
};

const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export async function fetchLhVacancyStatus(application: {
  complexName?: string;
  title: string;
  area: string;
  brtcCode?: string;
}): Promise<VacancyStatusResult> {
  const query = new URLSearchParams({
    complexName: application.complexName || application.title,
    title: application.title,
    area: application.area,
    brtcCode: application.brtcCode || '',
  });
  const response = await fetch(`${syncServerUrl}/api/vacancy-status?${query.toString()}`);
  const body = await response.json() as VacancyStatusResult & { error?: string };
  if (!response.ok) throw new Error(body.error || 'LH 공가 현황을 불러오지 못했어요.');
  return body;
}
