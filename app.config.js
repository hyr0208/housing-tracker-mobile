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
      {
        android: {
          extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'],
          // R8(enableMinifyInReleaseBuilds)을 켜면 카카오 SDK의 Retrofit 호출이 깨져 로그인 중 앱이 종료된다(v9).
          // 필요한 keep 규칙을 기기에서 검증하기 전까지는 끈다.
        },
      },
    ]);
  }

  return { ...expo, ...config, plugins };
};
