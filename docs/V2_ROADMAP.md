# Version 2 Roadmap — Plant Management System

**Version:** 2.0.0
**Status:** Planning
**Builds on:** V1.0.0 (all M1–M5 complete, M6 polish in progress)

---

## New V2 Requirements

| # | Requirement | Status |
|---|-------------|--------|
| R1 | Indoor/outdoor mapping | ✅ Already implemented (location type, lat/lng, nested locations, drag-drop) |
| R2 | Log viewer in Settings UI | 🆕 New |
| R3 | Auto-identification when uploading/creating a plant | 🆕 New |
| R4 | Use already-saved plant photos in AI Diagnostics | 🆕 New |

---

## Milestones

### M6 — Polish & Production Readiness (carry-over from V1)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6.1 | Error boundaries & graceful degradation | High | ⬜ Todo |
| 6.2 | Loading states & skeleton screens | Medium | ⬜ Todo |
| 6.3 | Input validation — frontend forms + backend API | High | 🔧 Partial (empty-field fix landed in V1 hotfix) |
| 6.4 | Data export — plant registry as CSV/JSON | Medium | ⬜ Todo |
| 6.5 | Dark mode support | Low | ⬜ Todo |
| 6.6 | PWA manifest — installable on iOS/Android home screen | Medium | ⬜ Todo |

---

### M7 — Log Viewer (R2)

Surface backend application logs inside the Settings page so issues can be diagnosed without SSH access.

**Backend:**
- New `GET /api/v1/settings/logs?lines=200&level=all` endpoint
- Reads from structured application log (file or stdout, configurable)
- Supports query params: `lines` (tail count), `level` (error/warn/info/all), `since` (ISO timestamp)
- Add morgan/winston structured logging to backend if not already present
- Log rotation config (max size, max files)

**Frontend (Settings page — new "Logs" tab):**
- Tab bar added to Settings: General | Logs
- Log viewer panel: scrollable, monospace, color-coded by level (red=error, yellow=warn, blue=info)
- Controls: level filter dropdown, line count selector, auto-refresh toggle (30s), manual Refresh button
- Copy-to-clipboard button for sharing log snippets
- Clear visual separation between log entries (timestamp | level | message)

---

### M8 — Auto-Identification on Plant Create/Upload (R3)

When a photo is provided during plant creation or uploaded to an existing plant, automatically run AI identification and pre-fill plant fields.

**Plant creation flow:**
- If photo is uploaded in "Add Plant" modal → after image upload completes, call `POST /api/v1/ai/diagnose` with `prompt_type=identification` and the photo
- Parse AI response to extract: common name, scientific name, plant type, care summary
- Pre-fill form fields with extracted values (user can override before saving)
- Show inline "AI identified: _Monstera deliciosa_" confirmation chip in the form
- Graceful fallback: if AI unavailable or returns low-confidence result, skip pre-fill silently

**Plant detail photo upload:**
- Existing "Change Photo" button on PlantDetail already uploads and saves
- After upload, if no scientific name set: auto-run identification and update plant fields
- Show toast: "AI identified plant — fields updated" with undo option

**Backend:**
- New `POST /api/v1/plants/:id/identify` endpoint — runs identification against plant's current `image_url`, updates name/scientific_name/plant_type if blank, returns updated plant
- Reuse existing AI service chain (same provider routing as diagnostics)

---

### M9 — Saved Photos in AI Diagnostics (R4)

Let users select from photos already saved to their plants in the AI Diagnostics photo picker, instead of always uploading a new file.

**Frontend (AI Diagnostics page):**
- Photo input area gains two tabs: **Upload New** (current behavior) | **Use Saved Photo**
- "Use Saved Photo" tab shows a scrollable grid of plant profile photos (thumbnail + plant name)
- Selecting a saved photo sets `image_url` reference; no re-upload needed
- Selected photo shows same preview UI as an uploaded file
- If a specific plant is selected in the "Plant" dropdown, its photo is highlighted/auto-selected

**Backend:**
- `POST /api/v1/ai/diagnose` already accepts `image_url` in body (JSON path) — no backend changes needed
- When a saved photo is selected, frontend sends `image_url` in the JSON payload instead of uploading a file
- Backend loads image from disk, encodes to base64, passes to AI provider (same as upload path)

---

### M10 — Tech Debt & Security (carry-over TD items)

| # | Task | Priority | Notes |
|---|------|----------|-------|
| 10.1 | Encrypt API keys at rest in DB | High | TD-2: keys currently plaintext in PostgreSQL |
| 10.2 | Pagination on plant/care-log lists | Medium | TD-3: no limit on list queries |
| 10.3 | Image resize/optimization before storage | Low | TD-4: raw uploads stored unresized |
| 10.4 | Rate limiting on upload endpoint | Medium | Currently only AI endpoint is rate-limited |

---

## Delivery Order (Recommended)

1. **M6** — Polish first: error boundaries + validation + PWA make V1 feel complete before adding features
2. **M8** — Auto-ID on create (high visible impact, builds on existing AI + upload infrastructure)
3. **M9** — Saved photos in AI (completes the photo story; depends on M8 patterns)
4. **M7** — Log viewer (useful for ops; self-contained, low risk)
5. **M10** — Tech debt pass before any multi-user or external-facing work

---

## Definition of Done (V2)

- [ ] Feature works end-to-end in Docker Compose
- [ ] Deployed and smoke-tested on testing server (192.168.100.14) before production push
- [ ] QA test script updated to cover new endpoints
- [ ] TypeScript types defined (no `any`)
- [ ] Error states handled gracefully in UI
- [ ] Mobile-responsive layout verified

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-06-10 | Initial release — M1–M5 complete |
| 1.0.1 | 2026-06-17 | Hotfix: empty-field crash on add-plant; Settings API key clear button |
| 2.0.0 | TBD | M6–M10 |
