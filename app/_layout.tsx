import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { initializeDb } from '../lib/db';
import { setupNotificationChannel } from '../lib/notifications';

SplashScreen.preventAutoHideAsync();

// Stable module-level reference — calling setState inside onInit fires before
// RootLayout is mounted, so we hide the splash directly from onInit instead.
async function onInit(db: SQLiteDatabase) {
  await initializeDb(db);
  await setupNotificationChannel();
  await SplashScreen.hideAsync();
}

export default function RootLayout() {
  // setNotificationHandler must run after mount — calling it at module level
  // triggers an internal expo-notifications state update before React is ready.
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowAlert: true,
        shouldShowList: true,
      }),
    });
  }, []);

  return (
    <SQLiteProvider databaseName="dialysiser.db" onInit={onInit} options={{ enableChangeListener: true }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
