// import SideNav from "../../../components/SideNav/SideNav";
import { useState } from "react";
import Mandatorytrainingdata from "./Mandatorytrainingdata";
import MandatoryTrainingList from "./MandatoryTrainingList";
import ModileNav from "../../../components/SideNav/ModileNav";

const Mandatorytraining = () => {
    const [activeTab, setActiveTab] = useState("create"); // "create" or "list"

    return (
        <>
            <div style={styles.container}>
                {/* <div style={styles.left} className=" hidden lg:block z-50">
                    <SideNav />
                </div> */}
                <div className="md:hidden sm:block">
                    <ModileNav />
                </div>

                <div style={styles.middle} className="">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setActiveTab("create")}
                            className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                                activeTab === "create"
                                    ? "bg-[#016E5B] text-white border-b-2 border-[#016E5B]"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            Create Training
                        </button>
                        <button
                            onClick={() => setActiveTab("list")}
                            className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                                activeTab === "list"
                                    ? "bg-[#016E5B] text-white border-b-2 border-[#016E5B]"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            Training List
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === "create" ? (
                        <Mandatorytrainingdata />
                    ) : (
                        <MandatoryTrainingList />
                    )}
                </div>
            </div>
        </>
    );
};

const styles = {
    container: {
        display: "flex",
        width: "100%",
        minHeight: "100vh",
    },
    left: {
        // Adjust size
    },
    middle: {
        flex: 1,
        width: 100
    }
};

export default Mandatorytraining;