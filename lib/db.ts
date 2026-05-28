import * as SQLite from 'expo-sqlite';
import { DEFAULT_FLUID_LIMIT_ML, DEFAULT_TAP_AMOUNT_ML } from './constants';

export async function initializeDb(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS fluid_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('pre', 'post')),
      weight_kg REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, type)
    );

    CREATE TABLE IF NOT EXISTS bp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      systolic INTEGER NOT NULL,
      diastolic INTEGER NOT NULL,
      pulse INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS symptom_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      symptoms TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      uri TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('fluid_limit_ml', '${DEFAULT_FLUID_LIMIT_ML}');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('fluid_tap_ml', '${DEFAULT_TAP_AMOUNT_ML}');
  `);

  // If this is an existing install with data, skip onboarding
  await db.execAsync(`
    INSERT OR IGNORE INTO settings (key, value)
    SELECT 'onboarded', '1' WHERE EXISTS (
      SELECT 1 FROM fluid_logs
      UNION ALL SELECT 1 FROM weight_logs
      UNION ALL SELECT 1 FROM bp_logs
      UNION ALL SELECT 1 FROM symptom_logs
      UNION ALL SELECT 1 FROM documents
      LIMIT 1
    );
  `);

  // Migrate: drop NOT NULL on pulse if the existing table still has it
  const tableInfo = await db.getAllAsync<{ name: string; notnull: number }>(
    `PRAGMA table_info('bp_logs')`,
  );
  const pulseCol = tableInfo.find(c => c.name === 'pulse');
  if (pulseCol?.notnull === 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE _bp_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          systolic INTEGER NOT NULL,
          diastolic INTEGER NOT NULL,
          pulse INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO _bp_new SELECT * FROM bp_logs;
        DROP TABLE bp_logs;
        ALTER TABLE _bp_new RENAME TO bp_logs;
      `);
    });
  }
}

export function todayFormatted() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Uses device local time intentionally — patients care about "today" in their own timezone.
// Tradeoff: crossing midnight in a different timezone shifts which date entries are filed under.
// Storing per-entry timezone metadata would be needed if cross-timezone accuracy becomes a requirement.
export function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
