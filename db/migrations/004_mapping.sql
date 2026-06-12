-- Migration 004: Plant mapping — GPS pins (outdoor) + floor plan pins (indoor)

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS latitude     DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS longitude    DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS floor_plan_x DECIMAL(6,3),
  ADD COLUMN IF NOT EXISTS floor_plan_y DECIMAL(6,3);

INSERT INTO settings (key, value, category, label, description, is_secret) VALUES
  ('maps.google_api_key', '', 'api_keys',    'Google Maps API Key',   'From console.cloud.google.com — enable Maps JavaScript API', true),
  ('maps.floor_plan_url', '', 'preferences', 'Floor Plan Image URL',  'Set automatically when you upload a floor plan on the Indoor Map page', false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('004_mapping')
ON CONFLICT DO NOTHING;
