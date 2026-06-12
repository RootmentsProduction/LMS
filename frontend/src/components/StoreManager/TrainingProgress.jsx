import { useEffect, useState } from "react";
import { PieChart, Pie, Cell } from 'recharts';
import { fetchStoreManagerData } from '../../features/dashboard/dashboardFetch';

const TrainingProgress = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setIsLoading(true);
            try {
                const json = await fetchStoreManagerData();
                if (!mounted) return;
                setData(json);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);
    
    const processedData = data ? {
        completedTrainings: data.completedTrainings || { count: 0, data: [] },
        pendingTrainings: data.pendingTrainings || { count: 0, data: [] },
        dueTrainings: data.dueTrainings || { count: 0, data: [] },
        userconut: data.userconut || { count: 0 }
    } : {
        completedTrainings: { count: 0, data: [] },
        pendingTrainings: { count: 0, data: [] },
        dueTrainings: { count: 0, data: [] },
        userconut: { count: 0 }
    };

    const chartData = [
        { name: 'Completed', value: processedData.completedTrainings.count, color: '#016E5B' },
        { name: 'In Progress', value: processedData.dueTrainings.count, color: '#009279' },
        { name: 'Pending', value: processedData.pendingTrainings.count, color: '#0DBE9F' },
    ];

    if (isLoading) {
        return (
            <div role="status" className="flex items-center justify-center w-[600px] h-[400px] shadow-xl bg-slate-100 rounded-lg animate-pulse">
                <span className="sr-only">Loading chart...</span>
            </div>
        );
    }

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
                            {processedData.userconut.count || 0}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingProgress;
