import { useEffect } from 'react';
import { getSocket } from '../utils/socket';

export function useSocket(event: string, handler: (data: any) => void) {
    useEffect(() => {
        const socket = getSocket();

        if (socket) {
            socket.on(event, handler);

            return () => {
                socket.off(event, handler);
            };
        }
    }, [event, handler]);
}

export function useSocketEvent(event: string, callback: (data: any) => void) {
    useEffect(() => {
        const socket = getSocket();

        if (!socket) return;

        socket.on(event, callback);

        return () => {
            socket.off(event, callback);
        };
    }, [event, callback]);
}
