import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import toast from 'react-hot-toast';
import { plantsApi, settingsApi } from '../services/api';
import type { Plant } from '../types';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 33.3062, lng: -111.8413 };

function healthColor(h: string) {
  if (h === 'excellent' || h === 'good') return '#22c55e';
  if (h === 'fair') return '#f59e0b';
  if (h === 'poor' || h === 'critical') return '#ef4444';
  return '#9ca3af';
}

export default function OutdoorMapPage() {
  const qc = useQueryClient();
  const [selectedForPlacement, setSelectedForPlacement] = useState<Plant | null>(null);
  const [activeMarker, setActiveMarker] = useState<Plant | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.list });
  const { data: plants = [] } = useQuery({ queryKey: ['plants'], queryFn: () => plantsApi.list() });

  const googleApiKey = settings.find((s) => s.key === 'maps.google_api_key')?.value ?? '';
  const keyConfigured = googleApiKey && googleApiKey !== '***configured***';

  const { isLoaded } = useLoadScript({ googleMapsApiKey: keyConfigured ? googleApiKey : '' });

  const pinMutation = useMutation({
    mutationFn: ({ id, lat, lng }: { id: number; lat: number; lng: number }) =>
      plantsApi.update(id, { latitude: lat, longitude: lng }),
    onSuccess: (plant) => {
      toast.success(`${plant.name} placed on map`);
      qc.invalidateQueries({ queryKey: ['plants'] });
      setSelectedForPlacement(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearPin = useMutation({
    mutationFn: (id: number) => plantsApi.update(id, { latitude: null, longitude: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plants'] });
      setActiveMarker(null);
      toast.success('Pin removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const placedPlants = plants.filter((p) => p.latitude != null && p.longitude != null);
  const unplacedPlants = plants.filter((p) => p.latitude == null || p.longitude == null);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!selectedForPlacement || !e.latLng) return;
      pinMutation.mutate({ id: selectedForPlacement.id, lat: e.latLng.lat(), lng: e.latLng.lng() });
    },
    [selectedForPlacement, pinMutation]
  );

  if (!keyConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-4xl mb-3">🗺</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Google Maps API Key Required</h2>
        <p className="text-gray-500 text-sm mb-4">
          Add your Google Maps API key in Settings, then reload this page.
        </p>
        <Link to="/settings" className="btn-primary">Go to Settings</Link>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading map...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 96px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outdoor Map</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {placedPlants.length} placed · {unplacedPlants.length} unplaced
          </p>
        </div>
        <Link to="/map/indoor" className="btn-secondary text-sm">Switch to Indoor Map</Link>
      </div>

      {/* Placement banner */}
      {selectedForPlacement && (
        <div className="flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-blue-700">
            Placing <strong>{selectedForPlacement.name}</strong> — click the map to set location
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
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={14}
            onClick={handleMapClick}
            options={{
              mapTypeId: 'satellite',
              mapTypeControl: true,
              streetViewControl: false,
              fullscreenControl: true,
            }}
          >
            {placedPlants.map((plant) => (
              <MarkerF
                key={plant.id}
                position={{ lat: Number(plant.latitude), lng: Number(plant.longitude) }}
                onClick={() => { setActiveMarker(plant); setSelectedForPlacement(null); }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: healthColor(plant.health_status),
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                  scale: 10,
                }}
              />
            ))}
            {activeMarker && activeMarker.latitude != null && activeMarker.longitude != null && (
              <InfoWindowF
                position={{ lat: Number(activeMarker.latitude), lng: Number(activeMarker.longitude) }}
                onCloseClick={() => setActiveMarker(null)}
              >
                <div className="text-sm min-w-[150px] pr-1">
                  <p className="font-semibold text-gray-800">{activeMarker.name}</p>
                  {activeMarker.common_name && (
                    <p className="text-gray-500 text-xs">{activeMarker.common_name}</p>
                  )}
                  <p className="text-xs text-gray-400 capitalize mt-0.5">{activeMarker.health_status}</p>
                  <div className="flex gap-3 mt-2">
                    <Link to={`/plants/${activeMarker.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                      View plant
                    </Link>
                    <button
                      onClick={() => clearPin.mutate(activeMarker.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove pin
                    </button>
                  </div>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
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
                    onClick={() => setSelectedForPlacement(selectedForPlacement?.id === p.id ? null : p)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                      selectedForPlacement?.id === p.id
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50 text-gray-700'
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
                  <button
                    key={p.id}
                    onClick={() => {
                      setMapCenter({ lat: Number(p.latitude), lng: Number(p.longitude) });
                      setActiveMarker(p);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 hover:border-green-200 hover:bg-green-50 text-gray-700 transition-colors"
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
                  </button>
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
