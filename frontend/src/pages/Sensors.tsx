import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { sensorsApi, locationsApi } from '../services/api';
import Modal from '../components/common/Modal';
import type { Sensor, CreateSensorDto, SensorType, Location } from '../types';
import { formatDistanceToNow } from 'date-fns';

const SENSOR_TYPES: { value: SensorType; label: string; unit: string; icon: string }[] = [
  { value: 'soil_moisture',    label: 'Soil Moisture',     unit: '%',  icon: '💧' },
  { value: 'soil_temperature', label: 'Soil Temperature',  unit: '°F', icon: '🌡' },
  { value: 'air_temperature',  label: 'Air Temperature',   unit: '°F', icon: '🌡' },
  { value: 'lumens',           label: 'Light (Lumens)',    unit: 'lx', icon: '☀️' },
];

function sensorIcon(type: SensorType) {
  return SENSOR_TYPES.find((t) => t.value === type)?.icon ?? '📡';
}

function sensorLabel(type: SensorType) {
  return SENSOR_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function Sensors() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const { data: sensors = [], isLoading } = useQuery({
    queryKey: ['sensors'],
    queryFn: () => sensorsApi.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateSensorDto>();

  const createMutation = useMutation({
    mutationFn: sensorsApi.create,
    onSuccess: () => {
      toast.success('Sensor added');
      qc.invalidateQueries({ queryKey: ['sensors'] });
      setShowModal(false);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: sensorsApi.delete,
    onSuccess: () => {
      toast.success('Sensor removed');
      qc.invalidateQueries({ queryKey: ['sensors'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncAllMutation = useMutation({
    mutationFn: sensorsApi.syncAll,
    onSuccess: (data) => {
      toast.success(`Synced ${data?.updated ?? 0} sensor${(data?.updated ?? 0) !== 1 ? 's' : ''}`);
      qc.invalidateQueries({ queryKey: ['sensors'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function syncOne(id: number) {
    setSyncingId(id);
    try {
      await sensorsApi.sync(id);
      toast.success('Sensor synced');
      qc.invalidateQueries({ queryKey: ['sensors'] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSyncingId(null);
    }
  }

  function onSubmit(data: CreateSensorDto) {
    createMutation.mutate({ ...data, location_id: data.location_id ? Number(data.location_id) : null });
  }

  // Group sensors by location
  const locationMap = new Map<number, Location>(locations.map((l: Location) => [l.id, l]));
  const groups = new Map<number | null, Sensor[]>();
  for (const s of sensors) {
    const lid = s.location_id ?? null;
    if (!groups.has(lid)) groups.set(lid, []);
    groups.get(lid)!.push(s);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sensors</h1>
        <div className="flex gap-2">
          <button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending || sensors.length === 0}
            className="btn-secondary"
          >
            {syncAllMutation.isPending ? '⏳ Syncing…' : '🔄 Sync All'}
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Sensor</button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-28" />)}
        </div>
      ) : sensors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📡</div>
          <p className="font-medium">No sensors configured</p>
          <p className="text-sm mt-1">Add sensors linked to Home Assistant entities</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add Sensor</button>
        </div>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([lid, groupSensors]) => {
            const loc = lid !== null ? locationMap.get(lid) : null;
            return (
              <div key={lid ?? 'unassigned'}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {loc ? `${loc.type === 'indoor' ? '🏠' : '🌤'} ${loc.name}` : '❓ Unassigned'}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupSensors.map((s) => (
                    <div key={s.id} className="card relative group">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-2xl">{sensorIcon(s.sensor_type)}</span>
                          <h3 className="font-semibold text-gray-900 mt-1">{s.name}</h3>
                          <p className="text-xs text-gray-500">{sensorLabel(s.sensor_type)}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => syncOne(s.id)}
                            disabled={syncingId === s.id}
                            className="p-1.5 rounded hover:bg-blue-50 text-sm"
                            title="Sync now"
                          >
                            {syncingId === s.id ? '⏳' : '🔄'}
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteMutation.mutate(s.id); }}
                            className="p-1.5 rounded hover:bg-red-50 text-sm"
                            title="Delete"
                          >🗑️</button>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {s.last_value !== null && s.last_value !== undefined ? (
                          <p className="text-2xl font-bold text-plant-700">
                            {Number(s.last_value).toFixed(1)}
                            <span className="text-sm font-normal text-gray-500 ml-1">{s.unit}</span>
                          </p>
                        ) : (
                          <p className="text-gray-400 text-sm">No reading yet</p>
                        )}
                        {s.last_reading_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(s.last_reading_at), { addSuffix: true })}
                          </p>
                        )}
                        <p className="text-xs text-gray-300 font-mono mt-1 truncate" title={s.ha_entity_id}>
                          {s.ha_entity_id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Add Sensor" onClose={() => { setShowModal(false); reset(); }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Sensor Name *</label>
              <input
                {...register('name', { required: 'Name required' })}
                className="input"
                placeholder="e.g., Patio Soil Moisture"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Sensor Type *</label>
              <select {...register('sensor_type', { required: true })} className="input">
                {SENSOR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Home Assistant Entity ID *</label>
              <input
                {...register('ha_entity_id', { required: 'Entity ID required' })}
                className="input font-mono text-sm"
                placeholder="sensor.patio_soil_moisture"
              />
              {errors.ha_entity_id && <p className="text-xs text-red-500 mt-1">{errors.ha_entity_id.message}</p>}
            </div>
            <div>
              <label className="label">Location</label>
              <select {...register('location_id', { setValueAs: (v) => v ? Number(v) : null })} className="input">
                <option value="">None</option>
                {locations.map((l: Location) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unit (optional)</label>
              <input {...register('unit')} className="input" placeholder="e.g., %, °F, lx" />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                Add Sensor
              </button>
              <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
