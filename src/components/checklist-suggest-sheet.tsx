import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHECKLIST_TEMPLATES, type ChecklistTemplateItem } from '@/data/checklist-templates';
import { useSheetBottomInset } from '@/hooks/use-sheet-bottom-inset';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** 이미 추가한 추천 항목 ID */
  addedIds: Set<string>;
  onPick: (item: ChecklistTemplateItem) => void;
};

// 단계별 추천 체크리스트. 고른 항목은 바로 넣지 않고 '준비할 일 추가' 시트에 채워서, 마감일을 고르거나 고친 뒤 저장하게 한다.
export function ChecklistSuggestSheet({ visible, onClose, addedIds, onPick }: Props) {
  const sheetInset = useSheetBottomInset();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.modalCard, { paddingBottom: 24 + sheetInset }]}>
          <View style={styles.modalHeader}><View><Text style={styles.eyebrow}>SUGGESTIONS</Text><Text style={styles.modalTitle}>추천 체크리스트</Text></View><Pressable onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View>
          <Text style={styles.modalCopy}>항목을 고르면 추가 화면에서 내용을 고치고 마감일을 정할 수 있어요. 서류와 순서는 공급기관·유형마다 다를 수 있으니 공고문에서 꼭 확인해 주세요.</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {CHECKLIST_TEMPLATES.map((stage, stageIndex) => {
              const remaining = stage.items.filter((item) => !addedIds.has(item.id));
              return (
                <View key={stage.key} style={styles.stage}>
                  <View style={styles.stageHeader}>
                    <View style={styles.stageTitle}><Text style={styles.stageNumber}>{stageIndex + 1}</Text><Text style={styles.stageLabel}>{stage.label}</Text></View>
                    {remaining.length === 0 && <Text style={styles.stageDone}>모두 추가됨</Text>}
                  </View>
                  <View style={styles.stageCard}>
                  {stage.items.map((item, itemIndex) => {
                    const added = addedIds.has(item.id);
                    return (
                      <Pressable key={item.id} style={[styles.itemRow, itemIndex === stage.items.length - 1 && styles.itemRowLast]} disabled={added} onPress={() => onPick(item)}>
                        <View style={styles.itemCopy}><Text style={[styles.itemTitle, added && styles.itemTitleAdded]}>{item.title}</Text><Text style={styles.itemDetail}>{item.detail}</Text></View>
                        <Text style={[styles.itemAction, added && styles.itemActionAdded]}>{added ? '추가됨' : '›'}</Text>
                      </Pressable>
                    );
                  })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: '#9aa9a1', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(33, 55, 46, 0.28)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { color: '#29483d', fontSize: 21, fontWeight: '800', marginTop: 7 },
  closeText: { color: '#8c9b94', fontSize: 28, lineHeight: 28 },
  modalCopy: { color: '#8f9e96', fontSize: 13, lineHeight: 20, marginTop: 12 },
  list: { flexGrow: 0, flexShrink: 1, marginTop: 8 },
  stage: { marginTop: 22 },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stageTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#327e67', color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  stageLabel: { color: '#243b34', fontSize: 17, fontWeight: '800' },
  stageCard: { borderRadius: 14, backgroundColor: '#f6faf7', borderWidth: 1, borderColor: '#e4ece7', paddingHorizontal: 13 },
  stageDone: { color: '#a0ada6', fontSize: 12, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#e6eee9' },
  itemRowLast: { borderBottomWidth: 0 },
  itemCopy: { flex: 1, paddingRight: 10 },
  itemTitle: { color: '#405149', fontSize: 14, fontWeight: '700' },
  itemTitleAdded: { color: '#a0ada6' },
  itemDetail: { color: '#9aa9a1', fontSize: 11, lineHeight: 16, marginTop: 3 },
  itemAction: { width: 46, textAlign: 'right', color: '#3f8a72', fontSize: 18, fontWeight: '800' },
  itemActionAdded: { color: '#a0ada6', fontSize: 11, fontWeight: '700' },
});
