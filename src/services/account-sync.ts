import type { AppData } from '@/data/storage';

const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export async function fetchAccountData(accessToken: string): Promise<AppData | null> {
  const response = await fetch(`${syncServerUrl}/api/account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('계정 정보를 불러오지 못했어요.');
  const result = await response.json() as { data: AppData | null };
  return result.data;
}

export async function storeAccountData(accessToken: string, data: AppData): Promise<void> {
  const response = await fetch(`${syncServerUrl}/api/account`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('계정 정보 저장에 실패했어요.');
}
