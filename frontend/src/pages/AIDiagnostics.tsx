import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { aiApi, plantsApi } from '../services/api';
import type { LLMProvider, PromptType } from '../types';

const PROMPT_TYPES: { value: PromptType; label: string; emoji: string; desc: string }[] = [
  { value: 'diagnosis', label: 'Diagnose', emoji: '🔍', desc: 'Identify health issues from description or photo' },
  { value: 'identification', label: 'Identify', emoji: '🌿', desc: 'Identify plant species from photo or description' },
  { value: 'care_advice', label: 'Care Advice', emoji: '📚', desc: 'Get personalized care recommendations' },
  { value: 'general', label: 'General Q&A', emoji: '💬', desc: 'Ask any plant-related question' },
];

const PROVIDERS: { value: LLMProvider | 'auto'; label: string; emoji: string }[] = [
  { value: 'auto', label: 'Auto', emoji: '🤖' },
  { value: 'anthropic', label: 'Claude', emoji: '🟠' },
  { value: 'openai', label: 'GPT-4o', emoji: '🟢' },
  { value: 'ollama', label: 'Ollama (Local)', emoji: '🔵' },
];

export default function AIDiagnostics() {
  const [searchParams] = useSearchParams();
  const initialPlantId = searchParams.get('plant_id') ? Number(searchParams.get('plant_id')) : undefined;

  const [promptType, setPromptType] = useState<PromptType>('diagnosis');
  const [provider, setProvider] = useState<LLMProvider | 'auto'>('auto');
  const [plantId, setPlantId] = useState<number | undefined>(initialPlantId);
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: plants = [] } = useQuery({
    queryKey: ['plants'],
    queryFn: () => plantsApi.list(),
  });

  const { data: providerStatus } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: aiApi.providers,
    refetchInterval: 30_000,
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['ai-history'],
    queryFn: () => aiApi.history(undefined, 10),
  });

  const diagnoseMutation = useMutation({
    mutationFn: (fd: FormData) => aiApi.diagnose(fd),
    onSuccess: () => {
      toast.success('AI analysis complete');
      refetchHistory();
      setInput('');
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && !imageFile) {
      toast.error('Please enter a description or upload a photo');
      return;
    }
    const fd = new FormData();
    fd.append('prompt_type', promptType);
    fd.append('provider', provider);
    if (input.trim()) fd.append('user_input', input.trim());
    if (plantId) fd.append('plant_id', String(plantId));
    if (imageFile) fd.append('image', imageFile);
    diagnoseMutation.mutate(fd);
  }

  const latestResult = diagnoseMutation.data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Plant Diagnostics</h1>
        <p className="text-gray-500 text-sm mt-1">
          Describe your plant issue or upload a photo for AI-powered analysis
        </p>
      </div>

      {/* Provider status */}
      {providerStatus && (
        <div className="card mb-6">
          <h3 className="font-medium text-gray-700 mb-3">Available AI Providers</h3>
          <div className="flex flex-wrap gap-3">
            {([
              { key: 'ollama', label: 'Ollama (Local)', available: providerStatus.ollama.available },
              { key: 'openai', label: 'OpenAI', available: providerStatus.openai.available },
              { key: 'anthropic', label: 'Anthropic Claude', available: providerStatus.anthropic.available },
            ]).map((p) => (
              <div key={p.key} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                ${p.available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${p.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                {p.label}
                {p.available ? ' ✓' : ' (not configured)'}
              </div>
            ))}
          </div>
          {!providerStatus.ollama.available && !providerStatus.openai.available && !providerStatus.anthropic.available && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ No AI providers configured. Add API keys in <a href="/settings" className="underline">Settings</a>.
            </p>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Input form */}
        <div className="space-y-4">
          {/* Analysis type */}
          <div className="card">
            <h3 className="font-medium text-gray-700 mb-3">Analysis Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {PROMPT_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => setPromptType(pt.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    promptType === pt.value
                      ? 'border-plant-500 bg-plant-50 text-plant-800'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl mb-1">{pt.emoji}</div>
                  <div className="font-medium text-sm">{pt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{pt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Plant selector */}
              <div>
                <label className="label">Plant (optional)</label>
                <select
                  value={plantId ?? ''}
                  onChange={(e) => setPlantId(e.target.value ? Number(e.target.value) : undefined)}
                  className="input"
                >
                  <option value="">No specific plant</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* AI provider */}
              <div>
                <label className="label">AI Provider</label>
                <div className="flex flex-wrap gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setProvider(p.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        provider === p.value
                          ? 'border-plant-500 bg-plant-50 text-plant-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <div>
                <label className="label">Description</label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="input resize-none"
                  rows={4}
                  placeholder={
                    promptType === 'diagnosis'
                      ? 'Describe symptoms: yellowing leaves, brown spots, wilting...'
                      : promptType === 'identification'
                      ? 'Describe the plant: leaf shape, color, size, texture...'
                      : promptType === 'care_advice'
                      ? 'Tell me about your plant and environment...'
                      : 'Ask any plant question...'
                  }
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="label">Photo (optional)</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-plant-400 transition-colors"
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >✕</button>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <div className="text-3xl mb-1">📸</div>
                      <p className="text-sm">Drop photo here or click to upload</p>
                      <p className="text-xs mt-1">JPEG, PNG, WebP up to 10MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={diagnoseMutation.isPending || (!input.trim() && !imageFile)}
                className="btn-primary w-full justify-center"
              >
                {diagnoseMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  `🤖 Analyze with ${provider === 'auto' ? 'Best Available' : provider}`
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Result + history */}
        <div className="space-y-4">
          {/* Current result */}
          {latestResult && (
            <div className="card border-l-4 border-plant-500">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">AI Analysis Result</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="badge bg-plant-100 text-plant-700">{latestResult.llm_provider}</span>
                  {latestResult.llm_model && <span>{latestResult.llm_model}</span>}
                  {latestResult.duration_ms && <span>{(latestResult.duration_ms / 1000).toFixed(1)}s</span>}
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {latestResult.response}
                </div>
              </div>
              {latestResult.tokens_used && (
                <p className="text-xs text-gray-400 mt-3">
                  {latestResult.tokens_used} tokens
                  {Number(latestResult.cost_estimate) > 0
                    ? ` · $${Number(latestResult.cost_estimate).toFixed(4)}`
                    : ' · free (local)'}
                </p>
              )}
            </div>
          )}

          {/* History */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Analyses</h3>
            {history.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No analyses yet</div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="badge bg-gray-200 text-gray-600 text-xs capitalize">{item.prompt_type}</span>
                        <span className="badge bg-blue-100 text-blue-700 text-xs">{item.llm_provider}</span>
                        {(item as any).plant_name && (
                          <span className="text-xs text-gray-500">{(item as any).plant_name}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {item.user_input && (
                      <p className="text-xs text-gray-600 truncate">{item.user_input}</p>
                    )}
                    {item.response && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.response}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
