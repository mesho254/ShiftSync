import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { getCurrentUser } from '../utils/auth';
import { DateTime } from 'luxon';
import { useSocketEvent } from '../hooks/useSocket';
import Layout from '../components/Layout';

export default function Dashboard() {
    const user = getCurrentUser();

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const response = await api.get('/locations');
            return response.data;
        },
    });

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await api.get('/notifications?unreadOnly=true');
            return response.data;
        },
    });

    const { data: onDutyData, refetch: refetchOnDuty } = useQuery({
        queryKey: ['on-duty-now'],
        queryFn: async () => {
            const response = await api.get('/analytics/on-duty-now');
            return response.data;
        },
        enabled: user?.role === 'admin' || user?.role === 'manager',
        refetchInterval: 60000, // Refresh every minute
    });

    // Listen for shift updates to refresh on-duty data
    useSocketEvent('shifts:updated', () => {
        refetchOnDuty();
    });

    const isManager = user?.role === 'admin' || user?.role === 'manager';

    return (
        <Layout title="Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Quick Stats */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Locations</h3>
                    <p className="text-3xl font-bold text-primary-600">{locations?.length || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Active locations</p>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications</h3>
                    <p className="text-3xl font-bold text-primary-600">{notifications?.unreadCount || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Unread messages</p>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Role</h3>
                    <p className="text-3xl font-bold text-primary-600 capitalize">{user?.role}</p>
                    <p className="text-sm text-gray-600 mt-1">Your access level</p>
                </div>
            </div>

            {/* On Duty Now - Only for managers/admins */}
            {isManager && onDutyData && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">🟢 On Duty Now</h2>
                        <p className="text-sm text-gray-500">
                            Last updated: {DateTime.fromISO(onDutyData.timestamp).toLocaleString(DateTime.TIME_SIMPLE)}
                        </p>
                    </div>

                    {onDutyData.locations.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {onDutyData.locations.map((location: any) => (
                                <div key={location.locationId} className="card">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">{location.locationName}</h3>
                                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                            {location.staffCount} staff
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {location.shifts.map((shift: any) => (
                                            <div key={shift.shiftId} className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {shift.requiredSkill}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {DateTime.fromISO(shift.startUtc).toLocaleString(DateTime.TIME_SIMPLE)} -
                                                        {DateTime.fromISO(shift.endUtc).toLocaleString(DateTime.TIME_SIMPLE)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {shift.assigned.map((staff: any) => (
                                                        <div key={staff._id} className="flex items-center gap-2 px-2 py-1 bg-white rounded border border-gray-200">
                                                            {staff.avatarUrl && (
                                                                <img src={staff.avatarUrl} alt={staff.name} className="w-5 h-5 rounded-full" />
                                                            )}
                                                            <span className="text-sm text-gray-700">{staff.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card text-center py-8">
                            <p className="text-gray-500">No staff currently on duty</p>
                        </div>
                    )}
                </div>
            )}

            {/* Locations List */}
            <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Locations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locations?.map((location: any) => (
                        <div key={location._id} className="card">
                            <h3 className="font-semibold text-gray-900">{location.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                            <p className="text-xs text-gray-500 mt-2">Timezone: {location.timezone}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
