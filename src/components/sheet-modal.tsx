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

  // 모달이 화면에 붙기 전에 애니메이션을 시작하면 첫 프레임이 끊겨 보여서, 열릴 때는 onShow 뒤에 올린다.
  const open = () => {
    Animated.spring(progress, { toValue: 1, damping: 26, stiffness: 220, mass: 1, overshootClamping: true, useNativeDriver: true }).start();
  };

  useEffect(() => {
    if (visible) {
      if (mounted) open();
      else setMounted(true);
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: 260, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Modal visible={mounted} transparent animationType="none" onShow={open} onRequestClose={onRequestClose}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: backdropOpacity }]} />
      <Animated.View style={[styles.sheetLayer, { transform: [{ translateY }] }]}>{children}</Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetLayer: { flex: 1 },
});
