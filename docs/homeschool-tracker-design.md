# Homeschool Tracker — Design

A planning doc for a homeschool **attendance and curriculum/lesson tracker**. Scope: one parent/teacher tracking one or more students through a planned curriculum, with a daily confirmation flow, quick ad-hoc entry, exportable reports, and quarter/semester roll-ups.

**v1 is local-only** — data lives in the browser (IndexedDB), no accounts, no server. Cloud sync is a possible future upgrade, not a v1 requirement.

**Core interaction model: plan → confirm → dissent.** The app pre-populates each school day from the curriculum and schedule. A daily confirmation pops up (configurable time, default evening); tasks default to *completed*; the user taps to dissent (mark not done, edit minutes, add notes) and confirms with one button. Adding unplanned items is a first-class, ≤3-tap path.

**Mobile + desktop, accessible by default.** One responsive PWA codebase. WCAG 2.1 AA target, keyboard-operable, screen-reader tested, respects OS reduced-motion / color-scheme / Do Not Disturb.

## 1. What the app needs to do

From the brief:

- Track multiple **students**
- Track **attendance** per student per day
- Track **subjects** (customizable list)
- Track a **curriculum of lessons** per subject (ordered, editable, skippable)
- Track **time spent per subject per day** (auto-filled from planned lesson estimate, editable)
- **Auto-mark daily/weekly tasks completed** in the confirmation flow, with fast toggle to "not completed" or inline edit
- **Daily confirmation popup** — easy, mobile-friendly, one-tap commit
- **Easy to add unplanned items** — quick-add sheet, ≤3 taps
- **Easy to view and edit** past days (retro entry)
- **Mobile-friendly and desktop-friendly** — one PWA, responsive, installable
- **Accessible** — keyboard, screen reader, color-independent signals, dynamic type
- **Save/download** by day, week, month
- **Summarize** by quarter and semester
- **Customizable** — subjects, curricula, schedules, school year boundaries, quarter/semester dates, required hours, confirmation time, etc.

Out of scope (for v1): cloud sync, accounts/auth, grading/rubrics, multi-teacher collaboration, read-only sharing with third parties, state-specific compliance report templates, calendar-app sync, AI lesson suggestions.


## 2. Recommended feature set

### Must-have (v1)

1. **Students** — add/edit/archive. Fields: name, grade, color, avatar/emoji, birth date. Color + avatar propagate everywhere (Today cards, calendar dots, reports).
2. **Subjects** — custom, with color, category (Core / Elective / PE / Life Skills), and optional weekly target minutes.
3. **Curriculum + lessons** — each subject can have an ordered list of lessons (title, estimated minutes, optional notes/link). Reorder, skip, insert, edit inline.
4. **Schedules** — per subject: which weekdays it runs, planned minutes per session. A schedule + the next unfinished lesson is what generates a day's tasks.
5. **Today screen** — the workhorse. Auto-generated task list for the current day. Each card shows subject color, lesson title, planned minutes, status. One tap toggles done/not-done; pencil edits minutes and notes.
6. **Daily confirmation modal** — bottom sheet triggered at a configurable time (default 6pm) or on first open after cutoff. All tasks default to *completed*; user dissents on any, then taps a single "Confirm" button. Attendance chip at top. Dismissing keeps tasks `pending` and shows a "Confirm yesterday" banner next day.
7. **Quick-add** — big "+" on Today (and inside the modal) opens a three-field sheet: subject, minutes, optional title. Optional "link to lesson." Saves as `completed` immediately. Works retroactively from the Week view.
8. **Attendance** — Present / Absent / Half-day / Holiday / Sick. Bulk-mark a date range (vacations). Defaults to Present on any day with at least one completed task.
9. **Week view** — swipe (mobile) or click (desktop) between days; vertical list per day; edit any past day inline.
10. **Calendar view** — month grid with attendance color + total minutes per day. Tap a day to open its tasks.
11. **Reports & export** — Day / Week / Month / Quarter / Semester / Year. XLSX + CSV (`xlsx`, `papaparse` already installed), print-friendly HTML (→ PDF via browser print). Per-student, per-subject totals; attendance summary; curriculum progress.
12. **School year setup** — start/end dates, quarter/semester boundaries, school-week shape (which weekdays count), holidays.
13. **Local persistence** — IndexedDB via Dexie. Fully offline (see §4).
14. **Backup & restore** — one-click JSON export; drag-and-drop JSON to import.

**Life-happens essentials (must-have):**

15. **Undo toast** — 10-second window after any confirm/delete/destructive action.
16. **Copy yesterday** — one button in the daily confirmation: duplicates yesterday's tasks and statuses to today.
17. **Sick day / Snow day** — one tap marks the day absent and auto-pushes every planned lesson to the next scheduled day for each subject.
18. **Reschedule vs. skip** — marking a lesson "not done" asks whether to *push to next scheduled day* (default) or *skip permanently*. No ambiguity.

### Should-have (v1.1)

**Progress & feedback (not gamified):**
- **Week dots** — five (or N) small circles under the Today header, filled as days confirm. At-a-glance; no streak-shame.
- **Curriculum progress** — "Chapter 12 of 40 · projected May 14" under each subject, based on actual pace.
- **End-of-week digest** — Sunday popup summarizing the week (lessons done, rescheduled, total minutes, notes); one-click export of the week.
- **Required-hours progress bars** — per subject per quarter, with projected end-of-period estimate.

**Capture moments:**
- **Quick note** — floating pencil icon on Today for a one-line note per day.
- **Photo-to-task** — camera icon on any task card; attaches an image Blob to that task/day.
- **Voice notes** — browser Web Speech API; mic button dictates into the note field.
- **Attachments** — stored as Blobs in a dedicated IndexedDB store so the main JSON export stays small; attachments export as a separate zip.

**Find things again:**
- **Search** — one field across lesson titles, task notes, and day journal entries.
- **This day last year** — small card on quieter days showing what was done a year ago.

**Student-family touches:**
- **Per-student color + avatar everywhere** — taps feel personal, not generic.
- **Multi-student Today** — when >1 student, a horizontal switcher at top; long-press to show two side-by-side.

**Tiny but high-value:**
- **PWA icon badge** — home-screen icon shows a dot/count when today is unconfirmed.
- **DND respect** — no confirmation popup between 10pm–7am (configurable).
- **Empty-state encouragement** — first-run flow suggests "Start with one subject, you can add more later."
- **Keyboard cheat sheet** — `?` on desktop shows shortcuts (`C` confirm day, `N` new task, `1–9` toggle, arrow keys to move).

**Power/retro entry:**
- **Bulk edit** — select multiple cells in the week view, apply a duration/status.
- **Import** — paste from a spreadsheet or upload CSV to backfill.
- **Templates** — save a "typical Monday" and apply it across a date range.
- **Day notes (journal)** — free-text per student per day, searchable (overlaps with quick note; one surface, two entry points).
- **Auto-backup to disk** — File System Access API (Chromium): pick a folder once, app writes dated JSON after each session. Safari/Firefox fall back to a reminder.

### Nice-to-have (later)

- Reading log (book titles, pages, minutes), field-trip log (location, photos), standardized-test scores, portfolio artifacts, co-op / outside-class tracking, per-state compliance report templates, multi-parent sharing via cloud sync, iOS/Android native wrapper, calendar-app sync, AI lesson suggestions, grading/rubrics.

## 3. Data model

Dexie object stores (IndexedDB). No `user_id` columns — the database is the user's. Indexes listed after each store.

```
school_years     (id, name, start_date, end_date, week_days[1..7])
terms            (id, school_year_id, kind: 'quarter'|'semester', name, start_date, end_date)
                 idx: school_year_id, [start_date+end_date]
holidays         (id, school_year_id, date, label)
                 idx: date

students         (id, name, grade, color, avatar, birth_date, archived_at)
subjects         (id, name, color, category, weekly_target_minutes, archived_at)

curricula        (id, subject_id, name, archived_at)
                 idx: subject_id
lessons          (id, curriculum_id, order, title, est_minutes, notes, link)
                 idx: [curriculum_id+order]
lesson_state     (id, student_id, lesson_id, status: 'pending'|'completed'|'skipped',
                  completed_on, order_override)
                 idx: [student_id+lesson_id] (unique), [student_id+status]

schedules        (id, student_id, subject_id, curriculum_id,
                  weekday[0..6], planned_minutes, active_from, active_to)
                 idx: [student_id+weekday], subject_id

daily_tasks      (id, student_id, date, subject_id, lesson_id|null,
                  title, planned_minutes, minutes, status: 'pending'|'completed'|'not_done'|'skipped',
                  note, confirmed_at, source: 'planned'|'quick_add'|'copied'|'rescheduled_from:<id>')
                 idx: [student_id+date], [student_id+date+subject_id], [lesson_id]

attendance       (id, student_id, date, status, note)
                 idx: [student_id+date] (unique), date
day_notes        (id, student_id, date, body)
                 idx: [student_id+date] (unique)
attachments_meta (id, owner_kind: 'day'|'task', owner_id, student_id, date,
                  blob_key, kind, caption)
                 idx: [student_id+date], [owner_kind+owner_id], blob_key
attachments_blob (blob_key, blob)   -- separate store so main JSON export stays lean

undo_log         (id, at, op, payload)
                 idx: at                 -- powers the 10-second undo toast; auto-prunes
search_index     (token, task_id, field) -- derived, rebuilt on open; supports fast search
                 idx: token
settings         (key, value)             -- kv: theme, confirmation cutoff, DND window,
                                          -- last-backup-at, week-dot goal, etc.
```

Key decisions:

- **`daily_tasks` is the source of truth for the day.** Generated lazily on first open of a date from `schedules` × next `pending` `lesson_state` per subject. Once generated, it's owned by the day — editing the schedule later won't retroactively rewrite past days.
- **`minutes` as the unit of truth.** `planned_minutes` is what the schedule/lesson suggested; `minutes` is what actually happened. They start equal and diverge if the user edits.
- **`lesson_state` vs. `lessons`.** Lessons are shared (a curriculum is a template); `lesson_state` tracks per-student progress. Supports multiple students sharing one curriculum without cross-contamination.
- **"Reschedule vs. skip" is just two operations on the same task.** *Reschedule* → create a new `daily_tasks` row on the next scheduled date with `source: rescheduled_from:<id>` and mark the original `skipped`; lesson stays `pending`. *Skip permanently* → mark task and `lesson_state` both `skipped`; advance to next lesson.
- **"Sick day" fans out "reschedule" across all today's tasks.** One operation, many rows; all undoable via `undo_log`.
- **Quick-add tasks have `lesson_id = null`** and a free-text `title`. They count toward totals but don't advance curriculum.
- **No `term_id` on tasks.** Terms are derived from `date` at query time — lets you redefine quarter boundaries without rewriting history.
- **Attachments split into meta + blob stores.** Makes the JSON export trivial (meta only); binary export is a separate zip.
- **Schema versioning via Dexie's `db.version(n).stores(...).upgrade(...)`** — migrations run on open, no server round-trip.

## 4. Architecture and build choices

**Recommendation: React + Vite + Dexie, installable as a PWA.** Pure client app — no backend, no accounts, no network. This repo already has React + Vite scaffolded and `xlsx` / `papaparse` installed, which cover exports.

### Why this stack

- **React + Vite**: fast dev loop, already scaffolded.
- **Dexie (IndexedDB wrapper)**: robust local database, handles schema migrations, supports compound indexes and transactions. Fits 100k+ daily tasks comfortably. `localStorage` is used only for small settings, if at all.
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
- Reports are computed from `daily_tasks` + `attendance` — never stored — so changing a subject's name retroactively updates old reports consistently.

### Responsive layout (one codebase, three breakpoints)

Works on phone, tablet, and desktop. Same screens, different chrome.

- **Phone (< 640px):** bottom nav (Today · Week · Curriculum · Reports), one column, bottom-sheet modals, swipe-to-toggle on task rows, numeric keypad input.
- **Tablet (640–1024px):** same bottom nav, wider cards, week view fits two days at once.
- **Desktop (≥ 1024px):** side nav replaces bottom nav; three-column layout on Today (student switcher | tasks | quick-add panel always visible); full keyboard shortcuts; `?` opens the cheat sheet.
- **Input adapts automatically:** `inputmode="numeric"` on phone minute fields, full `Tab` flow on desktop, `Enter` to confirm a task, `N` to open quick-add, `C` to confirm the day.
- **Print stylesheet** for desktop — the printable report matches the XLSX grid exactly, so umbrella-school submissions are identical across formats.

### Accessibility (WCAG 2.1 AA target)

First-class, not bolted on. Every feature is designed to meet these baselines before it ships:

- **Semantic HTML** first, ARIA only where native elements can't carry the role.
- **Keyboard-operable end-to-end.** Every swipe gesture has a button equivalent; every modal has a focus trap with clear return focus; `Esc` dismisses.
- **Screen-reader tested** on VoiceOver (iOS, macOS) and NVDA (Windows). Tasks announce as "Math, chapter 7, 30 minutes, completed, button — double-tap to mark not done."
- **Color is never the only signal.** Status carries an icon + text label; subject colors meet 3:1 contrast; a colorblind-safe palette is the default (can be swapped in settings).
- **Respects OS preferences:** `prefers-reduced-motion` kills swipe animations and replaces with fades; `prefers-color-scheme` for dark mode; dynamic type follows system font-size; DND window blocks the confirmation popup.
- **Tap targets ≥ 44×44px**, focus rings visible on keyboard focus (not hover), error messages programmatically linked to fields.
- **Forms are labelable.** No placeholder-only labels; every field has a visible label and an `aria-describedby` hint when needed.

### Code layout

```
src/
  db/              Dexie schema, migrations, typed repositories (the only place that touches Dexie)
  features/
    students/
    subjects/
    curriculum/    curricula, lessons, lesson_state
    schedule/      weekday schedules, day generation
    today/         today screen + daily confirmation modal
    quickadd/      quick-add sheet
    week/          week view (swipe/scroll)
    calendar/      month grid
    reports/       report builders + XLSX/CSV/print renderers
    backup/        export/import + File System Access auto-backup
    search/        search index + search UI
    settings/      theme, confirmation time, DND, week-dot goal, etc.
  lib/             date math, minutes formatting, a11y helpers, undo manager
  ui/              shared components (Button, Sheet, Card, Toast, Badge)
  App.jsx
```

Feature-folder structure keeps each screen's queries, components, and tests together. The `db/` layer is the only place that touches Dexie — everything else calls repo functions (e.g. `dailyTasksRepo.forDay(studentId, date)`, `lessonStateRepo.nextFor(studentId, subjectId)`).

## 5. UX priorities

- **Two paths, both ≤ 3 taps from open:** confirm the planned day, or quick-add an unplanned item.
- **Default to "it went as planned."** The confirmation modal pre-checks everything. Dissent (not-done, edited minutes, notes) is one tap per task; committing the whole day is one tap total.
- **Retro entry is a first-class workflow.** Catching up three days later on a Saturday morning must feel as fast as live entry.
- **Numbers, not prose.** Minutes render as `45m` or `1h 15m`, never `0.75 hours`.
- **Color + icon + label for every status.** No color-only signals.
- **Color coding from students and subjects propagates everywhere** (Today cards, calendar dots, week grid cells, report bars) — reduces cognitive load.
- **Undo is always available for 10 seconds.** Confirm, delete, sick-day, skip — all reversible from a toast.
- **Print view matches the XLSX export.** Umbrella-school submissions are identical across formats.
- **Respects reduced motion, dark mode, dynamic type, DND.** The app quiets down when the OS says so.
- **Tracking is a chore; remove friction.** Large tap targets, numeric keypads where apt, keyboard shortcuts on desktop, haptics on phone.

## 6. Daily confirmation flow

The headline interaction — worth spelling out end to end.

### Trigger

- Fires on first app open after a user-configurable cutoff (default **6:00 pm**).
- Suppressed during the DND window (default 10 pm – 7 am) — rolls to the next open.
- Users with multiple students see a combined modal by default (one section per student); settings offer "one modal per student" for those who prefer to confirm each separately.

### Layout (bottom sheet on phone, centered dialog on desktop)

```
┌──────────────────────────────────────────┐
│  How was Tuesday, April 23?           ✕ │
│                                          │
│  Attendance:  [● Present] [Absent] [½] │
│                                          │
│  ── Math ────────────────────────────── │
│  ✓ Ch. 7 Fractions        30m     [✎]   │
│                                          │
│  ── Reading ─────────────────────────── │
│  ✓ Charlotte's Web pp. 40–55  25m [✎]   │
│                                          │
│  ── History ────────────────────────── │
│  ✓ Ancient Egypt: Pyramids  45m   [✎]   │
│                                          │
│  + Copy yesterday                        │
│  + Add unplanned item                    │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │          Confirm today               │ │
│ └──────────────────────────────────────┘ │
│  Ask me later                            │
└──────────────────────────────────────────┘
```

### Per-task interactions

- **Tap row** → toggle ✓ completed ↔ ✗ not done. Tapping ✗ surfaces an inline picker: *push to next scheduled day* (default, highlighted) / *skip permanently*.
- **Tap minutes chip** → numeric keypad on phone, focused input on desktop. Snaps to 5-minute increments.
- **Tap pencil (✎)** → expands a note field (voice-note mic button on the right).
- **Long-press / right-click a row** → "Mark all remaining completed / not done" for bulk action.

### Commit semantics

- "Confirm today" writes all rows: `status` as shown, `minutes` as edited, `confirmed_at = now()`, attendance per chip. Closes modal. Undo toast appears for 10s.
- "Ask me later" dismisses. All tasks remain `pending`. Next day's Today screen shows a non-blocking banner: "You haven't confirmed Tuesday yet — [Confirm now]".
- If the user never confirms and the month ends, unconfirmed tasks show in reports as `pending` (counted separately from completed/not-done) so the gap is visible.

### Copy yesterday

One tap creates today's tasks from yesterday's *completed* tasks (same subjects, same minutes, same notes blank). Useful when today was a repeat. Only enabled when today has no tasks yet, to avoid accidental duplication.

### Sick day / Snow day

A single "Sick day" action (in the attendance chip menu and in the Today overflow menu) marks attendance and:
1. Sets every existing `daily_tasks` row for today to `skipped` with `status = skipped, source = sick_day`.
2. For each affected subject, creates a new `daily_tasks` row on its *next scheduled day* with `source = rescheduled_from:<original_id>`.
3. Writes one `undo_log` entry grouping all of the above so undo reverts the whole set.

### Multi-student day

- Modal shows one collapsible section per student, headed by avatar + color + name.
- "Confirm today" confirms *all* students at once; each student can be individually skipped ("confirm only Ava").
- A single undo reverts all-student confirmation.

## 7. Milestones

| Phase | Scope | Rough size |
|------|-------|------|
| M0 | Dexie schema + repos, students/subjects CRUD, school year setup, responsive shell (bottom nav ↔ side nav), a11y foundation | 3–4 days |
| M1 | Curriculum + lessons CRUD, schedules, day-generation engine (schedule × next-lesson → `daily_tasks`) | 1 week |
| M2 | Today screen + daily confirmation modal + attendance + undo toast | 1–2 weeks |
| M3 | Quick-add, reschedule-vs-skip, sick day, copy yesterday | 3–5 days |
| M4 | Week view + calendar view + retro edit | 1 week |
| M5 | Reports: day/week/month/quarter/semester + XLSX/CSV/print | 1 week |
| M6 | JSON backup/restore + File System Access auto-backup | 2–3 days |
| M7 | PWA install + offline asset caching + PWA icon badge | 2 days |
| M8 | Gentle feedback (week dots, curriculum progress, end-of-week digest), search, this-day-last-year | 1 week |
| M9 | Capture moments: attachments, photo-to-task, voice notes, quick notes/journal | 1 week |
| M10 | Power/retro: bulk edit, import, templates, required-hours bars, multi-student Today | 1–2 weeks |

## 8. Open questions for the user

1. **Jurisdiction?** Some US states require specific reporting formats (hours per subject, days in session). Knowing the state lets us ship the right export template.
2. **How many students, realistically?** Shapes whether the multi-student Today switcher should ship in M2 or M10.
3. **Default confirmation cutoff?** 6pm is a guess. Dinner-time (5–6pm) or bedtime (8–9pm)?
4. **Does time need sub-minute precision?** Recommending "no" — round to 5-minute increments in the UI.
5. **Which browser(s)?** File System Access API (auto-backup) is Chromium-only. If Safari/iOS is primary, auto-backup becomes a scheduled reminder to export manually. PWA install on iOS requires Safari's "Add to Home Screen."
6. **Curriculum import?** Will you type lessons by hand, or do you want CSV/spreadsheet import in M1 rather than M10?
7. **Does this repo keep the plant-shop code alongside, or is it repurposed?** Decides whether to delete unused deps and routes, or scaffold the homeschool app behind a new route.

## 9. Caveats of the local-only choice

Worth stating plainly so expectations match reality:

- **Clear-site-data wipes the app.** Mitigation: prominent backup reminders, auto-backup to disk, optional periodic export prompt.
- **One browser profile = one dataset.** Using the app on a phone and a laptop gives you two separate databases until cloud sync ships. Export/import is the bridge.
- **Storage quotas** are browser-managed; IndexedDB typically gets 50%+ of free disk, but may be evicted under pressure. Large attachment libraries are the main risk — mitigated by `navigator.storage.persist()`.
- **No password protection** on the device itself. If the laptop is shared, anyone who opens the app sees the data. Acceptable for home use; flag as a known limitation.
