import { useState, useEffect } from 'react';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

interface AuditLog {
    _id: string;
    actorId: {
        name: string;
        email: string;
    };
    action: string;
    targetType: string;
    targetId: string;
    before?: any;
    after?: any;
    metadata?: any;
    timestamp: string;
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (fromDate) params.append('from', fromDate);
            if (toDate) params.append('to', toDate);
            if (actionFilter) params.append('action', actionFilter);

            const response = await api.get(`/audit?${params.toString()}`);
            setLogs(response.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = async () => {
        try {
            const params = new URLSearchParams();
            if (fromDate) params.append('from', fromDate);
            if (toDate) params.append('to', toDate);
            if (actionFilter) params.append('action', actionFilter);
            params.append('format', 'csv');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/audit?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'audit-log.csv';
            a.click();
        } catch (err) {
            setError('Failed to export CSV');
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('create')) return 'text-green-600';
        if (action.includes('delete')) return 'text-red-600';
        if (action.includes('update') || action.includes('assign')) return 'text-blue-600';
        if (action.includes('approve')) return 'text-purple-600';
        return 'text-gray-600';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="p-4 md:p-6">
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold mb-4">Audit Logs</h1>

                <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Action</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="">All Actions</option>
                                <option value="shift.create">Shift Create</option>
                                <option value="shift.assign">Shift Assign</option>
                                <option value="shift.unassign">Shift Unassign</option>
                                <option value="shift.update">Shift Update</option>
                                <option value="shift.delete">Shift Delete</option>
                                <option value="schedule.publish">Schedule Publish</option>
                                <option value="schedule.unpublish">Schedule Unpublish</option>
                                <option value="swap.create">Swap Create</option>
                                <option value="swap.approve">Swap Approve</option>
                                <option value="swap.cancel">Swap Cancel</option>
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                onClick={fetchLogs}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Filter
                            </button>
                            <button
                                onClick={exportCSV}
                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {error && <ErrorMessage message={error} />}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log._id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>{log.actorId?.name || 'System'}</div>
                                        <div className="text-xs text-gray-500">{log.actorId?.email}</div>
                                    </td>
                                    <td className={`px-4 py-3 text-sm font-medium ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div>{log.targetType}</div>
                                        <div className="text-xs text-gray-500 font-mono">{log.targetId.slice(-8)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="text-blue-600 hover:underline"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold">Audit Log Details</h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="font-semibold">Action:</label>
                                <p className={getActionColor(selectedLog.action)}>{selectedLog.action}</p>
                            </div>

                            <div>
                                <label className="font-semibold">Actor:</label>
                                <p>{selectedLog.actorId?.name} ({selectedLog.actorId?.email})</p>
                            </div>

                            <div>
                                <label className="font-semibold">Timestamp:</label>
                                <p>{new Date(selectedLog.timestamp).toLocaleString()}</p>
                            </div>

                            {selectedLog.before && (
                                <div>
                                    <label className="font-semibold">Before:</label>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(selectedLog.before, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.after && (
                                <div>
                                    <label className="font-semibold">After:</label>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(selectedLog.after, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.metadata && (
                                <div>
                                    <label className="font-semibold">Metadata:</label>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
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
