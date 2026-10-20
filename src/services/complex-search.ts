export type ComplexSearchResult = {
  id: string;
  complexName: string;
  area: string;
  brtcCode: string;
  suplyTy?: string;
  houseTy?: string;
  address?: string;
  housingTypes: string[];
};

const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export async function searchComplexes(keyword: string, brtcCode: string): Promise<ComplexSearchResult[]> {
  const query = new URLSearchParams({ keyword, brtcCode });
  let response: Response;
  try {
    response = await fetch(`${syncServerUrl}/api/complex-search?${query.toString()}`);
  } catch {
    throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
  }
  // 서버 내부 오류나 프록시 HTML 응답은 원문 대신 안내 문구로 바꿔 보여준다.
  const body = await response.json().catch(() => ({})) as { results?: ComplexSearchResult[]; error?: string };
  if (response.status >= 500 || (response.ok && !body.results)) throw new Error('공고 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
  if (!response.ok) throw new Error(body.error || '공고 검색에 실패했어요.');
  return body.results ?? [];
}
