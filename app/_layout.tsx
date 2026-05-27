import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { initializeDb } from '../lib/db';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // SQLiteProvider renders children only after onInit completes,
  // so the DB is guaranteed ready before any child mounts.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SQLiteProvider databaseName="dialysiser.db" onInit={initializeDb} options={{ enableChangeListener: true }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
