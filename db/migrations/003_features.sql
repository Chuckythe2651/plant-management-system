-- Migration 003: Nested locations, sensors, OpenRouter, Home Assistant

-- ── Nested Locations ─────────────────────────────────────────────
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);

-- ── Sensors (Home Assistant pull) ────────────────────────────────
CREATE TABLE IF NOT EXISTS sensors (
  id              SERIAL PRIMARY KEY,
  location_id     INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  sensor_type     VARCHAR(50)  NOT NULL
                    CHECK (sensor_type IN ('soil_moisture','soil_temperature','air_temperature','lumens')),
  ha_entity_id    VARCHAR(255) NOT NULL,
  unit            VARCHAR(30),
  last_value      DECIMAL(10,4),
  last_reading_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensors_location ON sensors(location_id);

CREATE TRIGGER trg_sensors_updated_at
  BEFORE UPDATE ON sensors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Widen llm_provider CHECK to include openrouter ───────────────
ALTER TABLE llm_interactions
  DROP CONSTRAINT IF EXISTS llm_interactions_llm_provider_check;

ALTER TABLE llm_interactions
  ADD CONSTRAINT llm_interactions_llm_provider_check
    CHECK (llm_provider IN ('ollama','openai','anthropic','openrouter'));

-- ── New Settings ─────────────────────────────────────────────────
INSERT INTO settings (key, value, category, label, description, is_secret) VALUES
  ('api.openrouter_key',   '', 'api_keys',     'OpenRouter API Key',   'From openrouter.ai/keys', true),
  ('llm.openrouter_model', 'anthropic/claude-sonnet-4-5:beta',
                               'llm',           'OpenRouter Model',     'Model slug for OpenRouter routing', false),
  ('ha.base_url',          '', 'integrations',  'Home Assistant URL',   'e.g. http://homeassistant.local:8123', false),
  ('ha.token',             '', 'integrations',  'Home Assistant Token', 'Long-lived access token from HA profile', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('003_features')
ON CONFLICT DO NOTHING;
