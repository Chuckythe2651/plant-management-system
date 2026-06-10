import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { locationsApi, plantsApi } from '../services/api';
import Modal from '../components/common/Modal';
import type { Location } from '../types';

export default function Locations() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editLoc, setEditLoc] = useState<Location | null>(null);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants'],
    queryFn: () => plantsApi.list(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<Location>>();

  const createMutation = useMutation({
    mutationFn: locationsApi.create,
    onSuccess: () => { toast.success('Location added'); qc.invalidateQueries({ queryKey: ['locations'] }); closeModal(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Location> }) => locationsApi.update(id, data),
    onSuccess: () => { toast.success('Location updated'); qc.invalidateQueries({ queryKey: ['locations'] }); closeModal(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: locationsApi.delete,
    onSuccess: () => { toast.success('Location removed'); qc.invalidateQueries({ queryKey: ['locations'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditLoc(null);
    reset({ type: 'indoor', city: 'Chandler', state: 'AZ', zip_code: '85224' });
    setShowModal(true);
  }

  function openEdit(loc: Location) {
    setEditLoc(loc);
    reset(loc);
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditLoc(null); reset(); }

  function onSubmit(data: Partial<Location>) {
    if (editLoc) updateMutation.mutate({ id: editLoc.id, data });
    else createMutation.mutate(data);
  }

  const plantsByLocation = plants.reduce<Record<number, number>>((acc, p) => {
    if (p.location_id) acc[p.location_id] = (acc[p.location_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <button onClick={openCreate} className="btn-primary">+ Add Location</button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-32" />)}
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📍</div>
          <p>No locations yet. Add one to organize your plants.</p>
          <button onClick={openCreate} className="btn-primary mt-4">Add Location</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc: Location) => (
            <div key={loc.id} className="card relative group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{loc.type === 'indoor' ? '🏠' : '🌤'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{loc.name}</h3>
                    {loc.is_default && (
                      <span className="badge bg-plant-100 text-plant-700 text-xs">Default</span>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => openEdit(loc)} className="p-1.5 rounded hover:bg-gray-100 text-sm" title="Edit">✏️</button>
                  <button
                    onClick={() => { if (confirm(`Delete ${loc.name}?`)) deleteMutation.mutate(loc.id); }}
                    className="p-1.5 rounded hover:bg-red-50 text-sm" title="Delete"
                  >🗑️</button>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p className="capitalize font-medium text-plant-700">{loc.type}</p>
                {loc.description && <p className="text-gray-500 text-xs">{loc.description}</p>}
                <p className="text-xs text-gray-400">{loc.city}, {loc.state} {loc.zip_code}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {plantsByLocation[loc.id] ?? 0} plant{(plantsByLocation[loc.id] ?? 0) !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-400">
                  {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editLoc ? `Edit ${editLoc.name}` : 'Add Location'} onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input {...register('name', { required: 'Name required' })} className="input" placeholder="e.g., Living Room" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Type *</label>
              <select {...register('type')} className="input">
                <option value="indoor">🏠 Indoor</option>
                <option value="outdoor">🌤 Outdoor</option>
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <input {...register('description')} className="input" placeholder="e.g., South-facing windows" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label">City</label>
                <input {...register('city')} className="input" />
              </div>
              <div>
                <label className="label">State</label>
                <input {...register('state')} className="input" maxLength={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude</label>
                <input type="number" step="any" {...register('latitude', { valueAsNumber: true })} className="input" />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input type="number" step="any" {...register('longitude', { valueAsNumber: true })} className="input" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_default" {...register('is_default')} className="w-4 h-4 accent-plant-600" />
              <label htmlFor="is_default" className="text-sm text-gray-700">Set as default location</label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1 justify-center">
                {editLoc ? 'Update' : 'Add'} Location
              </button>
              <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
