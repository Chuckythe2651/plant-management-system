export interface Location {
  id: number;
  name: string;
  type: 'indoor' | 'outdoor';
  description?: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  parent_id?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface LocationNode extends Location {
  children: LocationNode[];
}

export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unknown';
export type SunlightRequirement = 'full_sun' | 'partial_shade' | 'indirect_light' | 'full_shade';

export interface Plant {
  id: number;
  name: string;
  common_name?: string;
  scientific_name?: string;
  location_id?: number;
  location?: Location;
  location_name?: string;
  location_type?: string;
  plant_type?: string;
  health_status: HealthStatus;
  watering_frequency_days: number;
  last_watered_at?: Date;
  next_watering_at?: Date;
  last_fertilized_at?: Date;
  fertilizing_frequency_days: number;
  sunlight_requirement?: SunlightRequirement;
  temperature_min_f?: number;
  temperature_max_f?: number;
  notes?: string;
  image_url?: string;
  perenual_id?: number;
  acquired_date?: Date;
  is_favorite: boolean;
  latitude?: number | null;
  longitude?: number | null;
  floor_plan_x?: number | null;
  floor_plan_y?: number | null;
  created_at: Date;
  updated_at: Date;
}

export type CareType = 'watering' | 'fertilizing' | 'pruning' | 'repotting' | 'pest_treatment' | 'observation' | 'other';

export interface CareLog {
  id: number;
  plant_id: number;
  plant?: Plant;
  care_type: CareType;
  notes?: string;
  amount_ml?: number;
  product_used?: string;
  performed_at: Date;
  created_at: Date;
}

export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'openrouter';
export type PromptType = 'diagnosis' | 'identification' | 'care_advice' | 'pest_treatment' | 'general';

export interface LLMInteraction {
  id: number;
  plant_id?: number;
  plant?: Plant;
  llm_provider: LLMProvider;
  llm_model?: string;
  prompt_type: PromptType;
  user_input?: string;
  image_url?: string;
  response?: string;
  structured?: Record<string, unknown>;
  tokens_used?: number;
  cost_estimate?: number;
  duration_ms?: number;
  created_at: Date;
}

export interface PlantKnowledge {
  id: number;
  plant_id?: number;
  source: 'perenual' | 'trefle' | 'manual';
  external_id?: string;
  slug?: string;
  data: Record<string, unknown>;
  fetched_at: Date;
  created_at: Date;
}

export interface Setting {
  id: number;
  key: string;
  value?: string;
  category: 'api_keys' | 'location' | 'preferences' | 'llm' | 'integrations';
  label?: string;
  description?: string;
  is_secret: boolean;
  updated_at: Date;
}

// Request/Response DTOs
export interface CreatePlantDto {
  name: string;
  common_name?: string;
  scientific_name?: string;
  location_id?: number;
  plant_type?: string;
  health_status?: HealthStatus;
  watering_frequency_days?: number;
  fertilizing_frequency_days?: number;
  sunlight_requirement?: SunlightRequirement;
  temperature_min_f?: number;
  temperature_max_f?: number;
  notes?: string;
  image_url?: string;
  acquired_date?: string;
  is_favorite?: boolean;
}

export interface UpdatePlantDto extends Partial<CreatePlantDto> {
  last_watered_at?: string;
  next_watering_at?: string;
  last_fertilized_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  floor_plan_x?: number | null;
  floor_plan_y?: number | null;
}

export interface CreateLocationDto {
  name: string;
  type: 'indoor' | 'outdoor';
  description?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  parent_id?: number | null;
}

export type SensorType = 'soil_moisture' | 'soil_temperature' | 'air_temperature' | 'lumens';

export interface Sensor {
  id: number;
  location_id?: number | null;
  name: string;
  sensor_type: SensorType;
  ha_entity_id: string;
  unit?: string;
  last_value?: number | null;
  last_reading_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSensorDto {
  location_id?: number | null;
  name: string;
  sensor_type: SensorType;
  ha_entity_id: string;
  unit?: string;
}

export interface CreateCareLogDto {
  plant_id: number;
  care_type: CareType;
  notes?: string;
  amount_ml?: number;
  product_used?: string;
  performed_at?: string;
}

export interface AIDiagnoseDto {
  plant_id?: number;
  prompt_type: PromptType;
  user_input?: string;
  image_url?: string;
  provider?: LLMProvider | 'auto';
}

export interface UpdateSettingsDto {
  [key: string]: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface HealthCheck {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    database: boolean;
    ollama: boolean;
    openai: boolean;
    anthropic: boolean;
    openrouter: boolean;
  };
}
