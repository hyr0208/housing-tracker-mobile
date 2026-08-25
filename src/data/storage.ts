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
  complexName?: string;
  brtcCode?: string;
  signguCode?: string;
  suplyTy?: string;
  houseTy?: string;
  publicWaitCount?: number;
  publicWaitPreviousCount?: number;
  publicWaitUpdatedAt?: string;
  syncStatus?: 'synced' | 'no_match' | 'error';
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  profileListeners.forEach((listener) => listener(data.profile));
}

export function makeNotification(title: string, body: string): AppNotification {
  return { id: `notification-${Date.now()}`, title, body, createdAt: '방금 전', read: false };
}
