import AsyncStorage from '@react-native-async-storage/async-storage';
import * as KakaoUser from '@react-native-kakao/user';
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
  provider: 'kakao';
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
let accountSaveQueue: Promise<void> = Promise.resolve();

export function subscribeToProfile(listener: (profile?: UserProfile) => void) {
  profileListeners.add(listener);
  return () => { profileListeners.delete(listener); };
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
    accountSaveQueue = accountSaveQueue.catch(() => undefined).then(async () => {
      const token = await KakaoUser.getAccessToken();
      await storeAccountData(token.accessToken, data);
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
}

export function makeNotification(title: string, body: string): AppNotification {
  return { id: `notification-${Date.now()}`, title, body, createdAt: '방금 전', read: false };
}
