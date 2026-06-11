import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../../services/api';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/plants', label: 'My Plants', icon: '🌿' },
  { path: '/locations', label: 'Locations', icon: '📍' },
  { path: '/sensors', label: 'Sensors', icon: '📡' },
  { path: '/ai', label: 'AI Diagnostics', icon: '🤖' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: settingsApi.health,
    refetchInterval: 60_000,
  });

  const weatherInfo = health?.weather;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-plant-900 text-white flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-plant-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h1 className="font-bold text-lg leading-none">PlantManager</h1>
              <p className="text-plant-300 text-xs mt-0.5">Smart Home Plants</p>
            </div>
          </div>
        </div>

        {/* Weather widget */}
        {weatherInfo && (
          <div className="px-4 py-3 bg-plant-800 text-sm">
            <div className="flex items-center gap-2">
              <img
                src={`https://openweathermap.org/img/wn/${weatherInfo.icon}.png`}
                alt=""
                className="w-8 h-8"
              />
              <div>
                <p className="font-semibold">{weatherInfo.temperature}°F — {weatherInfo.city}</p>
                <p className="text-plant-300 text-xs capitalize">{weatherInfo.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-plant-700 text-white'
                    : 'text-plant-200 hover:bg-plant-800 hover:text-white'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Status indicators */}
        {health && (
          <div className="p-4 border-t border-plant-800">
            <p className="text-plant-400 text-xs font-medium uppercase tracking-wide mb-2">Services</p>
            <div className="space-y-1">
              {Object.entries(health.services).map(([svc, ok]) => (
                <div key={svc} className="flex items-center justify-between text-xs">
                  <span className="text-plant-300 capitalize">{svc}</span>
                  <span className={ok ? 'text-green-400' : 'text-red-400'}>
                    {ok ? '● Online' : '● Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-plant-700">🌱 PlantManager</span>
          <div className="w-9" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
