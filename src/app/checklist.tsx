import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { AddTaskSheet } from '@/components/add-task-sheet';
import { ChecklistSuggestSheet } from '@/components/checklist-suggest-sheet';
import type { ChecklistTemplateItem } from '@/data/checklist-templates';
import { formatTaskDue } from '@/services/schedule';
import { defaultAppData, loadAppData, saveAppData, subscribeToAppData, type AppData, type ChecklistTask } from '@/data/storage';

type Filter = 'all' | 'active' | 'done';

type DialogState = {
  title: string;
  message: string;
  onConfirm?: () => void;
};

export default function ChecklistScreen() {
  const [data, setData] = useState<AppData>(defaultAppData);
  const [filter, setFilter] = useState<Filter>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ChecklistTask>();
  const [pickedTemplate, setPickedTemplate] = useState<ChecklistTemplateItem>();
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const reload = useCallback(() => {
    loadAppData().then(setData);
  }, []);

  useFocusEffect(reload);
  useEffect(() => subscribeToAppData(setData), []);

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
    setDialog({
      title: '준비할 일 삭제',
      message: `${task.title}을(를) 삭제할까요?`,
      onConfirm: () => updateTasks(data.tasks.filter((item) => item.id !== task.id)),
    });
  };

  const addTask = (title: string, detail: string, dueDate?: string) => {
    if (editingTask) {
      updateTasks(data.tasks.map((task) => task.id === editingTask.id ? { ...task, title, detail: detail || task.detail, dueDate } : task));
    } else {
      const task: ChecklistTask = {
        id: `task-${Date.now()}`,
        title,
        detail: detail || '직접 추가한 준비 항목',
        done: false,
        ...(dueDate ? { dueDate } : {}),
        ...(pickedTemplate ? { templateId: pickedTemplate.id } : {}),
      };
      updateTasks([...data.tasks, task]);
    }
    closeAddSheet();
  };

  const closeAddSheet = () => {
    setIsAddOpen(false);
    setEditingTask(undefined);
    setPickedTemplate(undefined);
  };

  const openEdit = (task: ChecklistTask) => {
    setEditingTask(task);
    setIsAddOpen(true);
  };

  const addedTemplateIds = useMemo(() => new Set(data.tasks.map((task) => task.templateId).filter((id): id is string => Boolean(id))), [data.tasks]);

  // 추천 항목을 고르면 추가 시트에 채워 연다. iOS는 모달 두 개를 겹쳐 띄우지 못해서 추천 시트가 닫힌 뒤 연다.
  const pickTemplate = (item: ChecklistTemplateItem) => {
    setIsSuggestOpen(false);
    setPickedTemplate(item);
    setTimeout(() => setIsAddOpen(true), 400);
  };

  const openSuggestionsFromAdd = () => {
    closeAddSheet();
    setTimeout(() => setIsSuggestOpen(true), 400);
  };

  return (
    // Android에서 탭을 다시 누르면 맨 위로 올라가려면 ScrollView가 화면의 첫 자식 줄에 있어야 해서, 바깥 View 없이 SafeAreaView를 루트로 둔다.
    <SafeAreaView style={styles.screen} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>MOVE-IN CHECKLIST</Text>
          <Text style={styles.title}>입주 준비 체크리스트</Text>
          <Text style={styles.subtitle}>내 신청 일정에 맞춰 하나씩 준비해보세요.</Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}><View><Text style={styles.progressEyebrow}>MY PROGRESS</Text><Text style={styles.progressTitle}>입주 준비도</Text></View><Text style={styles.progressPercent}>{progress}%</Text></View>
            <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
            <View style={styles.progressFooter}><Text style={styles.progressCaption}>{data.tasks.length ? `${completed}/${data.tasks.length}단계 완료` : '준비할 일을 추가해보세요'}</Text><Text style={styles.progressCaption}>{progress === 100 ? '모두 완료했어요!' : '천천히 해도 괜찮아요'}</Text></View>
          </View>

          <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>NEXT STEPS</Text><Text style={styles.sectionTitle}>준비할 일</Text></View><View style={styles.headerActions}><Pressable style={styles.suggestButton} onPress={() => setIsSuggestOpen(true)}><Text style={styles.suggestButtonText}>추천</Text></Pressable><Pressable style={styles.addButton} onPress={() => setIsAddOpen(true)}><Text style={styles.addButtonText}>＋ 추가</Text></Pressable></View></View>

          <View style={styles.filterRow}>
            {([['all', '전체'], ['active', '진행 중'], ['done', '완료']] as [Filter, string][]).map(([value, label]) => <Pressable key={value} style={[styles.filterButton, filter === value && styles.filterButtonActive]} onPress={() => setFilter(value)}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}{value === 'all' ? ` ${data.tasks.length}` : value === 'active' ? ` ${data.tasks.length - completed}` : ` ${completed}`}</Text></Pressable>)}
          </View>

          {data.tasks.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>뭐부터 해야 할지 막막하다면</Text><Text style={styles.emptyText}>당첨 후 서류부터 입주까지, 단계별 추천 항목에서{'\n'}필요한 것만 골라 담아 보세요.</Text><Pressable style={styles.emptyPrimary} onPress={() => setIsSuggestOpen(true)}><Text style={styles.emptyPrimaryText}>추천 체크리스트 보기</Text></Pressable><Pressable style={styles.emptySecondary} onPress={() => setIsAddOpen(true)}><Text style={styles.emptySecondaryText}>직접 추가하기</Text></Pressable></View>
          : visibleTasks.length === 0 ? <Pressable style={({ pressed }) => [styles.emptyCard, pressed && filter !== 'done' && styles.emptyCardPressed]} disabled={filter === 'done'} onPress={() => setIsAddOpen(true)} accessibilityRole="button"><Text style={styles.emptyIcon}>{filter === 'done' ? '✓' : '＋'}</Text><Text style={styles.emptyTitle}>{filter === 'done' ? '아직 완료한 일이 없어요' : filter === 'active' ? '모든 준비를 끝냈어요' : '체크리스트가 비어 있어요'}</Text><Text style={styles.emptyText}>{filter === 'done' ? '할 일을 완료하면 여기에 모여요.' : '여기를 눌러 필요한 준비 항목을 추가해보세요.'}</Text></Pressable> : <View style={styles.taskList}>{visibleTasks.map((task, index) => <View key={task.id} style={[styles.taskRow, task.done && styles.taskRowDone]}><Pressable style={styles.taskMain} onPress={() => toggleTask(task.id)} onLongPress={() => openEdit(task)} accessibilityHint="길게 누르면 수정하거나 마감일을 넣을 수 있어요"><View style={[styles.checkbox, task.done && styles.checkboxDone]}>{task.done && <Text style={styles.checkMark}>✓</Text>}</View><View style={styles.taskCopy}><Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text>{task.dueDate && (() => { const due = formatTaskDue(task.dueDate); return <Text style={[styles.taskDue, due.overdue && !task.done && styles.taskDueOverdue]}>{due.label}</Text>; })()}</View></Pressable><Pressable style={styles.deleteButton} onPress={() => deleteTask(task)}><Text style={styles.deleteText}>×</Text></Pressable></View>)}</View>}
        </ScrollView>

      <AddTaskSheet visible={isAddOpen} onClose={closeAddSheet} onAdd={addTask} editing={editingTask} prefill={pickedTemplate} onOpenSuggestions={openSuggestionsFromAdd} />
      <ChecklistSuggestSheet visible={isSuggestOpen} onClose={() => setIsSuggestOpen(false)} addedIds={addedTemplateIds} onPick={pickTemplate} />

      <Modal visible={Boolean(dialog)} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
        <View style={styles.dialogBackdrop}><View style={styles.dialogCard}><View style={styles.dialogIcon}><Text style={styles.dialogIconText}>!</Text></View><Text style={styles.dialogTitle}>{dialog?.title}</Text><Text style={styles.dialogMessage}>{dialog?.message}</Text><View style={styles.dialogActions}><Pressable style={styles.dialogCancelButton} onPress={() => setDialog(null)}><Text style={styles.dialogCancelText}>취소</Text></Pressable><Pressable style={styles.dialogConfirmButton} onPress={() => { const action = dialog?.onConfirm; setDialog(null); action?.(); }}><Text style={styles.dialogConfirmText}>삭제</Text></Pressable></View></View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7f3' },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 110 },
  eyebrow: { color: '#9aa9a1', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#243b34', fontSize: 28, fontWeight: '800', letterSpacing: -1.4, marginTop: 9 },
  subtitle: { color: '#8c9c94', fontSize: 14, marginTop: 7 },
  progressCard: { marginTop: 25, padding: 19, borderRadius: 20, backgroundColor: '#dff1e9' },
  progressHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  progressEyebrow: { color: '#78a792', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  progressTitle: { color: '#315c4d', fontSize: 19, fontWeight: '800', marginTop: 5 },
  progressPercent: { color: '#3e9577', fontSize: 25, fontWeight: '800' },
  progressBar: { height: 10, borderRadius: 6, backgroundColor: '#c5e5d7', marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: '#4aa383' },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  progressCaption: { color: '#6f9685', fontSize: 11, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28 },
  sectionEyebrow: { color: '#a0ada6', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  sectionTitle: { color: '#38564a', fontSize: 20, fontWeight: '800', marginTop: 5 },
  headerActions: { flexDirection: 'row', gap: 6 },
  suggestButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dcefe6', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  suggestButtonText: { color: '#438d75', fontSize: 12, fontWeight: '800' },
  addButton: { backgroundColor: '#dcefe6', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  addButtonText: { color: '#438d75', fontSize: 12, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 7, marginTop: 17 },
  filterButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: '#e8efeb' },
  filterButtonActive: { backgroundColor: '#327e67' },
  filterText: { color: '#82968b', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  taskList: { marginTop: 12, backgroundColor: '#fff', borderRadius: 17, borderWidth: 1, borderColor: '#e4ece7', paddingHorizontal: 15 },
  taskRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#edf2ee' },
  taskRowDone: { opacity: 0.62 },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  checkbox: { width: 25, height: 25, borderRadius: 9, borderWidth: 1.5, borderColor: '#a8c8b8', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  checkboxDone: { backgroundColor: '#4aa383', borderColor: '#4aa383' },
  checkMark: { color: '#fff', fontSize: 17, fontWeight: '800' },
  taskCopy: { flex: 1 },
  taskTitle: { color: '#405149', fontSize: 14, fontWeight: '800' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#82968b' },
  taskDetail: { color: '#9aa9a1', fontSize: 11, marginTop: 5 },
  taskDue: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#eef7f2', color: '#3f8a72', fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  taskDueOverdue: { backgroundColor: '#fbebe6', color: '#d47d6c' },
  deleteButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#b3beb8', fontSize: 22, fontWeight: '300' },
  emptyCard: { marginTop: 12, padding: 28, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ece7', alignItems: 'center' },
  emptyCardPressed: { opacity: 0.6 },
  emptyIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: '#e4f3ec', color: '#438d75', fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  emptyTitle: { color: '#527662', fontSize: 15, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#8aa097', fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: 'center' },
  emptyPrimary: { alignSelf: 'stretch', height: 44, borderRadius: 11, backgroundColor: '#327e67', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  emptyPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  emptySecondary: { paddingVertical: 10, marginTop: 4 },
  emptySecondaryText: { color: '#6f9685', fontSize: 13, fontWeight: '700' },
  dialogBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32, 59, 48, 0.33)', paddingHorizontal: 30 },
  dialogCard: { width: '100%', borderRadius: 18, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, shadowColor: '#24483a', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  dialogIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fae8e2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  dialogIconText: { color: '#d98471', fontSize: 19, fontWeight: '800' },
  dialogTitle: { color: '#243b34', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  dialogMessage: { color: '#74857c', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
  dialogActions: { flexDirection: 'row', gap: 8, marginTop: 17 },
  dialogCancelButton: { flex: 1, height: 42, borderRadius: 10, backgroundColor: '#f2f6f3', alignItems: 'center', justifyContent: 'center' },
  dialogCancelText: { color: '#71847a', fontSize: 13, fontWeight: '800' },
  dialogConfirmButton: { flex: 1, height: 42, borderRadius: 10, backgroundColor: '#d98471', alignItems: 'center', justifyContent: 'center' },
  dialogConfirmText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
