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
          // Play가 요구하는 코드 최적화(R8). 카카오 SDK는 응답 모델을 리플렉션으로 읽어서 난독화에서 제외한다.
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          extraProguardRules: [
            '-keep class com.kakao.sdk.**.model.* { <fields>; }',
            '-keep class * extends com.google.gson.TypeAdapter',
            '-keep interface com.kakao.sdk.**.*Api',
            '-dontwarn org.bouncycastle.jsse.**',
            '-dontwarn org.conscrypt.*',
            '-dontwarn org.openjsse.**',
          ].join('\n'),
        },
      },
    ]);
  }

  return { ...expo, ...config, plugins };
};
