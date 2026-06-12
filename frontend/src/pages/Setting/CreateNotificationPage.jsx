import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import CreateCustomNotification from "./CreateNotification";

const CreateNotificationPage = () => {
    return (
        <div className="flex w-full min-h-screen bg-gray-50 overflow-x-hidden">
            {/* Sidebar */}
            <div className="hidden md:block z-50">
                <SideNav />
            </div>
            <ModileNav />

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 ml-0 md:ml-[110px] p-4 md:p-6 pb-24 md:pb-6 flex flex-col">
                <CreateCustomNotification />
            </div>
        </div>
    );
};

export default CreateNotificationPage;
