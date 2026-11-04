import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { toDateKey } from '@/services/schedule';

type Props = {
  value?: string;
  onChange: (dateKey: string) => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 네이티브 날짜 선택기 없이(OTA로 배포 가능하게) 만든 한 달 달력.
export function MonthCalendar({ value, onChange }: Props) {
  const initial = value ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 1) : new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const todayKey = toDateKey(new Date());

  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const moveMonth = (offset: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <Pressable onPress={() => moveMonth(-1)} hitSlop={10} accessibilityLabel="이전 달"><Text style={styles.arrow}>‹</Text></Pressable>
        <Text style={styles.monthLabel}>{month.getFullYear()}년 {month.getMonth() + 1}월</Text>
        <Pressable onPress={() => moveMonth(1)} hitSlop={10} accessibilityLabel="다음 달"><Text style={styles.arrow}>›</Text></Pressable>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((day, index) => <Text key={day} style={[styles.weekday, index === 0 && styles.sunday]}>{day}</Text>)}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={styles.row}>
          {cells.slice(week * 7, week * 7 + 7).map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={styles.cell} />;
            const dateKey = toDateKey(new Date(month.getFullYear(), month.getMonth(), day));
            const selected = dateKey === value;
            return (
              <Pressable key={dateKey} style={[styles.cell, selected && styles.selected]} onPress={() => onChange(dateKey)}>
                <Text style={[styles.day, index === 0 && styles.sunday, dateKey === todayKey && styles.today, selected && styles.selectedText]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { marginTop: 8, borderWidth: 1, borderColor: '#e4ece7', borderRadius: 12, padding: 10, backgroundColor: '#fbfcfb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 6 },
  arrow: { color: '#38856d', fontSize: 22, fontWeight: '700', paddingHorizontal: 6 },
  monthLabel: { color: '#29483d', fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: '#9aa9a1', fontSize: 12, fontWeight: '700', paddingVertical: 4 },
  cell: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  day: { color: '#52635b', fontSize: 14, fontWeight: '600' },
  sunday: { color: '#d47d6c' },
  today: { color: '#327e67', fontWeight: '900', textDecorationLine: 'underline' },
  selected: { backgroundColor: '#327e67' },
  selectedText: { color: '#fff', fontWeight: '800', textDecorationLine: 'none' },
});
