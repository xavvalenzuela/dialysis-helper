import '../global.css';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { initializeDb } from '../lib/db';

SplashScreen.preventAutoHideAsync();

// Stable module-level reference — calling setState inside onInit fires before
// RootLayout is mounted, so we hide the splash directly from onInit instead.
async function onInit(db: SQLiteDatabase) {
  await initializeDb(db);
  await SplashScreen.hideAsync();
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="dialysiser.db" onInit={onInit} options={{ enableChangeListener: true }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
