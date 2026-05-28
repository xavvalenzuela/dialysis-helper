import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext, addDatabaseChangeListener } from 'expo-sqlite';
import { addSymptomEntry } from '../../lib/data';
import { todayISO, todayFormatted } from '../../lib/db';

const SYMPTOMS = ['Chills', 'Cramping', 'Fatigue', 'Nausea', 'Headache'] as const;
type SymptomLog = { id: number; symptoms: string; notes: string | null };

export default function Symptoms() {
  const db = useSQLiteContext();
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [existing, setExisting] = useState<SymptomLog | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const row = await db.getFirstAsync<SymptomLog>(
      'SELECT id, symptoms, notes FROM symptom_logs WHERE date = ?',
      [todayISO()],
    );
    setExisting(row ?? null);
    if (row) {
      try {
        setSelected(JSON.parse(row.symptoms) as string[]);
      } catch {
        setSelected([]);
      }
      setNotes(row.notes ?? '');
    }
  }, [db]);

  useEffect(() => {
    load();
    const sub = addDatabaseChangeListener(load);
    return () => sub.remove();
  }, [load]);

  const toggle = (symptom: string) => {
    setSelected(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom],
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await addSymptomEntry(db, selected, notes);
      setSaved(true);
    } catch {
      Alert.alert('Error', 'Could not save entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView>
          <View className="px-4 py-5">
            <Text className="text-2xl font-bold text-sky-700">Symptom Journal</Text>
            <Text className="text-slate-400 text-sm mt-0.5">{todayFormatted()}</Text>
          </View>

          <View className="mx-4 mb-8 p-4 bg-white rounded-2xl border-8 border-sky-100">
            <Text className="text-slate-400 text-xs font-semibold uppercase mb-3">Symptoms</Text>
            <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
              {SYMPTOMS.map(symptom => (
                <TouchableOpacity
                  key={symptom}
                  className={`px-4 py-2.5 rounded-full border-2 ${
                    selected.includes(symptom)
                      ? 'bg-sky-600 border-sky-600'
                      : 'bg-white border-sky-100'
                  }`}
                  onPress={() => toggle(symptom)}
                >
                  <Text className={selected.includes(symptom) ? 'text-white font-medium' : 'text-slate-600'}>
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-slate-400 text-xs font-semibold uppercase mb-3">Notes</Text>
            <TextInput
              className="border-2 border-sky-100 rounded-xl px-4 py-3 text-slate-700 mb-4"
              style={{ minHeight: 96, textAlignVertical: 'top' }}
              multiline
              placeholder="Any concerns, how you're feeling..."
              placeholderTextColor="#94a3b8"
              value={notes}
              onChangeText={(t) => { setNotes(t); setSaved(false); }}
            />

            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${saved ? 'bg-green-500' : 'bg-sky-600'}`}
              onPress={handleSave}
              disabled={saving}
            >
              <Text className="text-white text-base font-bold">
                {saved ? '✓ Saved' : existing ? 'Update Entry' : 'Save Entry'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
