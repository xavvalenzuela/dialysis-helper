import '../global.css';
import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { initializeDb } from '../lib/db';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  // Stable reference — useCallback with [] so SQLiteProvider never sees a new onInit prop
  const onInit = useCallback(async (db: SQLiteDatabase) => {
    await initializeDb(db);
    setDbReady(true);
  }, []);

  useEffect(() => {
    if (dbReady) SplashScreen.hideAsync();
  }, [dbReady]);

  return (
    <SQLiteProvider databaseName="dialysiser.db" onInit={onInit} options={{ enableChangeListener: true }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
