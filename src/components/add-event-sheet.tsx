import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScheduleKind } from '@/data/storage';
import { MonthCalendar } from '@/components/month-calendar';
import { SCHEDULE_KINDS } from '@/services/schedule';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, kind: ScheduleKind, date: string) => void;
};

// 서류 마감·계약일 같은 일정을 추가하는 바텀시트. 하루 전 오전 9시와 당일 오전 9시에 알려준다.
export function AddEventSheet({ visible, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ScheduleKind>('document');
  const [date, setDate] = useState<string>();
  const [error, setError] = useState<string>();

  const submit = () => {
    if (!title.trim()) {
      setError('일정 이름을 입력해 주세요.');
      return;
    }
    if (!date) {
      setError('달력에서 날짜를 골라 주세요.');
      return;
    }
    onAdd(title.trim(), kind, date);
    setTitle('');
    setDate(undefined);
    setError(undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}><View><Text style={styles.eyebrow}>NEW SCHEDULE</Text><Text style={styles.modalTitle}>일정 추가</Text></View><Pressable onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View>
            <Text style={styles.modalCopy}>하루 전과 당일 오전 9시에 알림을 보내드려요.</Text>
            <Text style={styles.inputLabel}>일정 이름</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="예: 소득 증빙 서류 제출" placeholderTextColor="#a9b4ae" style={styles.input} />
            <Text style={styles.inputLabel}>종류</Text>
            <View style={styles.chips}>
              {SCHEDULE_KINDS.map((item) => <Pressable key={item.key} style={[styles.chip, kind === item.key && styles.chipSelected]} onPress={() => setKind(item.key)}><Text style={[styles.chipText, kind === item.key && styles.chipTextSelected]}>{item.label}</Text></Pressable>)}
            </View>
            <Text style={styles.inputLabel}>날짜{date ? `  ·  ${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일` : ''}</Text>
            <MonthCalendar value={date} onChange={(next) => { setDate(next); setError(undefined); }} />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.saveButton} onPress={submit}><Text style={styles.saveButtonText}>일정 저장하기  →</Text></Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: '#9aa9a1', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(33, 55, 46, 0.28)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '90%', backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { color: '#29483d', fontSize: 21, fontWeight: '800', marginTop: 7 },
  closeText: { color: '#8c9b94', fontSize: 28, lineHeight: 28 },
  modalCopy: { color: '#8f9e96', fontSize: 13, lineHeight: 21, marginTop: 14, marginBottom: 4 },
  inputLabel: { color: '#61736a', fontSize: 12, fontWeight: '800', marginTop: 13 },
  input: { height: 44, backgroundColor: '#fbfcfb', borderWidth: 1, borderColor: '#e4ece7', borderRadius: 10, paddingHorizontal: 12, color: '#52635b', fontSize: 14, marginTop: 7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  chip: { borderWidth: 1, borderColor: '#dcebe2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f8fbf8' },
  chipSelected: { backgroundColor: '#d5eee2', borderColor: '#83c4aa' },
  chipText: { color: '#6b8c7d', fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: '#2f7d64' },
  error: { color: '#d47d6c', fontSize: 12, marginTop: 8 },
  saveButton: { height: 47, borderRadius: 11, backgroundColor: '#327e67', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
