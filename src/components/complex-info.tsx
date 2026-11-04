import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComplexInfo } from '@/data/storage';

type Props = {
  info?: ComplexInfo;
  isLoading: boolean;
  onLoad: () => void;
};

function openMap(address: string) {
  const query = encodeURIComponent(address.replace(/\(.*\)/, '').trim());
  const url = Platform.OS === 'ios' ? `maps://?q=${query}` : `geo:0,0?q=${query}`;
  void Linking.openURL(url).catch(() => Linking.openURL(`https://map.naver.com/p/search/${query}`));
}

// 지난 공고 사이 간격으로 "보통 몇 개월마다 모집하는지" 알려준다.
function averageNoticeGapMonths(info: ComplexInfo) {
  const dates = info.notices.map((notice) => new Date(notice.announcedAt).getTime()).filter((time) => !Number.isNaN(time)).sort((a, b) => b - a);
  if (dates.length < 2) return undefined;
  const gaps = dates.slice(1).map((time, index) => (dates[index] - time) / (30 * 24 * 60 * 60 * 1000));
  return Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
}

// LH 부동산맵에 공개된 단지 기본 정보, 주택형, 지난 모집공고를 보여준다.
export function ComplexInfoPanel({ info, isLoading, onLoad }: Props) {
  if (!info) {
    return (
      <View>
        <Text style={styles.description}>LH 부동산맵에서 세대수, 주택형, 지난 모집공고를 가져와요.</Text>
        <Pressable style={styles.loadButton} onPress={onLoad} disabled={isLoading}><Text style={styles.loadText}>{isLoading ? '불러오는 중…' : '단지 정보 불러오기'}</Text></Pressable>
      </View>
    );
  }

  const gap = averageNoticeGapMonths(info);
  const facts = [
    info.households ? ['세대수', `${info.households.toLocaleString()}세대`] : null,
    info.moveInMonth ? ['입주', info.moveInMonth] : null,
    info.heating ? ['난방', info.heating] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <View>
      {info.lhName && <Text style={styles.description}>LH 부동산맵 기준 단지: {info.lhName}</Text>}
      {info.address && <Pressable style={styles.row} onPress={() => openMap(info.address!)}>
        <Text style={styles.rowLabel}>주소</Text>
        <Text style={styles.rowValue}>{info.address}  <Text style={styles.link}>지도 ↗</Text></Text>
      </Pressable>}
      {facts.length > 0 && <View style={styles.facts}>{facts.map(([label, value]) => <View key={label} style={styles.fact}><Text style={styles.factValue}>{value}</Text><Text style={styles.factLabel}>{label}</Text></View>)}</View>}
      {info.phone && <Pressable style={styles.row} onPress={() => void Linking.openURL(`tel:${info.phone}`)}>
        <Text style={styles.rowLabel}>관리사무소</Text>
        <Text style={styles.rowValue}>{info.phone}  <Text style={styles.link}>전화 ↗</Text></Text>
      </Pressable>}

      {info.types.length > 0 && <View style={styles.panel}>
        <Text style={styles.panelTitle}>주택형</Text>
        {info.types.map((type, index) => <View key={`${type.type}-${index}`} style={styles.typeRow}>
          <Text style={styles.typeName}>{type.type}{/^\d/.test(type.type) ? '형' : ''}</Text>
          <Text style={styles.typeMeta}>{[type.area ? `${type.area}㎡` : null, type.households ? `${type.households}세대` : null, type.latestSupply ? `최근 ${type.latestSupply}세대 모집` : null].filter(Boolean).join(' · ')}</Text>
        </View>)}
      </View>}

      {info.notices.length > 0 && <View style={styles.panel}>
        <Text style={styles.panelTitle}>지난 모집공고{gap ? `  ·  평균 약 ${gap}개월 간격` : ''}</Text>
        {info.notices.map((notice) => <Pressable key={`${notice.announcedAt}-${notice.title}`} style={styles.noticeRow} onPress={() => { if (notice.url) void Linking.openURL(notice.url); }}>
          <Text style={styles.noticeTitle} numberOfLines={2}>{notice.title}</Text>
          <Text style={styles.noticeMeta}>{notice.announcedAt.replace(/-/g, '.')} 공고 · {notice.status}{notice.url ? '  ↗' : ''}</Text>
        </Pressable>)}
      </View>}
      <Text style={styles.footnote}>임대보증금과 월 임대료는 모집공고문에서 확인할 수 있어요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  description: { color: '#5c6b63', fontSize: 14, lineHeight: 21, marginTop: 4 },
  loadButton: { height: 42, borderRadius: 10, backgroundColor: '#e4f3ec', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  loadText: { color: '#2f7d64', fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#edf1ee' },
  rowLabel: { width: 76, color: '#65786e', fontSize: 14, fontWeight: '700' },
  rowValue: { flex: 1, color: '#30433b', fontSize: 14, lineHeight: 21 },
  link: { color: '#38856d', fontWeight: '800' },
  facts: { flexDirection: 'row', gap: 8, marginTop: 12 },
  fact: { flex: 1, backgroundColor: '#f7faf8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  factValue: { color: '#285645', fontSize: 15, fontWeight: '800' },
  factLabel: { color: '#65786e', fontSize: 12, marginTop: 3 },
  panel: { marginTop: 14, borderRadius: 12, backgroundColor: '#f7faf8', paddingHorizontal: 14, paddingVertical: 10 },
  panelTitle: { color: '#587368', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 6 },
  typeName: { color: '#30433b', fontSize: 14, fontWeight: '800' },
  typeMeta: { flex: 1, textAlign: 'right', color: '#436c5d', fontSize: 13 },
  noticeRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#edf1ee' },
  noticeTitle: { color: '#30433b', fontSize: 14, fontWeight: '700', lineHeight: 21 },
  noticeMeta: { color: '#65786e', fontSize: 12, marginTop: 3 },
  footnote: { color: '#72857b', fontSize: 12, marginTop: 12 },
});
