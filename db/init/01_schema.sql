-- Smart Home Plant Management System — Database Schema
-- PostgreSQL 16+

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- LOCATIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(50)  NOT NULL CHECK (type IN ('indoor', 'outdoor')),
  description TEXT,
  city        VARCHAR(255) DEFAULT 'Chandler',
  state       VARCHAR(50)  DEFAULT 'AZ',
  zip_code    VARCHAR(10)  DEFAULT '85224',
  latitude    DECIMAL(9,6) DEFAULT 33.3062,
  longitude   DECIMAL(9,6) DEFAULT -111.8413,
  is_default  BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_locations_type ON locations(type);

-- ─────────────────────────────────────────────────────────
-- PLANTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plants (
  id                        SERIAL PRIMARY KEY,
  name                      VARCHAR(255) NOT NULL,
  common_name               VARCHAR(255),
  scientific_name           VARCHAR(255),
  location_id               INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  plant_type                VARCHAR(100),  -- succulent, tropical, herb, fern, tree, etc.
  health_status             VARCHAR(50) DEFAULT 'good'
                              CHECK (health_status IN ('excellent','good','fair','poor','critical','unknown')),
  watering_frequency_days   INTEGER DEFAULT 7,
  last_watered_at           TIMESTAMP WITH TIME ZONE,
  next_watering_at          TIMESTAMP WITH TIME ZONE,
  last_fertilized_at        TIMESTAMP WITH TIME ZONE,
  fertilizing_frequency_days INTEGER DEFAULT 30,
  sunlight_requirement      VARCHAR(50)
                              CHECK (sunlight_requirement IN ('full_sun','partial_shade','indirect_light','full_shade',NULL)),
  temperature_min_f         INTEGER,
  temperature_max_f         INTEGER,
  notes                     TEXT,
  image_url                 VARCHAR(500),
  perenual_id               INTEGER,
  acquired_date             DATE,
  is_favorite               BOOLEAN DEFAULT FALSE,
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plants_location ON plants(location_id);
CREATE INDEX idx_plants_health ON plants(health_status);
CREATE INDEX idx_plants_next_watering ON plants(next_watering_at);

-- ─────────────────────────────────────────────────────────
-- CARE LOGS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_logs (
  id           SERIAL PRIMARY KEY,
  plant_id     INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  care_type    VARCHAR(50) NOT NULL
                 CHECK (care_type IN ('watering','fertilizing','pruning','repotting','pest_treatment','observation','other')),
  notes        TEXT,
  amount_ml    INTEGER,     -- for watering: ml of water used
  product_used VARCHAR(255), -- fertilizer/pesticide product name
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_care_logs_plant ON care_logs(plant_id);
CREATE INDEX idx_care_logs_type ON care_logs(care_type);
CREATE INDEX idx_care_logs_performed ON care_logs(performed_at DESC);

-- ─────────────────────────────────────────────────────────
-- PLANT KNOWLEDGE CACHE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plant_knowledge (
  id          SERIAL PRIMARY KEY,
  plant_id    INTEGER REFERENCES plants(id) ON DELETE CASCADE,
  source      VARCHAR(100) NOT NULL CHECK (source IN ('perenual','trefle','manual')),
  external_id VARCHAR(100),
  slug        VARCHAR(255),
  data        JSONB NOT NULL DEFAULT '{}',
  fetched_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plant_knowledge_plant ON plant_knowledge(plant_id);
CREATE INDEX idx_plant_knowledge_source ON plant_knowledge(source, external_id);
CREATE INDEX idx_plant_knowledge_data ON plant_knowledge USING GIN(data);

-- ─────────────────────────────────────────────────────────
-- LLM INTERACTIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_interactions (
  id             SERIAL PRIMARY KEY,
  plant_id       INTEGER REFERENCES plants(id) ON DELETE SET NULL,
  llm_provider   VARCHAR(50)  NOT NULL CHECK (llm_provider IN ('ollama','openai','anthropic')),
  llm_model      VARCHAR(100),
  prompt_type    VARCHAR(50)  NOT NULL CHECK (prompt_type IN ('diagnosis','identification','care_advice','general')),
  user_input     TEXT,
  image_url      VARCHAR(500),
  response       TEXT,
  structured     JSONB,        -- parsed structured data from LLM response
  tokens_used    INTEGER,
  cost_estimate  DECIMAL(10,6),
  duration_ms    INTEGER,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_llm_plant ON llm_interactions(plant_id);
CREATE INDEX idx_llm_provider ON llm_interactions(llm_provider);
CREATE INDEX idx_llm_created ON llm_interactions(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- SETTINGS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(255) UNIQUE NOT NULL,
  value       TEXT,
  category    VARCHAR(100) NOT NULL CHECK (category IN ('api_keys','location','preferences','llm','integrations')),
  label       VARCHAR(255),
  description TEXT,
  is_secret   BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_settings_category ON settings(category);

-- ─────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_plants_updated_at
  BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');
