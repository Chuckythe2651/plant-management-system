import axios from 'axios';
import type {
  Plant, Location, LocationNode, CareLog, LLMInteraction, Setting, Sensor, CreateSensorDto,
  ApiResponse, HealthCheckData, ProviderStatus,
} from '../types';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.error ?? err.message;
    return Promise.reject(new Error(msg));
  }
);

// ── Plants ────────────────────────────────────────────────────
export const plantsApi = {
  list: (params?: { locationId?: number; search?: string; health_status?: string; plant_type?: string }) =>
    api.get<ApiResponse<Plant[]>>('/plants', {
      params: {
        ...(params?.locationId ? { location_id: params.locationId } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.health_status ? { health_status: params.health_status } : {}),
        ...(params?.plant_type ? { plant_type: params.plant_type } : {}),
      },
    }).then((r) => r.data.data!),

  get: (id: number) =>
    api.get<ApiResponse<Plant>>(`/plants/${id}`).then((r) => r.data.data!),

  create: (data: Partial<Plant>) =>
    api.post<ApiResponse<Plant>>('/plants', data).then((r) => r.data.data!),

  update: (id: number, data: Partial<Plant>) =>
    api.put<ApiResponse<Plant>>(`/plants/${id}`, data).then((r) => r.data.data!),

  delete: (id: number) =>
    api.delete(`/plants/${id}`).then((r) => r.data),

  water: (id: number) =>
    api.post<ApiResponse<Plant>>(`/plants/${id}/water`).then((r) => r.data.data!),

  dueSoon: (days = 3) =>
    api.get<ApiResponse<Plant[]>>('/plants/due-soon', { params: { days } }).then((r) => r.data.data!),
};

// ── Locations ────────────────────────────────────────────────
export const locationsApi = {
  list: () =>
    api.get<ApiResponse<Location[]>>('/locations').then((r) => r.data.data!),

  tree: () =>
    api.get<ApiResponse<LocationNode[]>>('/locations/tree').then((r) => r.data.data!),

  get: (id: number) =>
    api.get<ApiResponse<Location>>(`/locations/${id}`).then((r) => r.data.data!),

  create: (data: Partial<Location>) =>
    api.post<ApiResponse<Location>>('/locations', data).then((r) => r.data.data!),

  update: (id: number, data: Partial<Location>) =>
    api.put<ApiResponse<Location>>(`/locations/${id}`, data).then((r) => r.data.data!),

  delete: (id: number) =>
    api.delete(`/locations/${id}`).then((r) => r.data),
};

// ── Sensors ───────────────────────────────────────────────────
export const sensorsApi = {
  list: (locationId?: number) =>
    api.get<ApiResponse<Sensor[]>>('/sensors', { params: locationId ? { location_id: locationId } : {} })
      .then((r) => r.data.data!),

  create: (data: CreateSensorDto) =>
    api.post<ApiResponse<Sensor>>('/sensors', data).then((r) => r.data.data!),

  delete: (id: number) =>
    api.delete(`/sensors/${id}`).then((r) => r.data),

  sync: (id: number) =>
    api.post<ApiResponse<Sensor>>(`/sensors/${id}/sync`).then((r) => r.data.data!),

  syncAll: () =>
    api.post<ApiResponse<{ updated: number; failed: number; total: number }>>('/sensors/sync-all')
      .then((r) => r.data.data!),
};

// ── Care Logs ────────────────────────────────────────────────
export const careLogsApi = {
  list: (plantId?: number, limit = 50) =>
    api.get<ApiResponse<CareLog[]>>('/care-logs', { params: { plant_id: plantId, limit } })
      .then((r) => r.data.data!),

  create: (data: Partial<CareLog>) =>
    api.post<ApiResponse<CareLog>>('/care-logs', data).then((r) => r.data.data!),

  delete: (id: number) =>
    api.delete(`/care-logs/${id}`).then((r) => r.data),
};

// ── AI ────────────────────────────────────────────────────────
export const aiApi = {
  diagnose: (formData: FormData) =>
    api.post<ApiResponse<LLMInteraction>>('/ai/diagnose', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data!),

  history: (plantId?: number, limit = 20) =>
    api.get<ApiResponse<LLMInteraction[]>>('/ai/history', { params: { plant_id: plantId, limit } })
      .then((r) => r.data.data!),

  providers: () =>
    api.get<ApiResponse<ProviderStatus>>('/ai/providers').then((r) => r.data.data!),
};

// ── Settings ──────────────────────────────────────────────────
export const settingsApi = {
  list: () =>
    api.get<ApiResponse<Setting[]>>('/settings').then((r) => r.data.data!),

  update: (data: Record<string, string>) =>
    api.put('/settings', data).then((r) => r.data),

  health: () =>
    api.get<ApiResponse<HealthCheckData>>('/settings/health').then((r) => r.data.data!),
};

// ── Maps ──────────────────────────────────────────────────────
export const mapsApi = {
  getFloorPlan: () =>
    api.get<ApiResponse<{ url: string | null }>>('/maps/floor-plan').then((r) => r.data.data!),

  uploadFloorPlan: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post<ApiResponse<{ url: string }>>('/maps/floor-plan', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data!);
  },
};

// ── Knowledge ─────────────────────────────────────────────────
export const knowledgeApi = {
  search: (q: string) =>
    api.get('/knowledge/search', { params: { q } }).then((r) => r.data.data),

  getForPlant: (plantId: number) =>
    api.get(`/knowledge/${plantId}`).then((r) => r.data.data),

  fetch: (plantId: number | undefined, perenualId: number) =>
    api.post('/knowledge/fetch', { plant_id: plantId, perenual_id: perenualId }).then((r) => r.data.data),
};

// ── Uploads ───────────────────────────────────────────────────
export const uploadsApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post<ApiResponse<{ url: string; filename: string }>>('/uploads', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data!);
  },
};
