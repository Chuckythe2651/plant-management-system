import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { plantsApi, settingsApi, mapsApi } from '../services/api';
import type { Plant } from '../types';

function healthColor(h: string) {
  if (h === 'excellent' || h === 'good') return '#22c55e';
  if (h === 'fair') return '#f59e0b';
  if (h === 'poor' || h === 'critical') return '#ef4444';
  return '#9ca3af';
}

export default function IndoorMapPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedForPlacement, setSelectedForPlacement] = useState<Plant | null>(null);
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);

  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.list });
  const { data: plants = [] } = useQuery({ queryKey: ['plants'], queryFn: () => plantsApi.list() });

  const floorPlanUrl = settings.find((s) => s.key === 'maps.floor_plan_url')?.value ?? '';

  const uploadMutation = useMutation({
    mutationFn: mapsApi.uploadFloorPlan,
    onSuccess: () => {
      toast.success('Floor plan uploaded');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, x, y }: { id: number; x: number; y: number }) =>
      plantsApi.update(id, { floor_plan_x: x, floor_plan_y: y }),
    onSuccess: (plant) => {
      toast.success(`${plant.name} placed`);
      qc.invalidateQueries({ queryKey: ['plants'] });
      setSelectedForPlacement(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearPin = useMutation({
    mutationFn: (id: number) => plantsApi.update(id, { floor_plan_x: null, floor_plan_y: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plants'] });
      setHoveredPin(null);
      toast.success('Pin removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const placedPlants = plants.filter((p) => p.floor_plan_x != null && p.floor_plan_y != null);
  const unplacedPlants = plants.filter((p) => p.floor_plan_x == null || p.floor_plan_y == null);

  const handleFloorPlanClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedForPlacement || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 10000) / 100;
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 10000) / 100;
      pinMutation.mutate({ id: selectedForPlacement.id, x, y });
    },
    [selectedForPlacement, pinMutation]
  );

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 96px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indoor Map</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {placedPlants.length} placed · {unplacedPlants.length} unplaced
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="btn-secondary text-sm"
          >
            {uploadMutation.isPending ? 'Uploading...' : floorPlanUrl ? 'Replace Floor Plan' : 'Upload Floor Plan'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMutation.mutate(f);
              e.target.value = '';
            }}
          />
          <Link to="/map/outdoor" className="btn-secondary text-sm">Switch to Outdoor Map</Link>
        </div>
      </div>

      {/* Placement banner */}
      {selectedForPlacement && (
        <div className="flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-blue-700">
            Placing <strong>{selectedForPlacement.name}</strong> — click the floor plan to set location
          </span>
          <button
            onClick={() => setSelectedForPlacement(null)}
            className="text-blue-500 hover:text-blue-700 font-medium ml-4"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Map + sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Floor plan area */}
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 flex items-center justify-center">
          {!floorPlanUrl ? (
            <div className="text-center p-8">
              <div className="text-5xl mb-3">🏠</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">No floor plan yet</h2>
              <p className="text-gray-500 text-sm mb-4">
                Upload a photo of your floor plan to start placing plants.
              </p>
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                Upload Floor Plan
              </button>
            </div>
          ) : (
            <div
              ref={mapRef}
              className="relative w-full h-full"
              style={{ cursor: selectedForPlacement ? 'crosshair' : 'default' }}
              onClick={handleFloorPlanClick}
            >
              <img
                src={floorPlanUrl}
                alt="Floor plan"
                className="w-full h-full object-contain select-none"
                draggable={false}
              />

              {/* Plant pins */}
              {placedPlants.map((plant) => (
                <div
                  key={plant.id}
                  className="absolute z-10"
                  style={{
                    left: `${plant.floor_plan_x}%`,
                    top: `${plant.floor_plan_y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseEnter={() => setHoveredPin(plant.id)}
                  onMouseLeave={() => setHoveredPin(null)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Pin */}
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm cursor-pointer hover:scale-125 transition-transform"
                    style={{ background: healthColor(plant.health_status) }}
                  >
                    🌱
                  </div>

                  {/* Tooltip */}
                  {hoveredPin === plant.id && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[160px] z-20 pointer-events-auto">
                      <p className="font-semibold text-gray-800 text-sm">{plant.name}</p>
                      {plant.common_name && (
                        <p className="text-gray-500 text-xs">{plant.common_name}</p>
                      )}
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{plant.health_status}</p>
                      <div className="flex gap-3 mt-2">
                        <Link
                          to={`/plants/${plant.id}`}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          View plant
                        </Link>
                        <button
                          onClick={() => clearPin.mutate(plant.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove pin
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-60 flex flex-col gap-3 overflow-y-auto flex-shrink-0">
          {unplacedPlants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Unplaced ({unplacedPlants.length})
              </p>
              <div className="space-y-1">
                {unplacedPlants.map((p) => (
                  <button
                    key={p.id}
                    disabled={!floorPlanUrl}
                    onClick={() => setSelectedForPlacement(selectedForPlacement?.id === p.id ? null : p)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                      selectedForPlacement?.id === p.id
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <span className="font-medium block truncate">{p.name}</span>
                    {p.location_name && (
                      <span className="text-xs text-gray-400">{p.location_name}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {placedPlants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Placed ({placedPlants.length})
              </p>
              <div className="space-y-1">
                {placedPlants.map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: healthColor(p.health_status) }}
                      />
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                    {p.location_name && (
                      <span className="text-xs text-gray-400 ml-4">{p.location_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {plants.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>No plants yet.</p>
              <Link to="/plants" className="text-blue-500 hover:underline text-xs mt-1 block">
                Add plants first
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
