import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';
import { DoctorProvider } from '@/context/DoctorContext';
import { colors } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <DoctorProvider>
        <RootLayoutNav />
      </DoctorProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const navTheme = DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          primary: colors.sky600,
          background: colors.bg,
          card: '#fff',
          text: colors.ink,
          border: colors.line,
        },
      }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.sky800, headerTitleStyle: { fontWeight: '700' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="request/[id]" options={{ title: 'Nueva solicitud' }} />
        <Stack.Screen name="visit/[id]" options={{ title: 'Visita activa' }} />
        <Stack.Screen name="earnings" options={{ title: 'Ingresos' }} />
        <Stack.Screen name="puntos" options={{ title: 'Medicilio Puntos' }} />
        <Stack.Screen name="verify" options={{ title: 'Verificación' }} />
      </Stack>
    </ThemeProvider>
  );
}
