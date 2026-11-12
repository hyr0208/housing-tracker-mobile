import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ChecklistTask } from '@/data/storage';
import { MonthCalendar } from '@/components/month-calendar';
import { useSheetBottomInset } from '@/hooks/use-sheet-bottom-inset';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, detail: string, dueDate?: string) => void;
  /** 넘기면 이 항목을 고치는 시트로 연다. */
  editing?: ChecklistTask;
  /** 추천 항목에서 고른 내용으로 채워서 연다. */
  prefill?: { title: string; detail: string };
  onOpenSuggestions?: () => void;
};

// 홈과 체크리스트 탭에서 함께 쓰는 '준비할 일 추가' 바텀시트. 마감일을 넣으면 하루 전과 당일 오전 9시에 알려준다.
export function AddTaskSheet({ visible, onClose, onAdd, editing, prefill, onOpenSuggestions }: Props) {
  const sheetInset = useSheetBottomInset();
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDetail, setDraftDetail] = useState('');
  const [dueDate, setDueDate] = useState<string>();
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraftTitle(editing?.title ?? prefill?.title ?? '');
    setDraftDetail(editing?.detail ?? prefill?.detail ?? '');
    setDueDate(editing?.dueDate);
    // 추천에서 골랐다면 바로 마감일을 정할 수 있게 달력을 펼친다.
    setShowCalendar(Boolean(prefill));
  }, [visible, editing, prefill]);

  const submit = () => {
    const title = draftTitle.trim();
    if (!title) return;
    onAdd(title, draftDetail.trim(), dueDate);
    setDraftTitle('');
    setDraftDetail('');
    setDueDate(undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.modalCard, { paddingBottom: 34 + sheetInset }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}><View><Text style={styles.eyebrow}>{editing ? 'EDIT CHECKLIST ITEM' : 'NEW CHECKLIST ITEM'}</Text><Text style={styles.modalTitle}>{editing ? '준비할 일 수정' : '준비할 일 추가'}</Text></View><Pressable onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View>
            <Text style={styles.modalCopy}>입주 준비에 필요한 일을 직접 기록해두세요. 마감일을 넣으면 하루 전과 당일 오전 9시에 알려드려요.</Text>
            {!editing && !prefill && onOpenSuggestions && <Pressable style={styles.suggestButton} onPress={onOpenSuggestions}><Text style={styles.suggestText}>뭐부터 할지 모르겠다면 · 추천 항목에서 고르기 ›</Text></Pressable>}
            <Text style={styles.inputLabel}>할 일</Text>
            <TextInput value={draftTitle} onChangeText={setDraftTitle} placeholder="예: 주민등록 이전 준비" placeholderTextColor="#a9b4ae" style={styles.input} autoFocus={!editing && !prefill} />
            <Text style={styles.inputLabel}>메모 (선택)</Text>
            <TextInput value={draftDetail} onChangeText={setDraftDetail} placeholder="예: 필요한 서류를 확인해요" placeholderTextColor="#a9b4ae" style={styles.input} />
            <View style={styles.dueHeader}>
              <Text style={styles.inputLabel}>마감일 (선택){dueDate ? `  ·  ${Number(dueDate.slice(5, 7))}월 ${Number(dueDate.slice(8, 10))}일까지` : ''}</Text>
              {dueDate ? <Pressable onPress={() => { setDueDate(undefined); setShowCalendar(false); }}><Text style={styles.dueAction}>지우기</Text></Pressable>
                : <Pressable onPress={() => setShowCalendar((value) => !value)}><Text style={styles.dueAction}>{showCalendar ? '닫기' : '날짜 고르기'}</Text></Pressable>}
            </View>
            {(showCalendar || dueDate) && <MonthCalendar value={dueDate} onChange={setDueDate} />}
            <Pressable style={styles.saveButton} onPress={submit}><Text style={styles.saveButtonText}>{editing ? '저장하기' : '체크리스트에 추가하기  →'}</Text></Pressable>
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
  suggestButton: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#eef7f2' },
  suggestText: { color: '#3f8a72', fontSize: 13, fontWeight: '800' },
  inputLabel: { color: '#61736a', fontSize: 12, fontWeight: '800', marginTop: 13 },
  input: { height: 44, backgroundColor: '#fbfcfb', borderWidth: 1, borderColor: '#e4ece7', borderRadius: 10, paddingHorizontal: 12, color: '#52635b', fontSize: 14, marginTop: 7 },
  dueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dueAction: { color: '#3f8a72', fontSize: 12, fontWeight: '800' },
  saveButton: { height: 47, borderRadius: 11, backgroundColor: '#327e67', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
