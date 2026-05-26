# Dialysiser — Plan

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4, mobile-first
- **Database**: Dexie.js / IndexedDB — fully client-side, no backend needed
- **Reactivity**: `useLiveQuery` (dexie-react-hooks) — DB changes auto-trigger re-renders
- **Icons**: lucide-react
- **Packaging**: Capacitor (`@capacitor/android`) — wraps app as Android WebView APK

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

### Weight Log
- Pre-dialysis and post-dialysis entries
- One entry per type per day (upsert — replacing replaces, not duplicates)

### Blood Pressure Log
- Systolic / diastolic / pulse per entry
- Multiple readings per day allowed

### Symptom Journal
- Quick-tap checklist: chills, cramping, fatigue, nausea, headache
- Optional free-text notes per entry

### Documents
- Upload prescriptions, treatment sheets, lab results (PDF + images)
- Stored as Blob in IndexedDB
- Folder-grouped explorer, inline PDF/image preview, download

---

## Architecture

```
dialysiser/
  app/
    dashboard/         # Calendar view (landing)
    day/[date]/        # Per-day detail view (all features for a date)
    fluid/             # Standalone fluid tracker
    weight/            # Standalone weight log
    blood-pressure/    # Standalone BP log
    symptoms/          # Standalone symptom journal
    documents/         # Document manager
    manifest.ts        # PWA manifest (Next.js built-in)
  components/
    CalendarView.tsx
    DayDetail.tsx
    FluidTracker.tsx
    WeightForm.tsx
    BPForm.tsx
    SymptomsForm.tsx
    DocumentsManager.tsx
    BottomNav.tsx
    ServiceWorkerRegistrar.tsx
  lib/
    db.ts              # Dexie schema + default settings
    data.ts            # Async mutation helpers
  public/
    sw.js              # Service worker (caches icons only)
    icon-192x192.png
    icon-512x512.png
```

---

## Data Layer

All data lives in the browser via IndexedDB (Dexie). No server, no API routes, no server actions.

```
fluid_logs    (id, date, amount_ml, created_at)
weight_logs   (id, date, type: pre|post, weight_kg, created_at)
bp_logs       (id, date, systolic, diastolic, pulse, created_at)
symptom_logs  (id, date, symptoms: JSON string, notes, created_at)
documents     (id, name, type, file: Blob, uploaded_at)
settings      (key, value)  — fluid_limit_ml, fluid_tap_ml
```

### Mutations (`lib/data.ts`)

All five data types support add and delete. Weight uses upsert (one pre + one post per day).

| Function | Description |
|---|---|
| `addFluidEntry(amount_ml, date?)` | Add fluid log |
| `deleteFluidEntry(id)` | Delete fluid log |
| `addWeightEntry(type, weight_kg, date?)` | Upsert pre/post weight for a date |
| `deleteWeightEntry(id)` | Delete weight log |
| `addBpEntry(systolic, diastolic, pulse, date?)` | Add BP reading |
| `deleteBpEntry(id)` | Delete BP reading |
| `addSymptomEntry(symptoms[], notes, date?)` | Add symptom log |
| `deleteSymptomEntry(id)` | Delete symptom log |
| `addDocument(file, type)` | Upload document (stored as Blob) |
| `deleteDocumentRecord(id)` | Delete document |
| `updateSetting(key, value)` | Update app setting |

---

## Release Plan

- **Platform**: Google Play Store (direct — no PWA web distribution)
- **Packaging**: `npm run build` → Capacitor sync → Android Studio → signed APK/AAB
- **Pricing**: One-time purchase fee (no subscription, no ads)

### Play Store Build Steps (when ready)
1. `npm run build`
2. `npx cap sync android`
3. Open Android Studio → Build → Generate Signed Bundle/APK
4. Upload AAB to Google Play Console

---

## Remaining Work

- [ ] Charts / trend views for weight and BP over time
- [ ] Dry weight target setting and tracking
- [ ] AI integration — OpenRouter (symptom pattern insights, lab result summaries)
- [ ] Onboarding flow for new users
- [ ] Production-quality app icon (replace placeholder)
- [ ] Capacitor Android build, signing, Play Store submission

---

## Dev Rules

- Run `npx tsc --noEmit` before starting the app
- Trace root cause before fixing bugs
- Mobile-first on every screen
- No server actions, no SQLite — keep everything client-side
