import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoticeAlertsSection } from '@/components/notice-alerts';

// 로그인하지 않아도 볼 수 있는 공공임대 모집공고 탭
export default function NoticesScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>NEW NOTICES</Text>
          <Text style={styles.title}>모집공고</Text>
          <Text style={styles.subtitle}>지금 접수 중이거나 곧 접수하는 공공임대 공고를 모아봤어요.</Text>
          <NoticeAlertsSection />
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
});
