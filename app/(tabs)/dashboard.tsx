import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext, addDatabaseChangeListener } from 'expo-sqlite';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { todayISO } from '../../lib/db';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type DayData = { fluid: boolean; weight: boolean; bp: boolean; symptoms: boolean };

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function Dashboard() {
  const db = useSQLiteContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [dayData, setDayData] = useState<Record<string, DayData>>({});
  const [userName, setUserName] = useState('');
  const today = todayISO();

  const load = useCallback(async () => {
    const start = isoDate(year, month, 1);
    const end = isoDate(year, month, new Date(year, month + 1, 0).getDate());

    const [fl, wl, bl, sl] = await Promise.all([
      db.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM fluid_logs WHERE date >= ? AND date <= ?', [start, end]),
      db.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM weight_logs WHERE date >= ? AND date <= ?', [start, end]),
      db.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM bp_logs WHERE date >= ? AND date <= ?', [start, end]),
      db.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM symptom_logs WHERE date >= ? AND date <= ?', [start, end]),
    ]);

    const fluid = new Set(fl.map(r => r.date));
    const weight = new Set(wl.map(r => r.date));
    const bp = new Set(bl.map(r => r.date));
    const symptoms = new Set(sl.map(r => r.date));

    const data: Record<string, DayData> = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = isoDate(year, month, d);
      data[dateStr] = {
        fluid: fluid.has(dateStr),
        weight: weight.has(dateStr),
        bp: bp.has(dateStr),
        symptoms: symptoms.has(dateStr),
      };
    }
    setDayData(data);
  }, [db, year, month]);

  useEffect(() => {
    load();
    const sub = addDatabaseChangeListener(load);
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['user_name'])
      .then(row => { if (row?.value) setUserName(row.value); })
      .catch(() => {});
  }, [db]);

  const MIN_YEAR = 2020;
  const MIN_MONTH = 0;
  const atMin = year === MIN_YEAR && month === MIN_MONTH;
  const atMax = year === now.getFullYear() && month === now.getMonth();

  const prevMonth = () => {
    if (atMin) return;
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (atMax) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView>
        <View className="flex-row items-center justify-between px-4 py-5">
          <View>
            <Text className="text-2xl font-bold text-sky-700">Dialysis Helper</Text>
            {userName ? (
              <Text className="text-slate-400 text-sm mt-0.5">Hello, {userName}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => router.push('/onboarding')} className="p-1" accessibilityLabel="Help and onboarding">
            <HelpCircle size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between px-4 mb-4">
          <TouchableOpacity onPress={prevMonth} className="p-2" disabled={atMin} accessibilityLabel="Previous month">
            <ChevronLeft size={24} color={atMin ? '#cbd5e1' : '#0284c7'} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-slate-700">{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} className="p-2" disabled={atMax} accessibilityLabel="Next month">
            <ChevronRight size={24} color={atMax ? '#cbd5e1' : '#0284c7'} />
          </TouchableOpacity>
        </View>

        <View className="flex-row px-2 mb-1">
          {DAYS.map(d => (
            <View key={d} className="flex-1 items-center">
              <Text className="text-xs text-slate-400 font-medium">{d}</Text>
            </View>
          ))}
        </View>

        <View className="px-2">
          {weeks.map((week, wi) => (
            <View key={wi} className="flex-row mb-1">
              {week.map((day, di) => {
                if (!day) return <View key={di} className="flex-1 py-2" />;
                const dateStr = isoDate(year, month, day);
                const data = dayData[dateStr];
                const isToday = dateStr === today;
                const isFuture = dateStr > today;
                const hasDots = data && (data.fluid || data.weight || data.bp || data.symptoms);
                return (
                  <TouchableOpacity
                    key={di}
                    className="flex-1 items-center py-1"
                    onPress={() => router.push(`/day/${dateStr}`)}
                    disabled={isFuture}
                  >
                    <View className={`w-8 h-8 items-center justify-center rounded-full ${isToday ? 'bg-sky-600' : ''}`}>
                      <Text className={`text-sm font-medium ${isToday ? 'text-white' : isFuture ? 'text-slate-300' : 'text-slate-700'}`}>
                        {day}
                      </Text>
                    </View>
                    <View className="flex-row mt-0.5" style={{ gap: 2 }}>
                      {data?.fluid && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#0ea5e9' }} />}
                      {data?.weight && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#22c55e' }} />}
                      {data?.bp && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#ef4444' }} />}
                      {data?.symptoms && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#f59e0b' }} />}
                      {!hasDots && <View style={{ width: 5, height: 5 }} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View className="px-4 mt-6 mb-4">
          <TouchableOpacity
            className="bg-sky-600 rounded-xl py-4 items-center"
            onPress={() => router.push(`/day/${today}`)}
          >
            <Text className="text-white font-bold text-base">Today's Log</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-center px-4 pb-8" style={{ gap: 16 }}>
          {[
            { color: '#0ea5e9', label: 'Fluid' },
            { color: '#22c55e', label: 'Weight' },
            { color: '#ef4444', label: 'BP' },
            { color: '#f59e0b', label: 'Symptoms' },
          ].map(({ color, label }) => (
            <View key={label} className="flex-row items-center" style={{ gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
              <Text className="text-slate-500 text-sm">{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
