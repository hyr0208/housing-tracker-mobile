import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadAppData, type HousingApplication } from '@/data/storage';

export default function ApplicationsScreen() {
  const [items, setItems] = useState<HousingApplication[]>([]);

  useEffect(() => {
    loadAppData().then((data) => setItems(data.applications));
  }, []);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>MY APPLICATIONS</Text>
          <Text style={styles.title}>내 신청내역</Text>
          <Text style={styles.subtitle}>내가 기다리고 있는 주거 기회를 한 곳에서 관리해요.</Text>
          <Pressable style={styles.filter}><Text style={styles.filterText}>전체 신청 {items.length}건</Text><Text style={styles.chevron}>⌄</Text></Pressable>
          {items.map((item) => <Pressable key={item.id} style={styles.card}><View style={[styles.icon, { backgroundColor: item.color }]}><Text style={styles.iconText}>{item.initials}</Text></View><View style={styles.cardBody}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.type}</Text><Text style={styles.cardMeta}>{item.area}</Text><View style={styles.bottom}><Text style={styles.rank}>{item.rank}번</Text><Text style={item.rank < item.previousRank ? styles.up : styles.same}>{item.rank < item.previousRank ? `↓ ${item.previousRank - item.rank}계단` : '변동 없음'}</Text><Text style={styles.updated}>{item.updatedAt}</Text></View></View><Text style={styles.arrow}>›</Text></Pressable>)}
          <View style={styles.tip}><Text style={styles.tipIcon}>✦</Text><View><Text style={styles.tipTitle}>신청 내역을 추가해보세요</Text><Text style={styles.tipText}>공고 URL을 등록하면 순번 변동을 놓치지 않아요.</Text></View></View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7f3' },
  safe: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 100 },
  eyebrow: { color: '#9aa9a1', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#243b34', fontSize: 29, fontWeight: '800', letterSpacing: -1.4, marginTop: 9 },
  subtitle: { color: '#8c9c94', fontSize: 12, marginTop: 7 },
  filter: { alignSelf: 'flex-start', flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#e4f3ec', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginTop: 23 },
  filterText: { color: '#4a9279', fontSize: 10, fontWeight: '800' },
  chevron: { color: '#6e9d8b', fontSize: 16, lineHeight: 11 },
  card: { backgroundColor: '#fff', borderColor: '#e4ece7', borderWidth: 1, borderRadius: 17, padding: 16, marginTop: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#5a947e', fontSize: 10, fontWeight: '800' },
  cardBody: { flex: 1 },
  cardTitle: { color: '#405149', fontSize: 12, fontWeight: '800' },
  cardMeta: { color: '#a1ada6', fontSize: 9, marginTop: 5 },
  bottom: { flexDirection: 'row', alignItems: 'center', marginTop: 13, gap: 7 },
  rank: { color: '#32765f', fontSize: 25, fontWeight: '800', letterSpacing: -1.5 },
  up: { color: '#4b9b81', backgroundColor: '#edf8f3', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 4, fontSize: 9 },
  same: { color: '#a8b1ab', backgroundColor: '#f2f4f2', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 4, fontSize: 8 },
  updated: { color: '#b0bab4', fontSize: 8, marginLeft: 'auto' },
  arrow: { color: '#9baba2', fontSize: 26, fontWeight: '300' },
  tip: { backgroundColor: '#f0f7ee', borderRadius: 15, padding: 15, flexDirection: 'row', gap: 10, marginTop: 19, alignItems: 'center' },
  tipIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#dcecdf', color: '#5a9d6d', textAlign: 'center', lineHeight: 28, fontSize: 15 },
  tipTitle: { color: '#527662', fontSize: 10, fontWeight: '800' },
  tipText: { color: '#809188', fontSize: 9, marginTop: 3 },
});
