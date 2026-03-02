import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

export default function Navbar() {
    const navigate = useNavigate();
    const user = getCurrentUser();

    const navItems = [
        { path: '/', label: 'Dashboard', roles: ['admin', 'manager', 'staff'] },
        { path: '/schedule', label: 'Schedule', roles: ['admin', 'manager'] },
        { path: '/my-schedule', label: 'My Schedule', roles: ['admin', 'manager', 'staff'] },
        { path: '/my-availability', label: 'My Availability', roles: ['admin', 'manager', 'staff'] },
        { path: '/swaps', label: 'Swaps', roles: ['admin', 'manager', 'staff'] },
        { path: '/analytics', label: 'Analytics', roles: ['admin', 'manager'] },
        { path: '/users', label: 'Users', roles: ['admin', 'manager'] },
        { path: '/locations', label: 'Locations', roles: ['admin', 'manager'] },
        { path: '/audit-logs', label: 'Audit Logs', roles: ['admin', 'manager'] },
    ];

    const filteredItems = navItems.filter(item =>
        user && item.roles.includes(user.role)
    );

    return (
        <nav className="bg-white border-b sticky top-[73px] z-40 overflow-x-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex space-x-4 sm:space-x-8">
                    {filteredItems.map((item) => {
                        const isActive = window.location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${isActive
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
