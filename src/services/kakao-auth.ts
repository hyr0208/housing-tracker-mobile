import { initializeKakaoSDK } from '@react-native-kakao/core';
import * as KakaoUser from '@react-native-kakao/user';
import * as SecureStore from 'expo-secure-store';

export type KakaoProfile = {
  id: string;
  nickname: string;
};

let initializedKey: string | undefined;
const SESSION_KEY = 'housing-tracker.kakao-session';
const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

async function ensureKakaoSDK() {
  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
  if (!nativeAppKey) throw new Error('.env에 EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY가 필요해요.');
  if (initializedKey !== nativeAppKey) {
    await initializeKakaoSDK(nativeAppKey);
    initializedKey = nativeAppKey;
  }
}

export async function loginWithKakao(): Promise<KakaoProfile> {
  await ensureKakaoSDK();
  // 프로필 동의항목은 카카오 콘솔에서 설정하므로 로그인 요청에 scopes를
  // 다시 넣지 않습니다. iOS SDK에서 scopes를 포함하면 로그인 토큰 발급
  // 대신 추가 동의 요청으로 처리되어 access_token 누락 오류가 발생할 수 있습니다.
  const token = await KakaoUser.login({ useKakaoAccountLogin: true });

  // 일부 iOS SDK 조합에서는 로그인 직후 SDK 내부 저장소에 토큰이 반영되기
  // 전에 me()가 호출되어 access_token 누락 오류가 발생할 수 있습니다.
  // 로그인 결과로 받은 토큰을 사용해 사용자 정보를 직접 조회합니다.
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!response.ok) {
    throw new Error('카카오 사용자 정보를 가져오지 못했어요. 잠시 후 다시 시도해주세요.');
  }

  const user = await response.json() as {
    id?: number;
    kakao_account?: { profile?: { nickname?: string } };
    properties?: { nickname?: string };
  };
  if (!user.id) throw new Error('카카오 사용자 정보가 비어 있어요.');

  // 계정 동기화용 서버 로그인 토큰을 받아 둔다. 카카오 SDK는 나중에 access token 문자열을 다시 꺼내 주지 않는다.
  const sessionResponse = await fetch(`${syncServerUrl}/api/auth/kakao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: token.accessToken }),
  });
  const session = await sessionResponse.json().catch(() => ({})) as { token?: string; error?: string };
  if (!sessionResponse.ok || !session.token) throw new Error(session.error || '카카오 로그인 확인에 실패했어요. 잠시 후 다시 시도해주세요.');
  await SecureStore.setItemAsync(SESSION_KEY, session.token);
  return {
    id: String(user.id),
    nickname: user.kakao_account?.profile?.nickname || user.properties?.nickname || '카카오 사용자',
  };
}

export async function clearKakaoSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await ensureKakaoSDK();
  if (await KakaoUser.isLogined()) await KakaoUser.logout();
}

// 카카오 계정과 앱의 연결을 끊는다. 다음 로그인 때 동의 절차를 다시 거친다.
export async function unlinkKakao() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await ensureKakaoSDK();
  await KakaoUser.unlink();
}

// 계정 동기화에 쓰는 서버 로그인 토큰. 예전 버전에서 로그인해 토큰이 없으면 다시 로그인해야 한다.
export async function getKakaoSessionToken(): Promise<string> {
  const token = await SecureStore.getItemAsync(SESSION_KEY);
  if (!token) throw new Error('계정 연결을 위해 로그아웃 후 카카오로 다시 로그인해주세요.');
  return token;
}
