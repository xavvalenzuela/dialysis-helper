import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Droplets, Scale, Heart, FileText, Lock, FolderOpen, User } from 'lucide-react-native';
import { updateSetting } from '../lib/data';
import { DEFAULT_FLUID_LIMIT_ML } from '../lib/constants';

const { width } = Dimensions.get('window');

const SLIDES = [
  { id: 'welcome' },
  { id: 'track' },
  { id: 'privacy' },
  { id: 'name' },
  { id: 'fluid_limit' },
];

export default function Onboarding() {
  const db = useSQLiteContext();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [limitInput, setLimitInput] = useState(String(DEFAULT_FLUID_LIMIT_ML));

  const limitValid = /^\d+$/.test(limitInput.trim()) && parseInt(limitInput) > 0;

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setStep(next);
  };

  const finish = async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarded', '1')`,
    );
    await updateSetting(db, 'user_name', nameInput.trim());
    if (limitValid) {
      await updateSetting(db, 'fluid_limit_ml', limitInput.trim());
    }
    router.replace('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {/* Slide 1 — Welcome */}
          <View style={{ width }} className="flex-1 items-center justify-center px-8">
            <View className="w-36 h-36 rounded-3xl bg-sky-500 items-center justify-center mb-8 shadow-lg"
              style={{ shadowColor: '#0369a1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 }}>
              <Image
                source={require('../assets/icon.png')}
                style={{ width: 120, height: 120, borderRadius: 24 }}
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-bold text-sky-800 text-center mb-3">
              Dialysis Helper
            </Text>
            <Text className="text-slate-500 text-base text-center leading-6">
              Your personal daily health tracker{'\n'}built for dialysis patients.
            </Text>
          </View>

          {/* Slide 2 — Daily Tracking */}
          <View style={{ width }} className="flex-1 justify-center px-8">
            <Text className="text-2xl font-bold text-sky-800 mb-2">Track What Matters</Text>
            <Text className="text-slate-500 text-sm mb-8">Log your health metrics every day.</Text>

            {[
              { icon: <Droplets size={22} color="#0284c7" />, bg: '#e0f2fe', title: 'Fluid Intake', desc: 'Monitor your daily limit and stay within it' },
              { icon: <Scale size={22} color="#16a34a" />, bg: '#dcfce7', title: 'Weight Log', desc: 'Pre & post-dialysis weights, fluid removed' },
              { icon: <Heart size={22} color="#dc2626" />, bg: '#fee2e2', title: 'Blood Pressure', desc: 'Log readings with status indicators' },
              { icon: <FileText size={22} color="#d97706" />, bg: '#fef3c7', title: 'Symptom Journal', desc: 'Quick-tap checklist and free-text notes' },
            ].map(item => (
              <View key={item.title} className="flex-row items-center mb-5" style={{ gap: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-slate-800 font-semibold text-base">{item.title}</Text>
                  <Text className="text-slate-400 text-sm mt-0.5">{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Slide 3 — Privacy */}
          <View style={{ width }} className="flex-1 items-center justify-center px-8">
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              <Lock size={36} color="#0284c7" />
            </View>

            <Text className="text-2xl font-bold text-sky-800 text-center mb-3">
              Privacy First
            </Text>
            <Text className="text-slate-500 text-base text-center leading-7 mb-10">
              No account needed. No cloud.{'\n'}
              All your health data lives only{'\n'}
              on your device.
            </Text>

            <View className="bg-white rounded-2xl border-2 border-sky-100 p-4 w-full" style={{ gap: 12 }}>
              {[
                { icon: <FolderOpen size={16} color="#0284c7" />, text: 'Upload & view prescriptions and lab results' },
                { icon: <FileText size={16} color="#0284c7" />, text: "Export any day's log as a PDF" },
              ].map(item => (
                <View key={item.text} className="flex-row items-start" style={{ gap: 10 }}>
                  {item.icon}
                  <Text className="text-slate-600 text-sm flex-1 leading-5">{item.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Slide 4 — Name */}
          <View style={{ width }} className="flex-1 items-center justify-center px-8">
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              <User size={36} color="#0284c7" />
            </View>

            <Text className="text-2xl font-bold text-sky-800 text-center mb-2">
              What's your name?
            </Text>
            <Text className="text-slate-500 text-sm text-center leading-6 mb-8">
              Your name will appear on exported{'\n'}day logs. This is optional.
            </Text>

            <View className="bg-white rounded-2xl border-8 border-sky-100 p-5 w-full">
              <Text className="text-slate-400 text-xs font-semibold uppercase mb-3">Your name</Text>
              <TextInput
                className="text-2xl font-bold text-sky-700 text-center"
                placeholder="e.g. John D."
                placeholderTextColor="#cbd5e1"
                value={nameInput}
                onChangeText={setNameInput}
                maxLength={50}
                autoCapitalize="words"
                accessibilityLabel="Your name"
              />
            </View>

            <Text className="text-slate-400 text-xs text-center mt-4 leading-5">
              Skip this if you prefer to stay anonymous.
            </Text>
          </View>

          {/* Slide 5 — Fluid limit setup */}
          <View style={{ width }} className="flex-1 items-center justify-center px-8">
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              <Droplets size={36} color="#0284c7" />
            </View>

            <Text className="text-2xl font-bold text-sky-800 text-center mb-2">
              Set Your Fluid Limit
            </Text>
            <Text className="text-slate-500 text-sm text-center leading-6 mb-8">
              Ask your care team for your{'\n'}prescribed daily fluid allowance.
            </Text>

            <View className="bg-white rounded-2xl border-8 border-sky-100 p-5 w-full items-center">
              <Text className="text-slate-400 text-xs font-semibold uppercase mb-3">Daily limit</Text>
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <TextInput
                  className="text-3xl font-bold text-sky-700 text-center"
                  style={{ minWidth: 100 }}
                  keyboardType="numeric"
                  value={limitInput}
                  onChangeText={setLimitInput}
                  maxLength={5}
                  accessibilityLabel="Daily fluid limit in millilitres"
                />
                <Text className="text-slate-400 text-lg font-medium">ml</Text>
              </View>
              {!limitValid && limitInput.length > 0 && (
                <Text className="text-red-400 text-xs mt-2">Enter a valid positive number</Text>
              )}
            </View>

            <Text className="text-slate-400 text-xs text-center mt-4 leading-5">
              You can update this anytime in the{'\n'}Fluid tab settings ⚙
            </Text>
          </View>
        </ScrollView>

        {/* Bottom controls */}
        <View className="px-8 pb-4">
          {/* Dots */}
          <View className="flex-row justify-center mb-6" style={{ gap: 8 }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === step ? '#0284c7' : '#bae6fd',
                }}
              />
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity
            className="rounded-2xl py-4 items-center"
            style={{ backgroundColor: step === SLIDES.length - 1 && !limitValid ? '#bae6fd' : '#0284c7' }}
            onPress={() => step < SLIDES.length - 1 ? goTo(step + 1) : finish()}
            disabled={step === SLIDES.length - 1 && !limitValid}
            activeOpacity={0.85}
          >
            <Text className="text-white text-base font-bold">
              {step < SLIDES.length - 1 ? 'Next' : 'Get Started'}
            </Text>
          </TouchableOpacity>

          {/* Back link */}
          {step > 0 && (
            <TouchableOpacity className="items-center mt-4" onPress={() => goTo(step - 1)}>
              <Text className="text-slate-400 text-sm">Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
