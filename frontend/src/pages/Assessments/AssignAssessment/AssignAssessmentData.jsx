import { Link } from "react-router-dom";
import Header from "../../../components/Header/Header";
import Select from "react-select";
import { FaPlus } from "react-icons/fa";
import { useEffect, useState } from "react";
import baseUrl from "../../../api/api";
import SideNav from "../../../components/SideNav/SideNav";
import { toast } from "react-toastify";

const AssignAssessmentData = () => {
    const [modules, setModules] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedModules, setSelectedModules] = useState([]);
    const [assignedTo, setAssignedTo] = useState([]); // Fixed missing state
    const [days, setDays] = useState(""); // Track input days
    const [selectedOption, setSelectedOption] = useState("user");
    const [Reassign, setReassign] = useState(true);
    const token = localStorage.getItem('token');

    const checkfuntion = async () => {
        const Assessment = {
            assignedTo: assignedTo.map((item) => item.value), // Map assignedTo values
            assessmentId: selectedModules.map((item) => item.value), // Map assessment values
            selectedOption, // Ensure this is defined
            days,
            Reassign // Ensure this is defined
        };

        console.log("Request Payload:", Assessment); // Debugging

        try {
            // Make sure `baseUrl.baseUrl` has the correct structure and trailing slash
            const url = `${baseUrl.baseUrl}api/user/post/createAssessment`;

            const RequestData = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(Assessment),
            });

            // Check if the response is okay (status 200-299)
            if (!RequestData.ok) {
                throw new Error(`HTTP error! status: ${RequestData.status}`);
            }

            const response = await RequestData.json(); // Parse JSON response
            console.log("API Response:", response.message);
            if (response.message === 'already Assigned') {
                toast.error(response.message) // Log response message

            } else {
                toast.success(response.message) // Log response message

            }
        } catch (error) {
            console.error("Error in checkfuntion:", error);
            toast.error("Error in Assign Assessment")// Log the error
        }
    };

    // Fetch modules (called once)
    useEffect(() => {
        const fetchModules = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/user/get/AllAssessment`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (!response.ok) throw new Error(`Error: ${response.statusText}`);
                const data = await response.json();
                console.log(data);


                const options = data?.data.map((module) => ({
                    value: module.assessmentId
                    ,
                    label: module.assessmentName
                    ,
                }));
                setModules(options);
            } catch (error) {
                console.error("Failed to fetch modules:", error.message);
            }
        };
        fetchModules();
    }, []); // Runs only once

    // Fetch users based on selected option
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                let options = [];

                if (selectedOption === "user") {
                    // Get internal users
                    const response = await fetch(`${baseUrl.baseUrl}api/usercreate/getAllUser`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Authorization': `Bearer ${token}`,
                        },
                        credentials: "include",
                    });

                    if (response.ok) {
                        const data = await response.json();
                        options = data.data.map((item) => ({
                            value: item._id,
                            label: item.username,
                        }));
                    }
                } else if (selectedOption === "branch") {
                    // Get branches
                    const response = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Authorization': `Bearer ${token}`,
                        },
                        credentials: "include",
                    });

                    if (response.ok) {
                        const data = await response.json();
                        options = data.data.map((item) => ({
                            value: item.locCode,
                            label: item.workingBranch,
                        }));
                    }
                } else if (selectedOption === "designation") {
                    // Get designations from external API
                    const response = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const uniqueDesignations = [...new Set(
                            (data?.data || [])
                                .map(emp => emp.role_name)
                                .filter(Boolean)
                        )].sort();

                        options = uniqueDesignations.map((designation) => ({
                            value: designation,
                            label: designation,
                        }));
                    }
                }

                setUsers(options);
            } catch (error) {
                console.error("Failed to fetch users:", error.message);
                setUsers([]);
            }
        };
        fetchUsers();
    }, [selectedOption, token]);

    return (
        <div className="w-full h-full bg-white text-[#016E5B]">
            <Header name="Assign Assessments" />
            <SideNav />
            <div className="md:ml-[100px] mt-[150px]">

                <div className="mt-20 mx-20">
                    <div className="w-full flex  gap-10 md:flex-row flex-col">
                        {/* Assessments Dropdown */}
                        <div className="flex flex-col w-full">
                            <label htmlFor="assessments" className="block text-gray-700 font-medium mb-2">
                                Assessments
                            </label>
                            <Select
                                placeholder="Select Assessments"
                                id="assessments"
                                options={modules}
                                isMulti
                                value={selectedModules}
                                onChange={setSelectedModules}
                                className="w-full"
                            />

                            <div className="flex w-56 border-2 justify-evenly items-center py-2 cursor-pointer mt-4">
                                <Link to={"/create/Assessment"} className="flex justify-evenly items-center  cursor-pointer  ">
                                    <FaPlus className="text-[#016E5B]" />
                                    <h4 className="text-black">Create New Assessment</h4>
                                </Link>
                            </div>

                        </div>

                        {/* Assign To Dropdown */}
                        <div className="flex flex-col w-full gap-6">
                            <div className="flex flex-col gap-4">
                                <label htmlFor="assignToType" className="block text-gray-700 font-medium">
                                    Assign To
                                </label>
                                <div className="flex gap-5">
                                    <label>
                                        <input
                                            type="radio"
                                            value="user"
                                            checked={selectedOption === "user"}
                                            onChange={() => setSelectedOption("user")}
                                        />{" "}
                                        User
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            value="designation"
                                            checked={selectedOption === "designation"}
                                            onChange={() => setSelectedOption("designation")}
                                        />{" "}
                                        Designation
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            value="branch"
                                            checked={selectedOption === "branch"}
                                            onChange={() => setSelectedOption("branch")}
                                        />{" "}
                                        Branch
                                    </label>
                                </div>
                                <Select
                                    placeholder="Select the users"
                                    id="assignToUsers"
                                    options={users}
                                    isMulti
                                    value={assignedTo}
                                    onChange={setAssignedTo}
                                    className="w-full"
                                />
                            </div>

                            {/* Days Input */}
                            <div className="flex flex-col w-full">
                                <label htmlFor="days" className="block text-gray-700 font-medium mb-2">
                                    How many days to complete this Assessment
                                </label>
                                <input
                                    type="number"
                                    id="days"
                                    value={days}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setDays(value);
                                    }}
                                    min="1"
                                    className="w-full bg-white border-gray-500 border py-1 px-2"
                                    placeholder="Enter the number of days"
                                />
                            </div>
                            <div className="flex justify-end mt-10 gap-5">
                                <div className="form-control">
                                    <label className="label cursor-pointer flex gap-5">
                                        <span className="label-text text-[#016E5B]">Reassign user</span>
                                        <input type="checkbox" onClick={() => setReassign((prev) => !prev)} defaultChecked className="checkbox checkbox-success border  border-black" />
                                    </label>
                                </div>
                                <button
                                    className="bg-[#016E5B] text-white py-2 px-6 rounded hover:bg-[#014d43] transition duration-300"
                                    onClick={checkfuntion} // Replace with your desired functionality
                                >
                                    Assign Assessment
                                </button>

                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignAssessmentData;
