# Code Review — Dialysis Helper

Reviewed: all files under `app/`, `lib/`, `components/`, and config files.

---

## Critical

### 1. `app/index.tsx` — Unhandled promise rejection (lines 12–16)
Database query has no `.catch()`. If the query fails, the promise rejects silently, `setReady` is never called, and the app is stuck on a blank sky-blue screen forever.

### 2. `app/(tabs)/documents.tsx` — File copy not verified (lines 48–54)
After `sourceFile.copy(destFile)`, the destination file is never verified to exist. If the copy fails partially, the DB entry is still inserted and now points to a non-existent file. The catch block swallows the actual error.

### 3. `app/day/[date].tsx` — Export errors swallowed (lines 184–199)
The catch block shows a generic alert but discards the actual error. If `Print.printToFileAsync()` or the file copy fails, no diagnostic information is available. Also, `date` from `useLocalSearchParams` is typed `string` but can actually be `undefined`; several downstream calls assume it's defined.

---

## High

### 4. All tab screens — No loading state on DB mutations
`addFluidEntry`, `addWeightEntry`, `addBpEntry`, `addSymptomEntry` are fired with no button disable or loading indicator. Users can double-tap and fire duplicate writes. Affected: `fluid.tsx:144`, `weight.tsx:114`, `blood-pressure.tsx:104`, `symptoms.tsx:88`, `[date].tsx` throughout.

### 5. `app/(tabs)/symptoms.tsx` — No error handling on save (line 43)
```ts
await addSymptomEntry(db, selected, notes);
setSaved(true); // runs even if the above throws
```
If the DB write fails, the UI shows "Saved" anyway.

### 6. `app/(tabs)/symptoms.tsx` & `app/day/[date].tsx` — Unguarded `JSON.parse` (symptoms.tsx:25, [date].tsx:80)
```ts
setSelected(JSON.parse(row.symptoms) as string[]);
```
If `row.symptoms` is corrupted or an empty string, this throws and crashes the component. No try-catch.

### 7. `lib/db.ts` — Migration not wrapped in a transaction (lines 62–76)
The `bp_logs` migration creates `_bp_new`, copies data, drops the original, and renames. If any step fails mid-way, the original table is gone and the new one is incomplete. Data loss with no rollback.

### 8. `app/(tabs)/fluid.tsx` — `NaN` propagates from corrupted settings (lines 33–36)
`Number("abc")` returns `NaN`. If a setting value in the DB is corrupted, `limit` becomes `NaN`, `total / limit` is `NaN`, and the progress ring and status message break silently with no fallback.

### 9. `app/(tabs)/blood-pressure.tsx` — Fragile input validation (lines 43–46)
Relies on truthiness of `NaN` (`!NaN === true`) rather than explicit `isNaN()`. No upper-bound check — a user could enter systolic `9999` and it passes validation.

### 10. `app/_layout.tsx` — Splash hide timing not tied to DB ready (lines 13–15)
`SplashScreen.hideAsync()` fires in a `useEffect` with no deps, meaning it runs after the first render. `SQLiteProvider` renders children only after `onInit` completes, so in practice this works — but it's fragile and not explicit. A future change to the provider could break the guarantee.

---

## Medium

### 11. `app/day/[date].tsx` — `date` param typed as non-nullable but can be `undefined`
`useLocalSearchParams<{ date: string }>()` does not guarantee the param exists. Several lines use `date` without a null guard beyond the early `if (!date) return` at line 65, but the type annotation misleads future readers.

### 12. `app/day/[date].tsx` — HTML template not escaped (lines 134–152)
User-derived values (`e.created_at`, notes text, symptom names) are directly interpolated into the HTML string passed to `expo-print`. Special characters like `<`, `>`, `&` in notes text could break the PDF layout.

### 13. `app/day/[date].tsx` — `WeightLog.type` typed as `string` (line 20)
Should be `'pre' | 'post'` to match the DB schema and every other usage in the codebase. The loose type could allow invalid values to slip through.

### 14. Multiple screens — `KeyboardAvoidingView` with `height` on Android
`behavior="height"` inside a `ScrollView` on Android can collapse the view when the keyboard appears. Affected: `weight.tsx`, `blood-pressure.tsx`, `symptoms.tsx`, `[date].tsx`. The `padding` or `position` behaviors are more reliable cross-platform.

### 15. `app/(tabs)/documents.tsx` — No file size or type validation (lines 40–55)
`DocumentPicker` allows any file. A user could pick a 2 GB video, which blocks the UI while copying, may run out of storage, and produces an unreadable "document." No size cap or MIME type whitelist.

### 16. `lib/db.ts` — Timezone assumption in `todayISO()` (lines 92–102)
Uses device local time. If a user crosses midnight in a different timezone, entries logged just before midnight are filed under "yesterday" in the new zone. No timezone metadata is stored with entries, making historical data ambiguous.

### 17. `app/index.tsx` & `app/onboarding.tsx` — Route `as any` casts (index.tsx:21, onboarding.tsx:31)
The typed routes feature (`typedRoutes: true` in `app.json`) cannot resolve `/(tabs)/dashboard` and `/onboarding`, so they are cast to `any`. This silences TypeScript but means route typos will not be caught at compile time.

---

## Low

### 18. All icon-only buttons — Missing `accessibilityLabel`
Buttons containing only icons (Settings gear in `fluid.tsx:70`, Trash icons, Eye/Share/Delete in `documents.tsx`, zoom buttons in `doc-viewer.tsx`) have no `accessibilityLabel`. Screen readers cannot describe their purpose.

### 19. `app/(tabs)/dashboard.tsx` — No bounds on month/year navigation (lines 62–69)
Users can navigate arbitrarily far into the past or future (year 0, year 9999). No guard exists. Minor UX issue.

### 20. `components/ProgressRing.tsx` — Magic number color thresholds (line 17)
`progress >= 1`, `progress >= 0.75` thresholds and their hex colors are hardcoded here and duplicated in `fluid.tsx` and `[date].tsx`. No shared constants file.

### 21. `app/(tabs)/fluid.tsx` — Default limits hardcoded in two places
Defaults `950` and `300` appear in `db.ts` (SQL insert) and as component state initial values in `fluid.tsx`. If one is updated, the other is not, leading to a mismatch on first launch before settings are loaded.

### 22. `lib/data.ts` — Symptom data not normalized
Symptoms are stored as a JSON array string in a single `TEXT` column. Fine for 5 items, but querying or aggregating across symptom types (e.g., "how many days did I have fatigue this month?") is impossible without deserializing every row in application code.

### 23. `app/(tabs)/weight.tsx` — `.toFixed(2)` returns a string (line 41)
`fluidRemoved` is typed as `string | null` (correct), but the variable name implies a numeric value. Minor naming/clarity issue.

### 24. `app/doc-viewer.tsx` — No timeout for text file reads
If `FsFile.text()` hangs (e.g., very large file or broken URI), the loading spinner shows indefinitely with no timeout or cancel mechanism.

### 25. Onboarding fluid limit — Not set during onboarding
The onboarding flow has a slide about fluid tracking but never prompts the user to set their personalized limit. They land on the fluid screen with the default 950 ml, which may not match their prescription. This is a medical app — patient-specific limits matter.

---

## Summary counts

| Severity | Count |
|---|---|
| Critical | 3 |
| High | 7 |
| Medium | 7 |
| Low | 8 |
| **Total** | **25** |
