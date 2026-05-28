import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { getSetting, updateSetting } from '../lib/data';
import { DEFAULT_FLUID_LIMIT_ML, DEFAULT_TAP_AMOUNT_ML } from '../lib/constants';

export default function Settings() {
  const db = useSQLiteContext();

  const [nameInput, setNameInput] = useState('');
  const [limitInput, setLimitInput] = useState(String(DEFAULT_FLUID_LIMIT_ML));
  const [tapInput, setTapInput] = useState(String(DEFAULT_TAP_AMOUNT_ML));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting(db, 'user_name'),
      getSetting(db, 'fluid_limit_ml'),
      getSetting(db, 'fluid_tap_ml'),
    ]).then(([name, lim, tap]) => {
      if (name !== null) setNameInput(name);
      if (lim) setLimitInput(lim);
      if (tap) setTapInput(tap);
    }).catch(() => {});
  }, [db]);

  const limitNum = Number(limitInput);
  const tapNum = Number(tapInput);
  const limitValid = !isNaN(limitNum) && limitNum > 0 && /^\d+$/.test(limitInput.trim());
  const tapValid = !isNaN(tapNum) && tapNum > 0 && /^\d+$/.test(tapInput.trim());
  const canSave = limitValid && tapValid;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await Promise.all([
        updateSetting(db, 'user_name', nameInput.trim()),
        updateSetting(db, 'fluid_limit_ml', limitInput.trim()),
        updateSetting(db, 'fluid_tap_ml', tapInput.trim()),
      ]);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="flex-row items-center px-4 py-5">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <ChevronLeft size={24} color="#0284c7" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-sky-700">Profile & Settings</Text>
          </View>

          {/* Profile */}
          <View className="mx-4 mb-4 p-4 bg-white rounded-2xl border-8 border-sky-100">
            <Text className="text-slate-400 text-xs font-semibold uppercase mb-4">Profile</Text>
            <Text className="text-slate-600 text-sm mb-1">Name</Text>
            <TextInput
              className="border-2 border-sky-100 rounded-xl px-4 py-3 text-slate-700 text-base"
              placeholder="Your name (optional)"
              placeholderTextColor="#cbd5e1"
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={50}
              autoCapitalize="words"
              accessibilityLabel="Your name"
            />
            <Text className="text-slate-400 text-xs mt-2">
              Appears on exported day log PDFs.
            </Text>
          </View>

          {/* Fluid Settings */}
          <View className="mx-4 mb-4 p-4 bg-white rounded-2xl border-8 border-sky-100">
            <Text className="text-slate-400 text-xs font-semibold uppercase mb-4">Fluid Tracker</Text>

            <Text className="text-slate-600 text-sm mb-1">Daily limit (ml)</Text>
            <TextInput
              className="border-2 border-sky-100 rounded-xl px-4 py-3 text-slate-700 text-base mb-1"
              keyboardType="numeric"
              value={limitInput}
              onChangeText={setLimitInput}
              maxLength={5}
              accessibilityLabel="Daily fluid limit in millilitres"
            />
            {!limitValid && limitInput.length > 0 && (
              <Text className="text-red-400 text-xs mb-2">Enter a valid positive number</Text>
            )}

            <Text className="text-slate-600 text-sm mb-1 mt-3">Tap amount (ml)</Text>
            <TextInput
              className="border-2 border-sky-100 rounded-xl px-4 py-3 text-slate-700 text-base mb-1"
              keyboardType="numeric"
              value={tapInput}
              onChangeText={setTapInput}
              maxLength={4}
              accessibilityLabel="Fluid tap amount in millilitres"
            />
            {!tapValid && tapInput.length > 0 && (
              <Text className="text-red-400 text-xs">Enter a valid positive number</Text>
            )}
          </View>

          {/* Save */}
          <View className="mx-4 mb-4">
            <TouchableOpacity
              className="rounded-2xl py-4 items-center"
              style={{ backgroundColor: canSave ? '#0284c7' : '#bae6fd' }}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              <Text className="text-white font-bold text-base">
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Onboarding link */}
          <TouchableOpacity
            className="items-center pb-8"
            onPress={() => router.push('/onboarding')}
          >
            <Text className="text-slate-400 text-sm">View app walkthrough</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
