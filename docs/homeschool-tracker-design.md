# Homeschool Tracker — Design

A planning doc for a homeschool attendance and subject-time tracker. Scope: one parent/teacher tracking one or more students across customizable subjects, with daily logging, exportable reports, and quarter/semester roll-ups.

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

Out of scope (for v1): grading, lesson planning, a public parent/student split, multi-teacher collaboration, attendance-law compliance reporting for a specific US state (can be added per-jurisdiction later).

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
10. **Local-first persistence** — works offline, syncs when online (see §4).
11. **Auth** — single parent account; students are records, not logins.

### Should-have (v1.1)

- **Required hours progress bars** — per subject, per quarter, with projected end-of-period estimate.
- **Notes per day** — free-text journal entry per student per day. Searchable.
- **Attachments** — photos of worksheets, field-trip pics, reading logs. Stored in Supabase Storage.
- **Streaks and gentle nudges** — "You haven't logged Tuesday yet." No gamification guilt-trips.
- **Bulk edit** — select multiple cells in the weekly grid, apply a duration.
- **Import** — paste from a spreadsheet or upload CSV to backfill.
- **Templates** — "typical Monday" copies a preset day's subjects and durations.

### Nice-to-have (later)

- Lesson/curriculum tagging, reading log with book titles and pages, field-trip log with location, standardized-test scores, portfolio artifacts, co-op / outside class tracking, per-state compliance report templates, multi-parent sharing (read-only link), iOS/Android wrapper, Apple/Google Calendar sync, voice entry ("Siri, log 30 minutes of math for Ava").

## 3. Data model

Minimal schema — maps 1:1 to Supabase tables with RLS on `user_id`.

```
users            (id, email, created_at)
school_years     (id, user_id, name, start_date, end_date, week_days[1..7])
terms            (id, school_year_id, kind: 'quarter'|'semester', name, start_date, end_date)
holidays         (id, school_year_id, date, label)

students         (id, user_id, name, grade, color, birth_date, archived_at)
subjects         (id, user_id, name, color, category, weekly_target_minutes, archived_at)
student_subjects (student_id, subject_id, required_minutes_per_term)  -- per-student overrides

attendance       (id, student_id, date, status, note)                  -- unique(student_id, date)
time_entries     (id, student_id, subject_id, date, minutes, started_at, ended_at, note)
day_notes        (id, student_id, date, body)
attachments      (id, student_id, date, storage_path, kind, caption)
```

Key decisions:

- **`minutes` as the unit of truth.** Start/end times are optional metadata; the canonical duration is an integer. Avoids floating-point drift in rollups.
- **`time_entries` are append-only from the UI's perspective** (edits are fine, but we don't collapse them). Supports multiple sessions of the same subject in one day.
- **No `term_id` on entries.** Terms are derived from `date` at query time — lets you redefine quarter boundaries without rewriting history.

## 4. Architecture and build choices

**Recommendation: React + Vite + Supabase, PWA with offline sync.** This repo already has that stack installed, plus `xlsx` and `papaparse` for exports — good fit, use it.

### Why this stack

- **React + Vite**: fast dev loop, already scaffolded.
- **Supabase (Postgres + Auth + Storage + RLS)**: handles accounts, row-level security, file uploads, and realtime sync with almost no backend code. Free tier fits a single-family use case.
- **PWA + IndexedDB (via Dexie)**: offline-first. Parents log during co-op meetings or on road trips where WiFi is flaky. Sync on reconnect.
- **xlsx / papaparse**: already in `package.json`. XLSX for the "savable spreadsheet" vibe parents expect; CSV for anyone piping into Google Sheets.

### Alternative stacks considered

- **Plain local-only (no Supabase)**: simpler, zero accounts, but "downloadable" gets harder across devices and you lose cloud backup. Good for a v0 prototype.
- **Next.js + server actions**: overkill for a mostly-client app; Vite SPA is lighter.
- **Native (React Native / Expo)**: better for quick-timer UX on phone, but a good PWA covers 90% of that need. Defer.

### Sync strategy

1. Writes go to IndexedDB first, then fire-and-forget to Supabase.
2. Each table has `updated_at` + `deleted_at`. Conflict resolution is last-write-wins on the row, which is fine for single-user data.
3. On reconnect, pull rows `where updated_at > last_pulled_at`, then push local dirty rows.

### Export pipeline

- One pure function `buildReport(range, filters) -> ReportModel`.
- Renderers: `toXLSX`, `toCSV`, `toPrintableHTML` (→ user prints to PDF), `toJSON` (for backup/restore).
- Reports are computed from `time_entries` + `attendance` — never stored — so changing a subject's name retroactively updates old reports consistently.

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
| M0 | Schema + auth + students/subjects CRUD | 1 week |
| M1 | Daily log + weekly grid + attendance | 1–2 weeks |
| M2 | Calendar, timer, day notes | 1 week |
| M3 | Reports: day/week/month/quarter/semester + XLSX/CSV/print | 1 week |
| M4 | PWA + offline sync + attachments | 1–2 weeks |
| M5 | Required-hours tracking, templates, import | 1 week |

## 7. Open questions for the user

1. **One family or SaaS?** If just for your household, skip auth and keep it local-first; if multiple families, RLS and billing matter.
2. **Jurisdiction?** Some US states require specific reporting formats (hours per subject, days in session). Knowing the state lets us ship the right export template.
3. **Phone or laptop primary?** Shapes whether the timer or the weekly grid is the star of the UI.
4. **How many students, realistically?** Affects whether per-student color coding or per-student tabs is the better default.
5. **Does time need sub-minute precision?** Recommending "no" — round to 5-minute increments in the UI.
