export type ExploreComplex = {
  id: string;
  complexName: string;
  region: string;
  district: string;
  address?: string;
  supplyType: string;
  institution: string;
  totalWait: number;
  types: { label: string; count: number; moveOut?: number }[];
};

// 마이홈 대기현황 API의 광역시도 코드
export const REGION_CODES: Record<string, string> = {
  서울: '11', 부산: '26', 대구: '27', 인천: '28', 광주: '29', 대전: '30', 울산: '31', 세종: '36', 경기: '41',
  강원: '42', 충북: '43', 충남: '44', 전북: '45', 전남: '46', 경북: '47', 경남: '48', 제주: '50',
};

const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export async function fetchWaitingExplore(region: string): Promise<ExploreComplex[]> {
  const brtcCode = REGION_CODES[region];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${syncServerUrl}/api/waiting-explore?brtcCode=${brtcCode}`, { signal: controller.signal });
    const body = await response.json().catch(() => ({})) as { complexes?: ExploreComplex[]; error?: string };
    if (!response.ok || !body.complexes) throw new Error(body.error || '대기현황을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    return body.complexes;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('대기현황 조회가 오래 걸려 중단했어요. 잠시 후 다시 시도해주세요.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
