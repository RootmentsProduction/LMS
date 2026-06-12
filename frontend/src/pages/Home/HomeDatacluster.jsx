import SideNav from "../../components/SideNav/SideNav";
import HomeBar from "../../components/HomeBar/HomeBar";
import TopEmployeeAndBranch from "../../components/TopEmployeeAndBranch/TopEmployeeAndBranch";
import Quick from "../../components/Quick/Quick";
import Notification from "../../components/Notification/Notification";
import DashboardOverview from "../../components/DashboardOverview/DashboardOverview";

const HomeDatacluster = ({ user }) => {
    return (
        <div className="mx-0 mb-[90px]">
            <div className="flex">
                <SideNav />
                <div className="md:ml-[120px] w-full">
                    <div className="px-6 mt-6">
                        <DashboardOverview />
                    </div>
                </div>
            </div>
            <div className="flex gap-20 ml-[130px]">
                <HomeBar />
                <div className="h-[360px] w-[600px] rounded-xl">
                    <TopEmployeeAndBranch />
                </div>
            </div>
            <div className="flex ml-[130px] gap-10 justify-between">
                <Quick />
                <Notification />
            </div>
        </div>
    );
};

export default HomeDatacluster;
