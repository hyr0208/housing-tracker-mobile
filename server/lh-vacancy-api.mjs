const LH_BASE_URL = 'https://apply.lh.or.kr/lhapply/land';
const cache = new Map();
const cacheTtlMs = 30 * 60 * 1000;

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^가-힣a-z0-9]/g, '');
}

function decodeHtml(value = '') {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function textOnly(value = '') {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

async function lhPost(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${LH_BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`LH 부동산맵 응답 오류 (${response.status})`);
    return response;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('LH 공가 현황 조회 시간이 초과됐어요.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchLhComplexes(keyword, brtcCode) {
  const all = [];
  let pageTotalCount = 0;
  let page = 1;
  do {
    const response = await lhPost('dstRthoSearch.do', {
      srchUppAisTpCd: '061339',
      uppAisTpCd: '06',
      aisTpCd: '',
      cnpCd: brtcCode,
      searchText: keyword,
      bzdtSs: '',
      minDdoAr: '',
      maxDdoAr: '',
      searchPage: page,
    });
    const payload = await response.json();
    if (!Array.isArray(payload.searchList)) throw new Error('LH 단지 검색 결과를 읽을 수 없어요.');
    all.push(...payload.searchList);
    pageTotalCount = Number(payload.pageTotalCnt || payload.searchList[0]?.allCnt || all.length);
    page += 1;
  } while (all.length < pageTotalCount && page <= 10);
  return all;
}

function findLhComplex(rows, { complexName, title }) {
  const targets = [complexName, title].map(normalize).filter(Boolean);
  const exactMatches = rows.filter((row) => {
    const name = normalize(row.sbdLgoNm);
    return targets.some((target) => name === target || name.includes(target) || target.includes(name));
  });
  if (exactMatches.length === 1) return exactMatches[0];

  // MyHome and LH use different display names for a small number of complexes.
  const isSeongnamIndustrialA3 = targets.some((target) =>
    target.includes('성남산단3단지') || target.includes('성남재생산단a3'),
  );
  if (isSeongnamIndustrialA3) {
    const match = rows.find((row) => normalize(row.sbdLgoNm).includes('성남재생산단a3블록'));
    if (match) return match;
  }

  return exactMatches[0];
}

function getKnownSearchAliases(complexName) {
  const target = normalize(complexName);
  if (target.includes('성남산단3단지')) return ['성남재생산단 A3블록'];
  return [];
}

function parseVacancyRows(html) {
  const section = html.match(/<div[^>]*id=["']rthoDiv04["'][\s\S]*?<\/div>\s*<button/i)?.[0] || '';
  const body = section.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || '';
  const results = [];
  for (const row of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => textOnly(cell[1]));
    if (cells.length < 2 || /공가 현황이 없습니다/.test(cells.join(' '))) continue;
    const countText = cells[1].replace(/,/g, '').match(/-?\d+/)?.[0];
    if (!countText) continue;
    results.push({ label: cells[0].replace(/^평형\s*/, ''), count: Number(countText) });
  }
  return results;
}

function sectionHtml(html, id) {
  const start = html.search(new RegExp(`id=["']${id}["']`));
  if (start < 0) return '';
  const next = html.slice(start + 1).search(/id=["']rthoDiv\d+["']/);
  return next < 0 ? html.slice(start) : html.slice(start, start + 1 + next);
}

function tableRows(section) {
  const body = section.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || '';
  return [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => row[1]);
}

// 모바일용 제목(<em class="mTit">)을 빼고 셀 값만 읽는다.
function cellTexts(rowHtml) {
  return [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
    .map((cell) => textOnly(cell[1].replace(/<em class="mTit">[\s\S]*?<\/em>/gi, '')));
}

// LH 부동산맵 단지 팝업의 '단지정보', '주택형 안내', '공고현황' 탭을 읽는다. 임대료는 팝업에 없고 공고문에만 있다.
function parseComplexInfo(html) {
  const info = {};
  for (const row of tableRows(sectionHtml(html, 'rthoDiv01'))) {
    const cells = [...row.matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)];
    for (const [, label, value] of cells) info[textOnly(label).replace(/\(.*\)/, '').trim()] = textOnly(value);
  }
  const types = tableRows(sectionHtml(html, 'rthoDiv02'))
    .map(cellTexts)
    .filter((cells) => cells.length >= 4)
    .map(([type, area, households, latestNotice, latestSupply]) => ({
      type,
      area: Number(area) || undefined,
      households: Number(households.replace(/,/g, '')) || undefined,
      latestNotice: latestNotice || undefined,
      latestSupply: Number(String(latestSupply || '').replace(/,/g, '')) || undefined,
    }));
  const notices = tableRows(sectionHtml(html, 'rthoDiv03'))
    .map((row) => {
      const cells = cellTexts(row);
      const panId = row.match(/goWrtancDtl\('([^']+)','([^']*)','([^']*)','([^']*)'\)/);
      if (cells.length < 8) return null;
      return {
        title: cells[2],
        announcedAt: cells[5].replace(/\./g, '-'),
        closedAt: cells[6].replace(/\./g, '-'),
        status: cells[7],
        url: panId ? `https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancInfo.do?panId=${panId[1]}&ccrCnntSysDsCd=${panId[2]}&uppAisTpCd=${panId[3]}&aisTpCd=${panId[4]}&mi=1026` : undefined,
      };
    })
    .filter(Boolean)
    .slice(0, 5);
  const phone = info['문의처']?.match(/\d{2,4}-\d{3,4}-\d{4}/)?.[0];
  if (!info['단지명'] && types.length === 0) return undefined;
  return {
    households: Number(String(info['세대수'] || '').replace(/,/g, '')) || undefined,
    moveInMonth: info['입주예정월'] || undefined,
    heating: info['난방방식'] || undefined,
    phone,
    address: info['소재지'] || undefined,
    types,
    notices,
  };
}

function getAreaSearchKeyword(area = '') {
  const cityOrDistrict = String(area).match(/[가-힣]+(?:특별자치시|특별시|광역시|시|군|구)/)?.[0];
  return cityOrDistrict?.replace(/(?:특별자치시|특별시|광역시|자치시|시|군|구)$/, '');
}

export async function fetchVacancyStatus({ complexName, title, area, brtcCode }) {
  const targetName = String(complexName || '').trim();
  const regionCode = String(brtcCode || '').trim();
  if (!targetName || !regionCode) throw new Error('단지명과 지역 정보가 필요합니다.');

  const cacheKey = `${regionCode}|${normalize(targetName)}|${normalize(title || '')}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const keywords = [...getKnownSearchAliases(targetName), targetName, title, getAreaSearchKeyword(area)]
    .map((value) => String(value || '').trim())
    .filter((value, index, values) => value && values.indexOf(value) === index);
  let lhComplex;
  for (const keyword of keywords) {
    const rows = await searchLhComplexes(keyword, regionCode);
    lhComplex = findLhComplex(rows, { complexName: targetName, title });
    if (lhComplex) break;
  }
  if (!lhComplex) {
    return {
      status: 'no_match',
      complexName: targetName,
      rows: [],
      message: 'LH 부동산맵에서 일치하는 단지를 찾지 못했어요.',
    };
  }

  const response = await lhPost('gisRthoPopup.do', {
    sbdLgoNo: lhComplex.sbdLgoNo,
    splTpCd: lhComplex.splTpCd,
    sn: lhComplex.sn,
  });
  const html = await response.text();
  const rows = parseVacancyRows(html);
  const result = {
    status: rows.length ? 'synced' : 'no_data',
    complexName: lhComplex.sbdLgoNm || targetName,
    rows,
    complexInfo: parseComplexInfo(html),
    checkedAt: new Date().toISOString(),
    message: rows.length ? undefined : 'LH 부동산맵에 조회된 공가 현황이 없어요.',
    note: 'LH 공가 호수는 매월 말 기준으로 업데이트되며, 실제 공급 가능 호수와 다를 수 있어요.',
    sourceUrl: 'https://apply.lh.or.kr/lhapply/land/main.do?mi=1040',
  };
  cache.set(cacheKey, { result, expiresAt: Date.now() + cacheTtlMs });
  return result;
}
