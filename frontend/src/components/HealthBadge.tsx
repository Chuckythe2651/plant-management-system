import type { HealthStatus } from '../types';

const config: Record<HealthStatus, { label: string; color: string; emoji: string }> = {
  excellent: { label: 'Excellent', color: 'bg-emerald-100 text-emerald-800', emoji: '💚' },
  good:      { label: 'Good',      color: 'bg-green-100 text-green-800',     emoji: '🌿' },
  fair:      { label: 'Fair',      color: 'bg-yellow-100 text-yellow-800',   emoji: '🌤' },
  poor:      { label: 'Poor',      color: 'bg-orange-100 text-orange-800',   emoji: '⚠️' },
  critical:  { label: 'Critical',  color: 'bg-red-100 text-red-800',         emoji: '🆘' },
  unknown:   { label: 'Unknown',   color: 'bg-gray-100 text-gray-600',       emoji: '❓' },
};

export default function HealthBadge({ status }: { status: HealthStatus }) {
  const { label, color, emoji } = config[status] ?? config.unknown;
  return (
    <span className={`badge ${color}`}>
      {emoji} {label}
    </span>
  );
}
