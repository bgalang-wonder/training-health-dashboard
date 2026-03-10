# Program-Tracker Workout Experience for Training Health

## Summary
Build a mobile-first `Workouts` area as a top-level route alongside the existing dashboard. The product model for v1 is: `plans = prescription`, `logs = execution`, with manual plan editing by you, versioned plan history, and exercise-level actuals during the workout. The core UX goal is to let you open the app mid-workout, see today's program, complete/skip/modify each exercise quickly, add custom exercises on the fly, and preserve enough structure that the dashboard can later compare plan vs execution over time.

Trade-off posture:
- Favor clarity and in-session speed over coaching/admin complexity.
- Favor historical integrity over schema minimalism.
- Favor one workout record per date in v1 over true multi-session support.

Mental-model anchors:
- Prescription vs execution should stay visibly separate.
- The app should reduce typing during a live workout.
- Past plan versions must remain stable so old logs still make sense later.

## Implementation Changes
### Information architecture
- Add a persistent top navigation with `Dashboard` and `Workouts`.
- Keep `/` as the read-focused health dashboard.
- Add `/workouts` as the logging/program area with 3 views:
  1. `Today`: default, mobile-first workout execution screen.
  2. `History`: recent logged days, reopen/edit a prior workout.
  3. `Programs`: manual program management and version history.

### Workout execution flow (`/workouts` -> `Today`)
- Default to today's date, but allow changing the date.
- Resolve the active plan version for that date and show its exercises as tappable cards/rows.
- For each planned exercise, show:
  - planned target (`sets`, `reps_or_time`, notes)
  - execution status: `planned`, `completed`, `skipped`, `modified`
  - actual fields: completed sets, reps or duration, optional weight, optional notes
- Allow `Add exercise` for unplanned/custom movements; custom additions are clearly labeled and do not mutate the underlying plan.
- Include session-level fields at the bottom/top summary:
  - focus/title
  - overall RPE
  - workout notes
  - completed plan version reference
- Use a sticky primary action on mobile: `Save workout`.
- Preserve unsaved edits locally while on the page so live logging is resilient to accidental navigation/reload.
- Saving upserts the workout for that date rather than creating duplicate same-day records.

### Program management (`/workouts` -> `Programs`)
- Treat plans as versioned records, not overwrite-in-place documents.
- Program list shows plan name, effective date, and whether it is the current active version.
- Primary v1 creation flow: `Duplicate latest version` into a new editable version, then adjust exercises/notes.
- Allow manual editing of:
  - plan title/name
  - effective start date
  - general notes
  - ordered exercise list
- Exercise editor supports:
  - name
  - category / muscle metadata if already used
  - target sets
  - target reps-or-time display
  - coaching note
- Activating a new version should only affect future dates; past logs remain linked to the version they were created against.

### History and review (`/workouts` -> `History`)
- Show recent workout days with date, linked program version, session RPE, and completion summary.
- Opening a history item returns to the workout execution view for that date in edit mode.
- If the linked plan version is no longer active, the screen still renders against the historical version, not the current one.

### Data model / interface changes
- Keep `training_logs` as one record per date in v1.
- Extend `training_plans` to support versioning with fields equivalent to:
  - stable program/group identifier
  - version identifier
  - human-readable title
  - effective start date
  - archive/active state
- Add stable IDs to plan exercises so execution can map to planned items without fuzzy name matching.
- Extend logged exercises to capture execution semantics, including:
  - link to planned exercise ID when applicable
  - status (`completed`, `skipped`, `modified`, `added`)
  - actual sets
  - actual reps or duration
  - optional weight
  - optional notes
- Keep the existing dashboard-compatible day-level fields (`rpe`, `focus`, `workout_notes`, symptom fields, etc.) so the health dashboard continues to work.
- Do not build coach accounts, permissions, or Ryan-facing editing in v1.

## UX / Interaction Spec
### State model
- `Loading`: fetch plans/log for date.
- `No active plan`: show empty state with CTA to create or activate a program version.
- `Plan loaded, no log yet`: show planned workout with empty actual fields.
- `Draft in progress`: local unsaved edits present.
- `Saved workout`: confirmation state after successful save.
- `Save error`: non-destructive error message, preserve draft, retry allowed.

### Important behaviors
- Changing a plan after a workout was logged must not retroactively change that workout's displayed prescription.
- Skipping a planned exercise should still keep it visible in the session summary.
- Modifying an exercise should preserve the original target and record the actual performed values.
- Added/custom exercises should appear after planned items by default and be clearly marked.
- If there is already a log for the selected date, the form pre-fills from that log.

### Accessibility and mobile quality
- Large touch targets for exercise status and primary actions.
- Semantic form controls and labels for all fields.
- Keyboard-safe layout and predictable tab order on desktop.
- Sticky action bar must not hide content or trap focus.
- Mobile layout should work one-handed without requiring horizontal scrolling.

## Test Plan
- Route/nav:
  - top nav correctly switches between dashboard and workouts
  - current section is visually identifiable
- Plan versioning:
  - creating a new version does not mutate historical versions
  - selecting a past logged date loads the historical plan version
- Workout logging:
  - new day with active plan can be saved
  - existing day reopens and updates correctly
  - completed/skipped/modified/added exercise states persist correctly
  - custom added exercise saves without corrupting planned exercise mapping
- Edge cases:
  - selected date with no active plan shows correct empty state
  - failed save preserves in-progress data
  - dashboard still renders with new log shape and linked plan metadata
- Responsive behavior:
  - `Today` flow is usable on a phone-sized viewport without clipped actions or unreadable fields

## Assumptions and defaults
- Primary user is you; Ryan does not log in or edit directly in v1.
- Primary usage context is live during the workout on phone.
- V1 supports one workout log per day, even if the long-term product may later expand to multiple sessions per day.
- Deviation during a workout updates execution only; it does not silently rewrite the underlying program.
- The existing dashboard remains the analytics/review surface; the new workouts area is the operational logging surface.
