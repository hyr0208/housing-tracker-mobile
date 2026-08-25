# Welcome to your Expo app 👋

## 공개 대기현황 자동 조회

마이홈 공공 API의 단지별 공개 대기인원을 주기적으로 조회하고, 이전 값과 달라지면 알림을 보낼 수 있도록 `server/` 동기화 서버를 포함하고 있습니다. 이 API는 개인별 예비순번이 아니라 단지별 공개 대기인원을 제공합니다.

### 로컬 실행

1. `.env.example`을 참고해 프로젝트 루트 `.env`에 `MYHOME_API_KEY`를 설정합니다.
2. 터미널에서 `npm run server`를 실행합니다.
3. 별도 터미널에서 `npx expo start --dev-client`를 실행합니다.

동기화 서버는 기본적으로 `http://localhost:8787`에서 실행되며, 앱은 `EXPO_PUBLIC_SYNC_SERVER_URL`로 주소를 변경할 수 있습니다. 인증키는 앱에 포함되지 않고 서버에서만 읽습니다.

### 자동 변동 알림

- 앱을 처음 실행하면 알림 권한을 요청합니다.
- 실기기에서는 Expo 푸시 토큰을 서버에 등록하고, 서버가 등록된 신청 내역을 주기적으로 확인합니다.
- 공개 대기인원이 이전 확인값과 달라지면 앱 알림과 푸시 알림을 보냅니다.
- iOS 시뮬레이터는 원격 푸시 토큰을 발급하지 않으므로 앱 내 알림과 로컬 알림으로 동작을 확인합니다.
- 앱이 꺼져 있어도 알림을 받으려면 동기화 서버가 계속 실행 중이어야 합니다. 배포 전에는 `server/`를 항상 켜져 있는 서버에 올려야 합니다.

현재 공식 API가 제공하는 값은 개인 순번이 아닌 단지별 공개 대기인원입니다. 개인 순번 자동 조회는 LH·마이홈의 별도 공식 연동 승인이 필요합니다.

### 카카오 로그인 설정

1. 카카오 디벨로퍼스에서 네이티브 앱 키를 확인하고 iOS 번들 ID `com.anonymous.housing-tracker`, Android 패키지명 `com.anonymous.housingtracker`를 등록합니다.
2. 카카오 로그인을 활성화하고 `profile_nickname` 동의항목을 설정합니다.
3. `.env`에 `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`를 입력합니다.
4. 개발 빌드를 다시 실행합니다.

카카오 로그인은 이 앱의 사용자 계정 연결용입니다. 마이홈 개인순번을 가져오는 로그인으로 사용되지는 않습니다.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
