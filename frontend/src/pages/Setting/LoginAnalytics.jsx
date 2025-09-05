import { useState } from 'react';
import Header from '../../components/Header/Header';
import SideNav from '../../components/SideNav/SideNav';
import ModileNav from '../../components/SideNav/ModileNav';

const LoginAnalytics = () => {
    const [period, setPeriod] = useState('7d');
    const [selectedUser, setSelectedUser] = useState(null);

    // Mock data for demonstration
    const mockAnalytics = {
        totalLogins: 156,
        uniqueUserCount: 89,
        activeSessions: 12,
        deviceTypeStats: [
            { _id: 'desktop', count: 98 },
            { _id: 'mobile', count: 45 },
            { _id: 'tablet', count: 13 }
        ],
        osStats: [
            { _id: 'windows', count: 67 },
            { _id: 'android', count: 34 },
            { _id: 'ios', count: 28 },
            { _id: 'mac', count: 18 },
            { _id: 'linux', count: 9 }
        ],
        browserStats: [
            { _id: 'Chrome', count: 89 },
            { _id: 'Safari', count: 34 },
            { _id: 'Firefox', count: 18 },
            { _id: 'Edge', count: 15 }
        ],
        recentLogins: [
            {
                username: 'John Doe',
                email: 'john@example.com',
                deviceType: 'desktop',
                deviceOS: 'windows',
                loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
                username: 'Jane Smith',
                email: 'jane@example.com',
                deviceType: 'mobile',
                deviceOS: 'ios',
                loginTime: new Date(Date.now() - 4 * 60 * 60 * 1000)
            },
            {
                username: 'Mike Johnson',
                email: 'mike@example.com',
                deviceType: 'tablet',
                deviceOS: 'android',
                loginTime: new Date(Date.now() - 6 * 60 * 60 * 1000)
            }
        ]
    };

    const mockActiveUsers = [
        {
            _id: '1',
            username: 'John Doe',
            email: 'john@example.com',
            deviceType: 'desktop',
            deviceOS: 'windows',
            browser: 'Chrome',
            loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
            userId: { _id: '1' }
        },
        {
            _id: '2',
            username: 'Jane Smith',
            email: 'jane@example.com',
            deviceType: 'mobile',
            deviceOS: 'ios',
            browser: 'Safari',
            loginTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
            userId: { _id: '2' }
        }
    ];

    const getDeviceIcon = (deviceType) => {
        switch (deviceType) {
            case 'desktop': 
                return (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                );
            case 'mobile': 
                return (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 2a1 1 0 00-1 1v14a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H7zM6 0h8a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V2a2 2 0 012-2z" clipRule="evenodd" />
                    </svg>
                );
            case 'tablet': 
                return (
                    <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4z" clipRule="evenodd" />
                    </svg>
                );
            default: 
                return (
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const getOSIcon = (os) => {
        switch (os) {
            case 'windows': 
                return (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                );
            case 'mac': 
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                );
            case 'linux': 
                return (
                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                );
            case 'android': 
                return (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                );
            case 'ios': 
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                );
            default: 
                return (
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const getBrowserIcon = (browser) => {
        switch (browser.toLowerCase()) {
            case 'chrome': 
                return (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                );
            case 'firefox': 
                return (
                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                );
            case 'safari': 
                return (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                );
            case 'edge': 
                return (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                );
            default: 
                return (
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <>
            <div className="min-h-screen bg-gray-50">
                {/* Mobile Navigation */}
                <div className="md:hidden">
                    <ModileNav />
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:block">
                    <SideNav />
                </div>

                {/* Main Content */}
                <div className="md:ml-64">
                    <Header />
                    
                    <div className="p-6">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Login Analytics Dashboard</h1>
                            <p className="text-gray-600">Monitor user login activity, devices, and real-time sessions</p>
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> This is a demo page showing sample data. 
                                    To see real data, ensure your backend server is running and login tracking is enabled.
                                </p>
                            </div>
                        </div>

                        {/* Period Selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period:</label>
                            <select 
                                value={period} 
                                onChange={(e) => setPeriod(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="24h">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>

                        {/* Analytics Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <svg className="w-8 h-8 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Total Logins</p>
                                        <p className="text-2xl font-bold text-gray-900">{mockAnalytics.totalLogins}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <svg className="w-8 h-8 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5 8a2 2 0 11-4 0 2 2 0 014 0zM5 8a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Unique Users</p>
                                        <p className="text-2xl font-bold text-gray-900">{mockAnalytics.uniqueUserCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <svg className="w-8 h-8 text-purple-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Active Sessions</p>
                                        <p className="text-2xl font-bold text-gray-900">{mockAnalytics.activeSessions}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <svg className="w-8 h-8 text-orange-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                                        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-gray-600">Period</p>
                                        <p className="text-lg font-semibold text-gray-900 capitalize">{period}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Device & OS Distribution */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Device Type Distribution */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Device Types</h3>
                                <div className="space-y-3">
                                    {mockAnalytics.deviceTypeStats?.map((stat, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                {getDeviceIcon(stat._id)}
                                                <span className="ml-2 text-gray-700 capitalize">{stat._id}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{stat.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* OS Distribution */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">💻 Operating Systems</h3>
                                <div className="space-y-3">
                                    {mockAnalytics.osStats?.map((stat, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                {getOSIcon(stat._id)}
                                                <span className="ml-2 text-gray-700 capitalize">{stat._id}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{stat.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Browser Distribution */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">🌐 Browser Usage</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {mockAnalytics.browserStats?.map((stat, index) => (
                                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                                        <div className="flex justify-center mb-2">
                                            {getBrowserIcon(stat._id)}
                                        </div>
                                        <p className="text-sm text-gray-600 capitalize">{stat._id}</p>
                                        <p className="text-lg font-bold text-gray-900">{stat.count}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active Users */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">🟢 Currently Active Users</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OS</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Browser</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {mockActiveUsers.map((session) => (
                                            <tr key={session._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {session.username}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{session.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {getDeviceIcon(session.deviceType)}
                                                        <span className="ml-2 text-sm text-gray-900 capitalize">{session.deviceType}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {getOSIcon(session.deviceOS)}
                                                        <span className="ml-2 text-sm text-gray-900 capitalize">{session.deviceOS}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {getBrowserIcon(session.browser)}
                                                        <span className="ml-2 text-sm text-gray-900">{session.browser}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatDate(session.loginTime)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => setSelectedUser(session)}
                                                        className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md"
                                                    >
                                                        View History
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Logins */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Recent Login Activity</h3>
                            <div className="space-y-3">
                                {mockAnalytics.recentLogins?.map((login, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5 8a2 2 0 11-4 0 2 2 0 014 0zM5 8a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{login.username}</p>
                                                <p className="text-xs text-gray-500">{login.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center">
                                                {getDeviceIcon(login.deviceType)}
                                                <span className="ml-1 text-xs text-gray-600 capitalize">{login.deviceType}</span>
                                            </div>
                                            <div className="flex items-center">
                                                {getOSIcon(login.deviceOS)}
                                                <span className="ml-1 text-xs text-gray-600 capitalize">{login.deviceOS}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{formatDate(login.loginTime)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* User History Modal */}
                        {selectedUser && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Login History for {selectedUser.username}
                                        </h3>
                                        <button
                                            onClick={() => setSelectedUser(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-gray-600">
                                            This is a demo modal. In the real application, this would show the complete login history 
                                            for {selectedUser.username} including all devices, locations, and session durations.
                                        </p>
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <strong>Current Session:</strong>
                                                <p>Device: {selectedUser.deviceType}</p>
                                                <p>OS: {selectedUser.deviceOS}</p>
                                                <p>Browser: {selectedUser.browser}</p>
                                                <p>Login Time: {formatDate(selectedUser.loginTime)}</p>
                                            </div>
                                            <div>
                                                <strong>Sample History:</strong>
                                                <p>Previous login: 2 days ago</p>
                                                <p>Device: Desktop (Windows)</p>
                                                <p>Session Duration: 45 minutes</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginAnalytics;
