import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Android는 화면 끝까지 그려서 바텀시트가 하단 내비게이션 바 아래로 들어가요.
 * 시트 아래 여백에 더할 내비게이션 바 높이를 돌려줍니다. iOS는 기존 여백이 홈 인디케이터를 이미 덮어서 0이에요.
 */
export function useSheetBottomInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'android' ? insets.bottom : 0;
}
