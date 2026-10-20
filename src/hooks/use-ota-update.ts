import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert, AppState, Platform } from 'react-native';

// 앱 시작·복귀 시 새 OTA 업데이트를 받아두고, 바로 적용할지 사용자에게 묻는다.
// '나중에'를 고르면 받아둔 업데이트는 다음 실행 때 자동으로 적용된다.
export function useOtaUpdate() {
  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;

    let isChecking = false;
    let hasPendingUpdate = false;

    const checkForUpdate = async () => {
      if (isChecking || hasPendingUpdate) return;
      isChecking = true;
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        hasPendingUpdate = true;
        Alert.alert('새로운 업데이트가 있어요', '지금 적용하면 앱이 잠시 다시 시작돼요.', [
          { text: '나중에', style: 'cancel' },
          { text: '지금 적용', onPress: () => void Updates.reloadAsync() },
        ]);
      } catch (error) {
        console.warn('OTA 업데이트 확인 실패', error);
      } finally {
        isChecking = false;
      }
    };

    void checkForUpdate();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForUpdate();
    });
    return () => subscription.remove();
  }, []);
}
