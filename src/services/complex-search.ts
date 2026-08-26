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
  const response = await fetch(`${syncServerUrl}/api/complex-search?${query.toString()}`);
  const body = await response.json() as { results?: ComplexSearchResult[]; error?: string };
  if (!response.ok) throw new Error(body.error || '공고 검색에 실패했어요.');
  return body.results ?? [];
}
