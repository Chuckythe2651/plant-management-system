import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { plantsApi, careLogsApi, settingsApi } from '../services/api';
import HealthBadge from '../components/HealthBadge';
import { formatDistanceToNow, format } from 'date-fns';
import type { HealthStatus } from '../types';

const HEALTH_COLORS: Record<HealthStatus, string> = {
  excellent: '#10b981',
  good: '#22c55e',
  fair: '#eab308',
  poor: '#f97316',
  critical: '#ef4444',
  unknown: '#9ca3af',
};

export default function Dashboard() {
  const { data: plants = [], isLoading: plantsLoading } = useQuery({
    queryKey: ['plants'],
    queryFn: () => plantsApi.list(),
  });

  const { data: dueSoon = [] } = useQuery({
    queryKey: ['plants', 'due-soon'],
    queryFn: () => plantsApi.dueSoon(3),
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['care-logs', 'recent'],
    queryFn: () => careLogsApi.list(undefined, 10),
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: settingsApi.health,
    refetchInterval: 60_000,
  });

  // Health distribution for pie chart
  const healthCounts = plants.reduce<Record<string, number>>((acc, p) => {
    acc[p.health_status] = (acc[p.health_status] ?? 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(healthCounts).map(([status, count]) => ({ name: status, value: count }));

  // Care activity for bar chart (last 7 days)
  const careByDay: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    careByDay[format(d, 'MMM d')] = 0;
  }
  recentLogs.forEach((log) => {
    const day = format(new Date(log.performed_at), 'MMM d');
    if (day in careByDay) careByDay[day]++;
  });
  const barData = Object.entries(careByDay).map(([date, count]) => ({ date, actions: count }));

  const indoorCount = plants.filter((p) => p.location_type === 'indoor').length;
  const outdoorCount = plants.filter((p) => p.location_type === 'outdoor').length;
  const overdueCount = plants.filter((p) => p.next_watering_at && new Date(p.next_watering_at) < new Date()).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {health?.weather
              ? `${health.weather.temperature}°F in ${health.weather.city} · ${health.weather.description}`
              : 'Welcome to your plant manager'}
          </p>
        </div>
        <Link to="/plants" className="btn-primary">
          + Add Plant
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🌿" label="Total Plants" value={plants.length} color="green" />
        <StatCard icon="🏠" label="Indoor" value={indoorCount} color="blue" />
        <StatCard icon="🌤" label="Outdoor" value={outdoorCount} color="amber" />
        <StatCard icon="💧" label="Need Watering" value={overdueCount} color={overdueCount > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Health Distribution */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Health Overview</h2>
          {plants.length === 0 ? (
            <EmptyState message="No plants yet" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={HEALTH_COLORS[entry.name as HealthStatus] ?? '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs text-gray-600">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: HEALTH_COLORS[entry.name as HealthStatus] }}
                />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>

        {/* Care Activity */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4">Care Activity (7 days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="actions" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Due for watering */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">💧 Needs Watering</h2>
            <Link to="/plants" className="text-xs text-plant-600 hover:underline">View all</Link>
          </div>
          {dueSoon.length === 0 ? (
            <EmptyState message="All plants are up to date!" icon="✅" />
          ) : (
            <div className="space-y-2">
              {dueSoon.slice(0, 5).map((plant) => (
                <Link key={plant.id} to={`/plants/${plant.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 bg-plant-100 rounded-full flex items-center justify-center flex-shrink-0">
                    🌱
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{plant.name}</p>
                    <p className="text-xs text-gray-500">
                      {plant.next_watering_at
                        ? formatDistanceToNow(new Date(plant.next_watering_at), { addSuffix: true })
                        : 'Unknown'}
                    </p>
                  </div>
                  <HealthBadge status={plant.health_status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent care logs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">📋 Recent Care</h2>
          </div>
          {recentLogs.length === 0 ? (
            <EmptyState message="No care events logged yet" />
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-lg mt-0.5">{careTypeEmoji(log.care_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {log.care_type.replace('_', ' ')}
                      {(log as any).plant_name && (
                        <span className="text-gray-500 font-normal"> · {(log as any).plant_name}</span>
                      )}
                    </p>
                    {log.notes && <p className="text-xs text-gray-500 truncate">{log.notes}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(log.performed_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center text-xl`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, icon = '🌱' }: { message: string; icon?: string }) {
  return (
    <div className="text-center py-8 text-gray-400">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function careTypeEmoji(type: string) {
  const map: Record<string, string> = {
    watering: '💧', fertilizing: '🌱', pruning: '✂️',
    repotting: '🪴', pest_treatment: '🐛', observation: '👁', other: '📝',
  };
  return map[type] ?? '📝';
}
