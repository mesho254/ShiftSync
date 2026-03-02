import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { DateTime } from 'luxon';
import Layout from '../components/Layout';
import CreateShiftModal from '../components/CreateShiftModal';
import AssignStaffModal from '../components/AssignStaffModal';
import EditShiftModal from '../components/EditShiftModal';
import ShiftHistoryModal from '../components/ShiftHistoryModal';

export default function Schedule() {
    const [selectedLocation, setSelectedLocation] = useState('');
    const [weekStart, setWeekStart] = useState(
        DateTime.now().startOf('week').toISODate() || ''
    );
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedShift, setSelectedShift] = useState<any>(null);

    const queryClient = useQueryClient();

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const response = await api.get('/locations');
            return response.data;
        },
    });

    const { data: shifts, isLoading } = useQuery({
        queryKey: ['shifts', selectedLocation, weekStart],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedLocation) params.append('locationId', selectedLocation);
            params.append('dateFrom', weekStart);
            params.append('dateTo', DateTime.fromISO(weekStart).plus({ weeks: 1 }).toISODate() || '');

            const response = await api.get(`/shifts?${params}`);
            return response.data;
        },
        enabled: !!selectedLocation,
    });

    const publishMutation = useMutation({
        mutationFn: async () => {
            await api.post('/shifts/publish', {
                weekStart,
                locationId: selectedLocation,
            });
        },
        onSuccess: () => {
            toast.success('Schedule published successfully');
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to publish schedule');
        },
    });

    const unpublishMutation = useMutation({
        mutationFn: async () => {
            await api.post('/shifts/unpublish', {
                weekStart,
                locationId: selectedLocation,
            });
        },
        onSuccess: () => {
            toast.success('Schedule unpublished successfully');
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to unpublish schedule');
        },
    });

    const deleteShiftMutation = useMutation({
        mutationFn: async (shiftId: string) => {
            await api.delete(`/shifts/${shiftId}`);
        },
        onSuccess: () => {
            toast.success('Shift deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete shift');
        },
    });

    const unassignStaffMutation = useMutation({
        mutationFn: async ({ shiftId, userId }: { shiftId: string; userId: string }) => {
            await api.post(`/shifts/${shiftId}/unassign`, { userId });
        },
        onSuccess: () => {
            toast.success('Staff unassigned successfully');
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to unassign staff');
        },
    });

    const handleAssignStaff = (shift: any) => {
        setSelectedShift(shift);
        setShowAssignModal(true);
    };

    const handleEditShift = (shift: any) => {
        setSelectedShift(shift);
        setShowEditModal(true);
    };

    const handleDeleteShift = (shiftId: string) => {
        if (window.confirm('Are you sure you want to delete this shift?')) {
            deleteShiftMutation.mutate(shiftId);
        }
    };

    const handleUnassignStaff = (shiftId: string, userId: string, staffName: string) => {
        if (window.confirm(`Unassign ${staffName} from this shift?`)) {
            unassignStaffMutation.mutate({ shiftId, userId });
        }
    };

    const handleViewHistory = (shift: any) => {
        setSelectedShift(shift);
        setShowHistoryModal(true);
    };

    const canEditShift = (shift: any) => {
        if (!shift.published) return true;

        const shiftStart = DateTime.fromISO(shift.startUtc);
        const now = DateTime.now();
        const hoursUntilShift = shiftStart.diff(now, 'hours').hours;

        return hoursUntilShift > 48; // 48-hour cutoff
    };

    const hasPublishedShifts = shifts?.some((s: any) => s.published);
    const hasUnpublishedShifts = shifts?.some((s: any) => !s.published);

    return (
        <Layout title="Schedule Management">
            {/* Controls */}
            <div className="card mb-6">
                <div className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Location
                        </label>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="input"
                        >
                            <option value="">Select location...</option>
                            {locations?.map((loc: any) => (
                                <option key={loc._id} value={loc._id}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Week Starting
                        </label>
                        <input
                            type="date"
                            value={weekStart}
                            onChange={(e) => setWeekStart(e.target.value)}
                            className="input"
                        />
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        disabled={!selectedLocation}
                        className="btn btn-primary"
                    >
                        + Create Shift
                    </button>

                    {hasUnpublishedShifts && (
                        <button
                            onClick={() => publishMutation.mutate()}
                            disabled={!selectedLocation || publishMutation.isPending}
                            className="btn bg-green-600 text-white hover:bg-green-700"
                        >
                            📢 Publish Schedule
                        </button>
                    )}

                    {hasPublishedShifts && (
                        <button
                            onClick={() => unpublishMutation.mutate()}
                            disabled={!selectedLocation || unpublishMutation.isPending}
                            className="btn bg-orange-600 text-white hover:bg-orange-700"
                        >
                            🔒 Unpublish Schedule
                        </button>
                    )}
                </div>
            </div>

            {/* Shifts List */}
            {isLoading && (
                <div className="text-center py-8">
                    <div className="spinner mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading shifts...</p>
                </div>
            )}

            {shifts && shifts.length > 0 && (
                <div className="space-y-4">
                    {shifts.map((shift: any) => {
                        const canEdit = canEditShift(shift);
                        const shiftStart = DateTime.fromISO(shift.startUtc);
                        const hoursUntilShift = shiftStart.diff(DateTime.now(), 'hours').hours;

                        return (
                            <div key={shift._id} className="card">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-gray-900 text-lg">
                                                {shift.requiredSkill}
                                            </h3>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${shift.published
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {shift.published ? '✓ Published' : '📝 Draft'}
                                            </span>
                                            {shift.published && hoursUntilShift <= 48 && (
                                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    🔒 Locked (within 48h)
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p>
                                                📅 {DateTime.fromISO(shift.startUtc).toLocaleString(DateTime.DATETIME_MED)} -
                                                {DateTime.fromISO(shift.endUtc).toLocaleString(DateTime.TIME_SIMPLE)}
                                            </p>
                                            <p>
                                                ⏱️ Duration: {DateTime.fromISO(shift.endUtc).diff(DateTime.fromISO(shift.startUtc), 'hours').hours.toFixed(1)}h
                                            </p>
                                            <p>
                                                👥 Assigned: {shift.assigned.length} / {shift.headcount}
                                            </p>
                                        </div>

                                        {/* Assigned Staff */}
                                        {shift.assigned.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {shift.assigned.map((staff: any) => (
                                                    <div
                                                        key={staff._id}
                                                        className="flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                                                    >
                                                        <span>{staff.name}</span>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleUnassignStaff(shift._id, staff._id, staff.name)}
                                                                className="text-primary-600 hover:text-primary-800 font-bold"
                                                                title="Unassign"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 ml-4">
                                        <button
                                            onClick={() => handleViewHistory(shift)}
                                            className="btn btn-secondary text-sm"
                                            title="View shift history"
                                        >
                                            📋 History
                                        </button>

                                        {shift.assigned.length < shift.headcount && canEdit && (
                                            <button
                                                onClick={() => handleAssignStaff(shift)}
                                                className="btn btn-primary text-sm"
                                            >
                                                + Assign Staff
                                            </button>
                                        )}

                                        {canEdit && (
                                            <>
                                                <button
                                                    onClick={() => handleEditShift(shift)}
                                                    className="btn btn-secondary text-sm"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteShift(shift._id)}
                                                    className="btn btn-danger text-sm"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </>
                                        )}

                                        {!canEdit && (
                                            <span className="text-xs text-gray-500 text-center">
                                                Cannot edit<br />(within 48h)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {shifts && shifts.length === 0 && selectedLocation && (
                <div className="card text-center py-12">
                    <p className="text-gray-500 mb-4">No shifts found for this week</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        Create Your First Shift
                    </button>
                </div>
            )}

            {!selectedLocation && (
                <div className="card text-center py-12">
                    <p className="text-gray-500">Please select a location to view and manage shifts</p>
                </div>
            )}

            {/* Modals */}
            {showCreateModal && (
                <CreateShiftModal
                    locationId={selectedLocation}
                    weekStart={weekStart}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        queryClient.invalidateQueries({ queryKey: ['shifts'] });
                    }}
                />
            )}

            {showAssignModal && selectedShift && (
                <AssignStaffModal
                    shift={selectedShift}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedShift(null);
                    }}
                    onSuccess={() => {
                        setShowAssignModal(false);
                        setSelectedShift(null);
                        queryClient.invalidateQueries({ queryKey: ['shifts'] });
                    }}
                />
            )}

            {showEditModal && selectedShift && (
                <EditShiftModal
                    shift={selectedShift}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedShift(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedShift(null);
                        queryClient.invalidateQueries({ queryKey: ['shifts'] });
                    }}
                />
            )}

            {showHistoryModal && selectedShift && (
                <ShiftHistoryModal
                    shiftId={selectedShift._id}
                    onClose={() => {
                        setShowHistoryModal(false);
                        setSelectedShift(null);
                    }}
                />
            )}
        </Layout>
    );
}
