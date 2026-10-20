import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, detail: string) => void;
};

// 홈과 체크리스트 탭에서 함께 쓰는 '준비할 일 추가' 바텀시트.
export function AddTaskSheet({ visible, onClose, onAdd }: Props) {
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDetail, setDraftDetail] = useState('');

  const submit = () => {
    const title = draftTitle.trim();
    if (!title) return;
    onAdd(title, draftDetail.trim());
    setDraftTitle('');
    setDraftDetail('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" /><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.eyebrow}>NEW CHECKLIST ITEM</Text><Text style={styles.modalTitle}>준비할 일 추가</Text></View><Pressable onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View><Text style={styles.modalCopy}>입주 준비에 필요한 일을 직접 기록해두세요.</Text><Text style={styles.inputLabel}>할 일</Text><TextInput value={draftTitle} onChangeText={setDraftTitle} placeholder="예: 주민등록 이전 준비" placeholderTextColor="#a9b4ae" style={styles.input} autoFocus /><Text style={styles.inputLabel}>메모 (선택)</Text><TextInput value={draftDetail} onChangeText={setDraftDetail} placeholder="예: 필요한 서류를 확인해요" placeholderTextColor="#a9b4ae" style={styles.input} /><Pressable style={styles.saveButton} onPress={submit}><Text style={styles.saveButtonText}>체크리스트에 추가하기  →</Text></Pressable></View></KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: '#9aa9a1', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(33, 55, 46, 0.28)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { color: '#29483d', fontSize: 21, fontWeight: '800', marginTop: 7 },
  closeText: { color: '#8c9b94', fontSize: 28, lineHeight: 28 },
  modalCopy: { color: '#8f9e96', fontSize: 11, lineHeight: 18, marginTop: 14, marginBottom: 12 },
  inputLabel: { color: '#61736a', fontSize: 10, fontWeight: '800', marginTop: 13 },
  input: { height: 44, backgroundColor: '#fbfcfb', borderWidth: 1, borderColor: '#e4ece7', borderRadius: 10, paddingHorizontal: 12, color: '#52635b', fontSize: 12, marginTop: 7 },
  saveButton: { height: 47, borderRadius: 11, backgroundColor: '#327e67', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  saveButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
