import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../utils/auth';

export default function Locations() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingLocation, setEditingLocation] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const queryClient = useQueryClient();
    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === 'admin';

    const { data: locations, isLoading } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const response = await api.get('/locations');
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post('/locations', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Location created successfully');
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            setShowCreateModal(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create location');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.put(`/locations/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Location updated successfully');
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            setShowEditModal(false);
            setEditingLocation(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update location');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/locations/${id}`);
        },
        onSuccess: () => {
            toast.success('Location deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete location');
        },
    });

    const handleDelete = (location: any) => {
        if (window.confirm(`Are you sure you want to delete "${location.name}"? This cannot be undone.`)) {
            deleteMutation.mutate(location._id);
        }
    };

    return (
        <Layout title="Locations">
            {!isAdmin && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-yellow-800">
                        ℹ️ You have view-only access. Contact an administrator to manage locations.
                    </p>
                </div>
            )}

            {isAdmin && (
                <div className="mb-6">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        + Add New Location
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="text-center py-8">
                    <div className="spinner mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading locations...</p>
                </div>
            )}

            {locations && locations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {locations.map((location: any) => (
                        <div key={location._id} className="card hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        {location.name}
                                    </h3>
                                    {location.address && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            📍 {location.address}
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-500">
                                        🕐 {location.timezone}
                                    </p>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="flex gap-2 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            setEditingLocation(location);
                                            setShowEditModal(true);
                                        }}
                                        className="flex-1 btn btn-secondary text-sm"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(location)}
                                        className="flex-1 btn btn-danger text-sm"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {locations && locations.length === 0 && (
                <div className="card text-center py-12">
                    <p className="text-gray-500 mb-4">No locations found</p>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn btn-primary"
                        >
                            Add Your First Location
                        </button>
                    )}
                </div>
            )}

            {/* Create Location Modal */}
            {showCreateModal && <CreateLocationModal onClose={() => setShowCreateModal(false)} onSubmit={createMutation.mutate} />}

            {/* Edit Location Modal */}
            {showEditModal && editingLocation && (
                <EditLocationModal
                    location={editingLocation}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingLocation(null);
                    }}
                    onSubmit={(data) => updateMutation.mutate({ id: editingLocation._id, data })}
                />
            )}
        </Layout>
    );
}

function CreateLocationModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        timezone: 'America/New_York',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Add New Location</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🏢 Location Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                            placeholder="e.g., Downtown Branch"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📍 Address
                        </label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                            placeholder="e.g., 123 Main St, City, State"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🕐 Timezone *
                        </label>
                        <select
                            value={formData.timezone}
                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all bg-white"
                            required
                        >
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="America/Anchorage">Alaska Time (AKT)</option>
                            <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl">
                            ✨ Create Location
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

function EditLocationModal({ location, onClose, onSubmit }: { location: any; onClose: () => void; onSubmit: (data: any) => void }) {
    const [formData, setFormData] = useState({
        name: location.name,
        address: location.address || '',
        timezone: location.timezone,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Edit Location</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🏢 Location Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📍 Address
                        </label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🕐 Timezone *
                        </label>
                        <select
                            value={formData.timezone}
                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all bg-white"
                            required
                        >
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="America/Anchorage">Alaska Time (AKT)</option>
                            <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl">
                            💾 Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
