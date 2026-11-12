import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** 접혀 있을 때 보여줄 지금 고른 조건. 예: "서울 · 국민임대" */
  summary: string;
  initiallyOpen?: boolean;
  children: ReactNode;
};

// 지역·공급유형 칩이 많아 화면이 복잡해 보여서, 평소에는 고른 조건만 한 줄로 보여주고 눌러서 펼친다.
export function CollapsibleFilters({ summary, initiallyOpen = false, children }: Props) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <View style={styles.box}>
      <Pressable style={styles.header} onPress={() => setIsOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
        <Text style={styles.label}>조건</Text>
        <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
        <Text style={styles.action}>{isOpen ? '접기 ▴' : '변경 ▾'}</Text>
      </Pressable>
      {isOpen && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e1ebe5', backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 12 },
  label: { color: '#9aa9a1', fontSize: 12, fontWeight: '800' },
  summary: { flex: 1, color: '#2f5f4f', fontSize: 14, fontWeight: '800' },
  action: { color: '#3f8a72', fontSize: 12, fontWeight: '800' },
  body: { paddingHorizontal: 13, paddingBottom: 13, borderTopWidth: 1, borderTopColor: '#edf2ee' },
});
