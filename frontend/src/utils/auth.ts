import api from './api';

export interface User {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'staff';
    avatarUrl?: string;
    managedLocations?: string[];
    certifiedLocations?: string[];
    skills?: string[];
    availability?: any[];
    desiredHoursPerWeek?: number;
    notificationPrefs?: {
        inApp: boolean;
        email: boolean;
    };
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
};

export const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
}): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    const { accessToken, refreshToken, user } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
};

export const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    try {
        await api.post('/auth/logout', { refreshToken });
    } catch (error) {
        console.error('Logout error:', error);
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
};

export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('accessToken');
};
