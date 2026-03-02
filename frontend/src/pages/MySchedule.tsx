import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { getCurrentUser } from '../utils/auth';
import { DateTime } from 'luxon';
import Layout from '../components/Layout';

export default function MySchedule() {
    const user = getCurrentUser();

    const { data: shifts, isLoading } = useQuery({
        queryKey: ['my-shifts'],
        queryFn: async () => {
            const response = await api.get('/shifts', {
                params: {
                    dateFrom: DateTime.now().toISODate(),
                    dateTo: DateTime.now().plus({ weeks: 4 }).toISODate(),
                },
            });
            return response.data.filter((shift: any) =>
                shift.assigned.some((s: any) => s._id === user?._id)
            );
        },
    });

    const totalHours = shifts?.reduce((total: number, shift: any) => {
        const hours = DateTime.fromISO(shift.endUtc).diff(
            DateTime.fromISO(shift.startUtc),
            'hours'
        ).hours;
        return total + hours;
    }, 0);

    return (
        <Layout title="My Schedule">
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card">
                    <h3 className="text-sm font-medium text-gray-600">Upcoming Shifts</h3>
                    <p className="text-3xl font-bold text-primary-600 mt-2">
                        {shifts?.length || 0}
                    </p>
                </div>
                <div className="card">
                    <h3 className="text-sm font-medium text-gray-600">Total Hours</h3>
                    <p className="text-3xl font-bold text-primary-600 mt-2">
                        {totalHours?.toFixed(1) || 0}h
                    </p>
                </div>
            </div>

            {isLoading && <p>Loading your schedule...</p>}

            {shifts && shifts.length > 0 && (
                <div className="space-y-4">
                    {shifts.map((shift: any) => (
                        <div key={shift._id} className="card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        {shift.locationId.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {shift.requiredSkill}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {DateTime.fromISO(shift.startUtc).toLocaleString(
                                            DateTime.DATETIME_MED
                                        )}{' '}
                                        -{' '}
                                        {DateTime.fromISO(shift.endUtc).toLocaleString(
                                            DateTime.TIME_SIMPLE
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Duration:{' '}
                                        {DateTime.fromISO(shift.endUtc)
                                            .diff(DateTime.fromISO(shift.startUtc), 'hours')
                                            .hours.toFixed(1)}
                                        h
                                    </p>
                                </div>
                                {shift.published && (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                        Confirmed
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {shifts && shifts.length === 0 && (
                <div className="card text-center py-12">
                    <p className="text-gray-500">No upcoming shifts</p>
                </div>
            )}
        </Layout>
    );
}
