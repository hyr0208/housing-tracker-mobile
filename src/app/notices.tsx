import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoticeAlertsSection } from '@/components/notice-alerts';
import { WaitingExplore } from '@/components/waiting-explore';

// 로그인하지 않아도 볼 수 있는 공공임대 모집공고 탭
export default function NoticesScreen() {
  const [mode, setMode] = useState<'notices' | 'waiting'>('notices');
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>NEW NOTICES</Text>
          <Text style={styles.title}>{mode === 'notices' ? '모집공고' : '단지별 대기현황'}</Text>
          <Text style={styles.subtitle}>{mode === 'notices' ? '지금 접수 중이거나 곧 접수하는 공공임대 공고를 모아봤어요.' : '대기인원이 적은 단지부터 보여드려요.'}</Text>
          <View style={styles.segment}>
            {(['notices', 'waiting'] as const).map((item) => <Pressable key={item} style={[styles.segmentItem, mode === item && styles.segmentItemOn]} onPress={() => setMode(item)}><Text style={[styles.segmentText, mode === item && styles.segmentTextOn]}>{item === 'notices' ? '모집공고' : '대기현황'}</Text></Pressable>)}
          </View>
          {mode === 'notices' ? <NoticeAlertsSection /> : <WaitingExplore />}
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
  segment: { flexDirection: 'row', backgroundColor: '#e7efea', borderRadius: 11, padding: 3, marginTop: 18 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentItemOn: { backgroundColor: '#fff' },
  segmentText: { color: '#7d9188', fontSize: 12, fontWeight: '800' },
  segmentTextOn: { color: '#2f7d64' },
});
