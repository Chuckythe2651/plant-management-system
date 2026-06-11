import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { plantsApi, locationsApi, uploadsApi } from '../services/api';
import PlantCard from '../components/PlantCard';
import Modal from '../components/common/Modal';
import type { Plant, Location } from '../types';

const HEALTH_OPTIONS = ['excellent', 'good', 'fair', 'poor', 'critical', 'unknown'];
const SUNLIGHT_OPTIONS = ['full_sun', 'partial_shade', 'indirect_light', 'full_shade'];
const PLANT_TYPES = ['succulent', 'tropical', 'herb', 'fern', 'tree', 'shrub', 'vine', 'bulb', 'cactus', 'vegetable', 'flower', 'other'];

// ── Draggable plant wrapper ──────────────────────────────────
function DraggablePlant({
  plant, onEdit, onDelete,
}: { plant: Plant; onEdit: (p: Plant) => void; onDelete: (p: Plant) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: plant.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute top-1 left-1 z-10 w-6 h-6 bg-white/80 rounded shadow flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to move"
      >
        ⠿
      </div>
      <PlantCard plant={plant} />
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={() => onEdit(plant)}
          className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-xs hover:bg-gray-50"
          title="Edit"
        >✏️</button>
        <button
          onClick={() => onDelete(plant)}
          className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-xs hover:bg-red-50"
          title="Delete"
        >🗑️</button>
      </div>
    </div>
  );
}

// ── Droppable location container ─────────────────────────────
function LocationContainer({
  locationId, locationName, locationIcon, plants, onEdit, onDelete, isOver,
}: {
  locationId: number | null;
  locationName: string;
  locationIcon: string;
  plants: Plant[];
  onEdit: (p: Plant) => void;
  onDelete: (p: Plant) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: locationId ?? 'unassigned' });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 transition-colors p-4 ${
        isOver ? 'border-plant-400 bg-plant-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{locationIcon}</span>
        <h2 className="font-semibold text-gray-800">{locationName}</h2>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {plants.length}
        </span>
      </div>
      {plants.length === 0 ? (
        <div className="text-center py-6 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          Drop plants here
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {plants.map((p) => (
            <DraggablePlant key={p.id} plant={p} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Plants() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPlant, setEditPlant] = useState<Plant | null>(null);
  const [search, setSearch] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [overId, setOverId] = useState<number | 'unassigned' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: plants = [], isLoading } = useQuery({
    queryKey: ['plants'],
    queryFn: () => plantsApi.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<Plant>>();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Plant>) => {
      if (imageFile) {
        const uploaded = await uploadsApi.upload(imageFile);
        data.image_url = uploaded.url;
      }
      return plantsApi.create(data);
    },
    onSuccess: () => {
      toast.success('Plant added!');
      qc.invalidateQueries({ queryKey: ['plants'] });
      closeModal();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Plant> }) => {
      if (imageFile) {
        const uploaded = await uploadsApi.upload(imageFile);
        data.image_url = uploaded.url;
      }
      return plantsApi.update(id, data);
    },
    onSuccess: () => {
      toast.success('Plant updated!');
      qc.invalidateQueries({ queryKey: ['plants'] });
      closeModal();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: plantsApi.delete,
    onSuccess: () => {
      toast.success('Plant removed');
      qc.invalidateQueries({ queryKey: ['plants'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, locationId }: { id: number; locationId: number | null }) =>
      plantsApi.update(id, { location_id: locationId ?? undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plants'] }),
    onError: (err: Error) => toast.error(`Move failed: ${err.message}`),
  });

  function openCreate() {
    setEditPlant(null);
    reset({ health_status: 'good', watering_frequency_days: 7, fertilizing_frequency_days: 30 });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  }

  function openEdit(plant: Plant) {
    setEditPlant(plant);
    reset(plant);
    setImageFile(null);
    setImagePreview(plant.image_url ?? null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditPlant(null);
    setImageFile(null);
    setImagePreview(null);
    reset();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function onSubmit(data: Partial<Plant>) {
    if (editPlant) {
      updateMutation.mutate({ id: editPlant.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setOverId(null);
    const { active, over } = event;
    if (!over) return;
    const plantId = Number(active.id);
    const targetLocId = over.id === 'unassigned' ? null : Number(over.id);
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;
    const currentLocId = plant.location_id ?? null;
    if (currentLocId === targetLocId) return;
    moveMutation.mutate({ id: plantId, locationId: targetLocId });
  }

  const filtered = plants.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.common_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by location
  const groups: { locationId: number | null; locationName: string; locationIcon: string; plants: Plant[] }[] = [];

  const locationMap = new Map<number, Location>(locations.map((l: Location) => [l.id, l]));

  // Assigned locations in the order they appear
  const seenLocIds = new Set<number | null>();
  for (const p of filtered) {
    const lid = p.location_id ?? null;
    if (!seenLocIds.has(lid)) seenLocIds.add(lid);
  }

  // Build sorted groups: locations first (by name), then unassigned
  const sortedLocIds = [...seenLocIds].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return (locationMap.get(a)?.name ?? '').localeCompare(locationMap.get(b)?.name ?? '');
  });

  for (const lid of sortedLocIds) {
    const loc = lid !== null ? locationMap.get(lid) : null;
    groups.push({
      locationId: lid,
      locationName: loc?.name ?? 'Unassigned',
      locationIcon: loc ? (loc.type === 'indoor' ? '🏠' : '🌤') : '❓',
      plants: filtered.filter((p) => (p.location_id ?? null) === lid),
    });
  }

  // Always show all locations as drop targets (even empty ones)
  for (const loc of locations) {
    if (!seenLocIds.has(loc.id)) {
      groups.push({
        locationId: loc.id,
        locationName: loc.name,
        locationIcon: loc.type === 'indoor' ? '🏠' : '🌤',
        plants: [],
      });
    }
  }
  if (!seenLocIds.has(null)) {
    groups.push({ locationId: null, locationName: 'Unassigned', locationIcon: '❓', plants: [] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Plants</h1>
        <button onClick={openCreate} className="btn-primary">+ Add Plant</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search plants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-48"
        />
        <p className="text-sm text-gray-400 self-center">Drag plants between locations to reassign them.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-40 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && plants.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-lg font-medium">No plants yet</p>
          <p className="text-sm mt-1">Add your first plant to get started</p>
          <button onClick={openCreate} className="btn-primary mt-4">Add Plant</button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragOver={(e) => setOverId(e.over ? (e.over.id === 'unassigned' ? 'unassigned' : Number(e.over.id)) : null)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setOverId(null)}
        >
          <div className="space-y-6">
            {groups.map((g) => (
              <LocationContainer
                key={g.locationId ?? 'unassigned'}
                locationId={g.locationId}
                locationName={g.locationName}
                locationIcon={g.locationIcon}
                plants={g.plants}
                onEdit={openEdit}
                onDelete={(p) => { if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id); }}
                isOver={overId === (g.locationId ?? 'unassigned')}
              />
            ))}
          </div>
        </DndContext>
      )}

      {showModal && (
        <Modal title={editPlant ? `Edit ${editPlant.name}` : 'Add New Plant'} onClose={closeModal} size="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Plant Name *</label>
                <input {...register('name', { required: 'Name is required' })} className="input" placeholder="e.g., Monstera" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Common Name</label>
                <input {...register('common_name')} className="input" placeholder="e.g., Swiss Cheese Plant" />
              </div>
              <div>
                <label className="label">Scientific Name</label>
                <input {...register('scientific_name')} className="input" placeholder="Auto-filled if blank" />
              </div>
              <div>
                <label className="label">Location</label>
                <select {...register('location_id', { setValueAs: (v) => v ? Number(v) : undefined })} className="input">
                  <option value="">No location</option>
                  {locations.map((l: Location) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Plant Type</label>
                <select {...register('plant_type')} className="input">
                  <option value="">Select type</option>
                  {PLANT_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Health Status</label>
                <select {...register('health_status')} className="input">
                  {HEALTH_OPTIONS.map((h) => (
                    <option key={h} value={h} className="capitalize">{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Sunlight</label>
                <select {...register('sunlight_requirement')} className="input">
                  <option value="">Unknown</option>
                  {SUNLIGHT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Water every (days)</label>
                <input type="number" {...register('watering_frequency_days', { valueAsNumber: true })} className="input" min={1} />
              </div>
              <div>
                <label className="label">Fertilize every (days)</label>
                <input type="number" {...register('fertilizing_frequency_days', { valueAsNumber: true })} className="input" min={1} />
              </div>
              <div>
                <label className="label">Acquired Date</label>
                <input type="date" {...register('acquired_date')} className="input" />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea {...register('notes')} className="input resize-none" rows={3} placeholder="Care notes, observations..." />
              </div>
              <div className="col-span-2">
                <label className="label">Photo</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="input" />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="mt-2 h-24 rounded-lg object-cover" />
                )}
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_favorite" {...register('is_favorite')} className="w-4 h-4 accent-plant-600" />
                <label htmlFor="is_favorite" className="text-sm text-gray-700">Mark as favorite</label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {editPlant ? 'Update Plant' : 'Add Plant'}
              </button>
              <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
