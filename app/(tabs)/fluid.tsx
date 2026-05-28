import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext, addDatabaseChangeListener } from 'expo-sqlite';
import { Settings2, Trash2 } from 'lucide-react-native';
import ProgressRing from '../../components/ProgressRing';
import { addFluidEntry, deleteFluidEntry, updateSetting, getSetting } from '../../lib/data';
import { todayISO, todayFormatted } from '../../lib/db';
import { DEFAULT_FLUID_LIMIT_ML, DEFAULT_TAP_AMOUNT_ML, fluidColor, FLUID_WARN_THRESHOLD } from '../../lib/constants';

type FluidLog = { id: number; date: string; amount_ml: number; created_at: string };

function getStatus(progress: number, remaining: number) {
  if (progress >= 1)                    return { msg: 'Daily limit reached', color: fluidColor(progress) };
  if (progress >= FLUID_WARN_THRESHOLD) return { msg: `${remaining} ml remaining — limit approaching`, color: fluidColor(progress) };
  return { msg: `${remaining} ml remaining today`, color: '#64748b' };
}

export default function Fluid() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<FluidLog[]>([]);
  const [limit, setLimit] = useState(DEFAULT_FLUID_LIMIT_ML);
  const [tapAmount, setTapAmount] = useState(DEFAULT_TAP_AMOUNT_ML);
  const [showSettings, setShowSettings] = useState(false);
  const [limitInput, setLimitInput] = useState(String(DEFAULT_FLUID_LIMIT_ML));
  const [tapInput, setTapInput] = useState(String(DEFAULT_TAP_AMOUNT_ML));
  const [tapping, setTapping] = useState(false);

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<FluidLog>(
      'SELECT * FROM fluid_logs WHERE date = ? ORDER BY created_at ASC',
      [todayISO()],
    );
    setEntries(rows);
    const lim = await getSetting(db, 'fluid_limit_ml');
    const tap = await getSetting(db, 'fluid_tap_ml');
    const limNum = Number(lim);
    const tapNum = Number(tap);
    if (lim && !isNaN(limNum) && limNum > 0) { setLimit(limNum); setLimitInput(lim); }
    if (tap && !isNaN(tapNum) && tapNum > 0) { setTapAmount(tapNum); setTapInput(tap); }
  }, [db]);

  useEffect(() => {
    load();
    const sub = addDatabaseChangeListener(load);
    return () => sub.remove();
  }, [load]);

  const total = entries.reduce((sum, e) => sum + e.amount_ml, 0);
  const progress = total / limit;
  const remaining = Math.max(0, limit - total);
  const isOver = total > limit;
  const status = getStatus(progress, remaining);

  const saveSettings = async () => {
    const l = Number(limitInput);
    const t = Number(tapInput);
    if (!l || !t || l <= 0 || t <= 0) return;
    await updateSetting(db, 'fluid_limit_ml', String(l));
    await updateSetting(db, 'fluid_tap_ml', String(t));
    setLimit(l);
    setTapAmount(t);
    setShowSettings(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView>
        <View className="flex-row items-center justify-between px-4 py-5">
          <View>
            <Text className="text-2xl font-bold text-sky-700">Fluid Intake</Text>
            <Text className="text-slate-400 text-sm mt-0.5">{todayFormatted()}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(s => !s)} accessibilityLabel="Fluid settings">
            <Settings2 size={22} color="#0284c7" />
          </TouchableOpacity>
        </View>

        {showSettings && (
          <View className="mx-4 mb-4 p-4 bg-sky-50 rounded-2xl border-8 border-sky-100">
            <Text className="font-semibold text-slate-700 mb-3">Settings</Text>
            <View className="flex-row items-center mb-3">
              <Text className="text-slate-600 flex-1">Daily limit (ml)</Text>
              <TextInput
                className="border-2 border-sky-200 rounded-lg px-3 py-1.5 w-24 text-center text-slate-700"
                keyboardType="numeric"
                value={limitInput}
                onChangeText={setLimitInput}
              />
            </View>
            <View className="flex-row items-center mb-4">
              <Text className="text-slate-600 flex-1">Tap amount (ml)</Text>
              <TextInput
                className="border-2 border-sky-200 rounded-lg px-3 py-1.5 w-24 text-center text-slate-700"
                keyboardType="numeric"
                value={tapInput}
                onChangeText={setTapInput}
              />
            </View>
            <TouchableOpacity className="bg-sky-600 rounded-xl py-2.5 items-center" onPress={saveSettings}>
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main progress card */}
        <View className="mx-4 mb-4 rounded-2xl border-8 border-sky-100 bg-white overflow-hidden">
          <View className="items-center pt-6 pb-2">
            <ProgressRing
              progress={progress}
              size={200}
              strokeWidth={20}
              label={`${total} / ${limit} ml`}
              sublabel={isOver ? `${total - limit} ml over limit` : `${remaining} ml remaining`}
            />
          </View>

          {/* Status line */}
          <View className="px-4 pb-1">
            <Text className="text-center text-sm" style={{ color: status.color }}>{status.msg}</Text>
          </View>

          {/* Stats row */}
          <View className="flex-row border-t-2 border-sky-50 mx-4 mt-2 pt-3 pb-2" style={{ gap: 0 }}>
            <View className="flex-1 items-center">
              <Text className="text-xl font-bold text-sky-700">{entries.length}</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{entries.length === 1 ? 'sip' : 'sips'}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#e0f2fe' }} />
            <View className="flex-1 items-center">
              <Text className="text-xl font-bold text-sky-700">{total}</Text>
              <Text className="text-xs text-slate-400 mt-0.5">ml total</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#e0f2fe' }} />
            <View className="flex-1 items-center">
              <Text className="text-xl font-bold" style={{ color: isOver ? '#ef4444' : '#16a34a' }}>
                {isOver ? `+${total - limit}` : remaining}
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">{isOver ? 'over' : 'left'}</Text>
            </View>
          </View>

          {/* Tap button */}
          <View className="px-4 pb-4 pt-2">
            <TouchableOpacity
              className="rounded-2xl py-5 items-center"
              style={{ backgroundColor: fluidColor(progress) }}
              onPress={async () => {
                if (tapping) return;
                setTapping(true);
                try { await addFluidEntry(db, tapAmount); } finally { setTapping(false); }
              }}
              disabled={tapping}
              activeOpacity={0.8}
            >
              <Text className="text-white text-xl font-bold">💧 + {tapAmount} ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Log card */}
        {entries.length > 0 && (
          <View className="mx-4 mb-8 rounded-2xl border-8 border-sky-100 bg-white p-4">
            <Text className="text-slate-400 text-xs font-semibold uppercase mb-2">
              Today's Log · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
            {entries.map((e, i) => (
              <View key={e.id} className="flex-row items-center justify-between py-3 border-b-2 border-sky-50">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>💧</Text>
                  <Text className="text-slate-700 font-medium">{e.amount_ml} ml</Text>
                  <Text className="text-slate-300 text-sm">#{i + 1}</Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <Text className="text-slate-400 text-sm">{e.created_at.slice(11, 16)}</Text>
                  <TouchableOpacity onPress={() => deleteFluidEntry(db, e.id)} accessibilityLabel="Delete fluid entry">
                    <Trash2 size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
