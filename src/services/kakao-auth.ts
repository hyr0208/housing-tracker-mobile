import { initializeKakaoSDK } from '@react-native-kakao/core';
import * as KakaoUser from '@react-native-kakao/user';

export type KakaoProfile = {
  id: string;
  nickname: string;
};

let initializedKey: string | undefined;

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
  return {
    id: String(user.id),
    nickname: user.kakao_account?.profile?.nickname || user.properties?.nickname || '카카오 사용자',
  };
}

export async function clearKakaoSession() {
  await ensureKakaoSDK();
  if (await KakaoUser.isLogined()) await KakaoUser.logout();
}
