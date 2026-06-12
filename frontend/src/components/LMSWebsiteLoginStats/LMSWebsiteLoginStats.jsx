import { useEffect, useState } from "react";
import { FaGlobe } from "react-icons/fa";
import { fetchLMSStats } from "../../features/dashboard/dashboardFetch";

const LMSWebsiteLoginStats = () => {
    const [responseData, setResponseData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const json = await fetchLMSStats();
                if (!mounted) return;
                setResponseData(json);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);
    const lmsStats = responseData?.data || {
        uniqueLMSUserCount: 0,
        totalLMSLogins: 0,
        activeLMSSessions: 0,
        recentLMSLogins: 0
    };

    if (loading) {
        return (
            <div className="lg:w-56 w-48 md:w-52 h-28 relative border-gray-300 border rounded-xl shadow-lg text-black flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="lg:w-56 w-48 md:w-52 h-28 relative border-green-600 border-2 rounded-xl shadow-lg text-black flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
            <div className="flex gap-3">
                <div className="text-xl absolute top-2 right-2 bg-green-100 h-10 w-10 rounded-full flex items-center justify-center">
                    <FaGlobe />
                </div>
                <div className="flex flex-col absolute top-5 left-2 w-10">
                    <p className="text-sm text-black">LMS Website</p>
                    <h2 className="md:text-2xl sm:text-lg font-bold text-green-600">
                        {lmsStats.uniqueLMSUserCount || 0}
                    </h2>
                    <p className="text-xs text-gray-900">
                        Logins
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LMSWebsiteLoginStats;
