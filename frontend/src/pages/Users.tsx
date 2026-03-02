import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../utils/auth';

export default function Users() {
    const [editingUser, setEditingUser] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const queryClient = useQueryClient();
    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === 'admin';

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data;
        },
    });

    const { data: locations } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const response = await api.get('/locations');
            return response.data;
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
            const response = await api.put(`/users/${userId}`, updates);
            return response.data;
        },
        onSuccess: () => {
            toast.success('User updated successfully');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setShowEditModal(false);
            setEditingUser(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update user');
        },
    });

    const handleEditUser = (user: any) => {
        setEditingUser({
            ...user,
            managedLocations: user.managedLocations?.map((loc: any) => loc._id || loc) || [],
            certifiedLocations: user.certifiedLocations?.map((loc: any) => loc._id || loc) || [],
        });
        setShowEditModal(true);
    };

    const handleSaveUser = () => {
        if (!editingUser) return;

        updateUserMutation.mutate({
            userId: editingUser._id,
            updates: {
                role: editingUser.role,
                managedLocations: editingUser.managedLocations,
                certifiedLocations: editingUser.certifiedLocations,
                skills: editingUser.skills,
            },
        });
    };

    const toggleManagedLocation = (locationId: string) => {
        if (!editingUser) return;

        const locations = editingUser.managedLocations || [];
        const index = locations.indexOf(locationId);

        if (index > -1) {
            setEditingUser({
                ...editingUser,
                managedLocations: locations.filter((id: string) => id !== locationId),
            });
        } else {
            setEditingUser({
                ...editingUser,
                managedLocations: [...locations, locationId],
            });
        }
    };

    const toggleCertifiedLocation = (locationId: string) => {
        if (!editingUser) return;

        const locations = editingUser.certifiedLocations || [];
        const index = locations.indexOf(locationId);

        if (index > -1) {
            setEditingUser({
                ...editingUser,
                certifiedLocations: locations.filter((id: string) => id !== locationId),
            });
        } else {
            setEditingUser({
                ...editingUser,
                certifiedLocations: [...locations, locationId],
            });
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800';
            case 'manager':
                return 'bg-blue-100 text-blue-800';
            case 'staff':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Layout title="User Management">
            {!isAdmin && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-yellow-800">
                        ℹ️ You have view-only access. Contact an administrator to modify user permissions.
                    </p>
                </div>
            )}

            {isLoading && (
                <div className="text-center py-8">
                    <div className="spinner mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
            )}

            {users && users.length > 0 && (
                <div className="card overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Skills
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Managed Locations
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Certified Locations
                                </th>
                                {isAdmin && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user: any) => (
                                <tr key={user._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {user.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.skills?.map((skill: string) => (
                                                <span
                                                    key={skill}
                                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {user.managedLocations?.length > 0 ? (
                                                <div className="space-y-1">
                                                    {user.managedLocations.map((loc: any) => (
                                                        <div key={loc._id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                            {loc.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">None</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {user.certifiedLocations?.length > 0 ? (
                                                <div className="space-y-1">
                                                    {user.certifiedLocations.map((loc: any) => (
                                                        <div key={loc._id} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                                            {loc.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">None</span>
                                            )}
                                        </div>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => handleEditUser(user)}
                                                className="text-primary-600 hover:text-primary-900 font-medium"
                                            >
                                                ✏️ Edit
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold text-gray-900">Edit User</h2>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingUser(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* User Info */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-semibold text-gray-900">{editingUser.name}</p>
                                <p className="text-sm text-gray-600 mt-2">Email</p>
                                <p className="font-semibold text-gray-900">{editingUser.email}</p>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    👤 Role
                                </label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="input w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {/* Managed Locations (for managers) */}
                            {editingUser.role === 'manager' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        🏢 Managed Locations
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Select which locations this manager can oversee and create schedules for
                                    </p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                        {locations?.map((location: any) => (
                                            <label
                                                key={location._id}
                                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editingUser.managedLocations?.includes(location._id)}
                                                    onChange={() => toggleManagedLocation(location._id)}
                                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-900">{location.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Certified Locations (for staff) */}
                            {editingUser.role === 'staff' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        ✅ Certified Locations
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Select which locations this staff member is certified to work at
                                    </p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                        {locations?.map((location: any) => (
                                            <label
                                                key={location._id}
                                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editingUser.certifiedLocations?.includes(location._id)}
                                                    onChange={() => toggleCertifiedLocation(location._id)}
                                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-900">{location.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Skills (for staff and managers) */}
                            {(editingUser.role === 'staff' || editingUser.role === 'manager') && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        🎯 Skills
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Select the skills this person has
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['bartender', 'server', 'host', 'line_cook', 'prep_cook', 'dishwasher', 'manager'].map((skill) => (
                                            <label
                                                key={skill}
                                                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer border border-gray-200"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editingUser.skills?.includes(skill)}
                                                    onChange={(e) => {
                                                        const skills = editingUser.skills || [];
                                                        if (e.target.checked) {
                                                            setEditingUser({
                                                                ...editingUser,
                                                                skills: [...skills, skill],
                                                            });
                                                        } else {
                                                            setEditingUser({
                                                                ...editingUser,
                                                                skills: skills.filter((s: string) => s !== skill),
                                                            });
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-900 capitalize">
                                                    {skill.replace('_', ' ')}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingUser(null);
                                }}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                                disabled={updateUserMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveUser}
                                className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                disabled={updateUserMutation.isPending}
                            >
                                {updateUserMutation.isPending ? 'Saving...' : '💾 Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
