# XYTEEE Mobile

Expo + React Native client for the existing Xyteee API. It includes secure authentication, token refresh, conversations, live chat, profile editing, system/light/dark themes, and an Expo Notifications registration foundation.

## Requirements

- Node.js 20 or newer
- Android Studio emulator, iOS Simulator on macOS, or a physical device with Expo Go / a development build
- The API running and reachable from the device

## Start

```bash
npm install
npm start
```

The default API URL is `http://10.0.2.2:8000/api/v1`, which reaches the host machine from the standard Android emulator. No `.env` file is needed for that setup.

For a physical device, create `.env` from `.env.example` and set `EXPO_PUBLIC_API_URL` to the development computer's LAN address, for example:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000/api/v1
```

The phone and computer must be on the same network, the API must listen on `0.0.0.0`, and the firewall must allow port `8000`. For iOS Simulator, `http://localhost:8000/api/v1` is typically appropriate. Restart Expo after changing environment variables.

## Notifications

The Profile tab can request notification permission and obtain an Expo push token on a physical device. Registration deliberately tolerates a missing EAS project ID or local push credentials, so local development remains usable. To prepare production push delivery:

1. Configure the EAS project and native push credentials.
2. Add the generated EAS `projectId` to the Expo config.
3. Add an authenticated API endpoint to associate the Expo push token with the current user/device.
4. Send notifications from the backend through Expo Push Service.

Remote push notifications are not supported in an emulator and recent Expo Go versions have platform limitations; use a development build for end-to-end testing.

## Structure

- `app/(auth)` contains login and registration routes.
- `app/(tabs)` contains conversations and profile.
- `app/chat/[id].tsx` is the full-screen chat route.
- `src/api.ts` normalizes the backend contract and rotates secure tokens.
- `src/socket.tsx` maintains a reconnecting, app-state-aware WebSocket.
- `src/notifications.ts` handles permission and Expo token registration.

## Validation

```bash
npm run typecheck
npx expo-doctor
```
