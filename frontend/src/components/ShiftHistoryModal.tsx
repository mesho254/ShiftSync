import { useState, useEffect } from 'react';
import api from '../utils/api';
import LoadingSpinner from './LoadingSpinner';

interface ShiftHistoryModalProps {
    shiftId: string;
    onClose: () => void;
}

interface AuditLog {
    _id: string;
    actorId: {
        name: string;
        email: string;
        role: string;
    };
    action: string;
    before?: any;
    after?: any;
    metadata?: any;
    timestamp: string;
}

export default function ShiftHistoryModal({ shiftId, onClose }: ShiftHistoryModalProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchHistory();
    }, [shiftId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/audit/shift/${shiftId}`);
            setLogs(response.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch shift history');
        } finally {
            setLoading(false);
        }
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            'shift.create': 'Created',
            'shift.assign': 'Staff Assigned',
            'shift.unassign': 'Staff Unassigned',
            'shift.update': 'Updated',
            'shift.delete': 'Deleted',
        };
        return labels[action] || action;
    };

    const getActionColor = (action: string) => {
        if (action.includes('create')) return 'text-green-600';
        if (action.includes('delete')) return 'text-red-600';
        if (action.includes('assign')) return 'text-blue-600';
        if (action.includes('update')) return 'text-orange-600';
        return 'text-gray-600';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Shift History</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    {loading && <LoadingSpinner />}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded">
                            {error}
                        </div>
                    )}

                    {!loading && !error && logs.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No history available</p>
                    )}

                    {!loading && !error && logs.length > 0 && (
                        <div className="space-y-4">
                            {logs.map((log, index) => (
                                <div key={log._id} className="border rounded-lg p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-semibold ${getActionColor(log.action)}`}>
                                                    {getActionLabel(log.action)}
                                                </span>
                                                {index === 0 && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                <p>By: {log.actorId?.name} ({log.actorId?.role})</p>
                                                <p>{new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="text-blue-600 hover:underline text-sm"
                                        >
                                            View Details
                                        </button>
                                    </div>

                                    {log.metadata && (
                                        <div className="mt-2 text-sm">
                                            {log.metadata.userId && (
                                                <p className="text-gray-600">
                                                    Staff ID: {log.metadata.userId}
                                                </p>
                                            )}
                                            {log.metadata.weeklyHours && (
                                                <p className="text-gray-600">
                                                    Weekly Hours: {log.metadata.weeklyHours}h
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold">Change Details</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-gray-500 hover:text-gray-700 text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="font-semibold">Action:</label>
                                <p className={getActionColor(selectedLog.action)}>
                                    {getActionLabel(selectedLog.action)}
                                </p>
                            </div>

                            <div>
                                <label className="font-semibold">Changed By:</label>
                                <p>{selectedLog.actorId?.name} ({selectedLog.actorId?.email})</p>
                            </div>

                            <div>
                                <label className="font-semibold">Timestamp:</label>
                                <p>{new Date(selectedLog.timestamp).toLocaleString()}</p>
                            </div>

                            {selectedLog.before && (
                                <div>
                                    <label className="font-semibold">Before:</label>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto mt-1">
                                        {JSON.stringify(selectedLog.before, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.after && (
                                <div>
                                    <label className="font-semibold">After:</label>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto mt-1">
                                        {JSON.stringify(selectedLog.after, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.metadata && (
                                <div>
                                    <label className="font-semibold">Additional Info:</label>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto mt-1">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
