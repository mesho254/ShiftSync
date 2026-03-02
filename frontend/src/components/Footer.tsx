export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* About Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">ShiftSync</h3>
                        <p className="text-sm text-gray-600">
                            Staff scheduling made simple and fair for multi-location restaurants.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>
                                <a href="/" className="hover:text-primary-600">Dashboard</a>
                            </li>
                            <li>
                                <a href="/my-schedule" className="hover:text-primary-600">My Schedule</a>
                            </li>
                            <li>
                                <a href="/swaps" className="hover:text-primary-600">Swaps</a>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Support</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>
                                <a href="#" className="hover:text-primary-600">Help Center</a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary-600">Contact Us</a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary-600">Privacy Policy</a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-sm text-gray-500">
                            © {currentYear} ShiftSync. All rights reserved.
                        </p>
                        <p className="text-sm text-gray-500 mt-2 md:mt-0">
                            Built with ❤️ for Coastal Eats
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
