import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { syncPendingRounds } from '@/constants/round-sync';
import { CoursesProvider } from '@/context/courses-context';
import { TabBarProvider } from '@/context/tab-bar-context';

SplashScreen.preventAutoHideAsync().catch(console.warn);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void syncPendingRounds();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <CoursesProvider>
        <TabBarProvider>
          <AppTabs />
        </TabBarProvider>
      </CoursesProvider>
    </ThemeProvider>
  );
}
