import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext, addDatabaseChangeListener } from 'expo-sqlite';
import { Trash2 } from 'lucide-react-native';
import { addBpEntry, deleteBpEntry } from '../../lib/data';
import { todayISO, todayFormatted } from '../../lib/db';

type BpLog = { id: number; systolic: number; diastolic: number; pulse: number | null; created_at: string };

function bpStatus(systolic: number, diastolic: number) {
  if (systolic >= 180 || diastolic >= 120) return { label: 'Crisis', color: '#dc2626' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'High', color: '#ea580c' };
  if (systolic >= 130 || diastolic >= 80) return { label: 'Elevated', color: '#d97706' };
  if (systolic < 90 || diastolic < 60) return { label: 'Low', color: '#7c3aed' };
  return { label: 'Normal', color: '#16a34a' };
}

export default function BloodPressure() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<BpLog[]>([]);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const diastolicRef = useRef<TextInput>(null);
  const pulseRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<BpLog>(
      'SELECT id, systolic, diastolic, pulse, created_at FROM bp_logs WHERE date = ? ORDER BY created_at DESC',
      [todayISO()],
    );
    setEntries(rows);
  }, [db]);

  useEffect(() => {
    load();
    const sub = addDatabaseChangeListener(load);
    return () => sub.remove();
  }, [load]);

  const handleSave = async () => {
    const s = parseInt(systolic);
    const d = parseInt(diastolic);
    const p = pulse.trim() ? parseInt(pulse) : null;
    if (!s || !d || s <= 0 || d <= 0) return;
    if (p !== null && p <= 0) return;
    await addBpEntry(db, s, d, p);
    setSystolic('');
    setDiastolic('');
    setPulse('');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView>
          <View className="px-4 py-5">
            <Text className="text-2xl font-bold text-sky-700">Blood Pressure</Text>
            <Text className="text-slate-400 text-sm mt-0.5">{todayFormatted()}</Text>
          </View>

          <View className="mx-4 mb-4 rounded-2xl border border-sky-100 bg-white p-4">
            <View className="flex-row mb-1" style={{ gap: 10 }}>
              <TextInput
                className="flex-1 border border-sky-100 rounded-xl px-3 py-4 text-lg text-slate-700 text-center"
                keyboardType="numeric"
                placeholder="Sys"
                placeholderTextColor="#94a3b8"
                value={systolic}
                onChangeText={setSystolic}
                returnKeyType="next"
                onSubmitEditing={() => diastolicRef.current?.focus()}
              />
              <TextInput
                ref={diastolicRef}
                className="flex-1 border border-sky-100 rounded-xl px-3 py-4 text-lg text-slate-700 text-center"
                keyboardType="numeric"
                placeholder="Dia"
                placeholderTextColor="#94a3b8"
                value={diastolic}
                onChangeText={setDiastolic}
                returnKeyType="next"
                onSubmitEditing={() => pulseRef.current?.focus()}
              />
              <TextInput
                ref={pulseRef}
                className="flex-1 border border-sky-100 rounded-xl px-3 py-4 text-lg text-slate-700 text-center"
                keyboardType="numeric"
                placeholder="bpm"
                placeholderTextColor="#94a3b8"
                value={pulse}
                onChangeText={setPulse}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
            <View className="flex-row mb-4" style={{ gap: 10 }}>
              <Text className="flex-1 text-center text-xs text-slate-400">Systolic</Text>
              <Text className="flex-1 text-center text-xs text-slate-400">Diastolic</Text>
              <Text className="flex-1 text-center text-xs text-slate-400">Pulse (opt.)</Text>
            </View>

            <TouchableOpacity className="bg-sky-600 rounded-xl py-4 items-center" onPress={handleSave}>
              <Text className="text-white text-base font-bold">Log Reading</Text>
            </TouchableOpacity>
          </View>

          {entries.length > 0 && (
            <View className="mx-4 mb-8 rounded-2xl border border-sky-100 bg-white p-4">
              <Text className="text-slate-400 text-xs font-semibold uppercase mb-2">Today's Readings</Text>
              {entries.map((e) => {
                const status = bpStatus(e.systolic, e.diastolic);
                return (
                  <View key={e.id} className="flex-row items-center justify-between py-3 border-b border-sky-50">
                    <View>
                      <Text className="text-slate-700 font-semibold text-base">
                        {e.systolic}/{e.diastolic}
                        {e.pulse != null && (
                          <Text className="text-slate-400 font-normal"> · {e.pulse} bpm</Text>
                        )}
                      </Text>
                      <Text style={{ color: status.color, fontSize: 12 }}>{status.label}</Text>
                    </View>
                    <View className="flex-row items-center" style={{ gap: 12 }}>
                      <Text className="text-slate-400 text-sm">{e.created_at.slice(11, 16)}</Text>
                      <TouchableOpacity onPress={() => deleteBpEntry(db, e.id)}>
                        <Trash2 size={16} color="#cbd5e1" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
