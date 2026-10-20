import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AppleProfile = {
  id: string;
  nickname: string;
};

const SESSION_KEY = 'housing-tracker.apple-session';
const syncServerUrl = (process.env.EXPO_PUBLIC_SYNC_SERVER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export async function isAppleSignInAvailable() {
  return Platform.OS === 'ios' && AppleAuthentication.isAvailableAsync();
}

/**
 * Apple로 로그인한 뒤 서버에서 identity token을 확인받고, 계정 동기화에 쓸 서버 로그인 토큰을 보관합니다.
 * Apple identity token은 10분 뒤 만료되므로 동기화에는 서버가 발급한 토큰을 사용합니다.
 */
export async function loginWithApple(): Promise<AppleProfile | null> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
  if (!credential.identityToken) throw new Error('Apple 로그인 정보를 받지 못했어요. 다시 시도해주세요.');

  const response = await fetch(`${syncServerUrl}/api/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityToken: credential.identityToken, authorizationCode: credential.authorizationCode }),
  });
  const body = await response.json().catch(() => ({})) as { token?: string; userId?: string; error?: string };
  if (!response.ok || !body.token || !body.userId) throw new Error(body.error || 'Apple 로그인 확인에 실패했어요. 잠시 후 다시 시도해주세요.');
  await SecureStore.setItemAsync(SESSION_KEY, body.token);

  // 이름은 처음 로그인할 때만 전달되고, 사용자가 공유하지 않을 수도 있다.
  const name = [credential.fullName?.familyName, credential.fullName?.givenName].filter(Boolean).join('');
  return { id: body.userId, nickname: name || 'Apple 사용자' };
}

export async function getAppleSessionToken(): Promise<string> {
  const token = await SecureStore.getItemAsync(SESSION_KEY);
  if (!token) throw new Error('Apple 로그인이 필요해요. 다시 로그인해주세요.');
  return token;
}

export async function clearAppleSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
