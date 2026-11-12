export type TipAction = 'suggest' | 'waiting' | 'notices' | 'history' | 'event' | 'checklist';

export type HomeTip = {
  text: string;
  action?: TipAction;
};

// 홈 '이번 주의 팁'. 주마다 하나씩 돌아가며 보여주고, 누르면 관련 화면을 연다.
export const HOME_TIPS: HomeTip[] = [
  { text: '서류는 공고일 이후 발급분만 인정되는 경우가 많아요. 미리 떼기 전에 발급 기준일을 확인하세요.', action: 'suggest' },
  { text: '1년 퇴거 수가 많은 단지일수록 차례가 빨리 돌아와요. 단지별 대기현황에서 비교해 보세요.', action: 'waiting' },
  { text: '예비순번은 청약플러스에서 확인할 수 있어요. 바뀌면 순번 기록에 남겨 두세요.', action: 'history' },
  { text: '관심 지역을 등록하면 새 모집공고가 올라올 때 알려드려요.', action: 'notices' },
  { text: '서류 제출 기한을 놓치면 부적격이 될 수 있어요. 마감일을 일정에 넣어 두세요.', action: 'event' },
  { text: '대기인원이 0명인 단지는 신청하면 바로 차례가 올 수도 있어요.', action: 'waiting' },
  { text: '순번을 2주 이상 간격으로 기록하면 예상 시기가 더 정확해져요.', action: 'history' },
  { text: '소득·자산 기준은 해마다 바뀌어요. 신청 전에 최신 공고문 기준을 확인하세요.', action: 'notices' },
  { text: '예비입주자 자격에는 유효기간이 있어요. 공고문에서 예비자 유효기간을 확인하세요.' },
  { text: '입주 날짜가 정해지면 지금 집 보증금 반환 일정부터 맞춰 두세요.', action: 'suggest' },
  { text: '체크리스트에 마감일을 넣으면 하루 전과 당일 아침에 알려드려요.', action: 'checklist' },
  { text: '전입신고는 이사한 날부터 14일 안에 해야 해요. 확정일자도 같이 받아 두세요.', action: 'suggest' },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 이번 주의 팁. 같은 주에는 같은 팁이 보인다. */
export function tipOfWeek(now = Date.now()) {
  return HOME_TIPS[Math.floor(now / WEEK_MS) % HOME_TIPS.length];
}
