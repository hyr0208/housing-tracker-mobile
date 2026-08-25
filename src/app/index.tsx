import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  defaultAppData,
  loadAppData,
  makeNotification,
  saveAppData,
  type AppData,
  type AppNotification,
  type HousingApplication,
} from '@/data/storage';
import { syncPublicWait } from '@/services/public-sync';
import { prepareNotifications } from '@/services/notifications';
import { clearKakaoSession, loginWithKakao } from '@/services/kakao-auth';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const [data, setData] = useState<AppData>(defaultAppData);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [isReady, setIsReady] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRankOpen, setIsRankOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftRank, setDraftRank] = useState('');
  const [draftComplexName, setDraftComplexName] = useState('');
  const [draftArea, setDraftArea] = useState('');
  const [draftProfileName, setDraftProfileName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const pushTokenRef = useRef<string | undefined>(undefined);
  const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY || '';
  const applications = data.applications;
  const tasks = data.tasks;
  const isLoggedIn = Boolean(data.profile);
  const selected = applications.find((item) => item.id === selectedId) ?? applications[0];
  const profileName = data.profileName?.trim() || '';
  const completed = tasks.filter((task) => task.done).length;
  const progressPercent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const rankChange = selected ? selected.previousRank - selected.rank : 0;

  useEffect(() => {
    loadAppData().then((stored) => {
      setData(stored);
      setSelectedId(stored.applications[0]?.id);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    prepareNotifications().then((token) => {
      if (!active || !token) return;
      pushTokenRef.current = token;
      setData((current) => {
        if (current.pushToken === token) return current;
        const next = { ...current, pushToken: token };
        void saveAppData(next);
        return next;
      });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [isReady]);

  const handleKakaoLogin = async () => {
    if (!kakaoNativeAppKey) {
      Alert.alert('카카오 키가 필요해요', '.env에 EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY를 입력해주세요.');
      return;
    }
    setIsKakaoLoading(true);
    try {
      const profile = await loginWithKakao();
      updateData({ ...data, profile: { provider: 'kakao', id: profile.id, nickname: profile.nickname, loggedInAt: new Date().toISOString() }, profileName: profile.nickname });
      setDraftProfileName(profile.nickname);
      Alert.alert('로그인 완료', `${profile.nickname}님, 환영해요.`);
    } catch (error) {
      Alert.alert('카카오 로그인 실패', error instanceof Error ? error.message : '로그인 중 오류가 발생했어요.');
    } finally {
      setIsKakaoLoading(false);
    }
  };

  const weekday = useMemo(() => {
    const date = new Date();
    return new Intl.DateTimeFormat('ko-KR', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
  }, []);

  const updateData = (next: AppData) => {
    setData(next);
    void saveAppData(next);
  };

  const runPublicSync = async (application: HousingApplication, token = pushTokenRef.current) => {
    setIsSyncing(true);
    const result = await syncPublicWait(application, token);
    setIsSyncing(false);
    if (!result) return;

    const updated = { ...application, syncStatus: result.status, publicWaitCount: result.publicWaitCount, publicWaitPreviousCount: result.previousWaitCount, publicWaitUpdatedAt: result.checkedAt, updatedAt: '방금 전' };
    let changeNotification: AppNotification | undefined;
    if (result.changed && typeof result.publicWaitCount === 'number' && typeof result.previousWaitCount === 'number') {
      const title = `${application.complexName} 공개 대기현황 변동`;
      const body = `대기인원이 ${result.previousWaitCount}명에서 ${result.publicWaitCount}명으로 변경됐어요.`;
      changeNotification = makeNotification(title, body);
      try {
        const permissions = await Notifications.getPermissionsAsync();
        if (permissions.status !== 'granted') await Notifications.requestPermissionsAsync();
        await Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default' }, trigger: null });
      } catch {
        // 알림 권한이 없어도 앱 안의 알림 센터에는 기록합니다.
      }
    }
    setData((current) => {
      const next = {
        ...current,
        applications: current.applications.map((item) => item.id === application.id ? updated : item),
        notifications: changeNotification ? [changeNotification, ...current.notifications] : current.notifications,
      };
      void saveAppData(next);
      return next;
    });
  };

  useEffect(() => {
    if (isReady && isLoggedIn && selected) void runPublicSync(selected);
  }, [isReady, isLoggedIn, selectedId]);

  const toggleTask = (id: string) => {
    updateData({ ...data, tasks: tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) });
  };

  const saveApplication = () => {
    if (!isLoggedIn) {
      setIsProfileOpen(true);
      return;
    }
    const title = draftTitle.trim();
    const rank = Number(draftRank);
    if (!title || !Number.isFinite(rank) || rank < 1) return;
    const now = new Date().toISOString().slice(0, 10);
    const complexName = draftComplexName.trim() || title;
    const area = draftArea.trim() || '지역 미등록';
    const brtcCode = area.startsWith('서울') ? '11' : area.startsWith('부산') ? '26' : area.startsWith('대구') ? '27' : area.startsWith('인천') ? '28' : area.startsWith('광주') ? '29' : area.startsWith('대전') ? '30' : area.startsWith('울산') ? '31' : area.startsWith('세종') ? '36' : area.startsWith('경기') ? '41' : area.startsWith('강원') ? '42' : area.startsWith('충북') ? '43' : area.startsWith('충남') ? '44' : area.startsWith('전북') ? '45' : area.startsWith('전남') ? '46' : area.startsWith('경북') ? '47' : area.startsWith('경남') ? '48' : area.startsWith('제주') ? '50' : undefined;
    const newApplication: HousingApplication = {
      id: `application-${Date.now()}`,
      title,
      type: '행복주택 · 미등록 면적',
      area,
      rank,
      previousRank: rank,
      color: '#e4f1ec',
      initials: title.replace(/\s/g, '').slice(0, 2).toUpperCase(),
      updatedAt: '방금 전',
      history: [{ rank, recordedAt: now }],
      complexName,
      brtcCode,
    };
    const next = { ...data, applications: [...applications, newApplication], notifications: [makeNotification('신청 내역을 저장했어요', `${title} ${rank}번을 기록했습니다.`), ...data.notifications] };
    updateData(next);
    setSelectedId(newApplication.id);
    setDraftTitle('');
    setDraftRank('');
    setDraftComplexName('');
    setDraftArea('');
    setIsAddOpen(false);
  };

  const saveRank = () => {
    if (!selected) return;
    const nextRank = Number(draftRank);
    if (!Number.isFinite(nextRank) || nextRank < 1) return;
    const moved = selected.rank - nextRank;
    const updated: HousingApplication = { ...selected, previousRank: selected.rank, rank: nextRank, updatedAt: '방금 전', history: [...selected.history, { rank: nextRank, recordedAt: new Date().toISOString().slice(0, 10) }] };
    const notification = moved > 0 ? makeNotification(`${selected.title} 순번이 상승했어요`, `${selected.rank}번에서 ${nextRank}번으로 ${moved}계단 가까워졌어요.`) : makeNotification(`${selected.title} 순번을 기록했어요`, `현재 순번은 ${nextRank}번입니다.`);
    updateData({ ...data, applications: applications.map((item) => item.id === selected.id ? updated : item), notifications: [notification, ...data.notifications] });
    setDraftRank('');
    setIsRankOpen(false);
  };

  if (!isReady) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 92 }}>
          <View style={styles.header}>
            <View style={styles.brandLine}>
              <View style={styles.logo}><View style={styles.logoDot} /></View>
              <Text style={styles.brand}>내 차례</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.profileButton} accessibilityLabel="내 정보" onPress={() => { setDraftProfileName(data.profile?.nickname ?? data.profileName ?? ''); setIsProfileOpen(true); }}>
                <Text style={styles.profileInitial}>{profileName ? profileName.slice(0, 1) : '내'}</Text>
              </Pressable>
              <Pressable style={styles.notification} accessibilityLabel="알림" onPress={() => isLoggedIn ? setIsNotificationOpen(true) : setIsProfileOpen(true)}>
                <Text style={styles.bell}>♧</Text>
                {isLoggedIn && data.notifications.some((item) => !item.read) && <View style={styles.notificationDot} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.dateLabel}>{weekday.toUpperCase()}</Text>
            <Text style={styles.greeting}>좋은 아침이에요{profileName ? `, ${profileName}님` : ''} <Text style={styles.star}>✦</Text></Text>
            <Text style={styles.greetingSub}>오늘도 내 차례에 한 걸음 가까워지고 있어요.</Text>
          </View>

          {isLoggedIn && selected ? <>
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.liveText}>가장 가까운 내 차례</Text></View>
              <Text style={styles.heroTitle}>{selected.title}</Text>
              <Text style={styles.heroMeta}>{selected.type}  ·  {selected.area}</Text>
              <Text style={styles.rankLabel}>현재 예비순번</Text>
              <View style={styles.rankLine}><Text style={styles.heroRank}>{selected.rank}<Text style={styles.rankUnit}>번</Text></Text><View style={styles.changeBox}><Text style={styles.changeText}>↓ {rankChange}계단</Text><Text style={styles.changeLabel}>지난 확인 대비</Text></View></View>
              <Pressable style={styles.detailButton} onPress={() => { setDraftRank(String(selected.rank)); setIsRankOpen(true); }}><Text style={styles.detailText}>순번 업데이트  →</Text></Pressable>
            </View>
            <HomeIllustration />
          </View>

          <View style={styles.publicCard}>
            <View style={styles.publicCopy}>
              <Text style={styles.cardEyebrow}>PUBLIC WAITING STATUS</Text>
              <Text style={styles.publicTitle}>공개 대기현황</Text>
              <Text style={styles.publicSub}>{selected.syncStatus === 'no_match' ? '단지명을 공식 표기와 맞춰주세요.' : selected.syncStatus === 'error' ? '서버 연결을 확인해주세요.' : selected.publicWaitCount !== undefined ? `현재 공개 대기인원 ${selected.publicWaitCount}명` : '자동 조회를 준비하고 있어요.'}</Text>
              {selected.syncStatus === 'synced' && <Text style={styles.autoSyncText}>● 서버가 주기적으로 확인해요</Text>}
              {selected.publicWaitUpdatedAt && <Text style={styles.publicTime}>마지막 확인 {new Date(selected.publicWaitUpdatedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>}
            </View>
            <Pressable style={styles.syncButton} onPress={() => void runPublicSync(selected)} disabled={isSyncing}><Text style={styles.syncButtonText}>{isSyncing ? '확인 중' : '지금 확인'}</Text></Pressable>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressTop}><View><Text style={styles.cardEyebrow}>MY PROGRESS</Text><Text style={styles.cardTitle}>입주 준비도</Text></View><Text style={styles.progressPercent}>{progressPercent}%</Text></View>
            <View style={styles.progressRow}><View style={styles.progressRing}><View style={styles.ringInner}><Text style={styles.ringNumber}>{completed}/{tasks.length}</Text><Text style={styles.ringLabel}>단계 완료</Text></View></View><View style={styles.progressCopy}><Text style={styles.progressStrong}>{tasks.length ? '잘하고 있어요!' : '준비할 일을 추가해보세요'}</Text><Text style={styles.progressSub}>{tasks.length ? <>서류 준비를 마치면{`\n`}거의 다 왔어요.</> : '신청 내역에 맞는 체크리스트를 만들어보세요.'}</Text><Pressable><Text style={styles.checklistLink}>체크리스트 열기  →</Text></Pressable></View></View>
          </View>

          <View style={styles.sectionHeader}><View><Text style={styles.cardEyebrow}>MY APPLICATIONS</Text><Text style={styles.sectionTitle}>내 신청 현황 <Text style={styles.countPill}>{applications.length}</Text></Text></View><Pressable onPress={() => setIsAddOpen(true)} style={styles.addSmall}><Text style={styles.addSmallText}>＋ 추가</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.applicationList}>
            {applications.map((item) => <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.applicationCard, selectedId === item.id && styles.applicationSelected]}><View style={[styles.appIcon, { backgroundColor: item.color }]}><Text style={styles.appInitials}>{item.initials}</Text></View><Text style={styles.appTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.appMeta}>{item.type}</Text><View style={styles.appRankLine}><Text style={styles.appRank}>{item.rank}<Text style={styles.appRankUnit}>번</Text></Text>{item.rank !== item.previousRank ? <Text style={styles.upTag}>↓ {item.previousRank - item.rank}</Text> : <Text style={styles.sameTag}>변동 없음</Text>}</View><Text style={styles.appUpdated}>{item.updatedAt}</Text></Pressable>)}
          </ScrollView>

          <View style={styles.lowerHeader}><View><Text style={styles.cardEyebrow}>NEXT STEPS</Text><Text style={styles.sectionTitle}>준비할 일 <Text style={styles.taskCount}>{completed}/{tasks.length}</Text></Text></View><Pressable onPress={() => updateData({ ...data, tasks: [...tasks, { id: `task-${Date.now()}`, title: '이사 예상 비용 계산하기', detail: '전체 신청 · 아직 시작하지 않음', done: false }] })}><Text style={styles.moreText}>할 일 추가  ＋</Text></Pressable></View>
          <View style={styles.taskCard}>{tasks.map((task) => <Pressable key={task.id} onPress={() => toggleTask(task.id)} style={styles.taskRow}><View style={[styles.checkbox, task.done && styles.checkboxDone]}>{task.done && <Text style={styles.checkMark}>✓</Text>}</View><View style={styles.taskText}><Text style={[styles.taskTitle, task.done && styles.taskDone]}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text></View></Pressable>)}</View>

          <View style={styles.tipBanner}><View style={styles.tipCircle}><Text style={styles.tipSpark}>✦</Text></View><View style={{ flex: 1 }}><Text style={styles.tipTitle}>이번 주의 팁</Text><Text style={styles.tipBody}>순번이 20번대라면 서류를 미리 준비해두세요.</Text></View><Chevron /></View>
          </> : <View style={styles.guestCard}>
            <View style={styles.guestIcon}><Text style={styles.guestIconText}>♧</Text></View>
            <Text style={styles.guestTitle}>{isLoggedIn ? '신청 내역을 추가해보세요' : '내 신청을 안전하게 관리해요'}</Text>
            <Text style={styles.guestBody}>{isLoggedIn ? '공고명과 예비순번을 등록하면 변동 알림을 받을 수 있어요.' : '카카오 로그인 후 예비순번과 신청 정보를 등록하면 변동 알림을 받을 수 있어요.'}</Text>
            <Pressable style={styles.guestButton} onPress={() => isLoggedIn ? setIsAddOpen(true) : setIsProfileOpen(true)}><Text style={styles.guestButtonText}>{isLoggedIn ? '신청 내역 추가하기  →' : '카카오로 로그인하기  →'}</Text></Pressable>
          </View>}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={isAddOpen} transparent animationType="slide" onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.cardEyebrow}>NEW APPLICATION</Text><Text style={styles.modalTitle}>신청 내역 추가</Text></View><Pressable onPress={() => setIsAddOpen(false)}><Text style={styles.closeText}>×</Text></Pressable></View><Text style={styles.modalCopy}>공고 정보를 등록하면 순번과 공개 대기현황을 한 곳에서 관리할 수 있어요.</Text><Text style={styles.inputLabel}>공고명</Text><TextInput value={draftTitle} onChangeText={setDraftTitle} placeholder="예: 행복주택 공고명" placeholderTextColor="#a9b4ae" style={styles.input} /><Text style={styles.inputLabel}>공식 단지명</Text><TextInput value={draftComplexName} onChangeText={setDraftComplexName} placeholder="예: 단지 공식 명칭" placeholderTextColor="#a9b4ae" style={styles.input} /><Text style={styles.inputLabel}>지역</Text><TextInput value={draftArea} onChangeText={setDraftArea} placeholder="예: 서울 강서구" placeholderTextColor="#a9b4ae" style={styles.input} /><Text style={styles.inputLabel}>현재 예비순번</Text><TextInput value={draftRank} onChangeText={setDraftRank} keyboardType="number-pad" placeholder="예: 120" placeholderTextColor="#a9b4ae" style={styles.input} /><Pressable style={styles.saveButton} onPress={saveApplication}><Text style={styles.saveButtonText}>신청 내역 저장하기  →</Text></Pressable></View></View>
      </Modal>

      {selected && <Modal visible={isRankOpen} transparent animationType="slide" onRequestClose={() => setIsRankOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.cardEyebrow}>UPDATE RANK</Text><Text style={styles.modalTitle}>현재 순번 기록</Text></View><Pressable onPress={() => setIsRankOpen(false)}><Text style={styles.closeText}>×</Text></Pressable></View><Text style={styles.modalCopy}>{selected.title}의 공고문이나 대기현황에서 확인한 최신 순번을 입력하세요.</Text><Text style={styles.inputLabel}>현재 예비순번</Text><TextInput value={draftRank} onChangeText={setDraftRank} keyboardType="number-pad" placeholder="예: 24" placeholderTextColor="#a9b4ae" style={styles.input} autoFocus /><Text style={styles.historyTitle}>최근 순번 이력</Text><View style={styles.historyList}>{selected.history.slice(-3).reverse().map((snapshot) => <View key={`${snapshot.recordedAt}-${snapshot.rank}`} style={styles.historyRow}><Text style={styles.historyDate}>{snapshot.recordedAt}</Text><Text style={styles.historyRank}>{snapshot.rank}번</Text></View>)}</View><Pressable style={styles.saveButton} onPress={saveRank}><Text style={styles.saveButtonText}>순번 업데이트 저장  →</Text></Pressable></View></View>
      </Modal>}

      <Modal visible={isNotificationOpen} transparent animationType="slide" onRequestClose={() => setIsNotificationOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.cardEyebrow}>NOTIFICATIONS</Text><Text style={styles.modalTitle}>알림 센터</Text></View><Pressable onPress={() => setIsNotificationOpen(false)}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView style={styles.notificationList}>{data.notifications.length === 0 ? <Text style={styles.emptyText}>아직 알림이 없어요.</Text> : data.notifications.map((item) => <View key={item.id} style={styles.notificationRow}><View style={styles.notificationIcon}><Text style={styles.tipSpark}>✦</Text></View><View style={styles.notificationCopy}><Text style={styles.notificationTitle}>{item.title}</Text><Text style={styles.notificationBody}>{item.body}</Text><Text style={styles.notificationTime}>{item.createdAt}</Text></View></View>)}</ScrollView><Pressable style={styles.saveButton} onPress={() => { updateData({ ...data, notifications: data.notifications.map((item) => ({ ...item, read: true })) }); setIsNotificationOpen(false); }}><Text style={styles.saveButtonText}>모두 읽음 처리</Text></Pressable></View></View>
      </Modal>

      <Modal visible={isProfileOpen} transparent animationType="slide" onRequestClose={() => setIsProfileOpen(false)}>
                <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.cardEyebrow}>MY PROFILE</Text><Text style={styles.modalTitle}>내 정보</Text></View><Pressable onPress={() => setIsProfileOpen(false)}><Text style={styles.closeText}>×</Text></Pressable></View>{data.profile ? <><Text style={styles.loggedInLabel}>카카오로 로그인됨</Text><Text style={styles.loggedInName}>{data.profile.nickname}</Text><Text style={styles.modalCopy}>신청 내역과 알림 설정을 이 계정에 연결할 수 있어요.</Text><Pressable style={styles.outlineButton} onPress={() => { void clearKakaoSession(); updateData({ ...data, profile: undefined, profileName: undefined }); setIsProfileOpen(false); }}><Text style={styles.outlineButtonText}>로그아웃</Text></Pressable></> : <><Text style={styles.modalCopy}>카카오로 로그인하면 이 앱에서 사용하는 이름과 신청 내역을 계정에 연결할 수 있어요.</Text><Pressable style={styles.kakaoButton} disabled={!kakaoNativeAppKey || isKakaoLoading} onPress={() => void handleKakaoLogin()}><Text style={styles.kakaoButtonText}>{isKakaoLoading ? '로그인 중…' : '카카오로 로그인'}</Text></Pressable><Text style={styles.loginHint}>아직 키가 없으면 아래에서 이름만 저장해도 돼요.</Text><Text style={styles.inputLabel}>이름</Text><TextInput value={draftProfileName} onChangeText={setDraftProfileName} placeholder="예: 민지" placeholderTextColor="#a9b4ae" style={styles.input} /><Pressable style={styles.saveButton} onPress={() => { const name = draftProfileName.trim(); if (!name) return; updateData({ ...data, profileName: name }); setIsProfileOpen(false); }}><Text style={styles.saveButtonText}>이름만 저장하기</Text></Pressable></>}</View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  safeArea: { flex: 1 },
  header: { height: 62, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 27, height: 27, borderRadius: 9, backgroundColor: '#4ba989', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-7deg' }] },
  logoDot: { width: 9, height: 9, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  brand: { color: COLORS.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.7 },
  notification: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  profileButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dfeee7', justifyContent: 'center', alignItems: 'center' },
  profileInitial: { color: '#3b8068', fontSize: 14, fontWeight: '800' },
  loggedInLabel: { color: '#4b987e', fontSize: 11, fontWeight: '800', marginTop: 22 },
  loggedInName: { color: COLORS.ink, fontSize: 24, fontWeight: '800', marginTop: 8 },
  kakaoButton: { height: 47, borderRadius: 11, backgroundColor: '#FEE500', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  kakaoButtonText: { color: '#191919', fontSize: 12, fontWeight: '800' },
  loginHint: { color: '#a0aca5', fontSize: 9, textAlign: 'center', marginTop: 10 },
  outlineButton: { height: 47, borderRadius: 11, borderWidth: 1, borderColor: '#dbe8e0', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  outlineButtonText: { color: '#568a75', fontSize: 12, fontWeight: '800' },
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
  rankLine: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 5 },
  heroRank: { color: '#246b57', fontSize: 50, fontWeight: '800', letterSpacing: -5, lineHeight: 57, minWidth: 72 },
  rankUnit: { fontSize: 14, letterSpacing: 0 },
  changeBox: { marginTop: 8, marginLeft: 2 },
  changeText: { color: '#428b72', backgroundColor: '#c8e8db', overflow: 'hidden', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4, fontSize: 10, fontWeight: '600' },
  changeLabel: { color: '#75a794', fontSize: 8, marginTop: 5 },
  detailButton: { marginTop: 15 },
  detailText: { color: '#38856d', fontSize: 10, fontWeight: '800' },
  publicCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 17, backgroundColor: '#f8fbf8', borderWidth: 1, borderColor: '#dcebe2', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  publicCopy: { flex: 1, paddingRight: 10 },
  publicTitle: { color: '#3e5d50', fontSize: 15, fontWeight: '800', marginTop: 5 },
  publicSub: { color: '#82968b', fontSize: 10, marginTop: 5, lineHeight: 15 },
  autoSyncText: { color: '#4b9b81', fontSize: 8, marginTop: 6, fontWeight: '700' },
  publicTime: { color: '#a5b2aa', fontSize: 8, marginTop: 5 },
  syncButton: { backgroundColor: '#e0f1e8', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9 },
  syncButtonText: { color: '#438d75', fontSize: 10, fontWeight: '800' },
  guestCard: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#e6f3ed', borderRadius: 23, padding: 24, alignItems: 'center' },
  guestIcon: { width: 54, height: 54, borderRadius: 19, backgroundColor: '#c9e7da', alignItems: 'center', justifyContent: 'center' },
  guestIconText: { color: '#438d75', fontSize: 26 },
  guestTitle: { color: '#2e5e4e', fontSize: 19, fontWeight: '800', letterSpacing: -0.7, marginTop: 18 },
  guestBody: { color: '#78968a', fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  guestButton: { width: '100%', height: 46, borderRadius: 11, backgroundColor: '#f6d900', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  guestButtonText: { color: '#302e00', fontSize: 11, fontWeight: '800' },
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
  appUpdated: { color: '#b0bab4', fontSize: 8, marginTop: 9 },
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
  historyTitle: { color: '#61736a', fontSize: 10, fontWeight: '800', marginTop: 19 },
  historyList: { marginTop: 6, backgroundColor: '#f7faf8', borderRadius: 9, paddingHorizontal: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#eaf0ec' },
  historyDate: { color: '#9aa9a1', fontSize: 9 },
  historyRank: { color: '#4b927a', fontSize: 10, fontWeight: '800' },
  saveButton: { height: 47, borderRadius: 11, backgroundColor: '#327e67', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  saveButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  notificationList: { maxHeight: 330, marginTop: 18 },
  notificationRow: { flexDirection: 'row', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#eff3f0' },
  notificationIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#e1f2ea', alignItems: 'center', justifyContent: 'center' },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: '#4d6258', fontSize: 11, fontWeight: '800' },
  notificationBody: { color: '#8f9e96', fontSize: 10, lineHeight: 16, marginTop: 3 },
  notificationTime: { color: '#b1bbb5', fontSize: 8, marginTop: 5 },
  emptyText: { color: '#9aa9a1', textAlign: 'center', paddingVertical: 35, fontSize: 11 },
});
