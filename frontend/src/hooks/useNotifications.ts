import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useSocketEvent } from './useSocket';
import toast from 'react-hot-toast';

export function useNotifications() {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await api.get('/notifications?unreadOnly=true');
            return response.data;
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (notificationIds: string[]) => {
            await api.post('/notifications/mark-read', { notificationIds });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await api.post('/notifications/mark-all-read');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Listen for new notifications via Socket.IO
    useSocketEvent('notifications:new', (notification) => {
        toast.success(notification.title || 'New notification');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return {
        notifications: data?.notifications || [],
        unreadCount: data?.unreadCount || 0,
        isLoading,
        error,
        markAsRead: markAsReadMutation.mutate,
        markAllAsRead: markAllAsReadMutation.mutate,
    };
}
