import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { format, formatDistanceToNow } from 'date-fns';
import { plantsApi, careLogsApi, aiApi } from '../services/api';
import HealthBadge from '../components/HealthBadge';
import Modal from '../components/common/Modal';
import type { CareLog, CareType, PromptType } from '../types';

const CARE_TYPES: CareType[] = ['watering', 'fertilizing', 'pruning', 'repotting', 'pest_treatment', 'observation', 'other'];
const careEmoji: Record<string, string> = {
  watering: '💧', fertilizing: '🌱', pruning: '✂️',
  repotting: '🪴', pest_treatment: '🐛', observation: '👁', other: '📝',
};

const AI_TYPE_META: Record<PromptType, { label: string; emoji: string; pill: string; border: string }> = {
  diagnosis:      { label: 'Diagnosis',      emoji: '🔍', pill: 'bg-red-50 text-red-700 border border-red-200',    border: 'border-l-red-400' },
  identification: { label: 'Identification', emoji: '🌿', pill: 'bg-green-50 text-green-700 border border-green-200', border: 'border-l-green-500' },
  care_advice:    { label: 'Care Advice',    emoji: '📚', pill: 'bg-blue-50 text-blue-700 border border-blue-200',  border: 'border-l-blue-400' },
  pest_treatment: { label: 'Pest & Disease', emoji: '🐛', pill: 'bg-amber-50 text-amber-700 border border-amber-200', border: 'border-l-amber-400' },
  general:        { label: 'General Q&A',    emoji: '💬', pill: 'bg-gray-100 text-gray-600 border border-gray-200', border: 'border-l-gray-400' },
};

const AI_TYPE_ORDER: PromptType[] = ['diagnosis', 'identification', 'care_advice', 'pest_treatment', 'general'];

export default function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCareModal, setShowCareModal] = useState(false);

  const { data: plant, isLoading } = useQuery({
    queryKey: ['plants', Number(id)],
    queryFn: () => plantsApi.get(Number(id)),
  });

  const { data: careLogs = [] } = useQuery({
    queryKey: ['care-logs', Number(id)],
    queryFn: () => careLogsApi.list(Number(id), 20),
    enabled: !!id,
  });

  const { data: aiHistory = [] } = useQuery({
    queryKey: ['ai-history', Number(id)],
    queryFn: () => aiApi.history(Number(id), 50),
    enabled: !!id,
  });

  const [aiFilter, setAiFilter] = useState<PromptType | 'all'>('all');
  const [expandedAi, setExpandedAi] = useState<Set<number>>(new Set());

  const toggleExpand = (interactionId: number) =>
    setExpandedAi((prev) => {
      const next = new Set(prev);
      next.has(interactionId) ? next.delete(interactionId) : next.add(interactionId);
      return next;
    });

  const filteredAiHistory = aiFilter === 'all'
    ? aiHistory
    : aiHistory.filter((i) => i.prompt_type === aiFilter);

  const aiTypesPresent = AI_TYPE_ORDER.filter((t) => aiHistory.some((i) => i.prompt_type === t));

  const { register, handleSubmit, reset } = useForm<Partial<CareLog>>();

  const waterMutation = useMutation({
    mutationFn: () => plantsApi.water(Number(id)),
    onSuccess: () => {
      toast.success('Watering logged!');
      qc.invalidateQueries({ queryKey: ['plants', Number(id)] });
      qc.invalidateQueries({ queryKey: ['care-logs', Number(id)] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => plantsApi.delete(Number(id)),
    onSuccess: () => {
      toast.success('Plant removed');
      navigate('/plants');
    },
  });

  const careLogMutation = useMutation({
    mutationFn: (data: Partial<CareLog>) => careLogsApi.create({ ...data, plant_id: Number(id) }),
    onSuccess: () => {
      toast.success('Care event logged');
      qc.invalidateQueries({ queryKey: ['care-logs', Number(id)] });
      qc.invalidateQueries({ queryKey: ['plants', Number(id)] });
      setShowCareModal(false);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteLogMutation = useMutation({
    mutationFn: careLogsApi.delete,
    onSuccess: () => {
      toast.success('Log removed');
      qc.invalidateQueries({ queryKey: ['care-logs', Number(id)] });
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Plant not found</p>
        <Link to="/plants" className="btn-primary mt-4 inline-flex">Back to Plants</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link to="/plants" className="text-gray-400 hover:text-gray-600">Plants</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{plant.name}</span>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Photo */}
          <div className="card p-0 overflow-hidden">
            {plant.image_url ? (
              <img src={plant.image_url} alt={plant.name} className="w-full h-56 object-cover" />
            ) : (
              <div className="w-full h-56 bg-gradient-to-br from-plant-100 to-plant-200 flex items-center justify-center">
                <span className="text-7xl">🌱</span>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h1 className="font-bold text-xl text-gray-900">{plant.name}</h1>
                {plant.is_favorite && <span title="Favorite">⭐</span>}
              </div>
              {plant.scientific_name && (
                <p className="text-sm text-gray-500 italic">{plant.scientific_name}</p>
              )}
              <div className="mt-3">
                <HealthBadge status={plant.health_status} />
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => waterMutation.mutate()}
                disabled={waterMutation.isPending}
                className="btn-primary w-full justify-center"
              >
                💧 Water Now
              </button>
              <button
                onClick={() => setShowCareModal(true)}
                className="btn-secondary w-full justify-center"
              >
                📋 Log Care Event
              </button>
              <Link
                to={`/ai?plant_id=${plant.id}`}
                className="btn-secondary w-full justify-center text-sm"
              >
                🤖 AI Diagnosis
              </Link>
              <button
                onClick={() => { if (confirm(`Delete ${plant.name}?`)) deleteMutation.mutate(); }}
                className="btn-danger w-full justify-center text-sm"
              >
                🗑️ Delete Plant
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Plant info */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Plant Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Type" value={plant.plant_type} />
              <InfoRow label="Location" value={plant.location_name} />
              <InfoRow label="Sunlight" value={plant.sunlight_requirement?.replace('_', ' ')} />
              <InfoRow label="Acquired" value={plant.acquired_date ? format(new Date(plant.acquired_date), 'MMM d, yyyy') : undefined} />
              <InfoRow
                label="Water every"
                value={`${plant.watering_frequency_days} days`}
              />
              <InfoRow
                label="Last watered"
                value={plant.last_watered_at ? formatDistanceToNow(new Date(plant.last_watered_at), { addSuffix: true }) : 'Never'}
              />
              <InfoRow
                label="Next watering"
                value={plant.next_watering_at ? formatDistanceToNow(new Date(plant.next_watering_at), { addSuffix: true }) : 'Not set'}
              />
              <InfoRow
                label="Fertilize every"
                value={`${plant.fertilizing_frequency_days} days`}
              />
              {plant.temperature_min_f && (
                <InfoRow label="Temp range" value={`${plant.temperature_min_f}–${plant.temperature_max_f}°F`} />
              )}
            </div>
            {plant.notes && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                <p className="font-medium mb-1">Notes</p>
                <p>{plant.notes}</p>
              </div>
            )}
          </div>

          {/* Care history */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Care History</h3>
              <button onClick={() => setShowCareModal(true)} className="btn-primary text-xs py-1.5">
                + Log Event
              </button>
            </div>
            {careLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No care events logged yet
              </div>
            ) : (
              <div className="space-y-2">
                {careLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group">
                    <span className="text-xl mt-0.5">{careEmoji[log.care_type] ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm capitalize">{log.care_type.replace('_', ' ')}</p>
                        <span className="text-xs text-gray-400">
                          {format(new Date(log.performed_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {log.notes && <p className="text-xs text-gray-600 mt-0.5">{log.notes}</p>}
                      {log.amount_ml && <p className="text-xs text-blue-600 mt-0.5">{log.amount_ml}ml water used</p>}
                      {log.product_used && <p className="text-xs text-green-600 mt-0.5">Product: {log.product_used}</p>}
                    </div>
                    <button
                      onClick={() => deleteLogMutation.mutate(log.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Diagnostics History */}
      <div className="mt-6 card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">AI Analysis History</h3>
          <Link
            to={`/ai?plant_id=${plant.id}`}
            className="btn-primary text-xs py-1.5"
          >
            🤖 Run New Analysis
          </Link>
        </div>

        {aiHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-sm font-medium text-gray-500">No AI analyses yet for this plant</p>
            <p className="text-xs mt-1 mb-4">Get a diagnosis, identification, care plan, or pest treatment advice.</p>
            <Link to={`/ai?plant_id=${plant.id}`} className="btn-primary text-sm">
              Run First Analysis
            </Link>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setAiFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  aiFilter === 'all'
                    ? 'bg-plant-600 text-white border-plant-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                All ({aiHistory.length})
              </button>
              {aiTypesPresent.map((type) => {
                const meta = AI_TYPE_META[type];
                const count = aiHistory.filter((i) => i.prompt_type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setAiFilter(type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      aiFilter === type ? meta.pill + ' font-semibold' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {meta.emoji} {meta.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Interaction cards */}
            <div className="space-y-3">
              {filteredAiHistory.map((interaction) => {
                const meta = AI_TYPE_META[interaction.prompt_type] ?? AI_TYPE_META.general;
                const isExpanded = expandedAi.has(interaction.id);
                const response = interaction.response ?? '';
                const isLong = response.length > 400;
                const displayText = isLong && !isExpanded ? response.slice(0, 400).trimEnd() + '…' : response;

                return (
                  <div
                    key={interaction.id}
                    className={`border-l-4 ${meta.border} bg-white rounded-r-lg border border-gray-100 p-4`}
                  >
                    {/* Card header */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.pill}`}>
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                        {interaction.llm_provider}
                      </span>
                      {interaction.llm_model && (
                        <span className="text-xs text-gray-400">{interaction.llm_model}</span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        {formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Original user query if present */}
                    {interaction.user_input && (
                      <p className="text-xs text-gray-500 italic mb-2 line-clamp-2">
                        "{interaction.user_input}"
                      </p>
                    )}

                    {/* AI response */}
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {displayText}
                    </div>

                    {/* Expand / collapse */}
                    {isLong && (
                      <button
                        onClick={() => toggleExpand(interaction.id)}
                        className="mt-2 text-xs text-plant-600 hover:text-plant-800 font-medium"
                      >
                        {isExpanded ? '▲ Show less' : '▼ Read full response'}
                      </button>
                    )}

                    {/* Token / cost footer */}
                    {(interaction.tokens_used || Number(interaction.cost_estimate) > 0) && (
                      <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
                        {interaction.tokens_used ? `${interaction.tokens_used} tokens` : ''}
                        {Number(interaction.cost_estimate) > 0
                          ? ` · $${Number(interaction.cost_estimate).toFixed(4)}`
                          : interaction.tokens_used ? ' · free (local)' : ''}
                        {interaction.duration_ms ? ` · ${(interaction.duration_ms / 1000).toFixed(1)}s` : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Care log modal */}
      {showCareModal && (
        <Modal title="Log Care Event" onClose={() => setShowCareModal(false)}>
          <form onSubmit={handleSubmit((d) => careLogMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Care Type *</label>
              <select {...register('care_type', { required: true })} className="input">
                {CARE_TYPES.map((t) => (
                  <option key={t} value={t}>{careEmoji[t]} {t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea {...register('notes')} className="input resize-none" rows={3} placeholder="Observations, observations..." />
            </div>
            <div>
              <label className="label">Date & Time</label>
              <input type="datetime-local" {...register('performed_at')} className="input" />
            </div>
            <div>
              <label className="label">Water amount (ml)</label>
              <input type="number" {...register('amount_ml', { valueAsNumber: true })} className="input" min={0} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Product used</label>
              <input {...register('product_used')} className="input" placeholder="Fertilizer / pesticide name" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={careLogMutation.isPending} className="btn-primary flex-1 justify-center">
                Log Event
              </button>
              <button type="button" onClick={() => setShowCareModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium text-gray-800 capitalize">{value}</p>
    </div>
  );
}
