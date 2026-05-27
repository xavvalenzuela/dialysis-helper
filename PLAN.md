# Dialysis Helper — Plan

## Stack

- **Framework**: React Native (Expo ~56)
- **Navigation**: Expo Router (file-based, tab + stack)
- **Styling**: NativeWind v4 (Tailwind for React Native), sky-blue color scheme
- **Database**: expo-sqlite — fully client-side, no backend needed
- **Icons**: lucide-react-native + react-native-svg
- **PDF viewer**: react-native-pdf + react-native-blob-util
- **PDF export**: expo-print (HTML → PDF)
- **File sharing**: expo-sharing

---

## Features (Implemented)

### Calendar Dashboard
- Monthly calendar, days clickable to open that day's log
- Colored dots per day: sky (fluid), green (weight), red (BP), amber (symptoms)
- "Today's Log" shortcut button

### Fluid Intake Tracker
- Tap button adds configurable ml per tap (default 300 ml, editable)
- Editable daily limit (default 950 ml / ~32 oz)
- Progress ring with color shift as limit approaches
- Factual status message (remaining ml, warns at 75%, no motivational language)

### Weight Log
- Pre-dialysis and post-dialysis entries
- One entry per type per day (upsert)
- Fluid removed displayed in L

### Blood Pressure Log
- Systolic / diastolic / pulse (optional) per entry
- Multiple readings per day with status label (Normal / Elevated / High / Crisis / Low)

### Symptom Journal
- Quick-tap checklist: chills, cramping, fatigue, nausea, headache
- Optional free-text notes per entry

### Documents
- Upload prescriptions, treatment sheets, lab results, other (PDF + images)
- Stored locally on device via expo-file-system
- Grouped by type: Prescription, Lab Results, Treatment, Other, Logs
- Eye button → in-app viewer (PDF with zoom in/out, images, text files)
- Share button → system share sheet
- Delete with confirmation

### Day Log (per-date detail view)
- Full interactive view for any past or current day
- Add/delete entries for all 4 features from a single screen
- Export button → generates styled PDF (HTML→PDF via expo-print), saved to Documents → Logs

---

## Architecture

```
app/
  _layout.tsx          # Root layout — SQLiteProvider + Stack
  index.tsx            # Redirect → /(tabs)/dashboard
  doc-viewer.tsx       # In-app file viewer (PDF, images, text)
  (tabs)/
    _layout.tsx        # Tab navigator (sky-blue theme)
    dashboard.tsx      # Calendar view (landing)
    fluid.tsx          # Fluid intake tracker
    weight.tsx         # Weight log
    blood-pressure.tsx # BP log
    symptoms.tsx       # Symptom journal
    documents.tsx      # Document manager
  day/
    [date].tsx         # Per-day detail + export
components/
  ProgressRing.tsx     # SVG ring for fluid progress
lib/
  db.ts               # SQLite schema + initializeDb + migrations
  data.ts             # Mutation helpers
```

---

## Data Layer

All data lives on-device via SQLite (expo-sqlite). No server, no API.

```sql
fluid_logs    (id, date, amount_ml, created_at)
weight_logs   (id, date, type: pre|post, weight_kg, created_at)  -- unique per (date, type)
bp_logs       (id, date, systolic, diastolic, pulse INTEGER, created_at)
symptom_logs  (id, date, symptoms TEXT, notes, created_at)       -- unique per date
documents     (id, name, type, uri, uploaded_at)
settings      (key PK, value)  -- fluid_limit_ml, fluid_tap_ml
```

### Mutations (`lib/data.ts`)

| Function | Description |
|---|---|
| `addFluidEntry(db, amount_ml, date?)` | Add fluid log |
| `deleteFluidEntry(db, id)` | Delete fluid log |
| `addWeightEntry(db, type, weight_kg, date?)` | Upsert pre/post weight for a date |
| `deleteWeightEntry(db, id)` | Delete weight log |
| `addBpEntry(db, systolic, diastolic, pulse\|null, date?)` | Add BP reading |
| `deleteBpEntry(db, id)` | Delete BP reading |
| `addSymptomEntry(db, symptoms[], notes, date?)` | Upsert symptom log |
| `deleteSymptomEntry(db, id)` | Delete symptom log |
| `addDocument(db, name, type, uri)` | Register document |
| `deleteDocument(db, id)` | Delete document |
| `updateSetting(db, key, value)` | Update app setting |
| `getSetting(db, key)` | Read app setting |

Reactivity: `addDatabaseChangeListener` + `enableChangeListener: true` on SQLiteProvider.

---

## Release Plan

- **Platform**: Google Play Store (direct — no PWA web distribution)
- **Build**: EAS Build → signed AAB
- **Pricing**: One-time purchase fee (~$0.99 minimum, no subscription, no ads)

### Play Store Build Steps (when ready)
1. Configure EAS (`eas.json`)
2. `eas build --platform android --profile production`
3. Upload AAB to Google Play Console

---

## Remaining Work

- [ ] Charts / trend views for weight and BP over time
- [ ] Dry weight target setting and tracking
- [ ] Onboarding flow for new users
- [ ] Export all documents per type as ZIP
- [ ] EAS Build setup, signing, Play Store submission

---

## Dev Rules

- Run `npx tsc --noEmit` before starting the app
- Trace root cause before fixing bugs
- Mobile-first on every screen
- No server — keep everything on-device (SQLite + local file system)
- Read https://docs.expo.dev/versions/v56.0.0/ before writing Expo-specific code
