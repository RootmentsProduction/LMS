import { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import { FaGlobe } from "react-icons/fa";

const LMSWebsiteLoginStats = () => {
    const [lmsStats, setLmsStats] = useState({
        uniqueLMSUserCount: 0,
        totalLMSLogins: 0,
        activeLMSSessions: 0,
        recentLMSLogins: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLMSStats = async () => {
            try {
                console.log('Fetching LMS website login stats from:', baseUrl.baseUrl + 'api/lms-login/count-simple');
                
                const response = await fetch(baseUrl.baseUrl + 'api/lms-login/count-simple', {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                });
                
                console.log('LMS stats response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('LMS stats response not ok:', response.status, errorText);
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const result = await response.json();
                console.log('LMS stats response:', result);
                
                if (result.success && result.data) {
                    setLmsStats(result.data);
                    console.log('LMS stats fetched successfully:', result.data);
                } else {
                    console.error('LMS stats response structure unexpected:', result);
                    setLmsStats({
                        uniqueLMSUserCount: 0,
                        totalLMSLogins: 0,
                        activeLMSSessions: 0,
                        recentLMSLogins: 0
                    });
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch LMS website login stats:', error.message);
                setLmsStats({
                    uniqueLMSUserCount: 0,
                    totalLMSLogins: 0,
                    activeLMSSessions: 0,
                    recentLMSLogins: 0
                });
                setLoading(false);
            }
        };

        fetchLMSStats();
    }, []);

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
