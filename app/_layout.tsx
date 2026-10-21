import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { useTheme } from '../src/theme/tokens';
import { useApp } from '../src/store/useApp';
import { ToastHost } from '../src/components/Overlay';
import { QueryClientProvider } from '@tanstack/react-query';
import { qc, useBootstrap } from '../src/lib/queries';
import { useNotificationSchedule } from '../src/lib/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.textContent = 'input,textarea{outline:none!important}';
  document.head.appendChild(st);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic,
  });
  const hydrated = useApp((s) => s.hydrated);
  const { c, isDark } = useTheme();
  const ready = fontsLoaded && hydrated;
  useBootstrap();
  useNotificationSchedule();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  return (
    <QueryClientProvider client={qc}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background }, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="word/[id]" options={{ animation: 'fade_from_bottom', presentation: 'card' }} />
          <Stack.Screen name="review" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="drop" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="find" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="compose" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="postcard/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="age" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
