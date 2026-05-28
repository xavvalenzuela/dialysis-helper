import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext, addDatabaseChangeListener } from 'expo-sqlite';
import { Trash2 } from 'lucide-react-native';
import { addWeightEntry, deleteWeightEntry } from '../../lib/data';
import { todayISO, todayFormatted } from '../../lib/db';

type WeightLog = { id: number; date: string; type: 'pre' | 'post'; weight_kg: number };

export default function Weight() {
  const db = useSQLiteContext();
  const [preEntry, setPreEntry] = useState<WeightLog | null>(null);
  const [postEntry, setPostEntry] = useState<WeightLog | null>(null);
  const [type, setType] = useState<'pre' | 'post'>('pre');
  const [weightInput, setWeightInput] = useState('');

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<WeightLog>(
      'SELECT * FROM weight_logs WHERE date = ?',
      [todayISO()],
    );
    setPreEntry(rows.find(r => r.type === 'pre') ?? null);
    setPostEntry(rows.find(r => r.type === 'post') ?? null);
  }, [db]);

  useEffect(() => {
    load();
    const sub = addDatabaseChangeListener(load);
    return () => sub.remove();
  }, [load]);

  const handleSave = async () => {
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0) return;
    await addWeightEntry(db, type, kg);
    setWeightInput('');
  };

  const fluidRemovedKg: number | null = preEntry && postEntry
    ? preEntry.weight_kg - postEntry.weight_kg
    : null;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView>
          <View className="px-4 py-5">
            <Text className="text-2xl font-bold text-sky-700">Weight Log</Text>
            <Text className="text-slate-400 text-sm mt-0.5">{todayFormatted()}</Text>
          </View>

          <View className="mx-4 mb-4 p-4 bg-white rounded-2xl border-8 border-sky-100">
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text className="text-xs text-slate-500 uppercase">Pre-Dialysis</Text>
                <Text className="text-2xl font-bold text-slate-700 mt-1">
                  {preEntry ? `${preEntry.weight_kg}` : '—'}
                </Text>
                <Text className="text-slate-400 text-sm">kg</Text>
                {preEntry && (
                  <TouchableOpacity className="mt-2" onPress={() => deleteWeightEntry(db, preEntry.id)} accessibilityLabel="Delete pre-dialysis weight">
                    <Trash2 size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ width: 1, backgroundColor: '#bae6fd', marginHorizontal: 8 }} />
              <View className="flex-1 items-center">
                <Text className="text-xs text-slate-500 uppercase">Post-Dialysis</Text>
                <Text className="text-2xl font-bold text-slate-700 mt-1">
                  {postEntry ? `${postEntry.weight_kg}` : '—'}
                </Text>
                <Text className="text-slate-400 text-sm">kg</Text>
                {postEntry && (
                  <TouchableOpacity className="mt-2" onPress={() => deleteWeightEntry(db, postEntry.id)} accessibilityLabel="Delete post-dialysis weight">
                    <Trash2 size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {fluidRemovedKg !== null && (
              <View className="mt-4 pt-3 border-t-2 border-sky-200 items-center">
                <Text className="text-slate-500 text-sm">Fluid removed</Text>
                <Text className="text-xl font-bold text-sky-700 mt-0.5">{fluidRemovedKg.toFixed(2)} L</Text>
              </View>
            )}
          </View>

          <View className="mx-4 mb-8 p-4 bg-white rounded-2xl border-8 border-sky-100">
            <View className="flex-row bg-slate-100 rounded-xl p-1 mb-4">
              {(['pre', 'post'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  className={`flex-1 py-2.5 rounded-lg items-center ${type === t ? 'bg-white' : ''}`}
                  onPress={() => setType(t)}
                >
                  <Text className={`font-medium ${type === t ? 'text-sky-700' : 'text-slate-500'}`}>
                    {t === 'pre' ? 'Pre-Dialysis' : 'Post-Dialysis'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              className="border-2 border-slate-300 rounded-xl px-4 py-4 text-xl text-slate-700 mb-4"
              keyboardType="decimal-pad"
              placeholder="Weight in kg"
              placeholderTextColor="#94a3b8"
              value={weightInput}
              onChangeText={setWeightInput}
            />

            <TouchableOpacity className="bg-sky-600 rounded-xl py-4 items-center" onPress={handleSave}>
              <Text className="text-white text-base font-bold">
                Save {type === 'pre' ? 'Pre' : 'Post'}-Dialysis Weight
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
