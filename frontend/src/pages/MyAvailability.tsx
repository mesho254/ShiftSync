import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../utils/auth';

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

export default function MyAvailability() {
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [showOneOffModal, setShowOneOffModal] = useState(false);
    const queryClient = useQueryClient();
    const currentUser = getCurrentUser();

    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const response = await api.get(`/users/${currentUser?._id}`);
            return response.data;
        },
    });

    const updateAvailabilityMutation = useMutation({
        mutationFn: async (availability: any[]) => {
            const response = await api.put(`/users/${currentUser?._id}`, { availability });
            return response.data;
        },
        onSuccess: () => {
            toast.success('Availability updated successfully');
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            setShowRecurringModal(false);
            setShowOneOffModal(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update availability');
        },
    });

    const handleAddRecurring = (data: any) => {
        const newAvailability = [...(user?.availability || []), data];
        updateAvailabilityMutation.mutate(newAvailability);
    };

    const handleAddOneOff = (data: any) => {
        const newAvailability = [...(user?.availability || []), data];
        updateAvailabilityMutation.mutate(newAvailability);
    };

    const handleDelete = (index: number) => {
        if (window.confirm('Are you sure you want to delete this availability?')) {
            const newAvailability = user?.availability.filter((_: any, i: number) => i !== index);
            updateAvailabilityMutation.mutate(newAvailability);
        }
    };

    const recurringAvailability = user?.availability?.filter((a: any) => a.type === 'recurring') || [];
    const oneOffAvailability = user?.availability?.filter((a: any) => a.type === 'one-off') || [];

    return (
        <Layout title="My Availability">
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <p className="text-blue-800">
                    ℹ️ Set your availability so managers know when you can work. You can set recurring weekly hours and one-off exceptions.
                </p>
            </div>

            {/* Certified Locations */}
            <div className="card mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📍 My Certified Locations</h3>
                {user?.certifiedLocations && user.certifiedLocations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {user.certifiedLocations.map((location: any) => (
                            <div key={location._id} className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                                {location.name}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No certified locations. Contact your manager to get certified.</p>
                )}
            </div>

            {/* Recurring Availability */}
            <div className="card mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">🔄 Recurring Weekly Availability</h3>
                    <button
                        onClick={() => setShowRecurringModal(true)}
                        className="btn btn-primary"
                    >
                        + Add Recurring Hours
                    </button>
                </div>

                {isLoading && <p className="text-gray-500">Loading...</p>}

                {recurringAvailability.length > 0 ? (
                    <div className="space-y-3">
                        {recurringAvailability.map((avail: any, index: number) => {
                            const day = DAYS_OF_WEEK.find(d => d.value === avail.dayOfWeek);
                            return (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-gray-900">{day?.label}</p>
                                        <p className="text-sm text-gray-600">
                                            {avail.startTime} - {avail.endTime}
                                        </p>
                                        {avail.notes && (
                                            <p className="text-xs text-gray-500 mt-1">{avail.notes}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(user.availability.indexOf(avail))}
                                        className="text-red-600 hover:text-red-800 font-medium"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500">No recurring availability set. Add your regular weekly hours.</p>
                )}
            </div>

            {/* One-Off Availability */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">📅 One-Off Availability</h3>
                    <button
                        onClick={() => setShowOneOffModal(true)}
                        className="btn btn-primary"
                    >
                        + Add One-Off Hours
                    </button>
                </div>

                {oneOffAvailability.length > 0 ? (
                    <div className="space-y-3">
                        {oneOffAvailability.map((avail: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {new Date(avail.startDatetime).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(avail.startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                        {new Date(avail.endDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {avail.notes && (
                                        <p className="text-xs text-gray-500 mt-1">{avail.notes}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(user.availability.indexOf(avail))}
                                    className="text-red-600 hover:text-red-800 font-medium"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No one-off availability set. Add exceptions to your regular schedule.</p>
                )}
            </div>

            {/* Modals */}
            {showRecurringModal && <RecurringAvailabilityModal onClose={() => setShowRecurringModal(false)} onSubmit={handleAddRecurring} />}
            {showOneOffModal && <OneOffAvailabilityModal onClose={() => setShowOneOffModal(false)} onSubmit={handleAddOneOff} />}
        </Layout>
    );
}

function RecurringAvailabilityModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
    const [formData, setFormData] = useState({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            type: 'recurring',
            ...formData,
        });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Add Recurring Availability</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📅 Day of Week
                        </label>
                        <select
                            value={formData.dayOfWeek}
                            onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all bg-white"
                            required
                        >
                            {DAYS_OF_WEEK.map(day => (
                                <option key={day.value} value={day.value}>{day.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                🕐 Start Time
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                🕐 End Time
                            </label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📝 Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                            rows={2}
                            placeholder="e.g., Prefer morning shifts"
                        />
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl">
                            ✨ Add Availability
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

function OneOffAvailabilityModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
    const today = new Date().toISOString().split('T')[0];
    const [formData, setFormData] = useState({
        date: today,
        startTime: '09:00',
        endTime: '17:00',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const startDatetime = `${formData.date}T${formData.startTime}:00`;
        const endDatetime = `${formData.date}T${formData.endTime}:00`;

        onSubmit({
            type: 'one-off',
            startDatetime,
            endDatetime,
            notes: formData.notes,
        });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Add One-Off Availability</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Add a specific date when you're available outside your regular schedule.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📅 Date
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            min={today}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                🕐 Start Time
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                🕐 End Time
                            </label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📝 Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                            rows={2}
                            placeholder="e.g., Available for extra hours this day"
                        />
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl">
                            ✨ Add Availability
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
