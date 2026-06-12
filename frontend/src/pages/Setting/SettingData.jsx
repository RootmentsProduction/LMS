import { useState } from "react";
import SideNav from "../../components/SideNav/SideNav";
import PermissionSettings from "./PermissionSettings";
// import Visibility from "./Visibility";
// import NotificationSettings from "./Notificaton";
import CreateCustomNotification from "./CreateNotification";
import CreateUser from "./CreateAdmin";
import SubroleCreation from "./SubroleCreation";
import Escalation from "./Escalation";

const SettingData = () => {
    // State to manage active menu
    const [activeTab, setActiveTab] = useState("permission");

    // Function to render the active component
    const renderActiveComponent = () => {
        switch (activeTab) {
            // case "visibility":
            //     return <Visibility />;
            case "permission":
                return <PermissionSettings />;
            // case "notification":
            //     return <NotificationSettings />;
            case "createNotification":
                return <CreateCustomNotification />;
            case "createUser":
                return <CreateUser />;
            case "subrole":
                return <SubroleCreation />
            case "Escalation":
                return <Escalation />
            default:
                return null;
        }
    };

  return (
    <div className="w-full h-full bg-white">
      <SideNav />

      <div className="ml-0 md:ml-[120px] min-w-0">
        <div className="flex flex-col md:flex-row min-w-0">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-white shadow-sm md:shadow p-4 text-black relative md:fixed md:h-full md:left-28 overflow-x-auto md:overflow-x-visible scrollbar-none">
            <h2 className="text-xl font-extrabold mb-4 md:mb-6 hidden md:block">Settings</h2>
            <ul className="flex md:flex-col gap-4 md:gap-0 md:space-y-4 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none whitespace-nowrap">
              <li>
                <button
                  className={`text-gray-600 hover:text-black ${activeTab === "permission" ? "text-green-600 font-medium" : ""}`}
                  onClick={() => setActiveTab("permission")}
                >
                  Permission
                </button>
              </li>
              <li className="pl-0 md:pl-4">
                <button
                  className={`text-gray-600 hover:text-black ${activeTab === "createNotification" ? "text-green-600 font-medium" : ""}`}
                  onClick={() => setActiveTab("createNotification")}
                >
                  + Create Notification
                </button>
              </li>
              <li className="pl-0 md:pl-4">
                <button
                  className={`text-gray-600 hover:text-black ${activeTab === "createUser" ? "text-green-600 font-medium" : ""}`}
                  onClick={() => setActiveTab("createUser")}
                >
                  + Create User
                </button>
              </li>
              <li className="pl-0 md:pl-4">
                <button
                  className={`text-gray-600 hover:text-black ${activeTab === "subrole" ? "text-green-600 font-medium" : ""}`}
                  onClick={() => setActiveTab("subrole")}
                >
                  + Add subrole
                </button>
              </li>
              <li className="pl-0 md:pl-4">
                <button
                  className={`text-gray-600 hover:text-black ${activeTab === "Escalation" ? "text-green-600 font-medium" : ""}`}
                  onClick={() => setActiveTab("Escalation")}
                >
                  + Escalation
                </button>
              </li>
              <li>
                <a
                  href="/admin/login-analytics"
                  className="text-gray-600 hover:text-black flex items-center"
                >
                  🔍 Login Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 p-4 md:ml-[300px] pb-24 md:pb-4">
            {renderActiveComponent()}
          </div>
        </div>
      </div>
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default SettingData;
