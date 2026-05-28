import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

export default function Index() {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['onboarded'])
      .then(row => {
        setOnboarded(row?.value === '1');
        setReady(true);
      });
  }, [db]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0ea5e9' }} />;
  return <Redirect href={onboarded ? '/(tabs)/dashboard' : '/onboarding'} />;
}
