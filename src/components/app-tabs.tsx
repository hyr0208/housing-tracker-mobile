import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { loadAppData, subscribeToProfile } from '@/data/storage';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadAppData().then((data) => setIsLoggedIn(Boolean(data.profile)));
    return subscribeToProfile((profile) => setIsLoggedIn(Boolean(profile)));
  }, []);

  return (
    <NativeTabs
      backgroundColor="#fbfdfb"
      blurEffect="none"
      disableTransparentOnScrollEdge
      iconColor={{ default: '#91a099', selected: '#2f8067' }}
      indicatorColor="#d9efe5"
      shadowColor="#dfe9e3"
      labelStyle={{ selected: { color: '#2f8067' }, default: { color: '#91a099' } }}>
      <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {isLoggedIn && <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Label>내 신청</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>}
    </NativeTabs>
  );
}
