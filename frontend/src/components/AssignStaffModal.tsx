import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface AssignStaffModalProps {
    shift: any;
    onClose: () => void;
    onSuccess: () => void;
}

function AssignStaffModal({ shift, onClose, onSuccess }: AssignStaffModalProps) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [showViolations, setShowViolations] = useState(false);
    const [violations, setViolations] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    const { data: users, isLoading } = useQuery({
        queryKey: ['users', shift.locationId._id],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data.filter((u: any) => u.role === 'staff');
        },
    });

    const assignMutation = useMutation({
        mutationFn: async (userId: string) => {
            const response = await api.post(`/shifts/${shift._id}/assign`, { userId });
            return response.data;
        },
        onSuccess: (data) => {
            if (data.ok) {
                toast.success('Staff assigned successfully');
                if (data.warnings && data.warnings.length > 0) {
                    toast('⚠️ ' + data.warnings[0].msg, { duration: 5000 });
                }
                onSuccess();
            }
        },
        onError: (error: any) => {
            const errorData = error.response?.data;
            if (errorData?.violations) {
                setViolations(errorData.violations);
                setSuggestions(errorData.suggestions || []);
                setShowViolations(true);
            } else {
                toast.error(errorData?.error || 'Failed to assign staff');
            }
        },
    });

    const handleAssign = (userId: string) => {
        assignMutation.mutate(userId);
    };

    const handleSelectSuggestion = (userId: string) => {
        setSelectedUserId(userId);
        setShowViolations(false);
        setViolations([]);
        setSuggestions([]);
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Assign Staff to Shift</h2>
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

                <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🎯</span>
                            <div>
                                <p className="text-xs text-gray-600 font-medium">Required Skill</p>
                                <p className="text-sm font-bold text-gray-900">{shift.requiredSkill}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🕐</span>
                            <div>
                                <p className="text-xs text-gray-600 font-medium">Shift Time</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {new Date(shift.startUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                    {new Date(shift.endUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">👥</span>
                            <div>
                                <p className="text-xs text-gray-600 font-medium">Assigned</p>
                                <p className="text-sm font-bold text-gray-900">{shift.assigned.length} / {shift.headcount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {showViolations && violations.length > 0 && (
                    <div className="mb-6 p-5 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl shadow-md">
                        <div className="flex items-start gap-3 mb-4">
                            <span className="text-3xl">⚠️</span>
                            <div>
                                <h3 className="font-bold text-red-900 text-lg mb-2">Assignment Violations</h3>
                                <ul className="space-y-2">
                                    {violations.map((v, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                                            <span className="text-red-500 font-bold">•</span>
                                            <span>{v.msg}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {suggestions.length > 0 && (
                            <div className="mt-5 pt-5 border-t border-red-200">
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="text-xl">💡</span>
                                    Suggested Alternatives
                                </h4>
                                <div className="space-y-3">
                                    {suggestions.map((sug: any) => (
                                        <button
                                            key={sug.userId}
                                            onClick={() => handleSelectSuggestion(sug.userId)}
                                            className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-900 text-lg">{sug.name}</p>
                                                    <p className="text-sm text-gray-700 mt-1">{sug.reason}</p>
                                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                                                        <span>⏱️ Weekly hours: {sug.weeklyHours}h</span>
                                                    </p>
                                                </div>
                                                <span className="text-primary-600 text-2xl ml-4">→</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!showViolations && (
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            👤 Select Staff Member
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all bg-white text-base"
                            disabled={isLoading}
                        >
                            <option value="">Choose a staff member...</option>
                            {users?.map((user: any) => (
                                <option key={user._id} value={user._id}>
                                    {user.name} - {user.skills?.join(', ')}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-500">Select a staff member with the required skills for this shift</p>
                    </div>
                )}

                {isLoading && (
                    <div className="text-center py-8">
                        <svg className="animate-spin h-12 w-12 mx-auto text-primary-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="mt-4 text-sm text-gray-600 font-medium">Loading staff members...</p>
                    </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                        disabled={assignMutation.isPending}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleAssign(selectedUserId)}
                        className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedUserId || assignMutation.isPending}
                    >
                        {assignMutation.isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Assigning...
                            </span>
                        ) : (
                            '✅ Assign Staff'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default AssignStaffModal;
