# Dialysis Helper

## Business Requirements

Daily health tracker for dialysis patients.

### Core Features
- **Fluid intake tracker** — tap button adds configurable volume (default 300 ml); editable daily limit (default 950 ml / ~32 oz); progress ring UI; factual status messages (no motivational language — fluid is a restriction, not a goal)
- **Pre/post-dialysis weight logging** — one entry per type per day (upsert); fluid removed displayed in L
- **Blood pressure log** — systolic, diastolic, optional pulse; status labels (Normal/Elevated/High/Crisis/Low)
- **Symptom journal** — quick-tap checklist (chills, cramping, fatigue, nausea, headache) + free-text notes
- **Documents** — upload PDFs + images; folder-grouped by type (Prescription, Lab Results, Treatment, Other, Logs); in-app viewer with PDF zoom, share button
- **Day log export** — export any day's full log as a styled PDF; saved to Documents → Logs folder

### Calendar Dashboard
- Monthly calendar view as the landing screen
- Colored dots per day showing which features have entries
- Tap any past day to view/edit that day's logs

## Technical Decisions

- **Framework**: React Native (Expo ~56)
- **Navigation**: Expo Router (file-based, tab + stack)
- **Database**: expo-sqlite — on-device SQLite, no server required; `enableChangeListener: true` required for reactivity
- **Reactivity**: `addDatabaseChangeListener` + useState — components re-fetch on DB mutations
- **Styling**: NativeWind v4 (Tailwind for React Native), mobile-first, sky-blue color scheme
- **Icons**: lucide-react-native + react-native-svg
- **PDF viewing**: react-native-pdf + react-native-blob-util
- **PDF generation**: expo-print (HTML → PDF via printToFileAsync)
- **File sharing**: expo-sharing
- **No server, no cloud** — all data lives on-device (SQLite + local file system)
- Always run `npx tsc --noEmit` before starting the app
- If bugs are found, always trace the root cause before attempting a fix
- Android mipmap icon WebP files must be replaced manually with Pillow — Expo does not regenerate them on `expo run:android`

## GitHub Repository

- https://github.com/xavvalenzuela/dialysis-helper.git

## Release & Monetization Plan

- **Distribution**: Google Play Store (direct — no PWA web distribution)
- **Packaging**: EAS Build (Expo Application Services) → signed AAB for Play Store
- **Pricing**: One-time purchase fee (no subscription, no ads)
- **Target users**: Dialysis patients managing daily health metrics
