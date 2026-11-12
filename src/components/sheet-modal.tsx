import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, StyleSheet, useWindowDimensions } from 'react-native';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  backdropColor?: string;
  children: ReactNode;
};

// Modal의 animationType="slide"는 흐린 배경까지 통째로 밀어 올려서, 배경은 제자리에서 흐려지고 시트만 아래에서 올라오게 따로 움직인다.
export function SheetModal({ visible, onRequestClose, backdropColor = 'rgba(33, 55, 46, 0.28)', children }: Props) {
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onRequestClose}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: progress }]} />
      <Animated.View style={[styles.sheetLayer, { transform: [{ translateY }] }]}>{children}</Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetLayer: { flex: 1 },
});
