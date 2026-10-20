import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const APPLE_ISSUER = 'https://appleid.apple.com';
const bundleId = process.env.APPLE_BUNDLE_ID || 'kr.co.uulab.housingtracker';
const teamId = process.env.APPLE_TEAM_ID || 'N99FMBQ662';
const sessionTtlMs = 365 * 24 * 60 * 60 * 1000;

let appleKeysCache = { keys: [], expiresAt: 0 };

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url');
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function fetchAppleKeys(forceRefresh = false) {
  if (!forceRefresh && appleKeysCache.expiresAt > Date.now()) return appleKeysCache.keys;
  const response = await fetch(`${APPLE_ISSUER}/auth/keys`);
  if (!response.ok) throw new Error('Apple 공개 키를 가져오지 못했어요.');
  const { keys } = await response.json();
  appleKeysCache = { keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return keys;
}

// Apple identity token(JWT)의 서명·발급자·대상·만료를 확인하고 Apple 사용자 ID(sub)를 돌려준다.
export async function verifyAppleIdentityToken(identityToken) {
  const [encodedHeader, encodedPayload, encodedSignature] = String(identityToken || '').split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error('Apple 로그인 정보가 올바르지 않아요.');

  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'));
  } catch {
    throw new Error('Apple 로그인 정보가 올바르지 않아요.');
  }
  if (header.alg !== 'RS256') throw new Error('지원하지 않는 Apple 토큰 형식이에요.');

  let jwk = (await fetchAppleKeys()).find((key) => key.kid === header.kid);
  if (!jwk) jwk = (await fetchAppleKeys(true)).find((key) => key.kid === header.kid);
  if (!jwk) throw new Error('Apple 토큰 서명 키를 찾지 못했어요.');

  const isValid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    crypto.createPublicKey({ key: jwk, format: 'jwk' }),
    base64UrlDecode(encodedSignature),
  );
  if (!isValid) throw new Error('Apple 토큰 서명이 올바르지 않아요.');
  if (payload.iss !== APPLE_ISSUER) throw new Error('Apple 토큰 발급자가 올바르지 않아요.');
  if (payload.aud !== bundleId) throw new Error('이 앱에서 발급된 Apple 토큰이 아니에요.');
  if (!payload.sub || Number(payload.exp) * 1000 < Date.now()) throw new Error('Apple 로그인이 만료됐어요. 다시 로그인해주세요.');
  return { sub: String(payload.sub), email: payload.email };
}

async function getSessionSecret(stateDir) {
  const secretPath = path.join(stateDir, 'session-secret');
  try {
    return (await fs.readFile(secretPath, 'utf8')).trim();
  } catch {
    // 첫 실행 때 만든 비밀값을 data/에 보관해 컨테이너를 다시 만들어도 기존 로그인이 유지되게 한다.
    const secret = crypto.randomBytes(32).toString('hex');
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(secretPath, secret, { mode: 0o600 });
    return secret;
  }
}

// 서버 자체 로그인 토큰: 'hts.<payload>.<HMAC 서명>'
export async function createSessionToken(stateDir, userId) {
  const payload = base64UrlJson({ uid: userId, exp: Date.now() + sessionTtlMs });
  const signature = crypto.createHmac('sha256', await getSessionSecret(stateDir)).update(payload).digest('base64url');
  return `hts.${payload}.${signature}`;
}

export async function verifySessionToken(stateDir, token) {
  const [prefix, payload, signature] = String(token || '').split('.');
  if (prefix !== 'hts' || !payload || !signature) return null;
  const expected = crypto.createHmac('sha256', await getSessionSecret(stateDir)).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const { uid, exp } = JSON.parse(base64UrlDecode(payload).toString('utf8'));
  return uid && exp > Date.now() ? String(uid) : null;
}

// data/에 Apple에서 내려받은 'AuthKey_<KEY_ID>.p8' 파일이 있으면 토큰 교환·해지에 쓴다.
async function findSignInKey(stateDir) {
  const files = await fs.readdir(stateDir).catch(() => []);
  const file = files.find((name) => /^AuthKey_[A-Z0-9]+\.p8$/.test(name));
  if (!file) return null;
  return { keyId: file.slice('AuthKey_'.length, -'.p8'.length), privateKey: await fs.readFile(path.join(stateDir, file), 'utf8') };
}

async function createClientSecret(stateDir) {
  const key = await findSignInKey(stateDir);
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64UrlJson({ alg: 'ES256', kid: key.keyId })}.${base64UrlJson({ iss: teamId, iat: now, exp: now + 300, aud: APPLE_ISSUER, sub: bundleId })}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: key.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${unsigned}.${signature}`;
}

// 로그인 때 받은 authorization code를 refresh token으로 바꿔 둔다. 계정 삭제 시 이 토큰으로 Apple 연결을 해지한다.
export async function exchangeAuthorizationCode(stateDir, authorizationCode) {
  const clientSecret = await createClientSecret(stateDir);
  if (!clientSecret || !authorizationCode) return null;
  const response = await fetch(`${APPLE_ISSUER}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: bundleId, client_secret: clientSecret, code: authorizationCode, grant_type: 'authorization_code' }),
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body.refresh_token || null;
}

export async function revokeAppleToken(stateDir, refreshToken) {
  const clientSecret = await createClientSecret(stateDir);
  if (!clientSecret || !refreshToken) return false;
  const response = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: bundleId, client_secret: clientSecret, token: refreshToken, token_type_hint: 'refresh_token' }),
  });
  return response.ok;
}
