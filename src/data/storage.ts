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

export type WaitCountSnapshot = {
  count: number;
  recordedAt: string;
};

export type VacancyBreakdown = {
  label: string;
  count: number;
};

export type ComplexInfo = {
  lhName?: string;
  households?: number;
  moveInMonth?: string;
  heating?: string;
  phone?: string;
  address?: string;
  types: { type: string; area?: number; households?: number; latestNotice?: string; latestSupply?: number }[];
  notices: { title: string; announcedAt: string; closedAt: string; status: string; url?: string }[];
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
  // 서버가 기록한 공개 대기인원 변화. 입주까지 예상 기간을 계산할 때 쓴다.
  publicWaitHistory?: WaitCountSnapshot[];
  // 순번을 기록한 뒤 공개 대기인원이 줄어든 누적 수. 예상 순번(rank - waitAdvance)을 계산할 때 쓴다.
  waitAdvance?: number;
  vacancyBreakdown?: VacancyBreakdown[];
  vacancyUpdatedAt?: string;
  vacancyStatus?: 'synced' | 'no_data' | 'no_match' | 'error';
  vacancyMessage?: string;
  complexInfo?: ComplexInfo;
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

export type ScheduleKind = 'apply' | 'document' | 'contract' | 'move' | 'other';

export type ScheduleEvent = {
  id: string;
  title: string;
  kind: ScheduleKind;
  // YYYY-MM-DD. 접수 기간처럼 기간이 있으면 endDate까지.
  date: string;
  endDate?: string;
  noticeId?: string;
  url?: string;
};

export type NoticeAlertSettings = {
  enabled: boolean;
  regions: string[];
  supplyTypes: string[];
};

export type AppData = {
  applications: HousingApplication[];
  tasks: ChecklistTask[];
  notifications: AppNotification[];
  pushToken?: string;
  profileName?: string;
  profile?: UserProfile;
  noticeAlert?: NoticeAlertSettings;
  events?: ScheduleEvent[];
};

const STORAGE_KEY = '@housing-tracker/app-data-v1';
const profileListeners = new Set<(profile?: UserProfile) => void>();
const dataListeners = new Set<(data: AppData) => void>();
let accountSaveQueue: Promise<void> = Promise.resolve();
// 서버의 계정 데이터를 한 번이라도 받아 합친 뒤에만 이 기기 데이터를 서버에 올린다.
// 받기 전에 올리면, 로그인 직후 토큰을 못 읽은 기기가 빈 데이터로 다른 기기의 내역을 덮어쓸 수 있다.
let accountReady = false;

export function markAccountReady() {
  accountReady = true;
}

export function isAccountReady() {
  return accountReady;
}

function mergeById<T extends { id: string }>(remote: T[] = [], local: T[] = []) {
  const ids = new Set(remote.map((item) => item.id));
  return [...remote, ...local.filter((item) => !ids.has(item.id))];
}

/** 서버 데이터를 기준으로, 이 기기에만 있는 신청·할 일·알림·일정을 더한다. */
export function mergeAccountData(remote: AppData, local: AppData): AppData {
  return {
    ...local,
    ...remote,
    applications: mergeById(remote.applications, local.applications),
    tasks: mergeById(remote.tasks, local.tasks),
    notifications: mergeById(remote.notifications, local.notifications),
    events: mergeById(remote.events, local.events),
    noticeAlert: remote.noticeAlert ?? local.noticeAlert,
    pushToken: local.pushToken ?? remote.pushToken,
  };
}

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
      noticeAlert: parsed.noticeAlert,
      events: parsed.events ?? [],
    };
  } catch {
    return defaultAppData;
  }
}

export async function saveAppData(data: AppData) {
  await saveLocalAppData(data);
  if (!data.profile) accountReady = false;
  if (data.profile && accountReady) {
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
