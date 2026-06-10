export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unknown';
export type SunlightRequirement = 'full_sun' | 'partial_shade' | 'indirect_light' | 'full_shade';
export type CareType = 'watering' | 'fertilizing' | 'pruning' | 'repotting' | 'pest_treatment' | 'observation' | 'other';
export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'auto';
export type PromptType = 'diagnosis' | 'identification' | 'care_advice' | 'general';

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
  created_at: string;
  updated_at: string;
}

export interface Plant {
  id: number;
  name: string;
  common_name?: string;
  scientific_name?: string;
  location_id?: number;
  location_name?: string;
  location_type?: string;
  plant_type?: string;
  health_status: HealthStatus;
  watering_frequency_days: number;
  last_watered_at?: string;
  next_watering_at?: string;
  last_fertilized_at?: string;
  fertilizing_frequency_days: number;
  sunlight_requirement?: SunlightRequirement;
  temperature_min_f?: number;
  temperature_max_f?: number;
  notes?: string;
  image_url?: string;
  acquired_date?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareLog {
  id: number;
  plant_id: number;
  plant_name?: string;
  care_type: CareType;
  notes?: string;
  amount_ml?: number;
  product_used?: string;
  performed_at: string;
  created_at: string;
}

export interface LLMInteraction {
  id: number;
  plant_id?: number;
  plant_name?: string;
  llm_provider: LLMProvider;
  llm_model?: string;
  prompt_type: PromptType;
  user_input?: string;
  image_url?: string;
  response?: string;
  tokens_used?: number;
  cost_estimate?: number;
  duration_ms?: number;
  created_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value?: string;
  category: string;
  label?: string;
  description?: string;
  is_secret: boolean;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckData {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    database: boolean;
    ollama: boolean;
    openai: boolean;
    anthropic: boolean;
    weather: boolean;
  };
  weather?: {
    temperature: number;
    feels_like: number;
    humidity: number;
    description: string;
    icon: string;
    wind_speed: number;
    city: string;
  };
}

export interface ProviderStatus {
  ollama: { available: boolean; models: string[]; url: string };
  openai: { available: boolean; model: string };
  anthropic: { available: boolean; model: string };
  preferred: string;
}
