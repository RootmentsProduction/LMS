import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import baseUrl from '../../api/api';

const TrainingProgress = () => {
    const token = localStorage.getItem('token');
    const [data, setData] = useState({
        completedTrainings: { count: 0, data: [] },
        pendingTrainings: { count: 0, data: [] },
        dueTrainings: { count: 0, data: [] },
        userconut: { count: 0 }
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                console.error('No token found for TrainingProgress');
                return;
            }

            try {
                console.log('Fetching store manager data from:', `${baseUrl.baseUrl}api/admin/get/storemanagerData`);
                console.log('Using token:', token ? 'Token exists' : 'No token');
                
                const response = await fetch(`${baseUrl.baseUrl}api/admin/get/storemanagerData`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    credentials: 'include',
                });

                console.log('Store manager data response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Store manager data error:', response.status, errorText);
                    
                    if (response.status === 401) {
                        console.error('Authentication failed for store manager data');
                        return;
                    }
                    
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                console.log('Store manager data response:', result);
                setData(result);
            } catch (error) {
                console.error('Error fetching training progress data:', error);
                // Set default data structure on error
                setData({
                    completedTrainings: { count: 0, data: [] },
                    pendingTrainings: { count: 0, data: [] },
                    dueTrainings: { count: 0, data: [] },
                    userconut: { count: 0 }
                });
            }
        };

        fetchData();
    }, [token]);

    const chartData = [
        { name: 'Completed', value: data?.completedTrainings.count, color: '#016E5B' },
        { name: 'In Progress', value: data?.dueTrainings.count, color: '#009279' },
        { name: 'Pending', value: data?.pendingTrainings.count, color: '#0DBE9F' },
    ];

    return (
        <div className="relative flex items-center border justify-between w-[600px] p-6 bg-white rounded-lg shadow-md">
            {/* Legend Section */}
            <div className="flex flex-col items-start space-y-4 ml-4 text-[#016E5B]">
                <h3 className="text-lg font-semibold mb-4">Training Progress Summary</h3>
                {chartData.map((item, index) => (
                    <div key={index} className="flex items-center mt-4 space-x-4 text-sm">
                        <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: item.color }}
                        ></span>
                        <div className="flex justify-between w-[160px]">
                            <span>{item.name}</span>
                            <span>{item.value || 0}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pie Chart Section */}
            <div className="flex flex-col items-center">
                <div className="relative">
                    <PieChart width={250} height={250}>
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={60}
                            paddingAngle={0}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <p className="text-sm text-black font-semibold">No. of Staffs</p>
                        <p className="text-2xl font-bold text-[#016E5B]">
                            {data?.userconut.count || 0}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingProgress;
