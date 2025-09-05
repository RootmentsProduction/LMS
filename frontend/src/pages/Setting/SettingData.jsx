import { useState } from "react";
import Header from "../../components/Header/Header";
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
            <div>
                <Header name={"Settings"} />
            </div>
            <SideNav />

            <div className="md:ml-[100px] mt-[100px]">
                <div className="flex">
                    {/* Sidebar */}
                    <div className="w-64 bg-white shadow p-4 text-black fixed h-full md:left-28">
                        <h2 className="text-xl font-bold mb-6">Settings</h2>
                        <ul className="space-y-4">

                            <li>
                                <button
                                    className={`text-gray-600 hover:text-black ${activeTab === "permission" ? "text-green-600 font-medium" : ""}`}
                                    onClick={() => setActiveTab("permission")}
                                >
                                    Permission
                                </button>
                            </li>
                            {/* <li>
                                <button
                                    className={`text-gray-600 hover:text-black ${activeTab === "notification" ? "text-green-600 font-medium" : ""}`}
                                    onClick={() => setActiveTab("notification")}
                                >
                                    Notification Settings
                                </button>
                            </li> */}
                            <li className="pl-4">
                                <button
                                    className={`text-gray-600 hover:text-black ${activeTab === "createNotification" ? "text-green-600 font-medium" : ""}`}
                                    onClick={() => setActiveTab("createNotification")}
                                >
                                    + Create Notification
                                </button>
                            </li>
                            <li className="pl-4">
                                <button
                                    className={`text-gray-600 hover:text-black ${activeTab === "createUser" ? "text-green-600 font-medium" : ""}`}
                                    onClick={() => setActiveTab("createUser")}
                                >
                                    + Create User
                                </button>

                            </li>



                            <li className="pl-4">
                                <button
                                    className={`text-gray-600 hover:text-black ${activeTab === "subrole" ? "text-green-600 font-medium" : ""}`}
                                    onClick={() => setActiveTab("subrole")}
                                >
                                    + Add subrole
                                </button>

                            </li>

                            <li className="pl-4">
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
                    <div className="flex-1 p-4 md:ml-[300px]">
                        {renderActiveComponent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingData;
