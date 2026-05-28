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

// Resolved by onInit when DB is ready. useEffect awaits it so that
// SplashScreen.hideAsync() is always called after the component tree mounts —
// calling hideAsync() inside onInit directly triggers a state update inside
// ExpoRoot before it has finished mounting, producing the "can't update state
// on an unmounted component" warning.
let resolveDbReady: () => void;
const dbReadyPromise = new Promise<void>(resolve => { resolveDbReady = resolve; });

async function onInit(db: SQLiteDatabase) {
  await initializeDb(db);
  resolveDbReady();
}

export default function RootLayout() {
  useEffect(() => {
    // Hide splash only after mount AND db init are both done.
    dbReadyPromise.then(() => SplashScreen.hideAsync());

    // Both calls must be after mount — expo-notifications triggers internal
    // state updates that crash if called before React is ready.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowAlert: true,
        shouldShowList: true,
      }),
    });
    setupNotificationChannel();
  }, []);

  return (
    <SQLiteProvider databaseName="dialysiser.db" onInit={onInit} options={{ enableChangeListener: true }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
