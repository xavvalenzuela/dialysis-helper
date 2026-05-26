# Dialysiser

## Business Requirements

Daily health tracker for dialysis patients.

### Core Features
- **Fluid intake tracker** — tap button adds configurable volume (default 300 ml); editable daily limit (default 950 ml / ~32 oz); progress ring UI
- **Pre/post-dialysis weight logging** — one entry per type per day (upsert); tracks fluid removal toward dry weight
- **Blood pressure log** — systolic, diastolic, pulse with timestamp
- **Symptom journal** — quick-tap checklist (chills, cramping, fatigue, nausea, headache) + free-text notes
- **Documents** — upload/download/preview prescriptions, treatment sheets, lab results (PDF + images); folder-grouped by type

### Calendar Dashboard
- Monthly calendar view as the landing screen
- Colored dots per day showing which features have entries
- Tap any past day to view/edit that day's logs

## Technical Decisions

- **Framework**: React Native (Expo)
- **Database**: Dexie.js (IndexedDB wrapper) — fully client-side, no server required for data
- **Reactivity**: `useLiveQuery` from `dexie-react-hooks` — components auto-update on DB changes
- **Styling**: Tailwind CSS v4, mobile-first, sky-blue color scheme
- **Icons**: lucide-react
- **No server actions, no SQLite, no Docker** — data lives entirely in the browser (IndexedDB)
- Always run `npx tsc --noEmit` before starting the app
- If bugs are found, always trace the root cause before attempting a fix

## GitHub Repository

- https://github.com/xavvalenzuela/dialysis-helper.git

## Release & Monetization Plan

- **Distribution**: Google Play Store (direct — no PWA web distribution)
- **Packaging**: Capacitor (`@capacitor/android` already installed) wraps the Next.js app as an Android WebView APK
- **Pricing**: One-time purchase fee (no subscription, no ads)
- **Target users**: Dialysis patients managing daily health metrics
