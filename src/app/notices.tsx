import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoticeAlertsSection } from '@/components/notice-alerts';
import { WaitingExplore } from '@/components/waiting-explore';

type Mode = 'notices' | 'waiting';
const MODES: Mode[] = ['notices', 'waiting'];
const TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

// 로그인하지 않아도 볼 수 있는 공공임대 모집공고 탭
export default function NoticesScreen() {
  const [mode, setMode] = useState<Mode>('notices');
  // 대기현황은 처음 열 때 불러오는 데 오래 걸려서, 한 번 연 뒤에는 화면을 숨기기만 하고 그대로 둔다.
  const [hasOpenedWaiting, setHasOpenedWaiting] = useState(false);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const indicator = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const contentShift = useSharedValue(0);

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    const index = MODES.indexOf(next);
    indicator.value = withTiming(index, TIMING);
    // 오른쪽 탭으로 가면 오른쪽에서, 왼쪽 탭으로 가면 왼쪽에서 들어오게 한다.
    contentOpacity.value = 0;
    contentShift.value = index > MODES.indexOf(mode) ? 16 : -16;
    contentOpacity.value = withTiming(1, TIMING);
    contentShift.value = withTiming(0, TIMING);
    if (next === 'waiting') setHasOpenedWaiting(true);
    setMode(next);
  };

  const itemWidth = segmentWidth > 0 ? (segmentWidth - 6) / MODES.length : 0;
  // 폭은 일반 스타일로 넘긴다. 애니메이션 스타일 안에서 JS 값을 읽으면 릴리스 빌드에서 처음 폭이 반영되지 않아 표시가 안 보였다.
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicator.value * indicatorWidth.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value, transform: [{ translateX: contentShift.value }] }));

  return (
    // Android에서 탭을 다시 누르면 맨 위로 올라가려면 ScrollView가 화면의 첫 자식 줄에 있어야 해서, 바깥 View 없이 SafeAreaView를 루트로 둔다.
    <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>NEW NOTICES</Text>
          <Text style={styles.title}>{mode === 'notices' ? '모집공고' : '단지별 대기현황'}</Text>
          <Text style={styles.subtitle}>{mode === 'notices' ? '지금 접수 중이거나 곧 접수하는 공공임대 공고를 모아봤어요.' : '대기인원이 적은 단지부터 보여드려요.'}</Text>
          <View style={styles.segment} onLayout={(event) => { const width = event.nativeEvent.layout.width; setSegmentWidth(width); indicatorWidth.value = (width - 6) / MODES.length; }}>
            {itemWidth > 0 && <Animated.View style={[styles.segmentIndicator, { width: itemWidth }, indicatorStyle]} />}
            {MODES.map((item) => <Pressable key={item} style={styles.segmentItem} onPress={() => changeMode(item)} accessibilityRole="tab" accessibilityState={{ selected: mode === item }}><Text style={[styles.segmentText, mode === item && styles.segmentTextOn]}>{item === 'notices' ? '모집공고' : '대기현황'}</Text></Pressable>)}
          </View>
          <Animated.View style={contentStyle}>
            <View style={mode === 'notices' ? undefined : styles.hidden}><NoticeAlertsSection /></View>
            {hasOpenedWaiting && <View style={mode === 'waiting' ? undefined : styles.hidden}><WaitingExplore /></View>}
          </Animated.View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7f3' },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 100 },
  eyebrow: { color: '#9aa9a1', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#243b34', fontSize: 29, fontWeight: '800', letterSpacing: -1.4, marginTop: 9 },
  subtitle: { color: '#8c9c94', fontSize: 14, marginTop: 7 },
  segment: { flexDirection: 'row', backgroundColor: '#e7efea', borderRadius: 11, padding: 3, marginTop: 18 },
  segmentIndicator: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 9, backgroundColor: '#fff', shadowColor: '#2b4a3e', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9 },
  segmentText: { color: '#7d9188', fontSize: 14, fontWeight: '800' },
  segmentTextOn: { color: '#2f7d64' },
  hidden: { display: 'none' },
});
