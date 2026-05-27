import { SQLiteDatabase } from 'expo-sqlite';
import { todayISO } from './db';

// --- Fluid ---

export async function addFluidEntry(db: SQLiteDatabase, amount_ml: number, date = todayISO()) {
  await db.runAsync(
    'INSERT INTO fluid_logs (date, amount_ml) VALUES (?, ?)',
    [date, amount_ml],
  );
}

export async function deleteFluidEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM fluid_logs WHERE id = ?', [id]);
}

// --- Weight (upsert: one pre + one post per day) ---

export async function addWeightEntry(
  db: SQLiteDatabase,
  type: 'pre' | 'post',
  weight_kg: number,
  date = todayISO(),
) {
  await db.runAsync(
    `INSERT INTO weight_logs (date, type, weight_kg) VALUES (?, ?, ?)
     ON CONFLICT(date, type) DO UPDATE SET weight_kg = excluded.weight_kg, created_at = datetime('now')`,
    [date, type, weight_kg],
  );
}

export async function deleteWeightEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM weight_logs WHERE id = ?', [id]);
}

// --- Blood Pressure ---

export async function addBpEntry(
  db: SQLiteDatabase,
  systolic: number,
  diastolic: number,
  pulse: number | null,
  date = todayISO(),
) {
  await db.runAsync(
    'INSERT INTO bp_logs (date, systolic, diastolic, pulse) VALUES (?, ?, ?, ?)',
    [date, systolic, diastolic, pulse],
  );
}

export async function deleteBpEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM bp_logs WHERE id = ?', [id]);
}

// --- Symptoms (upsert: one entry per day, updated throughout the day) ---

export async function addSymptomEntry(
  db: SQLiteDatabase,
  symptoms: string[],
  notes: string,
  date = todayISO(),
) {
  await db.runAsync(
    `INSERT INTO symptom_logs (date, symptoms, notes) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET symptoms = excluded.symptoms, notes = excluded.notes, created_at = datetime('now')`,
    [date, JSON.stringify(symptoms), notes],
  );
}

export async function deleteSymptomEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM symptom_logs WHERE id = ?', [id]);
}

// --- Documents ---

export async function addDocument(db: SQLiteDatabase, name: string, type: string, uri: string) {
  await db.runAsync(
    'INSERT INTO documents (name, type, uri) VALUES (?, ?, ?)',
    [name, type, uri],
  );
}

export async function deleteDocument(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
}

// --- Settings ---

export async function updateSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}
