import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type ConstantsWithEasConfig = typeof Constants & {
  easConfig?: { projectId?: string };
};

/**
 * 알림 권한을 준비하고, 실기기에서만 Expo 원격 푸시 토큰을 가져옵니다.
 * iOS 시뮬레이터에서는 원격 푸시 토큰을 발급할 수 없으므로 앱 내 알림만 사용합니다.
 */
export async function prepareNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '내 차례 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B987B',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted' || !Device.isDevice) return null;

  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    (Constants as ConstantsWithEasConfig).easConfig?.projectId;

  if (!projectId) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
