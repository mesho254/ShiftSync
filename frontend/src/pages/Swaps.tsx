import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import { getCurrentUser } from '../utils/auth';
import { DateTime } from 'luxon';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useSocketEvent } from '../hooks/useSocket';

export default function Swaps() {
    const user = getCurrentUser();
    const [showRequestModal, setShowRequestModal] = useState(false);
    const queryClient = useQueryClient();

    // Listen for swap updates via socket
    useSocketEvent('swap:created', () => {
        queryClient.invalidateQueries({ queryKey: ['swaps'] });
        queryClient.invalidateQueries({ queryKey: ['availableDrops'] });
    });

    useSocketEvent('swap:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['swaps'] });
        queryClient.invalidateQueries({ queryKey: ['availableDrops'] });
    });

    const { data: swaps, isLoading: swapsLoading } = useQuery({
        queryKey: ['swaps'],
        queryFn: async () => {
            const response = await api.get(`/swaps?userId=${user?._id}`);
            return response.data;
        },
    });

    const { data: myShifts } = useQuery({
        queryKey: ['myShifts'],
        queryFn: async () => {
            const response = await api.get('/shifts');
            const allShifts = response.data;
            return allShifts.filter((s: any) =>
                s.assigned.some((a: any) => a._id === user?._id) &&
                new Date(s.startUtc) > new Date() // Only future shifts
            );
        },
    });

    const { data: availableDrops } = useQuery({
        queryKey: ['availableDrops'],
        queryFn: async () => {
            const response = await api.get('/swaps?status=pending');
            return response.data.filter((s: any) =>
                s.type === 'drop' &&
                s.requesterId._id !== user?._id &&
                (!s.expiresAt || new Date(s.expiresAt) > new Date())
            );
        },
    });

    const acceptMutation = useMutation({
        mutationFn: async (swapId: string) => {
            const response = await api.post(`/swaps/${swapId}/accept`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Swap request accepted');
            queryClient.invalidateQueries({ queryKey: ['swaps'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to accept swap');
        },
    });

    const pickupMutation = useMutation({
        mutationFn: async (swapId: string) => {
            const response = await api.post(`/swaps/${swapId}/pickup`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Shift pickup request sent to manager');
            queryClient.invalidateQueries({ queryKey: ['swaps'] });
            queryClient.invalidateQueries({ queryKey: ['availableDrops'] });
        },
        onError: (error: any) => {
            const violations = error.response?.data?.violations;
            if (violations) {
                toast.error('You do not meet the requirements for this shift');
            } else {
                toast.error(error.response?.data?.error || 'Failed to pick up shift');
            }
        },
    });

    const cancelMutation = useMutation({
        mutationFn: async (swapId: string) => {
            const response = await api.post(`/swaps/${swapId}/cancel`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Swap request cancelled');
            queryClient.invalidateQueries({ queryKey: ['swaps'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to cancel swap');
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (swapId: string) => {
            const response = await api.post(`/swaps/${swapId}/manager-approve`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Swap approved and executed');
            queryClient.invalidateQueries({ queryKey: ['swaps'] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to approve swap');
        },
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'rejected':
            case 'cancelled':
            case 'expired':
                return 'bg-red-100 text-red-800';
            case 'approved-by-manager':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const pendingSwaps = swaps?.filter((s: any) => s.status === 'pending' || s.status === 'accepted') || [];
    const completedSwaps = swaps?.filter((s: any) => ['approved-by-manager', 'rejected', 'cancelled', 'expired'].includes(s.status)) || [];
    const isManager = user?.role === 'manager' || user?.role === 'admin';

    return (
        <Layout title="Shift Swaps & Coverage">
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <p className="text-blue-800">
                    ℹ️ Request to swap shifts with colleagues or drop shifts for others to pick up. Maximum 3 pending requests at a time.
                </p>
            </div>

            {/* Request Swap/Drop Button */}
            <div className="mb-6">
                <button
                    onClick={() => setShowRequestModal(true)}
                    className="btn btn-primary"
                    disabled={pendingSwaps.length >= 3}
                >
                    + Request Swap or Drop
                </button>
                {pendingSwaps.length >= 3 && (
                    <p className="text-sm text-red-600 mt-2">
                        You have reached the maximum of 3 pending requests
                    </p>
                )}
            </div>

            {/* Available Drops to Pick Up */}
            {availableDrops && availableDrops.length > 0 && (
                <div className="card mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">📦 Available Shifts to Pick Up</h3>
                    <div className="space-y-3">
                        {availableDrops.map((drop: any) => (
                            <div key={drop._id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">
                                            {drop.shiftId?.requiredSkill} at {drop.shiftId?.locationId?.name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {DateTime.fromISO(drop.shiftId?.startUtc).toLocaleString(DateTime.DATETIME_MED)} -
                                            {DateTime.fromISO(drop.shiftId?.endUtc).toLocaleString(DateTime.TIME_SIMPLE)}
                                        </p>
                                        {drop.notes && (
                                            <p className="text-sm text-gray-600 mt-1 italic">"{drop.notes}"</p>
                                        )}
                                        {drop.expiresAt && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Expires: {DateTime.fromISO(drop.expiresAt).toRelative()}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => pickupMutation.mutate(drop._id)}
                                        className="btn btn-primary text-sm"
                                        disabled={pickupMutation.isPending}
                                    >
                                        Pick Up
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Requests */}
            {pendingSwaps.length > 0 && (
                <div className="card mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">⏳ Pending Requests</h3>
                    <div className="space-y-4">
                        {pendingSwaps.map((swap: any) => (
                            <div key={swap._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-semibold text-gray-900 capitalize">
                                                {swap.type === 'swap' ? '🔄 Swap' : '📤 Drop'}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(swap.status)}`}>
                                                {swap.status}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-600">
                                            Requester: {swap.requesterId.name}
                                        </p>

                                        {swap.targetStaffId && (
                                            <p className="text-sm text-gray-600">
                                                Target: {swap.targetStaffId.name}
                                            </p>
                                        )}

                                        {swap.shiftId && (
                                            <p className="text-sm text-gray-500 mt-2">
                                                Shift: {DateTime.fromISO(swap.shiftId.startUtc).toLocaleString(DateTime.DATETIME_MED)}
                                            </p>
                                        )}

                                        {swap.notes && (
                                            <p className="text-sm text-gray-600 mt-2 italic">"{swap.notes}"</p>
                                        )}

                                        <p className="text-xs text-gray-400 mt-2">
                                            Created: {DateTime.fromISO(swap.createdAt).toRelative()}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2 ml-4">
                                        {/* If I'm the target and it's pending */}
                                        {swap.type === 'swap' &&
                                            swap.targetStaffId?._id === user?._id &&
                                            swap.status === 'pending' && (
                                                <button
                                                    onClick={() => acceptMutation.mutate(swap._id)}
                                                    className="btn btn-primary text-sm"
                                                    disabled={acceptMutation.isPending}
                                                >
                                                    Accept
                                                </button>
                                            )}

                                        {/* If I'm the requester */}
                                        {swap.requesterId._id === user?._id && swap.status === 'pending' && (
                                            <button
                                                onClick={() => cancelMutation.mutate(swap._id)}
                                                className="btn btn-danger text-sm"
                                                disabled={cancelMutation.isPending}
                                            >
                                                Cancel
                                            </button>
                                        )}

                                        {/* If I'm a manager and it's accepted */}
                                        {isManager && swap.status === 'accepted' && (
                                            <button
                                                onClick={() => approveMutation.mutate(swap._id)}
                                                className="btn bg-green-600 text-white hover:bg-green-700 text-sm"
                                                disabled={approveMutation.isPending}
                                            >
                                                Approve
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Requests */}
            {completedSwaps.length > 0 && (
                <div className="card">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Completed Requests</h3>
                    <div className="space-y-3">
                        {completedSwaps.map((swap: any) => (
                            <div key={swap._id} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-gray-900 capitalize">
                                        {swap.type}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(swap.status)}`}>
                                        {swap.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {swap.shiftId && DateTime.fromISO(swap.shiftId.startUtc).toLocaleString(DateTime.DATETIME_MED)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {DateTime.fromISO(swap.createdAt).toRelative()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {swapsLoading && (
                <div className="text-center py-8">
                    <div className="spinner mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading swap requests...</p>
                </div>
            )}

            {!swapsLoading && swaps && swaps.length === 0 && (
                <div className="card text-center py-12">
                    <p className="text-gray-500 mb-4">No swap requests yet</p>
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="btn btn-primary"
                    >
                        Create Your First Request
                    </button>
                </div>
            )}

            {/* Request Modal */}
            {showRequestModal && (
                <RequestSwapModal
                    myShifts={myShifts || []}
                    onClose={() => {
                        setShowRequestModal(false);
                    }}
                    onSuccess={() => {
                        setShowRequestModal(false);
                        queryClient.invalidateQueries({ queryKey: ['swaps'] });
                    }}
                />
            )}
        </Layout>
    );
}

function RequestSwapModal({ myShifts, onClose, onSuccess }: { myShifts: any[]; onClose: () => void; onSuccess: () => void }) {
    const [type, setType] = useState<'swap' | 'drop'>('drop');
    const [shiftId, setShiftId] = useState('');
    const [targetStaffId, setTargetStaffId] = useState('');
    const [notes, setNotes] = useState('');

    const { data: staff } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => {
            const response = await api.get('/users/staff-list');
            return response.data;
        },
        enabled: type === 'swap',
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post('/swaps', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Request created successfully');
            onSuccess();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to create request');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            type,
            shiftId,
            targetStaffId: type === 'swap' ? targetStaffId : undefined,
            notes,
        });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Request Swap or Drop</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Request Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setType('drop')}
                                className={`p-4 border-2 rounded-lg transition-all ${type === 'drop'
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-gray-300 hover:border-gray-400'
                                    }`}
                            >
                                <div className="text-2xl mb-1">📤</div>
                                <div className="font-semibold">Drop</div>
                                <div className="text-xs">Offer shift to anyone</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('swap')}
                                className={`p-4 border-2 rounded-lg transition-all ${type === 'swap'
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-gray-300 hover:border-gray-400'
                                    }`}
                            >
                                <div className="text-2xl mb-1">🔄</div>
                                <div className="font-semibold">Swap</div>
                                <div className="text-xs">Trade with someone</div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Select Your Shift
                        </label>
                        <select
                            value={shiftId}
                            onChange={(e) => setShiftId(e.target.value)}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all bg-white"
                            required
                        >
                            <option value="">Choose a shift...</option>
                            {myShifts.map((shift: any) => (
                                <option key={shift._id} value={shift._id}>
                                    {DateTime.fromISO(shift.startUtc).toLocaleString(DateTime.DATETIME_MED)} - {shift.requiredSkill}
                                </option>
                            ))}
                        </select>
                    </div>

                    {type === 'swap' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Swap With
                            </label>
                            <select
                                value={targetStaffId}
                                onChange={(e) => setTargetStaffId(e.target.value)}
                                className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all bg-white"
                                required
                            >
                                <option value="">Choose a staff member...</option>
                                {staff?.map((s: any) => (
                                    <option key={s._id} value={s._id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                            rows={3}
                            placeholder="Reason for swap/drop..."
                        />
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl" disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creating...' : '✨ Create Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
