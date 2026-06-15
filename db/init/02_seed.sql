-- Seed data for Smart Home Plant Management System
-- Default location: Chandler, Arizona

-- ─── Default Locations ───────────────────────────────────
INSERT INTO locations (name, type, description, city, state, zip_code, latitude, longitude, is_default)
VALUES
  ('Living Room',       'indoor',  'South-facing windows, bright indirect light',  'Chandler', 'AZ', '85224', 33.3062, -111.8413, true),
  ('Back Patio',        'outdoor', 'Full sun, covered pergola section available',  'Chandler', 'AZ', '85224', 33.3062, -111.8413, false),
  ('Kitchen Windowsill','indoor',  'East-facing window, morning sun',              'Chandler', 'AZ', '85224', 33.3062, -111.8413, false),
  ('Front Garden',      'outdoor', 'Desert landscaping, full sun',                 'Chandler', 'AZ', '85224', 33.3062, -111.8413, false)
ON CONFLICT DO NOTHING;

-- ─── Default Settings ────────────────────────────────────
INSERT INTO settings (key, value, category, label, description, is_secret) VALUES
  -- Location
  ('location.city',           'Chandler',    'location',     'City',                  'Your city for weather integration', false),
  ('location.state',          'AZ',          'location',     'State',                 'Two-letter state code', false),
  ('location.zip_code',       '85224',       'location',     'ZIP Code',              'Your ZIP code', false),
  ('location.latitude',       '33.3062',     'location',     'Latitude',              'Decimal latitude', false),
  ('location.longitude',      '-111.8413',   'location',     'Longitude',             'Decimal longitude', false),
  ('location.usda_zone',      '9b',          'location',     'USDA Hardiness Zone',   'Your USDA plant hardiness zone', false),

  -- LLM Preferences
  ('llm.preferred_provider',  'anthropic',   'llm',  'Preferred Provider',  'Default LLM provider (ollama|openai|anthropic|openrouter|auto)', false),
  ('llm.ollama_base_url',     'http://host.docker.internal:11434', 'llm', 'Ollama Base URL', 'URL to your Ollama instance', false),
  ('llm.ollama_model',        'llava',       'llm',  'Ollama Model',        'Ollama model name (llava for vision)', false),
  ('llm.openai_model',        'gpt-4o',      'llm',  'OpenAI Model',        'OpenAI model ID', false),
  ('llm.anthropic_model',     'claude-sonnet-4-6', 'llm', 'Anthropic Model','Anthropic model ID', false),
  ('llm.openrouter_model',    'anthropic/claude-sonnet-4-5:beta', 'llm', 'OpenRouter Model', 'Model slug for OpenRouter routing', false),

  -- API Keys
  ('api.openai_key',          '', 'api_keys', 'OpenAI API Key',       'sk-... from platform.openai.com', true),
  ('api.anthropic_key',       '', 'api_keys', 'Anthropic API Key',    'sk-ant-... from console.anthropic.com', true),
  ('api.perenual_key',        '', 'api_keys', 'Perenual API Key',     'From perenual.com/docs', true),
  ('api.openweather_key',     '', 'api_keys', 'OpenWeatherMap Key',   'From openweathermap.org/api', true),
  ('api.openrouter_key',      '', 'api_keys', 'OpenRouter API Key',   'From openrouter.ai/keys', true),
  ('maps.google_api_key',     '', 'api_keys', 'Google Maps API Key',  'From console.cloud.google.com — enable Maps JavaScript API', true),

  -- Preferences
  ('pref.watering_reminder_hours', '8',  'preferences', 'Reminder Hour',           'Hour of day (0-23) to show watering reminders', false),
  ('pref.temperature_unit',        'F',  'preferences', 'Temperature Unit',         'F or C', false),
  ('pref.default_watering_days',   '7',  'preferences', 'Default Watering Interval','Default days between waterings for new plants', false),
  ('maps.floor_plan_url',          '',   'preferences', 'Floor Plan Image URL',     'Set automatically when you upload a floor plan on the Indoor Map page', false),

  -- Integrations
  ('ha.base_url', '', 'integrations', 'Home Assistant URL',   'e.g. http://homeassistant.local:8123', false),
  ('ha.token',    '', 'integrations', 'Home Assistant Token', 'Long-lived access token from HA profile', true)

ON CONFLICT (key) DO NOTHING;

-- ─── Sample Plants (demo data) ───────────────────────────
INSERT INTO plants (name, common_name, scientific_name, location_id, plant_type, health_status, watering_frequency_days, sunlight_requirement, notes, acquired_date)
SELECT 'Aloe Vera', 'Aloe Vera', 'Aloe barbadensis miller', l.id, 'succulent', 'excellent', 14, 'full_sun',
       'Thriving near south window. Water sparingly — drought tolerant.', '2024-03-15'
FROM locations l WHERE l.name = 'Living Room' LIMIT 1;

INSERT INTO plants (name, common_name, scientific_name, location_id, plant_type, health_status, watering_frequency_days, sunlight_requirement, notes, acquired_date)
SELECT 'Basil', 'Sweet Basil', 'Ocimum basilicum', l.id, 'herb', 'good', 3, 'full_sun',
       'Kitchen herb. Pinch flowers to keep producing leaves.', '2025-04-01'
FROM locations l WHERE l.name = 'Kitchen Windowsill' LIMIT 1;

INSERT INTO plants (name, common_name, scientific_name, location_id, plant_type, health_status, watering_frequency_days, sunlight_requirement, notes, acquired_date)
SELECT 'Desert Rose', 'Desert Rose', 'Adenium obesum', l.id, 'succulent', 'good', 10, 'full_sun',
       'Beautiful red blooms in spring. Protect from frost below 40°F.', '2024-11-20'
FROM locations l WHERE l.name = 'Back Patio' LIMIT 1;

UPDATE plants SET
  last_watered_at  = NOW() - (watering_frequency_days * INTERVAL '1 day' / 2),
  next_watering_at = NOW() + (watering_frequency_days * INTERVAL '1 day' / 2)
WHERE next_watering_at IS NULL;

-- ─── Sample Care Logs ────────────────────────────────────
INSERT INTO care_logs (plant_id, care_type, notes, performed_at)
SELECT p.id, 'watering', 'Regular watering, soil was dry 2 inches down', NOW() - INTERVAL '3 days'
FROM plants p WHERE p.name = 'Aloe Vera';

INSERT INTO care_logs (plant_id, care_type, notes, performed_at)
SELECT p.id, 'observation', 'New pup sprouting at base — looking healthy!', NOW() - INTERVAL '7 days'
FROM plants p WHERE p.name = 'Aloe Vera';

INSERT INTO care_logs (plant_id, care_type, notes, performed_at)
SELECT p.id, 'watering', 'Light watering', NOW() - INTERVAL '1 day'
FROM plants p WHERE p.name = 'Basil';

INSERT INTO care_logs (plant_id, care_type, notes, performed_at)
SELECT p.id, 'pruning', 'Pinched flower buds to encourage leaf growth', NOW() - INTERVAL '5 days'
FROM plants p WHERE p.name = 'Basil';

-- ─── Version Marker ──────────────────────────────────────
INSERT INTO schema_migrations (version) VALUES ('002_seed_data')
ON CONFLICT DO NOTHING;
