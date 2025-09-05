import { useEffect, useState } from "react";
import Select from "react-select"; // Import react-select
import Header from "../../../components/Header/Header";
import baseUrl from "../../../api/api";
import { toast } from "react-toastify";
import SideNav from "../../../components/SideNav/SideNav";

const CreateTrainingDatas = () => {
    const [modules, setModules] = useState([]); // Module options
    const [users, setUsers] = useState([]);     // Users options
    const [trainingName, setTrainingName] = useState("");
    const [assignedTo, setAssignedTo] = useState([]); // Multi-select values
    const [selectedModules, setSelectedModules] = useState([]); // Multi-select values
    const [days, setDays] = useState("");
    const [selectedOption, setSelectedOption] = useState("user"); // Radio button state
    const token = localStorage.getItem('token');
    // Fetch Modules
    useEffect(() => {
        const fetchModules = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/modules`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                console.log(data);

                // Map modules to options required by react-select
                const options = data.map((module) => ({
                    value: module.moduleId,
                    label: module.moduleName,
                }));

                setModules(options);
            } catch (error) {
                console.error("Failed to fetch modules:", error.message);
            }
        };

        const fetchUsers = async () => {
            try {
                // Always fetch from external employee API
                const response = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('External employee data:', data);
                console.log('Selected option:', selectedOption);

                const employeeData = data?.data || [];

                // Map users to options based on selected option
                if (selectedOption === 'branch') {
                    // Get unique branches from employee data
                    const uniqueBranches = [...new Set(employeeData.map(emp => emp.store_name).filter(Boolean))];
                    const options = uniqueBranches.map((branch) => ({
                        value: branch,
                        label: branch,
                    }));
                    setUsers(options);
                }
                else if (selectedOption === 'user') {
                    // Get individual users from employee data
                    const options = employeeData.map((employee) => ({
                        value: employee.emp_code,
                        label: `EmpId: ${employee.emp_code || 'N/A'} | Name: ${employee.name || 'N/A'} | Role: ${employee.role_name || 'N/A'}`,
                    }));
                    setUsers(options);
                }
                else if (selectedOption === 'designation') {
                    // Get unique designations/roles from employee data
                    const uniqueRoles = [...new Set(employeeData.map(emp => emp.role_name).filter(Boolean))];
                    const options = uniqueRoles.map((role) => ({
                        value: role,
                        label: role,
                    }));
                    setUsers(options);
                }
            } catch (error) {
                console.error("Failed to fetch users:", error.message);
            }
        };

        fetchModules();
        fetchUsers();
    }, [selectedOption, token]);

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form data before submission
        if (!trainingName.trim()) {
            toast.error("Training name is required");
            return;
        }
        if (selectedModules.length === 0) {
            toast.error("Please select at least one module");
            return;
        }
        if (!days || days <= 0) {
            toast.error("Please enter a valid number of days");
            return;
        }
        if (assignedTo.length === 0) {
            toast.error("Please select at least one user/role/branch to assign the training to");
            return;
        }

        const trainingData = {
            trainingName,
            workingBranch: assignedTo.map((item) => item.value), // Extract values
            modules: selectedModules.map((item) => item.value), // Extract values
            days,
            selectedOption
        };

        try {
            console.log("=== TRAINING CREATION DEBUG ===");
            console.log("Training Data being sent:", trainingData);
            console.log("AssignedTo array:", assignedTo);
            console.log("WorkingBranch values:", trainingData.workingBranch);
            console.log("Modules selected:", trainingData.modules);
            toast("Form Submitted Successfully!");
            // POST request (uncomment to use)
            const response = await fetch(`${baseUrl.baseUrl}api/trainings`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(trainingData),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error("Server error:", data);
                toast.error(data.message || "Failed to create training");
                return;
            }
            
            console.log("Training created successfully:", data);
            toast.success(data.message || "Training created successfully!");
            
            // Clear form after successful creation
            setTrainingName("");
            setSelectedModules([]);
            setAssignedTo([]);
            setDays("");
        } catch (error) {
            console.error("Failed to submit training:", error.message);
            toast.error("Error submitting training.");
        }
    };

    return (
        <div>
            <div className="w-full h-full bg-white">
                <Header name="Assign new Training" />
            </div>
            <SideNav />

            <div className=" md:ml-[100px] mt-[150px]">
                <form onSubmit={handleSubmit} className="text-black w-[800px] mt-10">
                    {/* Training Name */}
                    <div className="flex flex-col gap-5 mx-20 mt-5">
                        <div className="flex flex-col gap-5">
                            <p>Training Name</p>
                            <input
                                type="text"
                                placeholder="Training title"
                                className="bg-white border p-1 w-full rounded-lg border-black"
                                value={trainingName}
                                onChange={(e) => setTrainingName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Days */}
                    <div className="flex flex-col gap-5 mx-20 mt-5">
                        <div className="flex flex-col gap-5">
                            <p>Days</p>
                            <input
                                type="text"
                                placeholder="Number of days"
                                className="bg-white w-full border p-1 rounded-lg border-black"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Modules Dropdown */}
                    <div className="flex flex-col gap-5 mx-20 mt-5">
                        <p>Modules</p>
                        <Select
                            options={modules}
                            isMulti
                            value={selectedModules}
                            onChange={setSelectedModules}
                            className="w-full"
                        />
                    </div>

                    {/* Assign To Dropdown */}
                    <div className="flex flex-col gap-1 mx-20 mt-5">
                        <p>Assign To</p>
                        <div className="flex flex-col gap-5 mx-20 mt-5">
                            <div className="flex gap-5">
                                <label>
                                    <input
                                        type="radio"
                                        value="user"
                                        checked={selectedOption === "user"}
                                        onChange={() => setSelectedOption("user")}
                                    /> User
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        value="designation"
                                        checked={selectedOption === "designation"}
                                        onChange={() => setSelectedOption("designation")}
                                    /> Designation
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        value="branch"
                                        checked={selectedOption === "branch"}
                                        onChange={() => setSelectedOption("branch")}
                                    /> Branch
                                </label>
                            </div>
                        </div>
                        <Select
                            options={users}
                            isMulti
                            value={assignedTo}
                            onChange={setAssignedTo} // Updates state
                            className="w-full "
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="mt-10 mx-20">
                        <button
                            type="submit"
                            className="border border-black p-2 px-6 rounded-lg bg-[#016E5B] hover:bg-[#017E5B] text-white"
                        >
                            Assign Training
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTrainingDatas;
