import type { HousingApplication, PublicWaitBreakdown } from '@/data/storage';

export type PublicWaitSyncResult = {
  status: 'synced' | 'no_match' | 'error';
  changed?: boolean;
  publicWaitCount?: number;
  previousWaitCount?: number;
  publicWaitBreakdown?: PublicWaitBreakdown[];
  checkedAt?: string;
  message?: string;
};

const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs = 90000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('공개 현황 조회가 오래 걸려 중단했어요. 잠시 후 다시 시도해주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function toServerApplication(application: HousingApplication, pushToken?: string) {
  return {
    id: application.id,
    complexName: application.complexName,
    brtcCode: application.brtcCode,
    signguCode: application.signguCode,
    suplyTy: application.suplyTy,
    houseTy: application.houseTy,
    housingType: application.housingType,
    ...(pushToken ? { pushToken } : {}),
  };
}

export async function syncPublicWait(application: HousingApplication, pushToken?: string): Promise<PublicWaitSyncResult | null> {
  if (!application.complexName || !application.brtcCode) return null;

  try {
    const response = await fetchWithTimeout(`${syncServerUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toServerApplication(application, pushToken)),
    });
    const body = await response.json();
    if (!response.ok) return { status: 'error', message: body.error || '공개 대기현황 조회에 실패했어요.' };
    return { ...body, checkedAt: new Date().toISOString() };
  } catch {
    return { status: 'error', message: '동기화 서버에 연결할 수 없어요.' };
  }
}
