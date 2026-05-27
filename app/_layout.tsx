import '../global.css';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { initializeDb } from '../lib/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="dialysiser.db" onInit={initializeDb} options={{ enableChangeListener: true }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
