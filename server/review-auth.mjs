import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// 스토어 심사관은 카카오 추가 인증(카톡·문자)을 통과할 수 없어서, 아이디·비밀번호로 들어오는 심사용 계정을 따로 둔다.
// data/review-account.json: { "username": "...", "salt": "<hex>", "hash": "<scrypt hex>" }
// 파일이 없으면 심사용 로그인은 꺼진다.

export function hashReviewPassword(password, salt) {
  return crypto.scryptSync(String(password), Buffer.from(salt, 'hex'), 32).toString('hex');
}

export async function verifyReviewAccount(stateDir, username, password) {
  let account;
  try {
    account = JSON.parse(await fs.readFile(path.join(stateDir, 'review-account.json'), 'utf8'));
  } catch {
    return null;
  }
  if (!account.username || !account.salt || !account.hash) return null;
  if (typeof username !== 'string' || typeof password !== 'string' || username.trim() !== account.username) return null;
  const expected = Buffer.from(account.hash, 'hex');
  const actual = Buffer.from(hashReviewPassword(password, account.salt), 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  return `review:${account.username}`;
}
