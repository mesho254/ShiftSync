import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { DateTime } from 'luxon';

interface EditShiftModalProps {
    shift: any;
    onClose: () => void;
    onSuccess: () => void;
}

function EditShiftModal({ shift, onClose, onSuccess }: EditShiftModalProps) {
    const startDateTime = DateTime.fromISO(shift.startUtc);
    const endDateTime = DateTime.fromISO(shift.endUtc);

    const [formData, setFormData] = useState({
        date: startDateTime.toISODate(),
        startTime: startDateTime.toFormat('HH:mm'),
        endTime: endDateTime.toFormat('HH:mm'),
        requiredSkill: shift.requiredSkill,
        headcount: shift.headcount,
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.put(`/shifts/${shift._id}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Shift updated successfully');
            onSuccess();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update shift');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const startUtc = DateTime.fromISO(`${formData.date}T${formData.startTime}`).toUTC().toISO();
        const endUtc = DateTime.fromISO(`${formData.date}T${formData.endTime}`).toUTC().toISO();

        updateMutation.mutate({
            startUtc,
            endUtc,
            requiredSkill: formData.requiredSkill,
            headcount: formData.headcount,
        });
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 animate-slideUp"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Edit Shift</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        type="button"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📅 Date
                        </label>
                        <input
                            type="date"
                            value={formData.date || ''}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                            🎯 Required Skill
                        </label>
                        <select
                            value={formData.requiredSkill}
                            onChange={(e) => setFormData({ ...formData, requiredSkill: e.target.value })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all bg-white"
                            required
                        >
                            <option value="">Select skill...</option>
                            <option value="bartender">🍸 Bartender</option>
                            <option value="server">🍽️ Server</option>
                            <option value="host">👋 Host</option>
                            <option value="line_cook">👨‍🍳 Line Cook</option>
                            <option value="prep_cook">🔪 Prep Cook</option>
                            <option value="dishwasher">🧼 Dishwasher</option>
                            <option value="manager">💼 Manager</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            👥 Headcount Needed
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.headcount}
                            onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) })}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">Number of staff members needed for this shift</p>
                    </div>

                    {shift.assigned.length > 0 && (
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-lg">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <p className="font-semibold text-yellow-900 mb-1">Warning</p>
                                    <p className="text-sm text-yellow-800">
                                        This shift has {shift.assigned.length} staff assigned. Changing the time or skill may cause conflicts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Updating...
                                </span>
                            ) : (
                                '💾 Update Shift'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

export default EditShiftModal;
