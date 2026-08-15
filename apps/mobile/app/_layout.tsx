import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreenNative from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth';
import { SocketProvider } from '@/socket';
import { CallProvider } from '@/call-controller';
import { CallListener } from '@/call-listener';
import { PushListener } from '@/push-listener';
import { ThemeProvider, useTheme } from '@/theme';
import { I18nProvider } from '@/i18n';
import { SplashScreen } from '@/splash';

void SplashScreenNative.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { loading } = useAuth();
  const { colors, dark } = useTheme();
  const [nativeHidden, setNativeHidden] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (!nativeHidden) {
      void SplashScreenNative.hideAsync().then(() => setNativeHidden(true)).catch(() => setNativeHidden(true));
    }
  }, [nativeHidden]);

  if (loading || !splashDone) {
    return <SplashScreen ready={!loading} onFinish={() => setSplashDone(true)} />;
  }
  const navigationTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: { ...(dark ? DarkTheme.colors : DefaultTheme.colors), background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.accent },
  };
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
      </Stack>
      <CallListener />
      <PushListener />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <SocketProvider>
              <CallProvider>
                <Navigator />
              </CallProvider>
            </SocketProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
