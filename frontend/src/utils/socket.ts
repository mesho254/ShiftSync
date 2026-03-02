import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const initSocket = (token: string) => {
    if (socket?.connected) {
        return socket;
    }

    socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        console.log('✅ Socket connected');
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const joinLocation = (locationId: string) => {
    socket?.emit('join:location', locationId);
};

export const leaveLocation = (locationId: string) => {
    socket?.emit('leave:location', locationId);
};

export const setOnDuty = () => {
    socket?.emit('status:onduty');
};

export const setOffDuty = () => {
    socket?.emit('status:offduty');
};
