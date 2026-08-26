import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { defaultAppData, loadAppData, saveAppData, type AppData, type ChecklistTask } from '@/data/storage';

type Filter = 'all' | 'active' | 'done';

export default function ChecklistScreen() {
  const [data, setData] = useState<AppData>(defaultAppData);
  const [filter, setFilter] = useState<Filter>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDetail, setDraftDetail] = useState('');

  const reload = useCallback(() => {
    loadAppData().then(setData);
  }, []);

  useFocusEffect(reload);

  const completed = data.tasks.filter((task) => task.done).length;
  const progress = data.tasks.length ? Math.round((completed / data.tasks.length) * 100) : 0;
  const visibleTasks = useMemo(() => data.tasks.filter((task) => filter === 'all' || (filter === 'done' ? task.done : !task.done)), [data.tasks, filter]);

  const updateTasks = (tasks: ChecklistTask[]) => {
    const next = { ...data, tasks };
    setData(next);
    void saveAppData(next);
  };

  const toggleTask = (taskId: string) => {
    updateTasks(data.tasks.map((task) => task.id === taskId ? { ...task, done: !task.done } : task));
  };

  const deleteTask = (task: ChecklistTask) => {
    Alert.alert('준비할 일 삭제', `${task.title}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => updateTasks(data.tasks.filter((item) => item.id !== task.id)) },
    ]);
  };

  const addTask = () => {
    const title = draftTitle.trim();
    if (!title) return;
    const task: ChecklistTask = {
      id: `task-${Date.now()}`,
      title,
      detail: draftDetail.trim() || '직접 추가한 준비 항목',
      done: false,
    };
    updateTasks([...data.tasks, task]);
    setDraftTitle('');
    setDraftDetail('');
    setIsAddOpen(false);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>MOVE-IN CHECKLIST</Text>
          <Text style={styles.title}>입주 준비 체크리스트</Text>
          <Text style={styles.subtitle}>내 신청 일정에 맞춰 하나씩 준비해보세요.</Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}><View><Text style={styles.progressEyebrow}>MY PROGRESS</Text><Text style={styles.progressTitle}>입주 준비도</Text></View><Text style={styles.progressPercent}>{progress}%</Text></View>
            <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
            <View style={styles.progressFooter}><Text style={styles.progressCaption}>{data.tasks.length ? `${completed}/${data.tasks.length}단계 완료` : '준비할 일을 추가해보세요'}</Text><Text style={styles.progressCaption}>{progress === 100 ? '모두 완료했어요!' : '천천히 해도 괜찮아요'}</Text></View>
          </View>

          <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>NEXT STEPS</Text><Text style={styles.sectionTitle}>준비할 일</Text></View><Pressable style={styles.addButton} onPress={() => setIsAddOpen(true)}><Text style={styles.addButtonText}>＋ 추가</Text></Pressable></View>

          <View style={styles.filterRow}>
            {([['all', '전체'], ['active', '진행 중'], ['done', '완료']] as [Filter, string][]).map(([value, label]) => <Pressable key={value} style={[styles.filterButton, filter === value && styles.filterButtonActive]} onPress={() => setFilter(value)}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}{value === 'all' ? ` ${data.tasks.length}` : value === 'active' ? ` ${data.tasks.length - completed}` : ` ${completed}`}</Text></Pressable>)}
          </View>

          {visibleTasks.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyIcon}>{filter === 'done' ? '✓' : '＋'}</Text><Text style={styles.emptyTitle}>{filter === 'done' ? '아직 완료한 일이 없어요' : filter === 'active' ? '모든 준비를 끝냈어요' : '체크리스트가 비어 있어요'}</Text><Text style={styles.emptyText}>아래 추가 버튼으로 필요한 준비 항목을 기록해보세요.</Text></View> : <View style={styles.taskList}>{visibleTasks.map((task, index) => <View key={task.id} style={[styles.taskRow, task.done && styles.taskRowDone]}><Pressable style={styles.taskMain} onPress={() => toggleTask(task.id)}><View style={[styles.checkbox, task.done && styles.checkboxDone]}>{task.done && <Text style={styles.checkMark}>✓</Text>}</View><View style={styles.taskCopy}><Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text></View></Pressable><Pressable style={styles.deleteButton} onPress={() => deleteTask(task)}><Text style={styles.deleteText}>×</Text></Pressable></View>)}</View>}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={isAddOpen} transparent animationType="slide" onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.eyebrow}>NEW CHECKLIST ITEM</Text><Text style={styles.modalTitle}>준비할 일 추가</Text></View><Pressable onPress={() => setIsAddOpen(false)}><Text style={styles.closeText}>×</Text></Pressable></View><Text style={styles.modalCopy}>입주 준비에 필요한 일을 직접 기록해두세요.</Text><Text style={styles.inputLabel}>할 일</Text><TextInput value={draftTitle} onChangeText={setDraftTitle} placeholder="예: 주민등록 이전 준비" placeholderTextColor="#a9b4ae" style={styles.input} autoFocus /><Text style={styles.inputLabel}>메모 (선택)</Text><TextInput value={draftDetail} onChangeText={setDraftDetail} placeholder="예: 필요한 서류를 확인해요" placeholderTextColor="#a9b4ae" style={styles.input} /><Pressable style={styles.saveButton} onPress={addTask}><Text style={styles.saveButtonText}>체크리스트에 추가하기  →</Text></Pressable></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7f3' },
  safe: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 110 },
  eyebrow: { color: '#9aa9a1', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#243b34', fontSize: 28, fontWeight: '800', letterSpacing: -1.4, marginTop: 9 },
  subtitle: { color: '#8c9c94', fontSize: 12, marginTop: 7 },
  progressCard: { marginTop: 25, padding: 19, borderRadius: 20, backgroundColor: '#dff1e9' },
  progressHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  progressEyebrow: { color: '#78a792', fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  progressTitle: { color: '#315c4d', fontSize: 17, fontWeight: '800', marginTop: 5 },
  progressPercent: { color: '#3e9577', fontSize: 25, fontWeight: '800' },
  progressBar: { height: 10, borderRadius: 6, backgroundColor: '#c5e5d7', marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#4aa383' },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  progressCaption: { color: '#6f9685', fontSize: 9, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28 },
  sectionEyebrow: { color: '#a0ada6', fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  sectionTitle: { color: '#38564a', fontSize: 20, fontWeight: '800', marginTop: 5 },
  addButton: { backgroundColor: '#dcefe6', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  addButtonText: { color: '#438d75', fontSize: 10, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 7, marginTop: 17 },
  filterButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: '#e8efeb' },
  filterButtonActive: { backgroundColor: '#327e67' },
  filterText: { color: '#82968b', fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  taskList: { marginTop: 12, backgroundColor: '#fff', borderRadius: 17, borderWidth: 1, borderColor: '#e4ece7', paddingHorizontal: 15 },
  taskRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#edf2ee' },
  taskRowDone: { opacity: 0.62 },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  checkbox: { width: 25, height: 25, borderRadius: 9, borderWidth: 1.5, borderColor: '#a8c8b8', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  checkboxDone: { backgroundColor: '#4aa383', borderColor: '#4aa383' },
  checkMark: { color: '#fff', fontSize: 15, fontWeight: '800' },
  taskCopy: { flex: 1 },
  taskTitle: { color: '#405149', fontSize: 12, fontWeight: '800' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#82968b' },
  taskDetail: { color: '#9aa9a1', fontSize: 9, marginTop: 5 },
  deleteButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#b3beb8', fontSize: 22, fontWeight: '300' },
  emptyCard: { marginTop: 12, padding: 28, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ece7', alignItems: 'center' },
  emptyIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: '#e4f3ec', color: '#438d75', fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  emptyTitle: { color: '#527662', fontSize: 13, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#8aa097', fontSize: 10, marginTop: 6, textAlign: 'center' },
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
