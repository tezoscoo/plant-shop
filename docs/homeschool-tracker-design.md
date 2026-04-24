# Homeschool Tracker — Design

A planning doc for a homeschool attendance and subject-time tracker. Scope: one parent/teacher tracking one or more students across customizable subjects, with daily logging, exportable reports, and quarter/semester roll-ups.

**v1 is local-only** — data lives in the browser (IndexedDB), no accounts, no server. Cloud sync is a possible future upgrade, not a v1 requirement.

## 1. What the app needs to do

From the brief:

- Track multiple **students**
- Track **attendance** per student per day
- Track **subjects** (customizable list, not a fixed curriculum)
- Track **time spent per subject per day**
- **Easy to view and edit** — fast daily entry, inline edits, no deep menus
- **Save/download** by day, week, month
- **Summarize** by quarter and semester
- **Customizable** — subjects, school year boundaries, quarter/semester dates, required hours, etc.

Out of scope (for v1): cloud sync, accounts/auth, grading, lesson planning, a public parent/student split, multi-teacher collaboration, attendance-law compliance reporting for a specific US state (can be added per-jurisdiction later).

## 2. Recommended feature set

### Must-have (v1)

1. **Students** — add/edit/archive. Fields: name, grade level, color (for at-a-glance charts), optional photo, birth date.
2. **Subjects** — custom per student or shared. Fields: name, color, weekly target hours (optional), category (e.g. Core, Elective, PE, Life Skills).
3. **Daily log view** — the workhorse screen. One row per subject, columns: start/end time OR duration, notes, attendance toggle for the day at top. Keyboard-first: `Tab` between fields, `Enter` to add another entry.
4. **Quick timer** — tap a subject to start a timer; tap again to stop and log it. Survives page reload.
5. **Attendance** — per student per day: Present / Absent / Half-day / Holiday / Sick. Bulk-mark a date range (vacations).
6. **Calendar view** — month grid showing attendance color + total hours per day. Click a day to open its log.
7. **Weekly grid** — Mon–Fri (configurable) × subjects matrix, inline-editable cells with minutes. Best for retro entry when you forgot to log live.
8. **Reports & export**
   - Day / Week / Month / Quarter / Semester / Year
   - CSV and XLSX (library already in deps: `xlsx`, `papaparse`)
   - PDF print-friendly view (browser print → PDF is enough for v1)
   - Per-student, per-subject totals; attendance summary; required-hours progress
9. **School year setup** — start/end dates, quarter and semester boundaries, weekly days-in-session, holidays.
10. **Local persistence** — IndexedDB, works fully offline. No accounts, no network needed (see §4).
11. **Backup & restore** — one-click JSON export of the entire database; drag-and-drop JSON to restore. This is the user's "cloud backup" until cloud sync ships.

### Should-have (v1.1)

- **Required hours progress bars** — per subject, per quarter, with projected end-of-period estimate.
- **Notes per day** — free-text journal entry per student per day. Searchable.
- **Attachments** — photos of worksheets, field-trip pics, reading logs. Stored as Blobs in a dedicated IndexedDB store (kept out of the main DB so exports stay small; attachments export as a separate zip).
- **Streaks and gentle nudges** — "You haven't logged Tuesday yet." No gamification guilt-trips.
- **Bulk edit** — select multiple cells in the weekly grid, apply a duration.
- **Import** — paste from a spreadsheet or upload CSV to backfill.
- **Templates** — "typical Monday" copies a preset day's subjects and durations.
- **Auto-backup to disk** — via the File System Access API (Chromium browsers): pick a folder once, app writes a dated JSON backup after each session. Safari/Firefox fall back to a manual download button.

### Nice-to-have (later)

- Lesson/curriculum tagging, reading log with book titles and pages, field-trip log with location, standardized-test scores, portfolio artifacts, co-op / outside class tracking, per-state compliance report templates, multi-parent sharing (read-only link), iOS/Android wrapper, Apple/Google Calendar sync, voice entry ("Siri, log 30 minutes of math for Ava").

## 3. Data model

Dexie object stores (IndexedDB). No `user_id` columns — the database is the user's. Indexes listed after the fields.

```
school_years     (id, name, start_date, end_date, week_days[1..7])
terms            (id, school_year_id, kind: 'quarter'|'semester', name, start_date, end_date)
                 idx: school_year_id, [start_date+end_date]
holidays         (id, school_year_id, date, label)
                 idx: date

students         (id, name, grade, color, birth_date, archived_at)
subjects         (id, name, color, category, weekly_target_minutes, archived_at)
student_subjects (student_id, subject_id, required_minutes_per_term)
                 idx: [student_id+subject_id]

attendance       (id, student_id, date, status, note)
                 idx: [student_id+date] (unique), date
time_entries     (id, student_id, subject_id, date, minutes, started_at, ended_at, note)
                 idx: [student_id+date], [subject_id+date], date
day_notes        (id, student_id, date, body)
                 idx: [student_id+date] (unique)
attachments_meta (id, student_id, date, blob_key, kind, caption)
                 idx: [student_id+date], blob_key
attachments_blob (blob_key, blob)   -- separate store so main exports stay lean

settings         (key, value)        -- singleton kv store: theme, week shape, last-backup-at, etc.
```

Key decisions:

- **`minutes` as the unit of truth.** Start/end times are optional metadata; the canonical duration is an integer. Avoids floating-point drift in rollups.
- **`time_entries` are append-only from the UI's perspective** (edits are fine, but we don't collapse them). Supports multiple sessions of the same subject in one day.
- **No `term_id` on entries.** Terms are derived from `date` at query time — lets you redefine quarter boundaries without rewriting history.
- **Attachments split into meta + blob stores.** Makes the JSON export trivial (just the meta), and the binary export a separate zip.
- **Schema versioning via Dexie's `db.version(n).stores(...).upgrade(...)`** — migrations run on open, no server round-trip.

## 4. Architecture and build choices

**Recommendation: React + Vite + Dexie, installable as a PWA.** Pure client app — no backend, no accounts, no network. This repo already has React + Vite scaffolded and `xlsx` / `papaparse` installed, which cover exports.

### Why this stack

- **React + Vite**: fast dev loop, already scaffolded.
- **Dexie (IndexedDB wrapper)**: robust local database, handles schema migrations, supports compound indexes and transactions. Fits 100k+ time entries comfortably. `localStorage` is used only for small settings, if at all.
- **PWA (vite-plugin-pwa)**: installable to home screen on phone/desktop, launches without a browser chrome, runs fully offline — because the app *is* offline. Service worker caches assets; data never leaves the device.
- **xlsx / papaparse**: already in `package.json`. XLSX for the "savable spreadsheet" vibe parents expect; CSV for anyone piping into Google Sheets.
- **No backend deps to drop.** The existing `@supabase/supabase-js`, `resend`, and `@anthropic-ai/sdk` packages aren't used by this app and can be removed when we scaffold the homeschool build, or left alone if the repo still serves the plant-shop code.

### Alternative stacks considered

- **Supabase + cloud sync**: adds accounts, multi-device sync, cloud backup. Deferred — not needed for v1, and the Dexie schema is structured so it can be swapped behind a sync layer later without touching app code.
- **Next.js + server actions**: overkill for a purely client-side app.
- **Tauri / Electron desktop wrapper**: gives native file-save dialogs and a real app icon without the browser. Good v2 if the PWA story feels too thin. Tauri preferred for size.
- **React Native / Expo**: defer — PWA covers phone install and timer UX well enough.

### Backup & restore strategy

No sync. Backups are user-controlled:

1. **Manual export** — "Download backup" button writes a single JSON file with all stores (except attachment blobs). Date-stamped filename.
2. **Manual import** — drag-and-drop or file picker accepts the JSON and replaces or merges (user choice). Validates schema version; runs Dexie migrations if the file is older.
3. **Auto-backup** (should-have) — via the File System Access API, user picks a folder once; the app writes `homeschool-backup-YYYY-MM-DD.json` after each session (debounced). Chromium-only; other browsers show a "remind me" prompt on a cadence instead.
4. **Attachments** — exported separately as a zip of blobs + a manifest; imported independently so the main backup stays small.
5. **Restore safety** — before any import, the app snapshots current DB to a timestamped slot so a bad import is undoable.

### Upgrade path to cloud (future, not v1)

If/when cloud sync is wanted, the Dexie schema already supports it with minor additions:

- Add `updated_at` and `deleted_at` to each store (tombstones for deletes).
- Add a `sync_queue` store: dirty row ids awaiting push.
- Wrap writes in a `repo` layer (already recommended below) so swapping to "write to Dexie + enqueue for Supabase" is one file.
- Supabase (or any backend) reads/writes the same shape — tables become a 1:1 mirror of the Dexie stores.

### Export pipeline

- One pure function `buildReport(range, filters) -> ReportModel`.
- Renderers: `toXLSX`, `toCSV`, `toPrintableHTML` (→ user prints to PDF), `toJSON` (for backup/restore).
- Reports are computed from `time_entries` + `attendance` — never stored — so changing a subject's name retroactively updates old reports consistently.

### Code layout

```
src/
  db/              Dexie schema, migrations, typed repositories
  features/
    students/
    subjects/
    log/           daily log + weekly grid
    calendar/
    timer/
    reports/
    backup/
    settings/
  lib/             date math, minutes formatting, report builders
  ui/              shared components
  App.jsx
```

Feature-folder structure keeps each screen's queries, components, and tests together. The `db/` layer is the only place that touches Dexie — everything else calls repo functions like `timeEntriesRepo.forDay(studentId, date)`.

## 5. UX priorities

- **The daily log should open in ≤ 2 taps from the home screen.** Everything else is secondary.
- **Retro entry is a first-class workflow.** Assume parents forget to log for 3 days and need to catch up Saturday morning.
- **Numbers, not prose.** Minutes shown as `45m` or `1h 15m`, not `0.75 hours`.
- **Print view matches the spreadsheet.** Parents submitting to umbrella schools want a familiar grid.
- **Color coding from subjects propagates everywhere** (calendar dots, weekly grid cells, report bars) — reduces cognitive load.
- **Dark mode, large-tap targets, keyboard shortcuts.** Tracking is a chore; remove friction.

## 6. Milestones

| Phase | Scope | Rough size |
|------|-------|------|
| M0 | Dexie schema + repos + students/subjects CRUD + school year setup | 2–3 days |
| M1 | Daily log + weekly grid + attendance | 1–2 weeks |
| M2 | Calendar, timer, day notes | 1 week |
| M3 | Reports: day/week/month/quarter/semester + XLSX/CSV/print | 1 week |
| M4 | JSON backup/restore + File System Access auto-backup | 2–3 days |
| M5 | PWA install + offline asset caching | 2 days |
| M6 | Required-hours tracking, templates, import, attachments | 1–2 weeks |

## 7. Open questions for the user

1. **Jurisdiction?** Some US states require specific reporting formats (hours per subject, days in session). Knowing the state lets us ship the right export template.
2. **Phone or laptop primary?** Shapes whether the timer or the weekly grid is the star of the UI. Affects whether we optimize the PWA layout for mobile-first or desktop-first.
3. **How many students, realistically?** Affects whether per-student color coding or per-student tabs is the better default.
4. **Does time need sub-minute precision?** Recommending "no" — round to 5-minute increments in the UI.
5. **Which browser(s)?** File System Access API (auto-backup) is Chromium-only. If Safari/iOS is primary, auto-backup becomes a scheduled reminder to export manually.
6. **Does this repo keep the plant-shop code alongside, or is it repurposed?** Decides whether to delete unused deps and routes, or scaffold the homeschool app behind a new route.

## 8. Caveats of the local-only choice

Worth stating plainly so expectations match reality:

- **Clear-site-data wipes the app.** Mitigation: prominent backup reminders, auto-backup to disk, optional periodic export prompt.
- **One browser profile = one dataset.** Using the app on a phone and a laptop gives you two separate databases until cloud sync ships. Export/import is the bridge.
- **Storage quotas** are browser-managed; IndexedDB typically gets 50%+ of free disk, but may be evicted under pressure. Large attachment libraries are the main risk — mitigated by `navigator.storage.persist()`.
- **No password protection** on the device itself. If the laptop is shared, anyone who opens the app sees the data. Acceptable for home use; flag as a known limitation.
