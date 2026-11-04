import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type TrendPoint = {
  value: number;
  recordedAt: string;
};

type TrendChartProps = {
  title: string;
  points: TrendPoint[];
  unit: string;
  emptyText: string;
};

const CHART_HEIGHT = 96;
const DOT = 7;

function formatDay(recordedAt: string) {
  const date = new Date(recordedAt);
  return Number.isNaN(date.getTime()) ? recordedAt : `${date.getMonth() + 1}.${date.getDate()}`;
}

// 순번·대기인원처럼 날짜별로 바뀌는 값을 선 그래프로 그린다.
// 새 네이티브 라이브러리 없이(OTA로 배포 가능하게) View를 회전시켜 선분을 만든다.
export function TrendChart({ title, points, unit, emptyText }: TrendChartProps) {
  const [width, setWidth] = useState(0);
  // 지난 기록을 나중에 끼워 넣을 수 있으므로 날짜순으로 정렬해서 그린다.
  const recent = [...points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).slice(-12);

  if (recent.length < 2) {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.empty}>{emptyText}</Text>
      </View>
    );
  }

  const values = recent.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const innerWidth = Math.max(0, width - DOT);
  const coords = recent.map((point, index) => ({
    x: (index / (recent.length - 1)) * innerWidth + DOT / 2,
    // 값이 클수록 위에 그린다. 값이 모두 같으면 가운데 한 줄로 그린다.
    y: max === min ? CHART_HEIGHT / 2 : ((max - point.value) / range) * (CHART_HEIGHT - DOT) + DOT / 2,
  }));
  const first = recent[0];
  const last = recent[recent.length - 1];
  const diff = last.value - first.value;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.summary}>{diff === 0 ? '변동 없음' : `${diff < 0 ? '↓' : '↑'} ${Math.abs(diff)}${unit}`}</Text>
      </View>
      <View style={styles.chart} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && coords.slice(1).map((end, index) => {
          const start = coords[index];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          return <View key={`line-${index}`} style={[styles.line, { width: length, left: (start.x + end.x) / 2 - length / 2, top: (start.y + end.y) / 2 - 1, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }]} />;
        })}
        {width > 0 && coords.map((point, index) => <View key={`dot-${index}`} style={[styles.dot, index === coords.length - 1 && styles.lastDot, { left: point.x - DOT / 2, top: point.y - DOT / 2 }]} />)}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{formatDay(first.recordedAt)} · {first.value}{unit}</Text>
        <Text style={styles.axisText}>{formatDay(last.recordedAt)} · {last.value}{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', marginTop: 12, borderRadius: 12, backgroundColor: '#f7faf8', paddingHorizontal: 14, paddingVertical: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#587368', fontSize: 12, fontWeight: '800' },
  summary: { color: '#428b72', fontSize: 12, fontWeight: '800' },
  empty: { color: '#9aa9a1', fontSize: 11, marginTop: 6 },
  chart: { height: CHART_HEIGHT, marginTop: 10 },
  line: { position: 'absolute', height: 2, borderRadius: 1, backgroundColor: '#83c4aa' },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#fff', borderWidth: 2, borderColor: '#4ba989' },
  lastDot: { backgroundColor: '#327e67', borderColor: '#327e67' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { color: '#9aa9a1', fontSize: 11 },
});
