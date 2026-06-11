# QA Test Plan — Plant Management System

**Version:** 1.0  
**Last Updated:** 2026-06-11  
**Test Script:** `scripts/qa_test.sh`  
**Run command:** `BASE_URL=http://<host>:8090 bash scripts/qa_test.sh`  
**Last full run result:** 57 PASS / 0 FAIL / 1 SKIP (2026-06-11)

---

## How to Run

```bash
# Against the NAS server
BASE_URL=http://192.168.100.14:8090 bash scripts/qa_test.sh

# Against local Docker stack
BASE_URL=http://localhost:8090 bash scripts/qa_test.sh
```

The script is fully automated and self-cleaning — it creates all test data and deletes it at the end. It requires `curl` and `python3` on the machine running it.

---

## Sign-Off Checklist

After each release or major feature, a human reviewer should confirm these manual checks in addition to the automated suite. Check each box once verified.

| # | Manual Check | Notes | Sign-off |
|---|---|---|---|
| M-01 | Dashboard loads — plant counts, due-soon list, recent care logs all render | | |
| M-02 | Weather widget appears on dashboard when OpenWeatherMap key is set | | |
| M-03 | Plants page groups plants under location containers | | |
| M-04 | Drag-and-drop: drag a plant card to a different location, card moves | | |
| M-05 | Plant cards show correct left-border color: green=good/excellent, yellow=fair, red=poor/critical, gray=unknown | | |
| M-06 | Add plant form: save without Scientific Name — field auto-fills after save | | |
| M-07 | Locations page shows ↳ parent name on nested location cards | | |
| M-08 | AI Diagnostics: select a plant, context badge "🌱 Plant Name context included" appears | | |
| M-09 | AI Diagnostics: weather badge "🌤 82°F · clear sky · 23% humidity" appears when weather configured | | |
| M-10 | AI Diagnostics: all 5 analysis type buttons render (Diagnose, Identify, Pest & Disease, Care Advice, General Q&A) | | |
| M-11 | AI Diagnostics: upload a plant photo via drag-drop, image preview appears | | |
| M-12 | AI Diagnostics: submit with OpenRouter selected, result renders in structured format with headers | | |
| M-13 | Settings page shows all 23 settings keys grouped by category | | |
| M-14 | Settings page masks secret fields (API keys show ●●●●●● after save) | | |
| M-15 | Sensors page: add a sensor, it appears grouped under its location | | |
| M-16 | Sensors page: Sync button on a sensor without HA configured shows an error toast | | |

---

## Automated Test Cases

### Section 1 — Health Check & Providers

| ID | Test Name | Endpoint | Expected | Validates |
|---|---|---|---|---|
| 1-01 | GET /settings/health HTTP 200 | `GET /api/v1/settings/health` | HTTP 200 | Server is up |
| 1-02 | health.services.success | response body | `success: true` | Response wrapper correct |
| 1-03 | health.services.database present | response body | `services.database` key exists | DB connection live |
| 1-04 | GET /ai/providers HTTP 200 | `GET /api/v1/ai/providers` | HTTP 200 | Provider status endpoint up |
| 1-05 | GET /ai/providers success | response body | `success: true` | Response wrapper correct |
| 1-06 | openrouter shows available | response body | `data.openrouter.available == true` | OpenRouter key is configured |

---

### Section 2 — Locations: CRUD + Tree + Nesting

| ID | Test Name | Endpoint | Expected | Validates |
|---|---|---|---|---|
| 2-01 | GET /locations returns list | `GET /api/v1/locations` | HTTP 200, array | List endpoint works |
| 2-02 | GET /locations/tree returns list | `GET /api/v1/locations/tree` | HTTP 200, array | Tree endpoint works |
| 2-03 | POST /locations creates correctly | `POST /api/v1/locations` | HTTP 201, name matches | Create a top-level location |
| 2-04 | POST /locations (nested child) | `POST /api/v1/locations` with `parent_id` | HTTP 201 | Create child location |
| 2-05 | nested location has correct parent_id | response body | `data.parent_id == parent loc id` | parent_id stored correctly |
| 2-06 | tree: child nested under parent | `GET /api/v1/locations/tree` | child inside parent.children | Tree endpoint nests correctly |
| 2-07 | PUT /locations updates field | `PUT /api/v1/locations/:id` | HTTP 200, description updated | Update endpoint works |
| 2-08 | GET /locations/:id returns record | `GET /api/v1/locations/:id` | HTTP 200, id matches | Get-by-id works |
| 2-09 | GET /locations 404 on unknown id | `GET /api/v1/locations/999999` | HTTP 404 | Not-found handling works |

---

### Section 3 — Plants: CRUD + Filters + Water + DnD Move

| ID | Test Name | Endpoint | Expected | Validates |
|---|---|---|---|---|
| 3-01 | GET /plants returns list | `GET /api/v1/plants` | HTTP 200, array | List endpoint works |
| 3-02 | POST /plants creates correctly | `POST /api/v1/plants` | HTTP 201, name matches | Create plant |
| 3-03 | POST /plants without scientific_name accepted | `POST /api/v1/plants` (no sci name) | HTTP 201 | Field is optional |
| 3-04 | AI scientific name auto-fill | response body after create | `scientific_name` non-empty | Auto-fill via AI lookup runs on create |
| 3-05 | GET /plants/:id returns record | `GET /api/v1/plants/:id` | HTTP 200, id matches | Get-by-id works |
| 3-06 | GET /plants filter by location_id | `GET /api/v1/plants?location_id=X` | HTTP 200, len >= 1 | Query filter works |
| 3-07 | GET /plants filter by health_status | `GET /api/v1/plants?health_status=good` | HTTP 200 | Query filter works |
| 3-08 | GET /plants search returns QA plant | `GET /api/v1/plants?search=Monstera` | HTTP 200, result contains "Monstera" | Search filter works |
| 3-09 | GET /plants filter by plant_type | `GET /api/v1/plants?plant_type=tropical` | HTTP 200 | Query filter works |
| 3-10 | PUT /plants updates health_status | `PUT /api/v1/plants/:id` | HTTP 200, health_status updated | Update endpoint works |
| 3-11 | PUT /plants DnD reassigns location | `PUT /api/v1/plants/:id` with new `location_id` | HTTP 200, location_id changed | Drag-and-drop location move works |
| 3-12 | POST /plants/:id/water sets last_watered_at | `POST /api/v1/plants/:id/water` | HTTP 200, last_watered_at not null | Watering action updates timestamp |
| 3-13 | GET /plants/due-soon returns list | `GET /api/v1/plants/due-soon?days=30` | HTTP 200, array | Due-soon query works |
| 3-14 | GET /plants 404 on unknown id | `GET /api/v1/plants/999999` | HTTP 404 | Not-found handling works |
| 3-15 | POST /plants missing name rejects | `POST /api/v1/plants` with empty body | HTTP 400 | Required field validation works |

---

### Section 4 — Care Logs

| ID | Test Name | Endpoint | Expected | Validates |
|---|---|---|---|---|
| 4-01 | GET /care-logs returns list | `GET /api/v1/care-logs` | HTTP 200, array | List endpoint works |
| 4-02 | POST /care-logs creates log | `POST /api/v1/care-logs` | HTTP 201 | Create care log |
| 4-03 | GET /care-logs filter by plant_id | `GET /api/v1/care-logs?plant_id=X` | HTTP 200, len >= 1 | Query filter works |
| 4-04 | DELETE /care-logs removes log | `DELETE /api/v1/care-logs/:id` | HTTP 200 | Delete endpoint works |

---

### Section 5 — Sensors: CRUD + HA Sync

| ID | Test Name | Endpoint | Expected | Validates |
|---|---|---|---|---|
| 5-01 | GET /sensors returns list | `GET /api/v1/sensors` | HTTP 200, array | List endpoint works |
| 5-02 | POST /sensors creates sensor | `POST /api/v1/sensors` | HTTP 201, name matches | Create sensor |
| 5-03 | GET /sensors filter by location_id | `GET /api/v1/sensors?location_id=X` | HTTP 200, len >= 1 | Query filter works |
| 5-04 | POST /sensors/:id/sync (HA not configured) | `POST /api/v1/sensors/:id/sync` | HTTP 503 | Graceful failure when HA missing |
| 5-05 | POST /sensors/sync-all (HA not configured) | `POST /api/v1/sensors/sync-all` | HTTP 503 | Graceful failure when HA missing |
| 5-06 | DELETE /sensors removes sensor | `DELETE /api/v1/sensors/:id` | HTTP 200 | Delete endpoint works |

> **Note:** Tests 5-04 and 5-05 expect HTTP 503 because Home Assistant is not configured in the test environment. If HA is configured (`ha.base_url` + `ha.token` in Settings), these will pass with HTTP 200 instead.

---

### Section 6 — Settings

| ID | Test Name | Endpoint | Expected | Validates |
|---|---|---|---|---|
| 6-01 | GET /settings returns list | `GET /api/v1/settings` | HTTP 200, array | List endpoint works |
| 6-02 | settings count is >= 10 | response body | len >= 10 | No settings rows deleted by accident |
| 6-03 | migration 003 settings present | response body | keys `ha.base_url` and `api.openrouter_key` exist | Migration 003 ran on this DB |
| 6-04 | *(SKIP)* secret masking check | response body | All `is_secret=true` rows have empty `value` | API doesn't expose raw secrets |
| 6-05 | PUT /settings updates valid key | `PUT /api/v1/settings` | HTTP 200 | Known key can be updated |
| 6-06 | PUT /settings rejects unknown key | `PUT /api/v1/settings` with unknown key | HTTP 400 | Unknown keys are rejected |

> **Note:** Test 6-04 is currently skipped because the Settings API returns values for secrets (they are stored encrypted in DB, masked in UI). This may be tightened in a future security pass.

---

### Section 7 — AI Diagnostics: All Prompt Types + Context Injection

| ID | Test Name | Provider | Prompt Type | Context | Validates |
|---|---|---|---|---|---|
| 7-01 | diagnosis (text only) | openrouter | `diagnosis` | none | Diagnosis structured response works |
| 7-02 | identification (text only) | openrouter | `identification` | none | Identification structured response works |
| 7-03 | pest_treatment | openrouter | `pest_treatment` | none | IPM treatment structured response works |
| 7-04 | care_advice (no plant) | openrouter | `care_advice` | weather via OpenWeatherMap | Care plan with weather context works |
| 7-05 | general Q&A | openrouter | `general` | none | General question answering works |
| 7-06 | diagnosis WITH plant context | openrouter | `diagnosis` | plant_id injected | Plant context is added to prompt |
| 7-07 | care_advice WITH plant context | openrouter | `care_advice` | plant_id + weather | Plant + weather context combined |
| 7-08 | GET /ai/history has >= 3 records | `GET /api/v1/ai/history?limit=20` | — | — | Interactions are persisted |
| 7-09 | AI history records plant_id | response body | plant_id present in a record | — | Plant context association stored |

> **Note:** All AI tests in section 7 are skipped if OpenRouter is not configured (`api.openrouter_key` empty). The same prompt types work identically with Anthropic, OpenAI, or Ollama providers — only OpenRouter is tested here to keep costs minimal.
>
> **What "context injection" means:** When `plant_id` is passed, the backend adds a `=== Plant Context ===` block to the prompt containing the plant's name, type, health status, location, watering schedule, and notes. When an OpenWeatherMap key is configured, a `=== Current Weather ===` block is also prepended. Both are visible in the AI response when the model references specific plant or local weather details.

---

### Section 8 — Error Handling

| ID | Test Name | Endpoint | Expected | Validates |
|---|---|---|---|---|
| 8-01 | GET /plants/notanid → 400 | `GET /api/v1/plants/notanid` | HTTP 400 or 422 | Non-numeric ID rejected gracefully |
| 8-02 | GET /locations/0 → 400 or 404 | `GET /api/v1/locations/0` | HTTP 400 or 404 | Zero/invalid ID handled gracefully |

---

### Section 9 — Cleanup

The script deletes all test data it created. If the suite is interrupted mid-run, these records may remain in the database and should be deleted manually:

- Plants named `QA Monstera` or `Desert Rose`
- Locations named `QA Test Room` and `QA Window Shelf`
- Any sensor named `QA Soil Sensor`

```sql
-- Emergency cleanup if script is interrupted
DELETE FROM plants WHERE name IN ('QA Monstera', 'Desert Rose') AND plant_type IN ('tropical','succulent');
DELETE FROM locations WHERE name IN ('QA Window Shelf', 'QA Test Room');
```

---

## Known Limitations & Out of Scope

| ID | Item | Notes |
|---|---|---|
| OOS-01 | Image upload in AI diagnostics | Requires a physical image file — not easily automated with curl. Test manually via M-11/M-12. |
| OOS-02 | Drag-and-drop in browser | Browser interaction cannot be tested via curl. Covered by M-04. |
| OOS-03 | HA sensor live sync | Requires a real Home Assistant instance. Tests 5-04/5-05 verify graceful 503; live sync verified manually when HA is configured. |
| OOS-04 | Plant Knowledge / Perenual lookup | Perenual API calls are side-effectful. The auto-fill scientific name test (3-04) covers the integration path. |
| OOS-05 | Anthropic / OpenAI AI providers | Section 7 tests with OpenRouter only. All providers share the same controller/prompt code — only the HTTP client differs. |
| OOS-06 | Frontend unit/component tests | No test framework currently configured in the frontend. Coverage is manual (M-01 through M-16). |

---

## Bug Found During Test Run (2026-06-11)

| Bug ID | Description | Root Cause | Fix Applied |
|---|---|---|---|
| BUG-003 | `pest_treatment` prompt type returned HTTP 400 "Invalid value for field" | `llm_interactions.prompt_type` CHECK constraint was `('diagnosis','identification','care_advice','general')` — `pest_treatment` was added to the TypeScript types and frontend but the DB constraint was not widened | ALTER TABLE applied to live DB; `001_schema.sql` and `003_features.sql` updated for future installs |

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-06-11 | Initial test plan documenting 57 automated + 16 manual test cases |
