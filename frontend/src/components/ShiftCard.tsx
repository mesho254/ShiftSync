import { DateTime } from 'luxon';

interface ShiftCardProps {
    shift: any;
    onAssign?: (shiftId: string) => void;
    onUnassign?: (shiftId: string, userId: string) => void;
    onViewHistory?: (shiftId: string) => void;
    showActions?: boolean;
}

export default function ShiftCard({ shift, onAssign, onUnassign, onViewHistory, showActions = false }: ShiftCardProps) {
    const startTime = DateTime.fromISO(shift.startUtc);
    const endTime = DateTime.fromISO(shift.endUtc);
    const duration = endTime.diff(startTime, 'hours').hours;

    return (
        <div className="card shift-card">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{shift.requiredSkill}</h3>
                        <span
                            className={`status-badge ${shift.published ? 'status-published' : 'status-draft'
                                }`}
                        >
                            {shift.published ? 'Published' : 'Draft'}
                        </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                        <p>
                            📍 {shift.locationId?.name || 'Unknown Location'}
                        </p>
                        <p>
                            🕐 {startTime.toLocaleString(DateTime.DATETIME_MED)} - {endTime.toLocaleString(DateTime.TIME_SIMPLE)}
                        </p>
                        <p>
                            ⏱️ Duration: {duration.toFixed(1)}h
                        </p>
                        <p>
                            👥 Assigned: {shift.assigned?.length || 0} / {shift.headcount}
                        </p>
                    </div>

                    {shift.assigned && shift.assigned.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {shift.assigned.map((staff: any) => (
                                <div
                                    key={staff._id}
                                    className="flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                                >
                                    <span>{staff.name}</span>
                                    {showActions && onUnassign && (
                                        <button
                                            onClick={() => onUnassign(shift._id, staff._id)}
                                            className="text-primary-600 hover:text-primary-800"
                                            title="Unassign"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {shift.pendingSwap && (
                        <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm inline-block">
                            ⚠️ Pending swap request
                        </div>
                    )}
                </div>

                {showActions && onAssign && shift.assigned.length < shift.headcount && (
                    <button
                        onClick={() => onAssign(shift._id)}
                        className="btn btn-primary ml-4"
                    >
                        Assign Staff
                    </button>
                )}

                {showActions && onViewHistory && (
                    <button
                        onClick={() => onViewHistory(shift._id)}
                        className="btn btn-secondary ml-2"
                        title="View shift history"
                    >
                        📋 History
                    </button>
                )}
            </div>
        </div>
    );
}
