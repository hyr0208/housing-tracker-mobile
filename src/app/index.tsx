import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  ink: '#243b34',
  muted: '#8c9c94',
  line: '#e4ece7',
  green: '#3b987b',
  greenDark: '#286f5b',
  greenSoft: '#e1f2ea',
  canvas: '#f4f7f3',
  white: '#ffffff',
};

type Application = {
  id: number;
  title: string;
  type: string;
  area: string;
  rank: number;
  previousRank: number;
  color: string;
  initials: string;
};

const applications: Application[] = [
  { id: 1, title: '마곡나루 행복주택', type: '행복주택 · 16㎡', area: '서울 강서구', rank: 24, previousRank: 31, color: '#ddf1e8', initials: 'MN' },
  { id: 2, title: '고양삼송 A-11블록', type: '국민임대 · 36㎡', area: '경기 고양시', rank: 67, previousRank: 67, color: '#eae8f7', initials: 'GS' },
  { id: 3, title: '위례 A2-4블록', type: '청년 매입임대 · 24㎡', area: '서울 송파구', rank: 108, previousRank: 116, color: '#fbe9dc', initials: 'WR' },
];

const starterTasks = [
  { id: 1, title: '주민등록등본 발급하기', detail: '마곡나루 · 이번 주 금요일까지', done: false },
  { id: 2, title: '보증금 마련 계획 확인하기', detail: '순번 20번대 진입', done: false },
  { id: 3, title: '고양삼송 공고문 다시 확인하기', detail: '어제 추가 공지', done: true },
];

function Chevron({ direction = 'right' }: { direction?: 'right' | 'down' }) {
  return <Text style={direction === 'down' ? styles.chevronDown : styles.chevron}>›</Text>;
}

function HomeIllustration() {
  return (
    <View style={styles.illustration} pointerEvents="none">
      <View style={styles.sun} />
      <View style={styles.backHill} />
      <View style={styles.frontHill} />
      <View style={styles.house}>
        <View style={styles.roof} />
        <View style={styles.houseBody}>
          <View style={styles.window} />
          <View style={styles.door} />
        </View>
      </View>
      <View style={[styles.tree, { right: 31, bottom: 62 }]} />
      <View style={[styles.tree, { right: 59, bottom: 49, transform: [{ scale: 0.7 }] }]} />
      <View style={[styles.cloud, { right: 8, top: 52 }]} />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState(1);
  const [tasks, setTasks] = useState(starterTasks);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftRank, setDraftRank] = useState('');
  const selected = applications.find((item) => item.id === selectedId) ?? applications[0];
  const completed = tasks.filter((task) => task.done).length;
  const rankChange = selected.previousRank - selected.rank;

  const weekday = useMemo(() => {
    const date = new Date();
    return new Intl.DateTimeFormat('ko-KR', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
  }, []);

  const toggleTask = (id: number) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  };

  const saveApplication = () => {
    setDraftTitle('');
    setDraftRank('');
    setIsAddOpen(false);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 92 }}>
          <View style={styles.header}>
            <View style={styles.brandLine}>
              <View style={styles.logo}><View style={styles.logoDot} /></View>
              <Text style={styles.brand}>내 차례</Text>
            </View>
            <Pressable style={styles.notification} accessibilityLabel="알림">
              <Text style={styles.bell}>♧</Text>
              <View style={styles.notificationDot} />
            </Pressable>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.dateLabel}>{weekday.toUpperCase()}</Text>
            <Text style={styles.greeting}>좋은 아침이에요, 서연님 <Text style={styles.star}>✦</Text></Text>
            <Text style={styles.greetingSub}>오늘도 내 차례에 한 걸음 가까워지고 있어요.</Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.liveText}>가장 가까운 내 차례</Text></View>
              <Text style={styles.heroTitle}>{selected.title}</Text>
              <Text style={styles.heroMeta}>{selected.type}  ·  {selected.area}</Text>
              <Text style={styles.rankLabel}>현재 예비순번</Text>
              <View style={styles.rankLine}><Text style={styles.heroRank}>{selected.rank}<Text style={styles.rankUnit}>번</Text></Text><View style={styles.changeBox}><Text style={styles.changeText}>↓ {rankChange}계단</Text><Text style={styles.changeLabel}>지난 확인 대비</Text></View></View>
              <Pressable style={styles.detailButton}><Text style={styles.detailText}>상세 현황 보기  →</Text></Pressable>
            </View>
            <HomeIllustration />
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressTop}><View><Text style={styles.cardEyebrow}>MY PROGRESS</Text><Text style={styles.cardTitle}>입주 준비도</Text></View><Text style={styles.progressPercent}>68%</Text></View>
            <View style={styles.progressRow}><View style={styles.progressRing}><View style={styles.ringInner}><Text style={styles.ringNumber}>3/5</Text><Text style={styles.ringLabel}>단계 완료</Text></View></View><View style={styles.progressCopy}><Text style={styles.progressStrong}>잘하고 있어요!</Text><Text style={styles.progressSub}>서류 준비를 마치면{`\n`}거의 다 왔어요.</Text><Pressable><Text style={styles.checklistLink}>체크리스트 열기  →</Text></Pressable></View></View>
          </View>

          <View style={styles.sectionHeader}><View><Text style={styles.cardEyebrow}>MY APPLICATIONS</Text><Text style={styles.sectionTitle}>내 신청 현황 <Text style={styles.countPill}>3</Text></Text></View><Pressable onPress={() => setIsAddOpen(true)} style={styles.addSmall}><Text style={styles.addSmallText}>＋ 추가</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.applicationList}>
            {applications.map((item) => <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.applicationCard, selectedId === item.id && styles.applicationSelected]}><View style={[styles.appIcon, { backgroundColor: item.color }]}><Text style={styles.appInitials}>{item.initials}</Text></View><Text style={styles.appTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.appMeta}>{item.type}</Text><View style={styles.appRankLine}><Text style={styles.appRank}>{item.rank}<Text style={styles.appRankUnit}>번</Text></Text>{item.rank !== item.previousRank ? <Text style={styles.upTag}>↓ {item.previousRank - item.rank}</Text> : <Text style={styles.sameTag}>변동 없음</Text>}</View></Pressable>)}
          </ScrollView>

          <View style={styles.lowerHeader}><View><Text style={styles.cardEyebrow}>NEXT STEPS</Text><Text style={styles.sectionTitle}>준비할 일 <Text style={styles.taskCount}>{completed}/{tasks.length}</Text></Text></View><Pressable onPress={() => setTasks((current) => [...current, { id: Date.now(), title: '이사 예상 비용 계산하기', detail: '전체 신청 · 아직 시작하지 않음', done: false }])}><Text style={styles.moreText}>할 일 추가  ＋</Text></Pressable></View>
          <View style={styles.taskCard}>{tasks.map((task) => <Pressable key={task.id} onPress={() => toggleTask(task.id)} style={styles.taskRow}><View style={[styles.checkbox, task.done && styles.checkboxDone]}>{task.done && <Text style={styles.checkMark}>✓</Text>}</View><View style={styles.taskText}><Text style={[styles.taskTitle, task.done && styles.taskDone]}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text></View>{!task.done && task.id === 1 && <View style={styles.urgentDot} />}</Pressable>)}</View>

          <View style={styles.tipBanner}><View style={styles.tipCircle}><Text style={styles.tipSpark}>✦</Text></View><View style={{ flex: 1 }}><Text style={styles.tipTitle}>이번 주의 팁</Text><Text style={styles.tipBody}>순번이 20번대라면 서류를 미리 준비해두세요.</Text></View><Chevron /></View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={isAddOpen} transparent animationType="slide" onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.cardEyebrow}>NEW APPLICATION</Text><Text style={styles.modalTitle}>신청 내역 추가</Text></View><Pressable onPress={() => setIsAddOpen(false)}><Text style={styles.closeText}>×</Text></Pressable></View><Text style={styles.modalCopy}>공고 정보를 등록하면 순번과 일정을 한 곳에서 관리할 수 있어요.</Text><Text style={styles.inputLabel}>공고명</Text><TextInput value={draftTitle} onChangeText={setDraftTitle} placeholder="예: 마곡나루 행복주택" placeholderTextColor="#a9b4ae" style={styles.input} /><Text style={styles.inputLabel}>현재 예비순번</Text><TextInput value={draftRank} onChangeText={setDraftRank} keyboardType="number-pad" placeholder="예: 120" placeholderTextColor="#a9b4ae" style={styles.input} /><Pressable style={styles.saveButton} onPress={saveApplication}><Text style={styles.saveButtonText}>신청 내역 저장하기  →</Text></Pressable></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  safeArea: { flex: 1 },
  header: { height: 62, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 27, height: 27, borderRadius: 9, backgroundColor: '#4ba989', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-7deg' }] },
  logoDot: { width: 9, height: 9, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  brand: { color: COLORS.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.7 },
  notification: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  bell: { color: '#6e8178', fontSize: 20, transform: [{ rotate: '180deg' }] },
  notificationDot: { position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 4, backgroundColor: '#ee9575', borderWidth: 1.5, borderColor: '#fff' },
  greetingBlock: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 23 },
  dateLabel: { color: '#9aa9a1', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  greeting: { color: COLORS.ink, fontSize: 27, fontWeight: '800', letterSpacing: -1.5, marginTop: 9 },
  star: { color: '#ecad69', fontSize: 19 },
  greetingSub: { color: COLORS.muted, fontSize: 12, marginTop: 7 },
  heroCard: { height: 296, marginHorizontal: 16, borderRadius: 23, backgroundColor: '#def0e8', overflow: 'hidden', position: 'relative' },
  heroContent: { padding: 24, zIndex: 2 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ba989' },
  liveText: { color: '#498e76', fontSize: 10, fontWeight: '800' },
  heroTitle: { color: '#285645', fontSize: 22, fontWeight: '800', letterSpacing: -1, marginTop: 12 },
  heroMeta: { color: '#72a391', fontSize: 10, marginTop: 5 },
  rankLabel: { color: '#73a28f', fontSize: 9, marginTop: 19 },
  rankLine: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 5 },
  heroRank: { color: '#246b57', fontSize: 52, fontWeight: '800', letterSpacing: -5, lineHeight: 57 },
  rankUnit: { fontSize: 14, letterSpacing: 0 },
  changeBox: { marginBottom: 4 },
  changeText: { color: '#428b72', backgroundColor: '#c8e8db', overflow: 'hidden', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4, fontSize: 10, fontWeight: '600' },
  changeLabel: { color: '#75a794', fontSize: 8, marginTop: 5 },
  detailButton: { marginTop: 15 },
  detailText: { color: '#38856d', fontSize: 10, fontWeight: '800' },
  illustration: { position: 'absolute', right: 0, bottom: 0, width: '52%', height: '69%' },
  sun: { position: 'absolute', width: 82, height: 82, borderRadius: 50, backgroundColor: '#f8d39c', right: 27, top: 2 },
  backHill: { position: 'absolute', width: 210, height: 105, borderRadius: 120, backgroundColor: '#a8d2b7', right: -46, bottom: -32, transform: [{ rotate: '-10deg' }] },
  frontHill: { position: 'absolute', width: 230, height: 83, borderRadius: 120, backgroundColor: '#78b993', right: -58, bottom: -32, transform: [{ rotate: '12deg' }] },
  house: { position: 'absolute', right: 84, bottom: 25, width: 88 },
  roof: { width: 93, height: 31, backgroundColor: '#d68762', borderTopLeftRadius: 48, borderTopRightRadius: 48, transform: [{ skewX: '-18deg' }] },
  houseBody: { width: 68, height: 58, backgroundColor: '#fff1d9', alignSelf: 'center', position: 'relative' },
  window: { position: 'absolute', left: 10, top: 13, width: 20, height: 19, backgroundColor: '#9dd1cb', borderWidth: 3, borderColor: '#fff8e9' },
  door: { position: 'absolute', right: 10, bottom: 0, width: 18, height: 32, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: '#8cbe9b' },
  tree: { position: 'absolute', width: 25, height: 25, borderRadius: 20, backgroundColor: '#4d9977' },
  cloud: { position: 'absolute', width: 33, height: 10, borderRadius: 8, backgroundColor: '#f2faed', opacity: 0.8 },
  progressCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.line },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardEyebrow: { color: '#9aa9a1', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  cardTitle: { color: '#33463e', fontSize: 17, fontWeight: '800', letterSpacing: -0.7, marginTop: 5 },
  progressPercent: { color: '#4c9d82', fontSize: 20, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 17 },
  progressRing: { width: 111, height: 111, borderRadius: 60, borderWidth: 9, borderColor: '#eaf2ed', borderTopColor: '#65b397', borderRightColor: '#65b397', transform: [{ rotate: '25deg' }], justifyContent: 'center', alignItems: 'center' },
  ringInner: { transform: [{ rotate: '-25deg' }], alignItems: 'center' },
  ringNumber: { color: '#347e67', fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  ringLabel: { color: '#9aa8a1', fontSize: 9, marginTop: 2 },
  progressCopy: { flex: 1 },
  progressStrong: { color: '#5e927d', fontSize: 12, fontWeight: '800' },
  progressSub: { color: '#9ba8a1', fontSize: 10, lineHeight: 16, marginTop: 4 },
  checklistLink: { color: '#4b987e', fontSize: 10, fontWeight: '800', marginTop: 12 },
  sectionHeader: { marginTop: 32, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle: { color: '#30433b', fontSize: 19, fontWeight: '800', letterSpacing: -0.8, marginTop: 7 },
  countPill: { color: '#64a78d', backgroundColor: '#e3f2eb', fontSize: 10, fontWeight: '500', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  addSmall: { backgroundColor: '#e4f3ec', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  addSmallText: { color: '#438d75', fontSize: 10, fontWeight: '800' },
  applicationList: { gap: 10, paddingHorizontal: 22, paddingVertical: 16 },
  applicationCard: { width: 174, backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: COLORS.line, padding: 13 },
  applicationSelected: { borderColor: '#8fcab3', borderWidth: 2, padding: 12 },
  appIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  appInitials: { color: '#5a947e', fontSize: 10, fontWeight: '700' },
  appTitle: { color: '#405149', fontSize: 11, fontWeight: '800', marginTop: 11 },
  appMeta: { color: '#a1ada6', fontSize: 9, marginTop: 5 },
  appRankLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  appRank: { color: '#32765f', fontSize: 25, fontWeight: '800', letterSpacing: -2 },
  appRankUnit: { fontSize: 9, letterSpacing: 0 },
  upTag: { color: '#4b9b81', backgroundColor: '#edf8f3', fontSize: 9, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  sameTag: { color: '#a8b1ab', backgroundColor: '#f2f4f2', fontSize: 8, paddingHorizontal: 4, paddingVertical: 3, borderRadius: 4 },
  lowerHeader: { marginTop: 9, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  taskCount: { color: '#6aa68e', fontSize: 11, fontWeight: '500', marginLeft: 4 },
  moreText: { color: '#6a9b87', fontSize: 10, fontWeight: '800', paddingBottom: 3 },
  taskCard: { marginHorizontal: 16, marginTop: 15, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16 },
  taskRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#eff3f0' },
  checkbox: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, borderColor: '#cbd9d0', alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: '#70b59b', borderColor: '#70b59b' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  taskText: { flex: 1 },
  taskTitle: { color: '#55645d', fontSize: 11, fontWeight: '700' },
  taskDone: { color: '#aeb7b1', textDecorationLine: 'line-through' },
  taskDetail: { color: '#a7b1ab', fontSize: 9, marginTop: 4 },
  urgentDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#ee9a75' },
  tipBanner: { marginHorizontal: 16, marginTop: 18, backgroundColor: '#f0f7ee', borderRadius: 15, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipCircle: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#dcecdf', alignItems: 'center', justifyContent: 'center' },
  tipSpark: { color: '#5a9d6d', fontSize: 15 },
  tipTitle: { color: '#527662', fontSize: 10, fontWeight: '800' },
  tipBody: { color: '#809188', fontSize: 9, marginTop: 3 },
  chevron: { color: '#89a494', fontSize: 24, fontWeight: '300' },
  chevronDown: { color: '#89a494', fontSize: 17 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#203b3088' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: COLORS.ink, fontSize: 23, fontWeight: '800', letterSpacing: -1, marginTop: 7 },
  closeText: { color: '#93a099', fontSize: 28, lineHeight: 28 },
  modalCopy: { color: '#8f9e96', fontSize: 11, lineHeight: 18, marginTop: 14, marginBottom: 12 },
  inputLabel: { color: '#61736a', fontSize: 10, fontWeight: '800', marginTop: 13 },
  input: { height: 44, backgroundColor: '#fbfcfb', borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12, color: '#52635b', fontSize: 12, marginTop: 7 },
  saveButton: { height: 47, borderRadius: 11, backgroundColor: '#327e67', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  saveButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
