import * as SecureStore from 'expo-secure-store';

export type ReviewProfile = {
  id: string;
  nickname: string;
};

const SESSION_KEY = 'housing-tracker.review-session';
const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

/**
 * 스토어 심사용 계정으로 로그인합니다. 심사관은 카카오 추가 인증을 통과할 수 없어서
 * 서버가 아이디·비밀번호를 확인하고 Apple 로그인과 같은 서버 로그인 토큰을 발급합니다.
 */
export async function loginWithReviewAccount(username: string, password: string): Promise<ReviewProfile> {
  const response = await fetch(`${syncServerUrl}/api/auth/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  const body = await response.json().catch(() => ({})) as { token?: string; userId?: string; error?: string };
  if (!response.ok || !body.token || !body.userId) throw new Error(body.error || '로그인에 실패했어요. 잠시 후 다시 시도해주세요.');
  await SecureStore.setItemAsync(SESSION_KEY, body.token);
  return { id: body.userId, nickname: '심사용 계정' };
}

export async function getReviewSessionToken(): Promise<string> {
  const token = await SecureStore.getItemAsync(SESSION_KEY);
  if (!token) throw new Error('다시 로그인해주세요.');
  return token;
}

export async function clearReviewSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
