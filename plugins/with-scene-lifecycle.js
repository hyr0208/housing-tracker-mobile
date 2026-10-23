const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// iOS 27 SDK로 빌드한 앱은 UIScene 생명주기를 쓰지 않으면 실행 직후 종료된다.
// Expo 57 템플릿은 아직 AppDelegate에서 창을 만들므로, Expo가 제공하는
// ExpoAppSceneDelegate(EXExpoAppSceneDelegate)가 창을 만들고 React Native를 시작하도록 바꾼다.

const WINDOW_SETUP = /\n#if os\(iOS\) \|\| os\(tvOS\)\n {4}window = UIWindow\(frame: UIScreen\.main\.bounds\)\n {4}factory\.startReactNative\(\n[\s\S]*?\n#endif\n/;

function withSceneInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle: Swift AppDelegate만 지원합니다.');
    }
    let contents = config.modResults.contents;
    if (!contents.includes('ExpoReactNativeFactoryProvider')) {
      contents = contents.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
    }
    if (WINDOW_SETUP.test(contents)) {
      contents = contents.replace(WINDOW_SETUP, '\n    // 창 생성과 React Native 시작은 ExpoAppSceneDelegate가 맡는다.\n');
    }
    if (!contents.includes('ExpoReactNativeFactoryProvider') || contents.includes('UIWindow(frame: UIScreen.main.bounds)')) {
      throw new Error('with-scene-lifecycle: AppDelegate 템플릿이 예상과 달라 수정하지 못했습니다.');
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneInfoPlist(config));
};
