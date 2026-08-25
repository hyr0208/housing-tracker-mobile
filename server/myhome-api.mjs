import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const API_BASE_URL = 'https://apis.data.go.kr/1613000/HWSPR03/moveWaitStsList';

function readDotEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
      }),
  );
}

function getServiceKey() {
  const key = process.env.MYHOME_API_KEY || readDotEnv().MYHOME_API_KEY;
  if (!key) throw new Error('MYHOME_API_KEY가 설정되지 않았습니다.');
  return key;
}

function asList(item) {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

export async function fetchWaitingRows({ brtcCode, signguCode, suplyTy, houseTy }) {
  if (!brtcCode) throw new Error('광역시도 코드(brtcCode)가 필요합니다.');

  const rows = [];
  const numOfRows = 1000;
  let pageNo = 1;

  while (pageNo <= 10) {
    const url = new URL(API_BASE_URL);
    url.searchParams.set('serviceKey', getServiceKey());
    url.searchParams.set('brtcCode', brtcCode);
    url.searchParams.set('numOfRows', String(numOfRows));
    url.searchParams.set('pageNo', String(pageNo));
    if (signguCode) url.searchParams.set('signguCode', signguCode);
    if (suplyTy) url.searchParams.set('suplyTy', suplyTy);
    if (houseTy) url.searchParams.set('houseTy', houseTy);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`마이홈 API HTTP 오류: ${response.status}`);
    const payload = await response.json();
    const header = payload?.response?.header;
    if (header?.resultCode !== '00') throw new Error(`마이홈 API 오류: ${header?.resultMsg || header?.resultCode || '알 수 없는 오류'}`);

    const body = payload?.response?.body ?? {};
    const pageItems = asList(body.item);
    rows.push(...pageItems);
    if (rows.length >= Number(body.totalCount || 0) || pageItems.length < numOfRows) break;
    pageNo += 1;
  }

  return rows;
}

export function normalizeName(value = '') {
  return String(value).toLowerCase().replace(/[\s·_\-/()[\]]/g, '');
}

export function findMatchingRows(rows, { complexName, suplyTy, houseTy }) {
  const normalizedQuery = normalizeName(complexName);
  if (!normalizedQuery) return [];

  return rows.filter((row) => {
    const normalizedName = normalizeName(row.hsmpNm);
    const nameMatches = normalizedName === normalizedQuery || normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
    const supplyMatches = !suplyTy || normalizeName(row.suplyTyNm).includes(normalizeName(suplyTy));
    const houseMatches = !houseTy || normalizeName(row.houseTyNm).includes(normalizeName(houseTy));
    return nameMatches && supplyMatches && houseMatches;
  });
}

export { API_BASE_URL };
