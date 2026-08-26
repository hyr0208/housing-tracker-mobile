import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadAppData, type HousingApplication } from '@/data/storage';
import { useFocusEffect, useRouter } from 'expo-router';

export default function ApplicationsScreen() {
  const [items, setItems] = useState<HousingApplication[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showChangedOnly, setShowChangedOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HousingApplication>();
  const router = useRouter();

  const reload = useCallback(() => {
    loadAppData().then((data) => {
      setIsLoggedIn(Boolean(data.profile));
      setItems(data.applications);
    });
  }, []);

  useFocusEffect(reload);

  const visibleItems = showChangedOnly
    ? items.filter((item) => item.rank !== item.previousRank || item.syncStatus === 'error' || item.syncStatus === 'no_match')
    : items;

  if (!isLoggedIn) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.loginGate}>
            <Text style={styles.eyebrow}>MY APPLICATIONS</Text>
            <Text style={styles.title}>내 신청내역</Text>
            <Text style={styles.subtitle}>로그인하면 내 신청 정보와 순번 변동을 안전하게 관리할 수 있어요.</Text>
            <View style={styles.loginGateCard}>
              <Text style={styles.loginGateIcon}>♧</Text>
              <Text style={styles.loginGateTitle}>내 정보부터 연결해 주세요</Text>
              <Text style={styles.loginGateText}>카카오 로그인 후 신청 내역을 등록하고 알림을 받을 수 있어요.</Text>
              <Pressable style={styles.loginGateButton} onPress={() => router.replace('/')}>
                <Text style={styles.loginGateButtonText}>홈에서 로그인하기  →</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>MY APPLICATIONS</Text>
          <Text style={styles.title}>내 신청내역</Text>
          <Text style={styles.subtitle}>내가 기다리고 있는 주거 기회를 한 곳에서 관리해요.</Text>
          <Pressable style={[styles.filter, showChangedOnly && styles.filterActive]} onPress={() => setShowChangedOnly((value) => !value)}><Text style={styles.filterText}>{showChangedOnly ? `변동 있는 신청 ${visibleItems.length}건` : `전체 신청 ${items.length}건`}</Text><Text style={styles.chevron}>{showChangedOnly ? '×' : '⌄'}</Text></Pressable>
          {visibleItems.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>{showChangedOnly ? '변동된 신청이 없어요' : '아직 신청 내역이 없어요'}</Text><Text style={styles.emptyText}>{showChangedOnly ? '모든 신청 내역이 이전 확인과 동일해요.' : '홈에서 신청 내역을 추가하면 이곳에서 관리할 수 있어요.'}</Text></View> : visibleItems.map((item) => <Pressable key={item.id} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => setSelectedItem(item)}><View style={[styles.icon, { backgroundColor: item.color }]}><Text style={styles.iconText}>{item.initials}</Text></View><View style={styles.cardBody}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>{item.type}</Text><Text style={styles.cardMeta}>{item.area}</Text><View style={styles.bottom}><Text style={styles.rank}>{item.rank}번</Text><Text style={item.rank < item.previousRank ? styles.up : styles.same}>{item.rank < item.previousRank ? `↓ ${item.previousRank - item.rank}계단` : '변동 없음'}</Text><Text style={styles.updated}>{item.updatedAt}</Text></View></View><Text style={styles.arrow}>›</Text></Pressable>)}
          <Pressable style={({ pressed }) => [styles.tip, pressed && styles.cardPressed]} onPress={() => router.replace('/')}><Text style={styles.tipIcon}>✦</Text><View><Text style={styles.tipTitle}>신청 내역을 관리하려면</Text><Text style={styles.tipText}>홈으로 이동해 신청 내역을 추가하거나 수정할 수 있어요.</Text></View><Text style={styles.tipArrow}>›</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
      {selectedItem && <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedItem(undefined)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}><View><Text style={styles.eyebrow}>APPLICATION DETAIL</Text><Text style={styles.modalTitle}>신청 내역 상세</Text></View><Pressable onPress={() => setSelectedItem(undefined)}><Text style={styles.closeText}>×</Text></Pressable></View>
            <View style={styles.detailHero}><View style={[styles.detailIcon, { backgroundColor: selectedItem.color }]}><Text style={styles.iconText}>{selectedItem.initials}</Text></View><View style={styles.detailHeroCopy}><Text style={styles.detailTitle}>{selectedItem.title}</Text><Text style={styles.detailMeta}>{selectedItem.type} · {selectedItem.area}</Text></View></View>
            <View style={styles.detailRank}><View><Text style={styles.detailLabel}>현재 예비순번</Text><Text style={styles.detailRankNumber}>{selectedItem.rank}번</Text></View><Text style={selectedItem.rank < selectedItem.previousRank ? styles.up : styles.same}>{selectedItem.rank < selectedItem.previousRank ? `↓ ${selectedItem.previousRank - selectedItem.rank}계단` : '변동 없음'}</Text></View>
            <Text style={styles.detailLabel}>공개 대기현황</Text>
            {selectedItem.publicWaitBreakdown?.length ? <View style={styles.detailBreakdown}>{selectedItem.publicWaitBreakdown.map((item) => <View key={item.label} style={styles.detailBreakdownRow}><Text style={styles.detailBreakdownLabel}>{item.label}{selectedItem.housingType === item.label ? ' · 내 주택형' : ''}</Text><Text style={styles.detailBreakdownCount}>{item.count}명</Text></View>)}</View> : <Text style={styles.detailEmpty}>아직 공개 대기현황을 조회하지 않았어요.</Text>}
            {selectedItem.publicWaitUpdatedAt && <Text style={styles.detailUpdated}>마지막 확인 {new Date(selectedItem.publicWaitUpdatedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>}
            <Pressable style={styles.manageButton} onPress={() => { setSelectedItem(undefined); router.replace('/'); }}><Text style={styles.manageButtonText}>홈에서 수정·순번 관리하기  →</Text></Pressable>
          </View>
        </View>
      </Modal>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7f3' },
  safe: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 100 },
  loginGate: { paddingHorizontal: 22, paddingTop: 26 },
  loginGateCard: { marginTop: 30, padding: 22, borderRadius: 20, backgroundColor: '#e6f3ed', alignItems: 'center' },
  loginGateIcon: { color: '#4a9279', fontSize: 28 },
  loginGateTitle: { color: '#315b4c', fontSize: 17, fontWeight: '800', marginTop: 13 },
  loginGateText: { color: '#78968a', fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  loginGateButton: { width: '100%', height: 46, borderRadius: 11, backgroundColor: '#d8eee3', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  loginGateButtonText: { color: '#438d75', fontSize: 11, fontWeight: '800' },
  eyebrow: { color: '#9aa9a1', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#243b34', fontSize: 29, fontWeight: '800', letterSpacing: -1.4, marginTop: 9 },
  subtitle: { color: '#8c9c94', fontSize: 12, marginTop: 7 },
  filter: { alignSelf: 'flex-start', flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#e4f3ec', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginTop: 23 },
  filterText: { color: '#4a9279', fontSize: 10, fontWeight: '800' },
  chevron: { color: '#6e9d8b', fontSize: 16, lineHeight: 11 },
  card: { backgroundColor: '#fff', borderColor: '#e4ece7', borderWidth: 1, borderRadius: 17, padding: 16, marginTop: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
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
  filterActive: { backgroundColor: '#d6eee3' },
  emptyCard: { backgroundColor: '#fff', borderColor: '#e4ece7', borderWidth: 1, borderRadius: 17, padding: 25, marginTop: 12, alignItems: 'center' },
  emptyIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#e4f3ec', color: '#4a9279', textAlign: 'center', lineHeight: 35, fontSize: 18, fontWeight: '800' },
  emptyTitle: { color: '#527662', fontSize: 13, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#8aa097', fontSize: 10, textAlign: 'center', lineHeight: 16, marginTop: 6 },
  tip: { backgroundColor: '#f0f7ee', borderRadius: 15, padding: 15, flexDirection: 'row', gap: 10, marginTop: 19, alignItems: 'center' },
  tipIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#dcecdf', color: '#5a9d6d', textAlign: 'center', lineHeight: 28, fontSize: 15 },
  tipTitle: { color: '#527662', fontSize: 10, fontWeight: '800' },
  tipText: { color: '#809188', fontSize: 9, marginTop: 3 },
  tipArrow: { color: '#72a18d', fontSize: 24, marginLeft: 'auto' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(33, 55, 46, 0.28)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { color: '#29483d', fontSize: 21, fontWeight: '800', marginTop: 7 },
  closeText: { color: '#8c9b94', fontSize: 28, lineHeight: 28 },
  detailHero: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#edf2ee' },
  detailIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  detailHeroCopy: { flex: 1 },
  detailTitle: { color: '#405149', fontSize: 15, fontWeight: '800' },
  detailMeta: { color: '#9aa9a1', fontSize: 10, marginTop: 5 },
  detailRank: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 18 },
  detailLabel: { color: '#8c9c94', fontSize: 10, fontWeight: '800' },
  detailRankNumber: { color: '#2f8067', fontSize: 34, fontWeight: '800', marginTop: 4 },
  detailBreakdown: { backgroundColor: '#f5faf7', borderRadius: 12, marginTop: 9, paddingHorizontal: 13 },
  detailBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#e7f0ea' },
  detailBreakdownLabel: { color: '#557568', fontSize: 11, fontWeight: '700' },
  detailBreakdownCount: { color: '#347b65', fontSize: 12, fontWeight: '800' },
  detailEmpty: { color: '#9aa9a1', fontSize: 11, marginTop: 10 },
  detailUpdated: { color: '#a5b2aa', fontSize: 9, marginTop: 9 },
  manageButton: { height: 48, borderRadius: 12, backgroundColor: '#327e67', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  manageButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
