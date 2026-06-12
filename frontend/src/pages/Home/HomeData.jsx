import { useState, useEffect } from "react";
import SideNav from "../../components/SideNav/SideNav";
import DashboardOverview from "../../components/DashboardOverview/DashboardOverview";
import DailyWalkings from "../../components/DailyWalkings/DailyWalkings";
import TaskOverview from "../../components/TaskOverview/TaskOverview";
import HomeBar from "../../components/HomeBar/HomeBar";

const HomeData = () => {
    const [range, setRange] = useState("7");
    const [customRange, setCustomRange] = useState({ startDate: "", endDate: "" });

    const handleRangeChange = (nextRange) => {
        setRange(nextRange);
        if (nextRange !== "custom") {
            setCustomRange({ startDate: "", endDate: "" });
        }
    };

    useEffect(() => {
        const intervalId = setInterval(() => {
            window.dispatchEvent(new Event('dashboard:refresh'));
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="mx-0 mb-[90px]">
            <div className="flex">
                <SideNav />
                <div className="md:ml-[120px] w-full">
                    <div className="px-4 sm:px-6 mt-6">
                        <DashboardOverview range={range} customRange={customRange} />
                    </div>

                    {/* Daily Walkings + Task Overview row */}
                    <div className="px-4 sm:px-6 mt-4 flex flex-col lg:flex-row gap-4">
                        <DailyWalkings
                            range={range}
                            customRange={customRange}
                            onRangeChange={handleRangeChange}
                            onCustomRangeChange={setCustomRange}
                        />
                        <TaskOverview />
                    </div>

                    {/* Training Progress bar chart */}
                    <div className="px-4 sm:px-6 mt-4 mb-8">
                        <HomeBar />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeData;
