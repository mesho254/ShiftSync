import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, logout } from '../utils/auth';
import { DateTime } from 'luxon';
import { useSocketEvent } from '../hooks/useSocket';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
    children: ReactNode;
    title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [showNotifications, setShowNotifications] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data: notificationsData } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await api.get('/notifications');
            return response.data;
        },
        refetchInterval: 30000,
    });

    // Listen for new notifications via socket
    useSocketEvent('notifications:new', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            await api.put(`/notifications/${notificationId}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const notificationsList = notificationsData?.notifications || [];
    const unreadCount = notificationsData?.unreadCount || 0;

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header - Sticky at top */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ShiftSync</h1>
                            <p className="text-xs sm:text-sm text-gray-600">Welcome, {user?.name}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            {/* Notifications */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                                        <div className="p-4 border-b border-gray-200">
                                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                                        </div>
                                        {notificationsList.length > 0 ? (
                                            <div className="divide-y divide-gray-200">
                                                {notificationsList.slice(0, 10).map((notification: any) => (
                                                    <div
                                                        key={notification._id}
                                                        className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''
                                                            }`}
                                                        onClick={() => {
                                                            if (!notification.read) {
                                                                markAsReadMutation.mutate(notification._id);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex-1">
                                                                {user?.role === 'admin' && notification.userId && (
                                                                    <p className="text-xs text-gray-500 mb-1">
                                                                        For: {notification.userId.name} ({notification.userId.role})
                                                                    </p>
                                                                )}
                                                                <p className="font-medium text-gray-900 text-sm">
                                                                    {notification.title}
                                                                </p>
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {notification.body}
                                                                </p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {DateTime.fromISO(notification.createdAt).toRelative()}
                                                                </p>
                                                            </div>
                                                            {!notification.read && (
                                                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-gray-500">
                                                No notifications
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button onClick={handleLogout} className="btn btn-secondary text-sm sm:text-base px-3 py-2 sm:px-4">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation - Sticky below header */}
            <Navbar />

            {/* Main Content - Grows to fill space */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                {title && <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">{title}</h2>}
                {children}
            </main>

            {/* Footer - Always at bottom */}
            <Footer />
        </div>
    );
}
