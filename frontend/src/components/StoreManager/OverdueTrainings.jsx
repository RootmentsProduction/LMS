import { useEffect, useState } from "react";
import { fetchStoreManagerDueData } from "../../features/dashboard/dashboardFetch";

const OverdueTrainings = () => {
    const [responseData, setResponseData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setIsLoading(true);
            try {
                const json = await fetchStoreManagerDueData();
                if (!mounted) return;
                setResponseData(json);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);
    const data = responseData?.topOverdueUsers || [];

    if (isLoading) {
        return (
            <div role="status" className="flex items-center justify-center w-[600px] h-[400px] shadow-xl bg-slate-100 rounded-lg animate-pulse">
                <span className="sr-only">Loading overdue trainings...</span>
            </div>
        );
    }

    return (
        <div className="w-[600px] border bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Overdue Trainings
            </h3>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-gray-600 text-sm border-b">
                        <th className="py-2">Employee Name</th>
                        <th className="py-2">Trainings</th>
                        <th className="py-2">Assessments</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((user, index) => (
                        <tr key={index} className="text-sm text-gray-800 border-b">
                            <td className="py-2">{user.name}</td>
                            <td className="py-2 text-red-500 font-semibold">
                                {String(user.overdueTrainings.length).padStart(2, "0")}
                            </td>
                            <td className="py-2 text-red-500 font-semibold">
                                {String(user.overdueAssessments.length).padStart(2, "0")}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OverdueTrainings;
