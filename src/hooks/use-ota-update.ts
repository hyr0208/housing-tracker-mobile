import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// 앱 시작 시 새 OTA 업데이트가 있으면 받아서 바로 적용한다.
export function useOtaUpdate() {
  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (error) {
        console.warn('OTA 업데이트 확인 실패', error);
      }
    })();
  }, []);
}
