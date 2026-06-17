import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '../services/api';
import type { Setting } from '../types';

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  location: { label: 'Location', emoji: '📍' },
  llm: { label: 'AI Providers', emoji: '🤖' },
  api_keys: { label: 'API Keys', emoji: '🔑' },
  preferences: { label: 'Preferences', emoji: '⚙️' },
  integrations: { label: 'Integrations', emoji: '🔗' },
};

export default function Settings() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.list,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: settingsApi.health,
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast.success('Settings saved');
      setEdits({});
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  function handleChange(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  function getCurrentValue(s: Setting): string {
    if (s.key in edits) return edits[s.key];
    // Don't show masked values in the edit field
    if (s.is_secret && s.value === '***configured***') return '';
    return s.value ?? '';
  }

  const hasChanges = Object.keys(edits).length > 0;

  function handleSave() {
    // Only send keys that have actual changes (non-empty or explicitly cleared)
    const toSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(edits)) {
      toSave[key] = value;
    }
    updateMutation.mutate(toSave);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure API keys, location, and preferences</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn-primary"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* System health */}
      {health && (
        <div className={`card mb-6 border-l-4 ${health.status === 'ok' ? 'border-green-500' : 'border-amber-500'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">System Health</h2>
            <span className={`badge ${health.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {health.status === 'ok' ? '✅ All systems go' : '⚠️ Some services offline'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(health.services).map(([svc, ok]) => (
              <div key={svc} className="flex items-center gap-2 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className="capitalize text-gray-700">{svc}</span>
                <span className={`text-xs ${ok ? 'text-green-600' : 'text-red-500'}`}>
                  {ok ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
          {health.weather && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
              🌤 {health.weather.temperature}°F in {health.weather.city} — {health.weather.description}
              · Humidity {health.weather.humidity}%
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-40" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categorySettings]) => {
            const meta = CATEGORY_LABELS[category] ?? { label: category, emoji: '⚙️' };
            return (
              <div key={category} className="card">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span>{meta.emoji}</span>
                  {meta.label}
                </h2>
                <div className="space-y-4">
                  {categorySettings.map((s) => {
                    const currentVal = getCurrentValue(s);
                    const isDirty = s.key in edits;
                    return (
                      <div key={s.key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="label mb-0">{s.label ?? s.key}</label>
                          {isDirty && edits[s.key] === '' && s.is_secret && s.value === '***configured***'
                          ? <span className="text-xs text-red-500 font-medium">Will be cleared</span>
                          : isDirty && <span className="text-xs text-amber-600 font-medium">Modified</span>
                        }
                        </div>
                        {s.description && (
                          <p className="text-xs text-gray-500 mb-1">{s.description}</p>
                        )}
                        {(() => {
                          const isConfigured = s.is_secret && s.value === '***configured***';
                          const isClearing = isConfigured && isDirty && edits[s.key] === '';
                          const placeholder = isClearing
                            ? '(will be cleared on save)'
                            : isConfigured
                            ? '(configured — enter new value to change)'
                            : '';
                          const inputClass = `input pr-20 ${
                            isClearing
                              ? 'border-red-300 ring-1 ring-red-200'
                              : isDirty
                              ? 'border-amber-300 ring-1 ring-amber-200'
                              : ''
                          }`;
                          return (
                            <div className="relative">
                              <input
                                type={s.is_secret && !showSecrets[s.key] ? 'password' : 'text'}
                                value={currentVal}
                                onChange={(e) => handleChange(s.key, e.target.value)}
                                placeholder={placeholder}
                                className={inputClass}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {s.is_secret && (
                                  <button
                                    type="button"
                                    onClick={() => setShowSecrets((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                                    className="text-gray-400 hover:text-gray-600 text-xs"
                                  >
                                    {showSecrets[s.key] ? '🙈' : '👁'}
                                  </button>
                                )}
                                {isConfigured && !isClearing && (
                                  <button
                                    type="button"
                                    title="Clear this key"
                                    onClick={() => handleChange(s.key, '')}
                                    className="text-gray-400 hover:text-red-500 text-xs font-bold leading-none"
                                  >
                                    ✕
                                  </button>
                                )}
                                {isClearing && (
                                  <button
                                    type="button"
                                    title="Undo clear"
                                    onClick={() => setEdits((prev) => { const n = { ...prev }; delete n[s.key]; return n; })}
                                    className="text-red-400 hover:text-gray-500 text-xs font-bold leading-none"
                                  >
                                    ↩
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasChanges && (
        <div className="sticky bottom-4 mt-6">
          <div className="card flex items-center justify-between gap-4 shadow-lg border border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-800">
              You have unsaved changes ({Object.keys(edits).length} field{Object.keys(edits).length !== 1 ? 's' : ''})
            </p>
            <div className="flex gap-2">
              <button onClick={() => setEdits({})} className="btn-secondary text-sm py-1.5">Discard</button>
              <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary text-sm py-1.5">
                Save All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Setup help */}
      <div className="card mt-6">
        <h2 className="font-semibold text-gray-800 mb-3">🔗 API Setup Guides</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Anthropic Claude:</strong>{' '}
            Visit <code className="bg-gray-100 px-1 rounded">console.anthropic.com</code> → API Keys → Create Key
          </p>
          <p>
            <strong>OpenAI:</strong>{' '}
            Visit <code className="bg-gray-100 px-1 rounded">platform.openai.com/api-keys</code> → Create new secret key
          </p>
          <p>
            <strong>Ollama (local):</strong>{' '}
            Install from <code className="bg-gray-100 px-1 rounded">ollama.ai</code> and run{' '}
            <code className="bg-gray-100 px-1 rounded">ollama pull llava</code> for vision support
          </p>
          <p>
            <strong>Perenual:</strong>{' '}
            Free tier available at <code className="bg-gray-100 px-1 rounded">perenual.com/docs</code>
          </p>
          <p>
            <strong>OpenWeatherMap:</strong>{' '}
            Free tier at <code className="bg-gray-100 px-1 rounded">openweathermap.org/api</code> — use "Current Weather Data"
          </p>
        </div>
      </div>
    </div>
  );
}
