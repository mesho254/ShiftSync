import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { DateTime } from 'luxon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';

export default function Analytics() {
    const [selectedLocation, setSelectedLocation] = useState('');
    const [weekStart, setWeekStart] = useState(
        DateTime.now().startOf('week').toISODate()
    );

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const response = await api.get('/locations');
            return response.data;
        },
    });

    const { data: overtimeData } = useQuery({
        queryKey: ['analytics-overtime', selectedLocation, weekStart],
        queryFn: async () => {
            const response = await api.get('/analytics/overtime', {
                params: { locationId: selectedLocation, weekStart },
            });
            return response.data;
        },
        enabled: !!selectedLocation,
    });

    const { data: fairnessData } = useQuery({
        queryKey: ['analytics-fairness', selectedLocation, weekStart],
        queryFn: async () => {
            const end = DateTime.fromISO(weekStart).plus({ weeks: 1 }).toISODate();
            const response = await api.get('/analytics/fairness', {
                params: { locationId: selectedLocation, start: weekStart, end },
            });
            return response.data;
        },
        enabled: !!selectedLocation,
    });

    return (
        <Layout title="Analytics">
            <div className="card mb-6">
                <div className="flex gap-4">
                    <div className="flex-1">
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

                    <div className="flex-1">
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
                </div>
            </div>

            {overtimeData && (
                <div className="card mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Overtime Analysis
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={overtimeData.staff}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="hours" fill="#3b82f6" name="Total Hours" />
                            <Bar dataKey="overtimeHours" fill="#ef4444" name="Overtime Hours" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {fairnessData && (
                <div className="card mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Fairness Distribution
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-600">Average Hours</p>
                            <p className="text-2xl font-bold text-blue-600">{fairnessData.averageHours}h</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-600">Avg Premium Shifts</p>
                            <p className="text-2xl font-bold text-purple-600">{fairnessData.averagePremiumShifts}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600">Staff Members</p>
                            <p className="text-2xl font-bold text-green-600">{fairnessData.staff.length}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {fairnessData.staff.map((staff: any) => (
                            <div key={staff.userId} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-gray-900">{staff.name}</span>
                                        {staff.schedulingStatus === 'under-scheduled' && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                                Under-scheduled
                                            </span>
                                        )}
                                        {staff.schedulingStatus === 'over-scheduled' && (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                                Over-scheduled
                                            </span>
                                        )}
                                        {staff.schedulingStatus === 'balanced' && (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                Balanced
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {staff.desiredVsActual && `${staff.desiredVsActual}% of desired`}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Total Hours:</span>
                                        <span className="ml-2 font-semibold">{staff.totalHours.toFixed(1)}h</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Premium Shifts:</span>
                                        <span className="ml-2 font-semibold text-purple-600">{staff.premiumShifts}</span>
                                        <span className="ml-1 text-gray-500">({staff.premiumHours.toFixed(1)}h)</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Total Shifts:</span>
                                        <span className="ml-2 font-semibold">{staff.shiftCount}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!selectedLocation && (
                <div className="card text-center py-12">
                    <p className="text-gray-500">Select a location to view analytics</p>
                </div>
            )}
        </Layout>
    );
}
