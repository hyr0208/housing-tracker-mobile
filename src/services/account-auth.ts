import type { UserProfile } from '@/data/storage';
import { clearAppleSession, getAppleSessionToken } from '@/services/apple-auth';
import { clearKakaoSession, getKakaoAccessToken, unlinkKakao } from '@/services/kakao-auth';

// 로그인 방식(카카오/Apple)에 맞는 계정 동기화용 토큰을 가져온다.
export function getAccountToken(profile: UserProfile): Promise<string> {
  return profile.provider === 'apple' ? getAppleSessionToken() : getKakaoAccessToken();
}

export async function clearAccountSession(profile: UserProfile) {
  if (profile.provider === 'apple') await clearAppleSession();
  else await clearKakaoSession();
}

// 계정 삭제 후 로그인 연결을 정리한다. Apple 연결 해지는 서버가 계정 삭제 때 처리한다.
export async function unlinkAccount(profile: UserProfile) {
  if (profile.provider === 'apple') {
    await clearAppleSession();
    return;
  }
  await unlinkKakao().catch(() => clearKakaoSession());
}
