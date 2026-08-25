const { expo } = require('./app.json');

module.exports = ({ config }) => {
  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
  const plugins = (config.plugins || []).filter((plugin) => plugin !== 'expo-secure-store' && plugin !== 'expo-build-properties');

  if (nativeAppKey) {
    plugins.push([
      '@react-native-kakao/core',
      {
        nativeAppKey,
        ios: { handleKakaoOpenUrl: true },
        android: { authCodeHandlerActivity: true },
      },
    ]);
    plugins.push([
      'expo-build-properties',
      { android: { extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'] } },
    ]);
  }

  return { ...expo, ...config, plugins };
};
