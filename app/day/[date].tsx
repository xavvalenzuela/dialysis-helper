import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext, addDatabaseChangeListener } from 'expo-sqlite';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Droplets, Scale, Heart, FileText, Trash2, Download } from 'lucide-react-native';
import { File as FsFile, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import {
  addFluidEntry, deleteFluidEntry,
  addWeightEntry, deleteWeightEntry,
  addBpEntry, deleteBpEntry,
  addSymptomEntry, addDocument,
  getSetting,
} from '../../lib/data';

const SYMPTOMS = ['Chills', 'Cramping', 'Fatigue', 'Nausea', 'Headache'] as const;

type FluidLog = { id: number; amount_ml: number; created_at: string };
type WeightLog = { id: number; type: 'pre' | 'post'; weight_kg: number };
type BpLog = { id: number; systolic: number; diastolic: number; pulse: number | null; created_at: string };
type SymptomLog = { id: number; symptoms: string; notes: string | null };

function formatDate(d: string) {
  const dt = new Date(`${d}T12:00:00`);
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bpStatus(systolic: number, diastolic: number) {
  if (systolic >= 180 || diastolic >= 120) return { label: 'Crisis', color: '#dc2626' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'High', color: '#ea580c' };
  if (systolic >= 130 || diastolic >= 80) return { label: 'Elevated', color: '#d97706' };
  if (systolic < 90 || diastolic < 60) return { label: 'Low', color: '#7c3aed' };
  return { label: 'Normal', color: '#16a34a' };
}

export default function DayDetail() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const db = useSQLiteContext();

  const [fluidLogs, setFluidLogs] = useState<FluidLog[]>([]);
  const [fluidLimit, setFluidLimit] = useState(950);
  const [tapAmount, setTapAmount] = useState(300);

  const [preEntry, setPreEntry] = useState<WeightLog | null>(null);
  const [postEntry, setPostEntry] = useState<WeightLog | null>(null);
  const [weightType, setWeightType] = useState<'pre' | 'post'>('pre');
  const [weightInput, setWeightInput] = useState('');

  const [bpLogs, setBpLogs] = useState<BpLog[]>([]);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const diastolicRef = useRef<TextInput>(null);
  const pulseRef = useRef<TextInput>(null);

  const [userName, setUserName] = useState('');
  const [symptomLog, setSymptomLog] = useState<SymptomLog | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [symptomSaved, setSymptomSaved] = useState(false);
  const [savingWeight, setSavingWeight] = useState(false);
  const [savingBp, setSavingBp] = useState(false);
  const [savingSymptoms, setSavingSymptoms] = useState(false);
  const [tapping, setTapping] = useState(false);
  // prevent DB reload from clobbering unsaved symptom edits
  const symptomDirty = useRef(false);

  const load = useCallback(async () => {
    if (!date) return;
    const [fl, wl, bl, sl, lim, tap, nameRow] = await Promise.all([
      db.getAllAsync<FluidLog>('SELECT id, amount_ml, created_at FROM fluid_logs WHERE date = ? ORDER BY created_at ASC', [date]),
      db.getAllAsync<WeightLog>('SELECT id, type, weight_kg FROM weight_logs WHERE date = ?', [date]),
      db.getAllAsync<BpLog>('SELECT id, systolic, diastolic, pulse, created_at FROM bp_logs WHERE date = ? ORDER BY created_at DESC', [date]),
      db.getFirstAsync<SymptomLog>('SELECT id, symptoms, notes FROM symptom_logs WHERE date = ?', [date]),
      getSetting(db, 'fluid_limit_ml'),
      getSetting(db, 'fluid_tap_ml'),
      db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['user_name']),
    ]);
    setFluidLogs(fl);
    setPreEntry(wl.find(w => w.type === 'pre') ?? null);
    setPostEntry(wl.find(w => w.type === 'post') ?? null);
    setBpLogs(bl);
    if (!symptomDirty.current) {
      setSymptomLog(sl ?? null);
      let parsedSymptoms: string[] = [];
      try {
        if (sl?.symptoms) parsedSymptoms = JSON.parse(sl.symptoms) as string[];
      } catch { /* fallback to empty */ }
      setSelectedSymptoms(parsedSymptoms);
      setNotes(sl?.notes ?? '');
    }
    const limNum = Number(lim);
    const tapNum = Number(tap);
    if (lim && !isNaN(limNum) && limNum > 0) setFluidLimit(limNum);
    if (tap && !isNaN(tapNum) && tapNum > 0) setTapAmount(tapNum);
    if (nameRow?.value) setUserName(nameRow.value);
  }, [db, date]);

  useEffect(() => {
    load();
    const sub = addDatabaseChangeListener(load);
    return () => sub.remove();
  }, [load]);

  const fluidTotal = fluidLogs.reduce((s, e) => s + e.amount_ml, 0);
  const fluidRemoved = preEntry && postEntry
    ? (preEntry.weight_kg - postEntry.weight_kg).toFixed(2)
    : null;

  const handleSaveWeight = async () => {
    if (!date) return;
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0) return;
    setSavingWeight(true);
    try {
      await addWeightEntry(db, weightType, kg, date);
      setWeightInput('');
    } finally {
      setSavingWeight(false);
    }
  };

  const handleSaveBp = async () => {
    if (!date) return;
    const s = parseInt(systolic, 10);
    const d = parseInt(diastolic, 10);
    const p = pulse.trim() ? parseInt(pulse, 10) : null;
    if (isNaN(s) || isNaN(d) || s < 40 || s > 300 || d < 20 || d > 200) return;
    if (p !== null && (isNaN(p) || p < 20 || p > 300)) return;
    setSavingBp(true);
    try {
      await addBpEntry(db, s, d, p, date);
      setSystolic(''); setDiastolic(''); setPulse('');
    } finally {
      setSavingBp(false);
    }
  };

  const toggleSymptom = (symptom: string) => {
    symptomDirty.current = true;
    setSymptomSaved(false);
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom],
    );
  };

  const handleSaveSymptoms = async () => {
    if (!date) return;
    setSavingSymptoms(true);
    try {
      await addSymptomEntry(db, selectedSymptoms, notes, date);
      symptomDirty.current = false;
      setSymptomSaved(true);
    } catch {
      Alert.alert('Error', 'Could not save symptoms.');
    } finally {
      setSavingSymptoms(false);
    }
  };

  const handleExport = async () => {
    if (!date) return;

    const fluidRows = fluidLogs.length === 0
      ? '<p class="empty">No fluid logged</p>'
      : `<div class="row"><span class="lbl">Total</span><span class="val">${fluidTotal} ml / ${fluidLimit} ml</span></div>
         <div class="row"><span class="lbl">Remaining</span><span class="val">${Math.max(0, fluidLimit - fluidTotal)} ml</span></div>
         ${fluidLogs.map(e => `<div class="entry">• ${e.amount_ml} ml <span class="dim">${e.created_at.slice(11, 16)}</span></div>`).join('')}`;

    const weightRows = `
      <div class="row"><span class="lbl">Pre-dialysis</span><span class="val">${preEntry ? `${preEntry.weight_kg} kg` : '—'}</span></div>
      <div class="row"><span class="lbl">Post-dialysis</span><span class="val">${postEntry ? `${postEntry.weight_kg} kg` : '—'}</span></div>
      ${fluidRemoved !== null ? `<div class="row"><span class="lbl">Fluid removed</span><span class="val">${fluidRemoved} L</span></div>` : ''}`;

    const statusColor: Record<string, string> = {
      Normal: '#16a34a', Elevated: '#d97706', High: '#ea580c', Crisis: '#dc2626', Low: '#7c3aed',
    };
    const bpRows = bpLogs.length === 0
      ? '<p class="empty">No readings logged</p>'
      : [...bpLogs].reverse().map(bp => {
          const { label } = bpStatus(bp.systolic, bp.diastolic);
          const pulseStr = bp.pulse != null ? ` · ${bp.pulse} bpm` : '';
          return `<div class="entry">${bp.systolic}/${bp.diastolic}${pulseStr} <span style="color:${statusColor[label] ?? '#64748b'};font-size:12px">${label}</span> <span class="dim">${bp.created_at.slice(11, 16)}</span></div>`;
        }).join('');

    const symptomRows = selectedSymptoms.length === 0 && !notes.trim()
      ? '<p class="empty">No symptoms logged</p>'
      : `${selectedSymptoms.map(s => `<span class="chip">${s}</span>`).join('')}
         ${notes.trim() ? `<div class="notes">${escHtml(notes.trim())}</div>` : ''}`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;color:#1e293b;padding:36px;font-size:14px}
  h1{color:#0284c7;font-size:22px;margin:0 0 4px}
  .patient{color:#1e293b;font-size:15px;font-weight:600;margin-bottom:2px}
  .date{color:#64748b;font-size:13px;margin-bottom:28px}
  .section{margin-bottom:22px}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px}
  .row{display:flex;justify-content:space-between;padding:4px 0}
  .lbl{color:#64748b}.val{font-weight:600}
  .entry{padding:5px 0;border-bottom:1px solid #f1f5f9}
  .dim{color:#94a3b8;font-size:12px;margin-left:6px}
  .chip{display:inline-block;background:#e0f2fe;color:#0369a1;border-radius:12px;padding:3px 10px;font-size:12px;margin:2px}
  .notes{background:#f8fafc;border-left:3px solid #bae6fd;padding:8px 12px;font-size:13px;color:#475569;margin-top:8px;border-radius:4px}
  .empty{color:#94a3b8;font-style:italic;margin:0;font-size:13px}
  .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center}
</style></head><body>
  <h1>Dialysis Helper — Day Log</h1>
  ${userName ? `<div class="patient">${escHtml(userName)}</div>` : ''}
  <div class="date">${formatDate(date)}</div>
  <div class="section"><div class="section-title">Fluid Intake</div>${fluidRows}</div>
  <div class="section"><div class="section-title">Weight</div>${weightRows}</div>
  <div class="section"><div class="section-title">Blood Pressure</div>${bpRows}</div>
  <div class="section"><div class="section-title">Symptoms</div>${symptomRows}</div>
  <div class="footer">Exported from Dialysis Helper</div>
</body></html>`;

    try {
      const { uri: tempUri } = await Print.printToFileAsync({ html });
      const fileName = `log_${date}.pdf`;
      const destFile = new FsFile(Paths.document, fileName);
      await new FsFile(tempUri).copy(destFile, { overwrite: true });

      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM documents WHERE uri = ?', [destFile.uri],
      );
      if (!existing) {
        await addDocument(db, `Day Log — ${date}`, 'log', destFile.uri);
      }
      Alert.alert('Exported', 'PDF saved to Documents → Logs');
    } catch (err) {
      console.error('[DayLog] export error:', err);
      Alert.alert('Error', 'Could not export the log.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView>
          <View className="flex-row items-center px-4 py-5">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <ChevronLeft size={24} color="#0284c7" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-sky-700">Day Log</Text>
              <Text className="text-slate-500 text-sm">{date ? formatDate(date) : ''}</Text>
            </View>
            <TouchableOpacity onPress={handleExport} className="p-2">
              <Download size={20} color="#0284c7" />
            </TouchableOpacity>
          </View>

          {/* Fluid */}
          <SectionCard icon={<Droplets size={16} color="#0284c7" />} title="Fluid Intake">
            <View className="items-center py-2 mb-4">
              <Text className="text-3xl font-bold text-slate-700">
                {fluidTotal}{' '}
                <Text className="text-lg font-normal text-slate-400">/ {fluidLimit} ml</Text>
              </Text>
              <Text className="text-slate-400 text-sm mt-1">
                {Math.max(0, fluidLimit - fluidTotal)} ml remaining
              </Text>
            </View>
            <TouchableOpacity
              className="bg-sky-600 rounded-xl py-4 items-center mb-4"
              onPress={async () => {
                if (tapping) return;
                setTapping(true);
                try { await addFluidEntry(db, tapAmount, date); } finally { setTapping(false); }
              }}
              disabled={tapping}
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold">+ {tapAmount} ml</Text>
            </TouchableOpacity>
            {fluidLogs.map(e => (
              <View key={e.id} className="flex-row items-center justify-between py-2.5 border-b-2 border-sky-50">
                <Text className="text-slate-700 font-medium">{e.amount_ml} ml</Text>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <Text className="text-slate-400 text-sm">{e.created_at.slice(11, 16)}</Text>
                  <TouchableOpacity onPress={() => deleteFluidEntry(db, e.id)}>
                    <Trash2 size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {fluidLogs.length === 0 && <Text className="text-slate-400 text-sm">No fluid logged</Text>}
          </SectionCard>

          {/* Weight */}
          <SectionCard icon={<Scale size={16} color="#16a34a" />} title="Weight">
            <View className="flex-row mb-4">
              <View className="flex-1 items-center">
                <Text className="text-xs text-slate-500 uppercase">Pre-Dialysis</Text>
                <Text className="text-2xl font-bold text-slate-700 mt-1">
                  {preEntry ? `${preEntry.weight_kg} kg` : '—'}
                </Text>
                {preEntry && (
                  <TouchableOpacity className="mt-1" onPress={() => deleteWeightEntry(db, preEntry.id)}>
                    <Trash2 size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ width: 1, backgroundColor: '#e2e8f0', marginHorizontal: 8 }} />
              <View className="flex-1 items-center">
                <Text className="text-xs text-slate-500 uppercase">Post-Dialysis</Text>
                <Text className="text-2xl font-bold text-slate-700 mt-1">
                  {postEntry ? `${postEntry.weight_kg} kg` : '—'}
                </Text>
                {postEntry && (
                  <TouchableOpacity className="mt-1" onPress={() => deleteWeightEntry(db, postEntry.id)}>
                    <Trash2 size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {fluidRemoved !== null && (
              <View className="mb-4 pt-3 border-t-2 border-sky-50 items-center">
                <Text className="text-slate-500 text-sm">Fluid removed</Text>
                <Text className="text-xl font-bold text-sky-700 mt-0.5">{fluidRemoved} L</Text>
              </View>
            )}
            <View className="flex-row bg-slate-100 rounded-xl p-1 mb-3">
              {(['pre', 'post'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  className={`flex-1 py-2.5 rounded-lg items-center ${weightType === t ? 'bg-white' : ''}`}
                  onPress={() => setWeightType(t)}
                >
                  <Text className={`font-medium text-sm ${weightType === t ? 'text-sky-700' : 'text-slate-500'}`}>
                    {t === 'pre' ? 'Pre-Dialysis' : 'Post-Dialysis'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              className="border-2 border-sky-100 rounded-xl px-4 py-3 text-lg text-slate-700 mb-3"
              keyboardType="decimal-pad"
              placeholder="Weight in kg"
              placeholderTextColor="#94a3b8"
              value={weightInput}
              onChangeText={setWeightInput}
            />
            <TouchableOpacity className="bg-sky-600 rounded-xl py-3 items-center" onPress={handleSaveWeight} disabled={savingWeight}>
              <Text className="text-white font-bold">
                {savingWeight ? 'Saving…' : `Save ${weightType === 'pre' ? 'Pre' : 'Post'}-Dialysis Weight`}
              </Text>
            </TouchableOpacity>
          </SectionCard>

          {/* Blood Pressure */}
          <SectionCard icon={<Heart size={16} color="#dc2626" />} title="Blood Pressure">
            <View className="flex-row mb-1" style={{ gap: 8 }}>
              <TextInput
                className="flex-1 border-2 border-sky-100 rounded-xl px-3 py-3 text-lg text-slate-700 text-center"
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
                className="flex-1 border-2 border-sky-100 rounded-xl px-3 py-3 text-lg text-slate-700 text-center"
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
                className="flex-1 border-2 border-sky-100 rounded-xl px-3 py-3 text-lg text-slate-700 text-center"
                keyboardType="numeric"
                placeholder="bpm"
                placeholderTextColor="#94a3b8"
                value={pulse}
                onChangeText={setPulse}
                returnKeyType="done"
                onSubmitEditing={handleSaveBp}
              />
            </View>
            <View className="flex-row mb-3" style={{ gap: 8 }}>
              <Text className="flex-1 text-center text-xs text-slate-400">Systolic</Text>
              <Text className="flex-1 text-center text-xs text-slate-400">Diastolic</Text>
              <Text className="flex-1 text-center text-xs text-slate-400">Pulse</Text>
            </View>
            <TouchableOpacity className="bg-sky-600 rounded-xl py-3 items-center mb-4" onPress={handleSaveBp} disabled={savingBp}>
              <Text className="text-white font-bold">{savingBp ? 'Saving…' : 'Log Reading'}</Text>
            </TouchableOpacity>
            {bpLogs.map(bp => {
              const status = bpStatus(bp.systolic, bp.diastolic);
              return (
                <View key={bp.id} className="flex-row items-center justify-between py-2.5 border-b-2 border-sky-50">
                  <View>
                    <Text className="text-slate-700 font-semibold">
                      {bp.systolic}/{bp.diastolic}
                      {bp.pulse != null && (
                        <Text className="text-slate-400 font-normal"> · {bp.pulse} bpm</Text>
                      )}
                    </Text>
                    <Text style={{ color: status.color, fontSize: 12 }}>{status.label}</Text>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <Text className="text-slate-400 text-sm">{bp.created_at.slice(11, 16)}</Text>
                    <TouchableOpacity onPress={() => deleteBpEntry(db, bp.id)}>
                      <Trash2 size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {bpLogs.length === 0 && <Text className="text-slate-400 text-sm">No readings logged</Text>}
          </SectionCard>

          {/* Symptoms */}
          <SectionCard icon={<FileText size={16} color="#d97706" />} title="Symptom Journal">
            <Text className="text-slate-400 text-xs font-semibold uppercase mb-3">Symptoms</Text>
            <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
              {SYMPTOMS.map(symptom => (
                <TouchableOpacity
                  key={symptom}
                  className={`px-4 py-2 rounded-full border-2 ${
                    selectedSymptoms.includes(symptom) ? 'bg-sky-600 border-sky-600' : 'bg-white border-sky-100'
                  }`}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text className={selectedSymptoms.includes(symptom) ? 'text-white font-medium' : 'text-slate-600'}>
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-slate-400 text-xs font-semibold uppercase mb-2">Notes</Text>
            <TextInput
              className="border-2 border-sky-100 rounded-xl px-4 py-3 text-slate-700 mb-4"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              multiline
              placeholder="Any concerns, how you're feeling..."
              placeholderTextColor="#94a3b8"
              value={notes}
              onChangeText={t => {
                symptomDirty.current = true;
                setSymptomSaved(false);
                setNotes(t);
              }}
            />
            <TouchableOpacity
              className={`rounded-xl py-3 items-center ${symptomSaved ? 'bg-green-500' : 'bg-sky-600'}`}
              onPress={handleSaveSymptoms}
              disabled={savingSymptoms}
            >
              <Text className="text-white font-bold">
                {savingSymptoms ? 'Saving…' : symptomSaved ? '✓ Saved' : symptomLog ? 'Update Entry' : 'Save Entry'}
              </Text>
            </TouchableOpacity>
          </SectionCard>

          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 mb-3 p-4 bg-white rounded-2xl border-8 border-sky-50">
      <View className="flex-row items-center mb-4" style={{ gap: 8 }}>
        {icon}
        <Text className="text-slate-700 font-semibold text-base">{title}</Text>
      </View>
      {children}
    </View>
  );
}
