import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { plantsApi, locationsApi, uploadsApi } from '../services/api';
import PlantCard from '../components/PlantCard';
import Modal from '../components/common/Modal';
import type { Plant, Location } from '../types';

const HEALTH_OPTIONS = ['excellent', 'good', 'fair', 'poor', 'critical', 'unknown'];
const SUNLIGHT_OPTIONS = ['full_sun', 'partial_shade', 'indirect_light', 'full_shade'];
const PLANT_TYPES = ['succulent', 'tropical', 'herb', 'fern', 'tree', 'shrub', 'vine', 'bulb', 'cactus', 'vegetable', 'flower', 'other'];

export default function Plants() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPlant, setEditPlant] = useState<Plant | null>(null);
  const [filterLocation, setFilterLocation] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: plants = [], isLoading } = useQuery({
    queryKey: ['plants', filterLocation],
    queryFn: () => plantsApi.list(filterLocation),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Partial<Plant>>();

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

  const filtered = plants.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.common_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Plants</h1>
        <button onClick={openCreate} className="btn-primary">+ Add Plant</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search plants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-48"
        />
        <select
          value={filterLocation ?? ''}
          onChange={(e) => setFilterLocation(e.target.value ? Number(e.target.value) : undefined)}
          className="input w-44"
        >
          <option value="">All Locations</option>
          {locations.map((l: Location) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-40 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-lg font-medium">No plants found</p>
          <p className="text-sm mt-1">Add your first plant to get started</p>
          <button onClick={openCreate} className="btn-primary mt-4">Add Plant</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((plant) => (
            <div key={plant.id} className="relative group">
              <PlantCard plant={plant} />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(plant)}
                  className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-xs hover:bg-gray-50"
                  title="Edit"
                >✏️</button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${plant.name}?`)) deleteMutation.mutate(plant.id);
                  }}
                  className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-xs hover:bg-red-50"
                  title="Delete"
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plant form modal */}
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
                <input {...register('scientific_name')} className="input" placeholder="e.g., Monstera deliciosa" />
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
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
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
