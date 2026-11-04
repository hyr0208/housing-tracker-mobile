import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { loadAppData } from '@/data/storage';
import { NOTICE_REGIONS } from '@/services/notices';
import { fetchWaitingExplore, type ExploreComplex } from '@/services/waiting-explore';

const PAGE_SIZE = 30;

// 지역의 공공임대 단지를 대기인원이 적은 순으로 보여준다. 신청 전에 빨리 될 만한 단지를 비교하는 용도.
export function WaitingExplore() {
  const [region, setRegion] = useState<string>();
  const [complexes, setComplexes] = useState<ExploreComplex[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [supplyType, setSupplyType] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string>();

  // 처음에는 공고 알림에서 고른 관심 지역(없으면 서울)부터 보여준다.
  useEffect(() => {
    loadAppData().then((data) => setRegion((current) => current ?? data.noticeAlert?.regions[0] ?? '서울'));
  }, []);

  useEffect(() => {
    if (!region) return;
    let active = true;
    setIsLoading(true);
    setErrorMessage(undefined);
    setComplexes([]);
    setSupplyType(undefined);
    setVisibleCount(PAGE_SIZE);
    fetchWaitingExplore(region)
      .then((result) => { if (active) setComplexes(result); })
      .catch((error: unknown) => { if (active) setErrorMessage(error instanceof Error ? error.message : '대기현황을 불러오지 못했어요.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [region]);

  const supplyTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const complex of complexes) counts.set(complex.supplyType, (counts.get(complex.supplyType) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type);
  }, [complexes]);

  const filtered = useMemo(() => {
    const query = keyword.replace(/\s/g, '');
    return complexes.filter((complex) =>
      (!supplyType || complex.supplyType === supplyType)
      && (!query || `${complex.complexName}${complex.district}`.replace(/\s/g, '').includes(query)));
  }, [complexes, supplyType, keyword]);

  return (
    <View style={styles.section}>
      <Text style={styles.description}>마이홈에 공개된 단지별 예비입주자 대기인원이에요. 대기인원이 적을수록 빨리 차례가 올 가능성이 커요.</Text>
      <Text style={styles.groupLabel}>지역</Text>
      <View style={styles.chips}>
        {NOTICE_REGIONS.map((item) => <Pressable key={item} style={[styles.chip, region === item && styles.chipSelected]} onPress={() => setRegion(item)}><Text style={[styles.chipText, region === item && styles.chipTextSelected]}>{item}</Text></Pressable>)}
      </View>
      {supplyTypes.length > 1 && <>
        <Text style={styles.groupLabel}>공급유형</Text>
        <View style={styles.chips}>
          <Pressable style={[styles.chip, !supplyType && styles.chipSelected]} onPress={() => setSupplyType(undefined)}><Text style={[styles.chipText, !supplyType && styles.chipTextSelected]}>전체</Text></Pressable>
          {supplyTypes.map((item) => <Pressable key={item} style={[styles.chip, supplyType === item && styles.chipSelected]} onPress={() => setSupplyType(item)}><Text style={[styles.chipText, supplyType === item && styles.chipTextSelected]}>{item}</Text></Pressable>)}
        </View>
      </>}
      {complexes.length > 0 && <TextInput value={keyword} onChangeText={setKeyword} placeholder="단지명이나 시·군·구로 찾기" placeholderTextColor="#a9b4ae" style={styles.search} />}

      {isLoading ? <View style={styles.loading}><ActivityIndicator color="#327e67" /><Text style={styles.loadingText}>{region} 단지를 모으고 있어요. 처음에는 20초쯤 걸릴 수 있어요.</Text></View>
        : errorMessage ? <Text style={styles.empty}>{errorMessage}</Text>
        : <>
          <Text style={styles.groupLabel}>대기인원 적은 순 · {filtered.length}개 단지</Text>
          {filtered.length === 0 ? <Text style={styles.empty}>조건에 맞는 단지가 없어요.</Text> : filtered.slice(0, visibleCount).map((complex) => {
            const isOpen = openId === complex.id;
            return (
              <Pressable key={complex.id} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => setOpenId(isOpen ? undefined : complex.id)}>
                <View style={styles.cardTop}>
                  <View style={styles.cardBody}>
                    <View style={styles.tags}><Text style={styles.tag}>{complex.supplyType}</Text><Text style={styles.district}>{complex.district}</Text></View>
                    <Text style={styles.name} numberOfLines={isOpen ? undefined : 1}>{complex.complexName}</Text>
                  </View>
                  <View style={styles.waitBox}><Text style={[styles.waitCount, complex.totalWait === 0 && styles.waitZero]}>{complex.totalWait === 0 ? '없음' : complex.totalWait}</Text><Text style={styles.waitLabel}>{complex.totalWait === 0 ? '대기' : '명 대기'}</Text></View>
                </View>
                {isOpen && <View style={styles.detail}>
                  {complex.types.map((type, index) => <View key={`${type.label}-${index}`} style={styles.typeRow}><Text style={styles.typeLabel}>{type.label}{/^\d/.test(type.label) ? '형' : ''}</Text><Text style={styles.typeCount}>{type.count}명</Text></View>)}
                  {complex.address && <Text style={styles.address}>{complex.address}</Text>}
                  <Text style={styles.institution}>{complex.institution} · 대기 0명은 예비입주자가 모두 입주했거나 아직 모집 전이라는 뜻이에요.</Text>
                </View>}
              </Pressable>
            );
          })}
          {filtered.length > visibleCount && <Pressable style={styles.more} onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}><Text style={styles.moreText}>{Math.min(PAGE_SIZE, filtered.length - visibleCount)}개 더 보기</Text></Pressable>}
        </>}
      <Text style={styles.source}>마이홈포털 입주대기 현황 기준이에요. 실제 순번과 자격은 LH·SH 등 공급기관 공고에서 확인해 주세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  description: { color: '#596961', fontSize: 14, lineHeight: 20 },
  groupLabel: { color: '#587368', fontSize: 14, fontWeight: '800', marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: '#dcebe2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f8fbf8' },
  chipSelected: { backgroundColor: '#d5eee2', borderColor: '#83c4aa' },
  chipText: { color: '#6b8c7d', fontSize: 14, fontWeight: '700' },
  chipTextSelected: { color: '#2f7d64' },
  search: { height: 42, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ece7', borderRadius: 10, paddingHorizontal: 12, color: '#52635b', fontSize: 15, marginTop: 14 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  loadingText: { color: '#5c6b63', fontSize: 14 },
  empty: { color: '#65786e', fontSize: 14, marginTop: 10, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderColor: '#e4ece7', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 9 },
  cardPressed: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBody: { flex: 1 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tag: { color: '#2f7d64', backgroundColor: '#e4f3ec', overflow: 'hidden', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, fontSize: 13, fontWeight: '800' },
  district: { color: '#436c5d', fontSize: 13, fontWeight: '700' },
  name: { color: '#243b34', fontSize: 15, fontWeight: '800', marginTop: 7 },
  waitBox: { alignItems: 'flex-end', minWidth: 56 },
  waitCount: { color: '#246b57', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  waitZero: { fontSize: 16, color: '#4ba989' },
  waitLabel: { color: '#65786e', fontSize: 12, marginTop: 1 },
  detail: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#edf1ee' },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  typeLabel: { color: '#61736a', fontSize: 11, fontWeight: '700' },
  typeCount: { color: '#4b927a', fontSize: 11, fontWeight: '800' },
  address: { color: '#5c6b63', fontSize: 13, marginTop: 8 },
  institution: { color: '#72857b', fontSize: 12, marginTop: 6, lineHeight: 18 },
  more: { alignItems: 'center', paddingVertical: 12 },
  moreText: { color: '#38856d', fontSize: 14, fontWeight: '800' },
  source: { color: '#72857b', fontSize: 12, marginTop: 10, lineHeight: 18 },
});
