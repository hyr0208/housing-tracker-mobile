import AsyncStorage from '@react-native-async-storage/async-storage';

export type RankSnapshot = {
  rank: number;
  recordedAt: string;
};

export type HousingApplication = {
  id: string;
  title: string;
  type: string;
  area: string;
  rank: number;
  previousRank: number;
  color: string;
  initials: string;
  updatedAt: string;
  history: RankSnapshot[];
};

export type ChecklistTask = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type AppData = {
  applications: HousingApplication[];
  tasks: ChecklistTask[];
  notifications: AppNotification[];
};

const STORAGE_KEY = '@housing-tracker/app-data-v1';

export const defaultAppData: AppData = {
  applications: [
    { id: 'magok', title: '마곡나루 행복주택', type: '행복주택 · 16㎡', area: '서울 강서구', rank: 24, previousRank: 31, color: '#ddf1e8', initials: 'MN', updatedAt: '오늘 오전 9:42', history: [{ rank: 31, recordedAt: '2026-08-15' }, { rank: 28, recordedAt: '2026-08-18' }, { rank: 24, recordedAt: '2026-08-21' }] },
    { id: 'samseong', title: '고양삼송 A-11블록', type: '국민임대 · 36㎡', area: '경기 고양시', rank: 67, previousRank: 67, color: '#eae8f7', initials: 'GS', updatedAt: '어제 오후 4:10', history: [{ rank: 67, recordedAt: '2026-08-20' }] },
    { id: 'wirye', title: '위례 A2-4블록', type: '청년 매입임대 · 24㎡', area: '서울 송파구', rank: 108, previousRank: 116, color: '#fbe9dc', initials: 'WR', updatedAt: '8월 18일', history: [{ rank: 116, recordedAt: '2026-08-12' }, { rank: 108, recordedAt: '2026-08-18' }] },
  ],
  tasks: [
    { id: 'resident-doc', title: '주민등록등본 발급하기', detail: '마곡나루 · 이번 주 금요일까지', done: false },
    { id: 'deposit-plan', title: '보증금 마련 계획 확인하기', detail: '순번 20번대 진입', done: false },
    { id: 'notice-check', title: '고양삼송 공고문 다시 확인하기', detail: '어제 추가 공지', done: true },
  ],
  notifications: [
    { id: 'welcome', title: '내 차례에 오신 것을 환영해요', body: '신청내역을 등록하면 순번 변동을 기록할 수 있어요.', createdAt: '오늘 오전 9:42', read: false },
    { id: 'magok-rank', title: '마곡나루 순번이 상승했어요', body: '31번에서 24번으로 7계단 가까워졌어요.', createdAt: '8월 21일 오전 9:42', read: false },
  ],
};

export async function loadAppData(): Promise<AppData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultAppData;
    const parsed = JSON.parse(stored) as Partial<AppData>;
    return {
      applications: parsed.applications ?? defaultAppData.applications,
      tasks: parsed.tasks ?? defaultAppData.tasks,
      notifications: parsed.notifications ?? defaultAppData.notifications,
    };
  } catch {
    return defaultAppData;
  }
}

export async function saveAppData(data: AppData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function makeNotification(title: string, body: string): AppNotification {
  return { id: `notification-${Date.now()}`, title, body, createdAt: '방금 전', read: false };
}
