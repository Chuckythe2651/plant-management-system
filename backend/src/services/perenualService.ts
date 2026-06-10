import axios from 'axios';
import { AppError } from '../middleware/errorHandler';

const BASE_URL = 'https://perenual.com/api';

export interface PerenualPlant {
  id: number;
  common_name: string;
  scientific_name: string[];
  other_name?: string[];
  family?: string;
  type?: string;
  cycle?: string;
  watering?: string;
  sunlight?: string[];
  default_image?: {
    original_url?: string;
    regular_url?: string;
    thumbnail?: string;
  };
  description?: string;
}

export interface PerenualDetail extends PerenualPlant {
  care_level?: string;
  flowers?: boolean;
  flowering_season?: string;
  soil?: string[];
  growth_rate?: string;
  maintenance?: string;
  medicinal?: boolean;
  poisonous_to_humans?: boolean;
  poisonous_to_pets?: boolean;
  drought_tolerant?: boolean;
  salt_tolerant?: boolean;
  thorny?: boolean;
  invasive?: boolean;
  indoor?: boolean;
  origin?: string[];
  dimension?: string;
  hardiness?: { min: string; max: string };
  watering_general_benchmark?: { value: string; unit: string };
  pruning_month?: string[];
}

export async function searchPlants(
  apiKey: string,
  query: string,
  page = 1
): Promise<{ data: PerenualPlant[]; total: number }> {
  if (!apiKey) throw new AppError(503, 'Perenual API key not configured. Add api.perenual_key in Settings.');

  const res = await axios.get(`${BASE_URL}/species-list`, {
    params: { key: apiKey, q: query, page },
    timeout: 10000,
  });

  return {
    data: res.data.data ?? [],
    total: res.data.total ?? 0,
  };
}

export async function getPlantDetail(
  apiKey: string,
  plantId: number
): Promise<PerenualDetail | null> {
  if (!apiKey) return null;

  try {
    const res = await axios.get(`${BASE_URL}/species/details/${plantId}`, {
      params: { key: apiKey },
      timeout: 10000,
    });
    return res.data;
  } catch {
    return null;
  }
}

export async function getCareGuide(
  apiKey: string,
  speciesId: number
): Promise<Record<string, unknown> | null> {
  if (!apiKey) return null;

  try {
    const res = await axios.get(`${BASE_URL}/species-care-guide-list`, {
      params: { key: apiKey, species_id: speciesId },
      timeout: 10000,
    });
    return res.data.data?.[0] ?? null;
  } catch {
    return null;
  }
}
