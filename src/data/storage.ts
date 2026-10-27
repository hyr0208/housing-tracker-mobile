import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccountToken } from '@/services/account-auth';
import { storeAccountData } from '@/services/account-sync';

export type RankSnapshot = {
  rank: number;
  recordedAt: string;
};

export type PublicWaitBreakdown = {
  label: string;
  count: number;
};

export type VacancyBreakdown = {
  label: string;
  count: number;
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
  complexName?: string;
  brtcCode?: string;
  signguCode?: string;
  suplyTy?: string;
  houseTy?: string;
  housingType?: string;
  publicWaitCount?: number;
  publicWaitBreakdown?: PublicWaitBreakdown[];
  publicWaitPreviousCount?: number;
  publicWaitUpdatedAt?: string;
  // 순번을 기록한 뒤 공개 대기인원이 줄어든 누적 수. 예상 순번(rank - waitAdvance)을 계산할 때 쓴다.
  waitAdvance?: number;
  vacancyBreakdown?: VacancyBreakdown[];
  vacancyUpdatedAt?: string;
  vacancyStatus?: 'synced' | 'no_data' | 'no_match' | 'error';
  vacancyMessage?: string;
  syncStatus?: 'synced' | 'no_match' | 'error';
  syncMessage?: string;
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

export type UserProfile = {
  provider: 'kakao' | 'apple' | 'review';
  id: string;
  nickname: string;
  loggedInAt: string;
};

export type AppData = {
  applications: HousingApplication[];
  tasks: ChecklistTask[];
  notifications: AppNotification[];
  pushToken?: string;
  profileName?: string;
  profile?: UserProfile;
};

const STORAGE_KEY = '@housing-tracker/app-data-v1';
const profileListeners = new Set<(profile?: UserProfile) => void>();
const dataListeners = new Set<(data: AppData) => void>();
let accountSaveQueue: Promise<void> = Promise.resolve();

export function subscribeToProfile(listener: (profile?: UserProfile) => void) {
  profileListeners.add(listener);
  return () => { profileListeners.delete(listener); };
}

// 화면마다 AppData 사본을 들고 있으므로, 한 화면에서 저장하면 다른 화면도 최신 값으로 맞춘다.
export function subscribeToAppData(listener: (data: AppData) => void) {
  dataListeners.add(listener);
  return () => { dataListeners.delete(listener); };
}

export const defaultAppData: AppData = {
  applications: [],
  tasks: [],
  notifications: [],
};

const LEGACY_DEMO_APPLICATION_IDS = new Set(['magok', 'samseong', 'wirye']);
const LEGACY_DEMO_TASK_IDS = new Set(['resident-doc', 'deposit-plan', 'notice-check']);
const LEGACY_DEMO_NOTIFICATION_IDS = new Set(['welcome', 'magok-rank']);

export async function loadAppData(): Promise<AppData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultAppData;
    const parsed = JSON.parse(stored) as Partial<AppData>;
    const applications = (parsed.applications ?? []).filter((application) => !LEGACY_DEMO_APPLICATION_IDS.has(application.id));
    return {
      applications,
      tasks: (parsed.tasks ?? []).filter((task) => !LEGACY_DEMO_TASK_IDS.has(task.id)),
      notifications: (parsed.notifications ?? []).filter((notification) => !LEGACY_DEMO_NOTIFICATION_IDS.has(notification.id)),
      pushToken: parsed.pushToken,
      profileName: parsed.profileName,
      profile: parsed.profile,
    };
  } catch {
    return defaultAppData;
  }
}

export async function saveAppData(data: AppData) {
  await saveLocalAppData(data);
  if (data.profile) {
    const profile = data.profile;
    accountSaveQueue = accountSaveQueue.catch(() => undefined).then(async () => {
      await storeAccountData(await getAccountToken(profile), data);
    });
    await accountSaveQueue.catch(() => {
      // Keep local edits if the server is temporarily unreachable. They can sync
      // again on the next save or when the account is opened on this device.
    });
  }
}

export async function saveLocalAppData(data: AppData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  profileListeners.forEach((listener) => listener(data.profile));
  dataListeners.forEach((listener) => listener(data));
}

export function makeNotification(title: string, body: string): AppNotification {
  return { id: `notification-${Date.now()}`, title, body, createdAt: '방금 전', read: false };
}
