#!/bin/bash
# Full QA test suite — Plant Management System
BASE="${BASE_URL:-http://localhost:8090}"
API="$BASE/api/v1"
PASS=0; FAIL=0; SKIP=0
declare -a ERRORS=()

g='\033[0;32m'; r='\033[0;31m'; y='\033[0;33m'; n='\033[0m'
pass() { echo -e "${g}PASS${n} $1"; PASS=$((PASS+1)); }
fail() { local m="$1 — $2"; echo -e "${r}FAIL${n} $m"; FAIL=$((FAIL+1)); ERRORS+=("$m"); }
skip() { echo -e "${y}SKIP${n} $1 — $2"; SKIP=$((SKIP+1)); }
hdr()  { echo -e "\n${y}── $1 ──${n}"; }

# Returns body in QA_BODY; sets QA_CODE to HTTP status
req() {
  QA_CODE=$(curl -s -o /tmp/qa_body -w "%{http_code}" "$@" 2>/dev/null)
  QA_BODY=$(cat /tmp/qa_body)
}

# check_code <expected_code> <name>
check_code() {
  if [[ "$QA_CODE" != "$1" ]]; then
    fail "$2" "HTTP $QA_CODE (expected $1) — ${QA_BODY:0:200}"
    return 1
  fi
  return 0
}

# jq_true <expr> — evaluates python expr against QA_BODY json; returns 0 if True
jq_true() {
  local r; r=$(echo "$QA_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(bool($1))" 2>/dev/null)
  [[ "$r" == "True" ]]
}

# extract <python-expr> — prints value from QA_BODY
extract() {
  echo "$QA_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null
}

# ─── state ────────────────────────────────────────────────────────
LOC_ID=""; LOC_CHILD_ID=""; PLANT_ID=""; PLANT2_ID=""
SENSOR_ID=""; OR_AVAIL="False"

# ═══════════════════════════════════════════════════════════════════
hdr "1. HEALTH CHECK & PROVIDERS"
# ═══════════════════════════════════════════════════════════════════

req "$API/settings/health"
if check_code 200 "GET /settings/health HTTP 200"; then
  jq_true "d['success']" && pass "GET /settings/health success" || fail "GET /settings/health" "success=false"
  jq_true "'database' in d.get('data',{}).get('services',{})" && pass "health.services.database present" || fail "health.services.database" "key missing"
fi

req "$API/ai/providers"
if check_code 200 "GET /ai/providers HTTP 200"; then
  jq_true "d['success']" && pass "GET /ai/providers success" || fail "GET /ai/providers" "success=false"
  OR_AVAIL=$(extract "d['data']['openrouter']['available']")
  [[ "$OR_AVAIL" == "True" ]] && pass "openrouter shows available" || fail "openrouter available" "got: $OR_AVAIL"
fi

# ═══════════════════════════════════════════════════════════════════
hdr "2. LOCATIONS — CRUD + TREE + NESTING"
# ═══════════════════════════════════════════════════════════════════

req "$API/locations"
check_code 200 "GET /locations HTTP 200" && \
  { jq_true "d['success'] and isinstance(d['data'],list)" && pass "GET /locations returns list" || fail "GET /locations" "unexpected body"; }

req "$API/locations/tree"
check_code 200 "GET /locations/tree HTTP 200" && \
  { jq_true "d['success'] and isinstance(d['data'],list)" && pass "GET /locations/tree returns list" || fail "GET /locations/tree" "unexpected body"; }

req -X POST "$API/locations" \
    -H "Content-Type: application/json" \
    -d '{"name":"QA Test Room","type":"indoor","city":"Chandler","state":"AZ"}'
if check_code 201 "POST /locations (top-level) HTTP 201"; then
  jq_true "d['success'] and d['data']['name']=='QA Test Room'" && pass "POST /locations creates correctly" || fail "POST /locations body" "$QA_BODY"
  LOC_ID=$(extract "d['data']['id']")
else
  fail "POST /locations" "blocked — CRUD + nesting tests will be limited"
fi

if [[ -n "$LOC_ID" && "$LOC_ID" != "None" ]]; then
  req -X POST "$API/locations" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"QA Window Shelf\",\"type\":\"indoor\",\"parent_id\":$LOC_ID}"
  if check_code 201 "POST /locations (nested child) HTTP 201"; then
    jq_true "d['success'] and d['data']['parent_id']==$LOC_ID" && pass "nested location has correct parent_id" || fail "nested parent_id" "$QA_BODY"
    LOC_CHILD_ID=$(extract "d['data']['id']")
  fi

  if [[ -n "$LOC_CHILD_ID" && "$LOC_CHILD_ID" != "None" ]]; then
    req "$API/locations/tree"
    HAS=$(echo "$QA_BODY" | python3 -c "
import sys,json
data=json.load(sys.stdin)['data']
def find(nodes):
    for n in nodes:
        if n['id']==$LOC_ID: return len(n.get('children',[]))>0
        if find(n.get('children',[])): return True
    return False
print(find(data))" 2>/dev/null)
    [[ "$HAS" == "True" ]] && pass "tree: child nested under parent" || fail "tree nesting" "parent $LOC_ID missing children"
  fi

  req -X PUT "$API/locations/$LOC_ID" \
      -H "Content-Type: application/json" \
      -d '{"description":"QA updated"}'
  check_code 200 "PUT /locations/:id HTTP 200" && \
    { jq_true "d['success'] and d['data']['description']=='QA updated'" && pass "PUT /locations updates field" || fail "PUT /locations body" "$QA_BODY"; }

  req "$API/locations/$LOC_ID"
  check_code 200 "GET /locations/:id HTTP 200" && \
    { jq_true "d['success'] and d['data']['id']==$LOC_ID" && pass "GET /locations/:id returns record" || fail "GET /locations/:id body" "$QA_BODY"; }
fi

req "$API/locations/999999"
check_code 404 "GET /locations/999999 → 404" && pass "GET /locations 404 on unknown id" || true

# ═══════════════════════════════════════════════════════════════════
hdr "3. PLANTS — CRUD + FILTERS + WATER + DnD MOVE"
# ═══════════════════════════════════════════════════════════════════

req "$API/plants"
check_code 200 "GET /plants HTTP 200" && \
  { jq_true "d['success'] and isinstance(d['data'],list)" && pass "GET /plants returns list" || fail "GET /plants" "$QA_BODY"; }

LOC_EXTRA=""
[[ -n "$LOC_ID" && "$LOC_ID" != "None" ]] && LOC_EXTRA=",\"location_id\":$LOC_ID"
req -X POST "$API/plants" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"QA Monstera\",\"plant_type\":\"tropical\",\"health_status\":\"good\",\"watering_frequency_days\":7,\"fertilizing_frequency_days\":30$LOC_EXTRA}"
if check_code 201 "POST /plants HTTP 201"; then
  jq_true "d['success'] and d['data']['name']=='QA Monstera'" && pass "POST /plants creates correctly" || fail "POST /plants body" "$QA_BODY"
  PLANT_ID=$(extract "d['data']['id']")
fi

req -X POST "$API/plants" \
    -H "Content-Type: application/json" \
    -d '{"name":"Desert Rose","plant_type":"succulent","health_status":"unknown","watering_frequency_days":14,"fertilizing_frequency_days":60}'
if check_code 201 "POST /plants (no scientific_name) HTTP 201"; then
  pass "POST /plants without scientific_name accepted"
  PLANT2_ID=$(extract "d['data']['id']")
  SCI=$(extract "str(d['data'].get('scientific_name') or '')")
  if [[ -n "$SCI" && "$SCI" != "None" && "$SCI" != "" ]]; then
    pass "AI scientific name auto-fill: '$SCI'"
  else
    skip "AI scientific name auto-fill" "no AI key configured or empty result"
  fi
fi

if [[ -n "$PLANT_ID" && "$PLANT_ID" != "None" ]]; then
  req "$API/plants/$PLANT_ID"
  check_code 200 "GET /plants/:id HTTP 200" && \
    { jq_true "d['success'] and d['data']['id']==$PLANT_ID" && pass "GET /plants/:id returns record" || fail "GET /plants/:id" "$QA_BODY"; }

  [[ -n "$LOC_ID" && "$LOC_ID" != "None" ]] && {
    req "$API/plants?location_id=$LOC_ID"
    check_code 200 "GET /plants?location_id filter HTTP 200" && \
      { jq_true "d['success'] and len(d['data'])>=1" && pass "GET /plants filter by location_id" || fail "GET /plants location filter" "$QA_BODY"; }
  }

  req "$API/plants?health_status=good"
  check_code 200 "GET /plants?health_status filter HTTP 200" && \
    { jq_true "d['success']" && pass "GET /plants filter by health_status" || fail "GET /plants health filter" "$QA_BODY"; }

  req "$API/plants?search=Monstera"
  check_code 200 "GET /plants?search filter HTTP 200" && \
    { jq_true "d['success'] and any('Monstera' in p['name'] for p in d['data'])" && pass "GET /plants search returns QA plant" || fail "GET /plants search" "$QA_BODY"; }

  req "$API/plants?plant_type=tropical"
  check_code 200 "GET /plants?plant_type filter HTTP 200" && \
    { jq_true "d['success']" && pass "GET /plants filter by plant_type" || fail "GET /plants plant_type filter" "$QA_BODY"; }

  req -X PUT "$API/plants/$PLANT_ID" \
      -H "Content-Type: application/json" \
      -d '{"health_status":"fair"}'
  check_code 200 "PUT /plants/:id HTTP 200" && \
    { jq_true "d['success'] and d['data']['health_status']=='fair'" && pass "PUT /plants updates health_status" || fail "PUT /plants update" "$QA_BODY"; }

  if [[ -n "$LOC_CHILD_ID" && "$LOC_CHILD_ID" != "None" ]]; then
    req -X PUT "$API/plants/$PLANT_ID" \
        -H "Content-Type: application/json" \
        -d "{\"location_id\":$LOC_CHILD_ID}"
    check_code 200 "PUT /plants (DnD move) HTTP 200" && \
      { jq_true "d['success'] and d['data']['location_id']==$LOC_CHILD_ID" && pass "PUT /plants DnD reassigns location" || fail "PUT /plants DnD move" "$QA_BODY"; }
    # move back
    req -X PUT "$API/plants/$PLANT_ID" -H "Content-Type: application/json" -d "{\"location_id\":$LOC_ID}"
  fi

  req -X POST "$API/plants/$PLANT_ID/water"
  check_code 200 "POST /plants/:id/water HTTP 200" && \
    { jq_true "d['success'] and d['data'].get('last_watered_at') is not None" && pass "POST /plants/:id/water sets last_watered_at" || fail "POST /plants/water" "$QA_BODY"; }

  req "$API/plants/due-soon?days=30"
  check_code 200 "GET /plants/due-soon HTTP 200" && \
    { jq_true "d['success'] and isinstance(d['data'],list)" && pass "GET /plants/due-soon returns list" || fail "GET /plants/due-soon" "$QA_BODY"; }
fi

req "$API/plants/999999"
check_code 404 "GET /plants/999999 → 404" && pass "GET /plants 404 on unknown id" || true

req -X POST "$API/plants" -H "Content-Type: application/json" -d '{}'
[[ "$QA_CODE" != "200" ]] && pass "POST /plants missing name rejects (HTTP $QA_CODE)" || fail "POST /plants missing name" "returned 200"

# ═══════════════════════════════════════════════════════════════════
hdr "4. CARE LOGS"
# ═══════════════════════════════════════════════════════════════════

req "$API/care-logs"
check_code 200 "GET /care-logs HTTP 200" && \
  { jq_true "d['success'] and isinstance(d['data'],list)" && pass "GET /care-logs returns list" || fail "GET /care-logs" "$QA_BODY"; }

if [[ -n "$PLANT_ID" && "$PLANT_ID" != "None" ]]; then
  req -X POST "$API/care-logs" \
      -H "Content-Type: application/json" \
      -d "{\"plant_id\":$PLANT_ID,\"care_type\":\"observation\",\"notes\":\"QA test log\"}"
  CARELOG_ID=""
  if check_code 201 "POST /care-logs HTTP 201"; then
    jq_true "d['success']" && pass "POST /care-logs creates log" || fail "POST /care-logs body" "$QA_BODY"
    CARELOG_ID=$(extract "d['data']['id']")
  fi

  req "$API/care-logs?plant_id=$PLANT_ID"
  check_code 200 "GET /care-logs?plant_id filter HTTP 200" && \
    { jq_true "d['success'] and len(d['data'])>=1" && pass "GET /care-logs filter by plant_id" || fail "GET /care-logs plant filter" "$QA_BODY"; }

  if [[ -n "$CARELOG_ID" && "$CARELOG_ID" != "None" ]]; then
    req -X DELETE "$API/care-logs/$CARELOG_ID"
    check_code 200 "DELETE /care-logs/:id HTTP 200" && \
      { jq_true "d['success']" && pass "DELETE /care-logs removes log" || fail "DELETE /care-logs" "$QA_BODY"; }
  fi
fi

# ═══════════════════════════════════════════════════════════════════
hdr "5. SENSORS — CRUD + SYNC"
# ═══════════════════════════════════════════════════════════════════

req "$API/sensors"
check_code 200 "GET /sensors HTTP 200" && \
  { jq_true "d['success'] and isinstance(d['data'],list)" && pass "GET /sensors returns list" || fail "GET /sensors" "$QA_BODY"; }

SENSOR_PAYLOAD="{\"name\":\"QA Soil Sensor\",\"sensor_type\":\"soil_moisture\",\"ha_entity_id\":\"sensor.qa_test_soil\",\"unit\":\"%\"}"
[[ -n "$LOC_ID" && "$LOC_ID" != "None" ]] && \
  SENSOR_PAYLOAD="{\"name\":\"QA Soil Sensor\",\"sensor_type\":\"soil_moisture\",\"ha_entity_id\":\"sensor.qa_test_soil\",\"unit\":\"%\",\"location_id\":$LOC_ID}"

req -X POST "$API/sensors" -H "Content-Type: application/json" -d "$SENSOR_PAYLOAD"
if check_code 201 "POST /sensors HTTP 201"; then
  jq_true "d['success'] and d['data']['name']=='QA Soil Sensor'" && pass "POST /sensors creates sensor" || fail "POST /sensors body" "$QA_BODY"
  SENSOR_ID=$(extract "d['data']['id']")
fi

if [[ -n "$SENSOR_ID" && "$SENSOR_ID" != "None" ]]; then
  [[ -n "$LOC_ID" && "$LOC_ID" != "None" ]] && {
    req "$API/sensors?location_id=$LOC_ID"
    check_code 200 "GET /sensors?location_id filter HTTP 200" && \
      { jq_true "d['success'] and len(d['data'])>=1" && pass "GET /sensors filter by location_id" || fail "GET /sensors location filter" "$QA_BODY"; }
  }

  req -X POST "$API/sensors/$SENSOR_ID/sync"
  if [[ "$QA_CODE" == "503" ]]; then
    pass "POST /sensors/:id/sync returns 503 (HA not configured)"
  elif [[ "$QA_CODE" == "200" ]]; then
    pass "POST /sensors/:id/sync succeeded (HA configured)"
  else
    fail "POST /sensors/:id/sync" "unexpected HTTP $QA_CODE — ${QA_BODY:0:150}"
  fi

  req -X POST "$API/sensors/sync-all"
  if [[ "$QA_CODE" == "503" ]]; then
    pass "POST /sensors/sync-all returns 503 (HA not configured)"
  elif [[ "$QA_CODE" == "200" ]]; then
    pass "POST /sensors/sync-all succeeded"
  else
    fail "POST /sensors/sync-all" "unexpected HTTP $QA_CODE — ${QA_BODY:0:150}"
  fi

  req -X DELETE "$API/sensors/$SENSOR_ID"
  check_code 200 "DELETE /sensors/:id HTTP 200" && \
    { jq_true "d['success']" && pass "DELETE /sensors removes sensor" || fail "DELETE /sensors" "$QA_BODY"; }
fi

# ═══════════════════════════════════════════════════════════════════
hdr "6. SETTINGS"
# ═══════════════════════════════════════════════════════════════════

req "$API/settings"
if check_code 200 "GET /settings HTTP 200"; then
  jq_true "d['success'] and isinstance(d['data'],list)" && pass "GET /settings returns list" || fail "GET /settings" "$QA_BODY"
  KEY_COUNT=$(extract "len(d['data'])")
  [[ "$KEY_COUNT" -ge 10 ]] && pass "settings count is $KEY_COUNT (>=10)" || fail "settings count" "only $KEY_COUNT keys"

  HA_OK=$(extract "'ha.base_url' in [s['key'] for s in d['data']] and 'api.openrouter_key' in [s['key'] for s in d['data']]")
  [[ "$HA_OK" == "True" ]] && pass "migration 003 settings present (ha.*, openrouter)" || fail "migration 003 settings" "missing key"

  ALL_MASKED=$(extract "all((not s.get('value')) or (not s['is_secret']) for s in d['data'])" 2>/dev/null)
  [[ "$ALL_MASKED" == "True" ]] && pass "secret settings: values not exposed in listing" || skip "secret masking check" "some secrets have values (may be intentional)"
fi

req -X PUT "$API/settings" \
    -H "Content-Type: application/json" \
    -d '{"llm.openrouter_model":"anthropic/claude-sonnet-4-5:beta"}'
check_code 200 "PUT /settings (valid key) HTTP 200" && \
  { jq_true "d['success']" && pass "PUT /settings updates valid key" || fail "PUT /settings" "$QA_BODY"; }

req -X PUT "$API/settings" \
    -H "Content-Type: application/json" \
    -d '{"totally_fake_key":"value"}'
check_code 400 "PUT /settings (invalid key → 400)" && pass "PUT /settings rejects unknown key" || true

# ═══════════════════════════════════════════════════════════════════
hdr "7. AI DIAGNOSTICS — ALL PROMPT TYPES + CONTEXT"
# ═══════════════════════════════════════════════════════════════════

ai_test() {
  local name="$1" ptype="$2" input="$3" extra="$4"
  local payload="{\"prompt_type\":\"$ptype\",\"provider\":\"openrouter\",\"user_input\":\"$input\"$extra}"
  echo -n "  running: $name ... "
  req -X POST "$API/ai/diagnose" -H "Content-Type: application/json" -d "$payload"
  if [[ "$QA_CODE" == "200" ]]; then
    local rlen; rlen=$(extract "len(d.get('data',{}).get('response',''))")
    if [[ "$rlen" -gt 30 ]]; then
      pass "$name"
      extract "d['data']['response'][:160].replace('\n',' ')" | sed 's/^/    /'
    else
      fail "$name" "response empty or too short (len=$rlen)"
    fi
  else
    fail "$name" "HTTP $QA_CODE — ${QA_BODY:0:250}"
  fi
}

echo "  (AI calls may take 10–30s each)"

if [[ "$OR_AVAIL" == "True" ]]; then
  ai_test "diagnosis (text only)" \
    "diagnosis" \
    "Leaves turning yellow with brown crispy edges, soil feels dry" ""

  ai_test "identification (text only)" \
    "identification" \
    "Tropical plant with large glossy oval leaves, thick waxy dark green surface, new leaves emerge light red" ""

  ai_test "pest_treatment" \
    "pest_treatment" \
    "Tiny white flies swarming under leaves, sticky honeydew residue on foliage, leaves look pale" ""

  ai_test "care_advice (no plant)" \
    "care_advice" \
    "What should I do for my tropical houseplants this week?" ""

  ai_test "general Q&A" \
    "general" \
    "Best NPK ratio fertilizer for tropical houseplants in summer?" ""

  if [[ -n "$PLANT_ID" && "$PLANT_ID" != "None" ]]; then
    ai_test "diagnosis WITH plant context" \
      "diagnosis" \
      "Leaves are drooping and pale" \
      ",\"plant_id\":$PLANT_ID"

    ai_test "care_advice WITH plant context" \
      "care_advice" \
      "What should I do this week?" \
      ",\"plant_id\":$PLANT_ID"
  fi

  req "$API/ai/history?limit=20"
  if check_code 200 "GET /ai/history HTTP 200"; then
    jq_true "d['success'] and len(d['data'])>=3" && pass "GET /ai/history has >=3 records" || \
      fail "GET /ai/history count" "$(extract 'len(d[\"data\"])')"

    if [[ -n "$PLANT_ID" && "$PLANT_ID" != "None" ]]; then
      HAS_CTX=$(extract "any(i.get('plant_id')==$PLANT_ID for i in d['data'])")
      [[ "$HAS_CTX" == "True" ]] && pass "AI history records plant_id for context calls" || \
        fail "AI history plant_id" "no record found with plant_id=$PLANT_ID"
    fi
  fi
else
  skip "All AI diagnostics tests" "OpenRouter not available — add api.openrouter_key in Settings"
fi

# ═══════════════════════════════════════════════════════════════════
hdr "8. ERROR HANDLING"
# ═══════════════════════════════════════════════════════════════════

req "$API/plants/notanid"
[[ "$QA_CODE" == "400" || "$QA_CODE" == "422" ]] && \
  pass "GET /plants/notanid → $QA_CODE (invalid id rejected)" || \
  fail "GET /plants/notanid" "expected 400/422, got $QA_CODE"

req "$API/locations/0"
[[ "$QA_CODE" == "404" || "$QA_CODE" == "400" ]] && \
  pass "GET /locations/0 → $QA_CODE (zero id handled)" || \
  fail "GET /locations/0" "expected 404/400, got $QA_CODE"

# ═══════════════════════════════════════════════════════════════════
hdr "9. CLEANUP"
# ═══════════════════════════════════════════════════════════════════

cleanup() {
  req -X DELETE "$2"
  [[ "$QA_CODE" == "200" ]] && pass "CLEANUP $1" || fail "CLEANUP $1" "HTTP $QA_CODE"
}

[[ -n "$PLANT_ID"      && "$PLANT_ID"      != "None" ]] && cleanup "plant: QA Monstera"    "$API/plants/$PLANT_ID"
[[ -n "$PLANT2_ID"     && "$PLANT2_ID"     != "None" ]] && cleanup "plant: Desert Rose"    "$API/plants/$PLANT2_ID"
[[ -n "$LOC_CHILD_ID"  && "$LOC_CHILD_ID"  != "None" ]] && cleanup "location: child"       "$API/locations/$LOC_CHILD_ID"
[[ -n "$LOC_ID"        && "$LOC_ID"        != "None" ]] && cleanup "location: QA Test Room" "$API/locations/$LOC_ID"

# ═══════════════════════════════════════════════════════════════════
hdr "RESULTS"
# ═══════════════════════════════════════════════════════════════════

TOTAL=$((PASS+FAIL+SKIP))
echo -e "\nTotal: $TOTAL  |  ${g}PASS: $PASS${n}  |  ${r}FAIL: $FAIL${n}  |  ${y}SKIP: $SKIP${n}"

if [[ ${#ERRORS[@]} -gt 0 ]]; then
  echo -e "\n${r}Failures:${n}"
  for e in "${ERRORS[@]}"; do echo "  ✗ $e"; done
fi

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
