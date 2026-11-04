import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RankSnapshot } from '@/data/storage';
import { MonthCalendar } from '@/components/month-calendar';
import { toDateKey } from '@/services/schedule';

type Props = {
  visible: boolean;
  history: RankSnapshot[];
  onClose: () => void;
  onSave: (history: RankSnapshot[]) => void;
};

function formatDate(recordedAt: string) {
  const [year, month, day] = recordedAt.slice(0, 10).split('-');
  return `${year}.${Number(month)}.${Number(day)}`;
}

// 앱을 쓰기 전에 확인했던 예비순번을 날짜와 함께 넣어, 순번 그래프가 처음부터 이어지게 한다.
export function RankHistorySheet({ visible, history, onClose, onSave }: Props) {
  const [date, setDate] = useState<string>();
  const [rank, setRank] = useState('');
  const [error, setError] = useState<string>();
  const sorted = [...history].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const add = () => {
    const value = Number(rank);
    if (!date) {
      setError('달력에서 순번을 확인한 날짜를 골라 주세요.');
      return;
    }
    if (date > toDateKey(new Date())) {
      setError('오늘 이후 날짜는 기록할 수 없어요.');
      return;
    }
    if (!Number.isFinite(value) || value < 1) {
      setError('예비순번은 1번 이상 숫자로 입력해 주세요.');
      return;
    }
    // 같은 날 기록이 있으면 새로 입력한 순번으로 바꾼다.
    onSave([...history.filter((item) => item.recordedAt.slice(0, 10) !== date), { rank: value, recordedAt: date }]);
    setRank('');
    setDate(undefined);
    setError(undefined);
  };

  const remove = (target: RankSnapshot) => {
    if (history.length <= 1) {
      setError('기록이 하나뿐이라 지울 수 없어요.');
      return;
    }
    onSave(history.filter((item) => item !== target));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.header}><View><Text style={styles.eyebrow}>RANK HISTORY</Text><Text style={styles.title}>지난 순번 기록</Text></View><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View>
            <Text style={styles.copy}>앱을 쓰기 전에 확인했던 예비순번을 날짜와 함께 넣으면, 순번 그래프에 처음부터의 흐름이 보여요.</Text>

            <Text style={styles.label}>확인한 날짜{date ? `  ·  ${formatDate(date)}` : ''}</Text>
            <MonthCalendar value={date} onChange={(next) => { setDate(next); setError(undefined); }} />
            <Text style={styles.label}>그날의 예비순번</Text>
            <TextInput value={rank} onChangeText={setRank} keyboardType="number-pad" placeholder="예: 32" placeholderTextColor="#a9b4ae" style={styles.input} />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.addButton} onPress={add}><Text style={styles.addText}>기록 추가하기</Text></Pressable>

            <Text style={styles.label}>전체 기록 {history.length}개</Text>
            <View style={styles.list}>
              {sorted.map((item, index) => <View key={`${item.recordedAt}-${item.rank}`} style={[styles.row, index === sorted.length - 1 && styles.rowLast]}>
                <Text style={styles.rowDate}>{formatDate(item.recordedAt)}{index === 0 ? '  ·  최근' : ''}</Text>
                <Text style={styles.rowRank}>{item.rank}번</Text>
                <Pressable onPress={() => remove(item)} hitSlop={8} accessibilityLabel={`${formatDate(item.recordedAt)} 기록 삭제`}><Text style={styles.remove}>×</Text></Pressable>
              </View>)}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(33, 55, 46, 0.28)', justifyContent: 'flex-end' },
  card: { maxHeight: '90%', backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 34 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: '#9aa9a1', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#29483d', fontSize: 21, fontWeight: '800', marginTop: 7 },
  close: { color: '#8c9b94', fontSize: 28, lineHeight: 28 },
  copy: { color: '#8f9e96', fontSize: 13, lineHeight: 21, marginTop: 14 },
  label: { color: '#61736a', fontSize: 12, fontWeight: '800', marginTop: 16 },
  input: { height: 44, backgroundColor: '#fbfcfb', borderWidth: 1, borderColor: '#e4ece7', borderRadius: 10, paddingHorizontal: 12, color: '#52635b', fontSize: 14, marginTop: 7 },
  error: { color: '#d47d6c', fontSize: 12, marginTop: 8 },
  addButton: { height: 45, borderRadius: 11, backgroundColor: '#327e67', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  addText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  list: { marginTop: 8, backgroundColor: '#f7faf8', borderRadius: 10, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eaf0ec' },
  rowLast: { borderBottomWidth: 0 },
  rowDate: { flex: 1, color: '#7f9087', fontSize: 13 },
  rowRank: { color: '#4b927a', fontSize: 14, fontWeight: '800' },
  remove: { color: '#a9b4ae', fontSize: 20, paddingHorizontal: 4 },
});
