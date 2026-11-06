import type { RankSnapshot, WaitCountSnapshot } from '@/data/storage';

export type WaitEstimate =
  | { status: 'collecting' }
  | { status: 'stalled'; days: number }
  | { status: 'estimated'; months: number; days: number; decrease: number; source: 'rank' | 'moveout' | 'wait' };

const DAY_MS = 24 * 60 * 60 * 1000;
// 대기인원은 한 달에 몇 번 바뀌지 않아서, 너무 짧은 기간으로 계산하면 속도가 크게 튄다.
const MIN_SPAN_DAYS = 14;

/**
 * 내가 기록한 예비순번 변화로 앞당겨진 속도를 구합니다. 직접 입력한 지난 순번까지 쓰기 때문에 앱을 쓰기 전 흐름도 반영돼요.
 */
function estimateFromRanks(ranks: RankSnapshot[] | undefined, rank: number): WaitEstimate | undefined {
  if (!ranks || ranks.length < 2) return undefined;
  const sorted = [...ranks].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = Math.floor((new Date(last.recordedAt).getTime() - new Date(first.recordedAt).getTime()) / DAY_MS);
  const decrease = first.rank - last.rank;
  if (days < MIN_SPAN_DAYS || decrease <= 0) return undefined;
  return { status: 'estimated', months: (rank / (decrease / days)) / 30, days, decrease, source: 'rank' };
}

/**
 * 마이홈이 공개하는 최근 1년 퇴거 세대 수로 계산합니다. 한 해에 그만큼 집이 비고 예비입주자에게 차례대로 돌아간다고 봐요.
 * 1년치 실적이라 짧은 기간의 대기인원 변화보다 안정적이에요.
 */
function estimateFromMoveOuts(moveOutPerYear: number | undefined, rank: number): WaitEstimate | undefined {
  if (!moveOutPerYear || moveOutPerYear <= 0) return undefined;
  return { status: 'estimated', months: (rank / moveOutPerYear) * 12, days: 365, decrease: moveOutPerYear, source: 'moveout' };
}

/**
 * "지금 속도면 내 차례까지 몇 달"인지 추정합니다.
 * 내 순번 기록이 2주 이상이고 앞당겨졌다면 그 속도를, 없으면 최근 1년 퇴거 세대 수를, 그것도 없으면 서버가 기록한 공개 대기인원 변화를 씁니다.
 * 대기인원은 줄어든 만큼만 앞으로 나아갔다고 보고(새 대기자는 내 뒤에 붙으므로 늘어난 건 무시), 그 평균 속도로 계산해요.
 */
export function estimateWait(history: WaitCountSnapshot[] | undefined, rank: number, ranks?: RankSnapshot[], moveOutPerYear?: number, now = Date.now()): WaitEstimate {
  const fromRanks = estimateFromRanks(ranks, rank);
  if (fromRanks) return fromRanks;
  const fromMoveOuts = estimateFromMoveOuts(moveOutPerYear, rank);
  if (fromMoveOuts) return fromMoveOuts;
  if (!history || history.length === 0) return { status: 'collecting' };
  const days = Math.floor((now - new Date(history[0].recordedAt).getTime()) / DAY_MS);
  if (days < MIN_SPAN_DAYS) return { status: 'collecting' };

  let decrease = 0;
  for (let index = 1; index < history.length; index += 1) {
    decrease += Math.max(0, history[index - 1].count - history[index].count);
  }
  if (decrease === 0) return { status: 'stalled', days };

  const months = (rank / (decrease / days)) / 30;
  return { status: 'estimated', months, days, decrease, source: 'wait' };
}

export function formatWaitEstimate(estimate: WaitEstimate) {
  if (estimate.status === 'collecting') return '순번 기록이나 대기인원 변화가 2주 이상 쌓이면 예상 시기를 알려드려요.';
  if (estimate.status === 'stalled') return `최근 ${estimate.days}일 동안 대기인원이 줄지 않아 아직 예상하기 어려워요.`;
  const { months } = estimate;
  if (months < 1) return '지금 속도면 1개월 안에 차례가 올 수 있어요.';
  if (months >= 60) return '지금 속도면 5년 넘게 걸릴 수 있어요.';
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const rest = Math.round(months % 12);
    return `지금 속도면 약 ${years}년${rest ? ` ${rest}개월` : ''} 뒤에 차례가 올 것 같아요.`;
  }
  return `지금 속도면 약 ${Math.round(months)}개월 뒤에 차례가 올 것 같아요.`;
}

export function shortWaitEstimate(estimate: WaitEstimate) {
  if (estimate.status !== 'estimated') return undefined;
  if (estimate.months < 1) return '1개월 이내';
  if (estimate.months >= 60) return '5년 이상';
  if (estimate.months >= 12) return `약 ${Math.floor(estimate.months / 12)}년${Math.round(estimate.months % 12) ? ` ${Math.round(estimate.months % 12)}개월` : ''}`;
  return `약 ${Math.round(estimate.months)}개월`;
}
