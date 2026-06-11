import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatDistanceToNow, isPast } from 'date-fns';
import { plantsApi } from '../services/api';
import HealthBadge from './HealthBadge';
import type { Plant } from '../types';

const HEALTH_BORDER: Record<string, string> = {
  excellent: 'border-l-4 border-l-green-500',
  good:      'border-l-4 border-l-green-400',
  fair:      'border-l-4 border-l-yellow-400',
  poor:      'border-l-4 border-l-red-400',
  critical:  'border-l-4 border-l-red-600',
  unknown:   'border-l-4 border-l-gray-300',
};

export default function PlantCard({ plant }: { plant: Plant }) {
  const qc = useQueryClient();

  const waterMutation = useMutation({
    mutationFn: () => plantsApi.water(plant.id),
    onSuccess: () => {
      toast.success(`${plant.name} watered!`);
      qc.invalidateQueries({ queryKey: ['plants'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const nextWatering = plant.next_watering_at ? new Date(plant.next_watering_at) : null;
  const overdue = nextWatering && isPast(nextWatering);

  const borderClass = HEALTH_BORDER[plant.health_status] ?? HEALTH_BORDER.unknown;

  return (
    <div className={`card hover:shadow-md transition-shadow ${borderClass}`}>
      {/* Image */}
      <div className="relative mb-3">
        {plant.image_url ? (
          <img
            src={plant.image_url}
            alt={plant.name}
            className="w-full h-40 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-plant-100 to-plant-200 rounded-lg flex items-center justify-center">
            <span className="text-5xl">🌱</span>
          </div>
        )}
        {plant.is_favorite && (
          <span className="absolute top-2 right-2 text-lg" title="Favorite">⭐</span>
        )}
        <div className="absolute bottom-2 left-2">
          <HealthBadge status={plant.health_status} />
        </div>
      </div>

      {/* Info */}
      <Link to={`/plants/${plant.id}`} className="block group">
        <h3 className="font-semibold text-gray-900 group-hover:text-plant-700 transition-colors truncate">
          {plant.name}
        </h3>
        {plant.scientific_name && (
          <p className="text-xs text-gray-500 italic truncate">{plant.scientific_name}</p>
        )}
      </Link>

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        {plant.location_name && (
          <span className="flex items-center gap-1">
            {plant.location_type === 'indoor' ? '🏠' : '🌤'} {plant.location_name}
          </span>
        )}
        {plant.plant_type && (
          <>
            <span>·</span>
            <span className="capitalize">{plant.plant_type}</span>
          </>
        )}
      </div>

      {/* Watering */}
      <div className={`mt-3 p-2.5 rounded-lg text-xs ${overdue ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
        <div className="flex items-center justify-between">
          <span>
            {overdue ? '⚠️ Overdue' : '💧 Next watering'}
          </span>
          <span className="font-medium">
            {nextWatering ? formatDistanceToNow(nextWatering, { addSuffix: true }) : 'Not set'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => waterMutation.mutate()}
          disabled={waterMutation.isPending}
          className="flex-1 btn-primary text-xs py-1.5 justify-center"
        >
          {waterMutation.isPending ? '...' : '💧 Water Now'}
        </button>
        <Link
          to={`/plants/${plant.id}`}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          View
        </Link>
      </div>
    </div>
  );
}
