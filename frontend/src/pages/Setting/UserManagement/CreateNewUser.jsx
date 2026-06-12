import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Select from "react-select";
import { toast } from "react-toastify";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import baseUrl from "../../../api/api";
import SideNav from "../../../components/SideNav/SideNav";
import ModileNav from "../../../components/SideNav/ModileNav";

const CreateNewUser = () => {
    const navigate = useNavigate();
    const user = useSelector((s) => s.auth.user);
    const [branches, setBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const token = localStorage.getItem("token");

    const [form, setForm] = useState({
        userName: "",
        email: "",
        phoneNumber: "+91 ",
        password: "",
        userRole: "",
    });

    useEffect(() => {
        if (user?.role === "cluster_admin") {
            setForm((prev) => ({ ...prev, userRole: "store_admin" }));
        }
    }, [user]);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setBranches(
                        data.data.map((item) => ({
                            value: item._id,
                            label: item.workingBranch,
                        }))
                    );
                }
            } catch (error) {
                console.error("Error fetching branches:", error);
            }
        };

        const fetchEmployees = async () => {
            try {
                // Fetch accessible employees for this admin from the Employee model
                const response = await fetch(`${baseUrl.baseUrl}api/admin/accessible-employees`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setEmployees(data.employees || []);
                }
            } catch (error) {
                console.error("Error fetching employees:", error);
            }
        };

        fetchBranches();
        fetchEmployees();
    }, [token]);

    const handleSelectEmployee = (option) => {
        if (!option) {
            setSelectedEmployee(null);
            setForm({
                userName: "",
                email: "",
                phoneNumber: "+91 ",
                password: "",
                userRole: user?.role === 'cluster_admin' ? 'store_admin' : "",
            });
            setSelectedBranches([]);
            return;
        }

        // Find by employeeId/EmpId
        const emp = employees.find(e => (e.employeeId || e.EmpId || e.empID) === option.value);
        if (emp) {
            setSelectedEmployee(emp);
            const name = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "";
            setForm({
                userName: name,
                email: emp.email || "",
                phoneNumber: emp.phoneNumber
                    ? emp.phoneNumber.startsWith("+91 ")
                        ? emp.phoneNumber
                        : `+91 ${emp.phoneNumber}`
                    : "+91 ",
                password: "",
                userRole: user?.role === 'cluster_admin' ? 'store_admin' : "",
            });
            // Pre-fill branches if already assigned
            let mappedBranches = [];
            if (emp.branches) {
                mappedBranches = (emp.branches || []).map(b => ({
                    value: b._id,
                    label: b.workingBranch,
                }));
            } else if (emp.storeId) {
                const matchedBranch = branches.find(b => b.value === emp.storeId || b.value === emp.storeId?._id);
                if (matchedBranch) {
                    mappedBranches = [matchedBranch];
                }
            }
            setSelectedBranches(mappedBranches);
        }
    };

    // Custom filter: search by name OR emp ID
    const employeeFilterOption = (option, inputValue) => {
        if (!inputValue) return true;
        const q = inputValue.toLowerCase();
        return (
            option.label.toLowerCase().includes(q) ||
            (option.data.empId || "").toLowerCase().includes(q)
        );
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "phoneNumber") {
            // Keep the "+91 " prefix intact
            if (!value.startsWith("+91 ")) {
                setForm((prev) => ({ ...prev, phoneNumber: "+91 " }));
                return;
            }
        }
        setForm((prev) => {
            const nextForm = { ...prev, [name]: value };
            if (name === "userRole") {
                if (value === "super_admin" || value === "admin" || value === "hr_admin") {
                    setSelectedBranches([]);
                } else if (value === "employee") {
                    setSelectedBranches((prevBranches) => prevBranches.slice(0, 1));
                }
            }
            return nextForm;
        });
    };

    const handleSelectBranches = (selectedOptions) => {
        if (form.userRole === "employee") {
            setSelectedBranches(selectedOptions ? [selectedOptions] : []);
        } else {
            setSelectedBranches(selectedOptions || []);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.userName || !form.email || !form.password || !form.userRole) {
            toast.warning("Please fill in all required fields.");
            return;
        }

        // Validate role selection
        if (!["super_admin", "admin", "hr_admin", "cluster_admin", "store_admin", "employee"].includes(form.userRole)) {
            toast.warning("Please select a valid user role.");
            return;
        }

        // Validate branch assignment for non-super/non-hr admins
        if (form.userRole !== "super_admin" && form.userRole !== "admin" && form.userRole !== "hr_admin" && selectedBranches.length === 0) {
            toast.warning("Please select at least one store.");
            return;
        }

        const payload = {
            userName: form.userName,
            email: form.email,
            phoneNumber: form.phoneNumber,
            password: form.password,
            userRole: form.userRole,
            Branch: selectedBranches.map((b) => b.value),
            userId: selectedEmployee ? selectedEmployee.EmpId : "", // Pass EmpId to prevent generating a new one
        };

        try {
            const response = await fetch(`${baseUrl.baseUrl}api/admin/admin/createadmin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to create user");
            }

            toast.success("User created successfully!");
            navigate("/settings/users");
        } catch (error) {
            toast.error(error.message || "An error occurred while creating user.");
        }
    };

    // react-select custom styles to match Screenshot 1 and project guidelines
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            borderRadius: "12px",
            borderColor: state.isFocused ? "#000" : "#e5e7eb",
            boxShadow: state.isFocused ? "0 0 0 1px #000" : "none",
            minHeight: "45px",
            fontSize: "14px",
            backgroundColor: "#fff",
            "&:hover": {
                borderColor: "#000",
            },
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: "2px 12px",
        }),
        placeholder: (provided) => ({
            ...provided,
            color: "#9ca3af",
        }),
    };

    return (
        <div className="flex w-full min-h-screen bg-gray-50 overflow-x-hidden">
            {/* Sidebar */}
            <div className="hidden md:block z-50">
                <SideNav />
            </div>
            <ModileNav />

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 ml-0 md:ml-[110px] p-4 md:p-6 pb-24 md:pb-6 flex flex-col">
                {/* Back button */}
                <div className="mb-4">
                    <Link
                        to="/settings/users"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:shadow text-gray-700 transition-all"
                    >
                        <FaArrowLeft size={16} />
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-gray-100 max-w-6xl w-full mx-auto">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-8">Create New User</h1>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Select Existing Employee (Optional) */}
                        <div className="max-w-xl">
                            <label className="block text-[13px] font-medium text-gray-700 mb-2">
                                Select Employee (Optional)
                            </label>
                            <Select
                                placeholder="Search by name or Emp ID…"
                                options={employees.map(emp => {
                                    const empId = emp.employeeId || emp.EmpId || emp.empID || "";
                                    const name = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
                                    return {
                                        value: empId,
                                        label: `${name} (${empId}) — ${emp.email || "No Email"}`,
                                        empId: empId,
                                    };
                                })}
                                filterOption={employeeFilterOption}
                                isClearable
                                onChange={handleSelectEmployee}
                                styles={customSelectStyles}
                                noOptionsMessage={() => "No employees found"}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Selecting an employee will auto-fill their name, email, and phone number.
                            </p>
                        </div>

                        {/* Row 1: Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* User Name */}
                            <div>
                                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                                    User Name<span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="userName"
                                    value={form.userName}
                                    onChange={handleInputChange}
                                    placeholder="Enter User Name"
                                    disabled={!!selectedEmployee}
                                    className={`w-full h-[45px] px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all placeholder-gray-400 ${
                                        selectedEmployee ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white text-gray-900"
                                    }`}
                                />
                            </div>

                            {/* Email Adress (preserving exact spelling from screenshot) */}
                            <div>
                                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                                    Email Adress<span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter your email address"
                                    disabled={!!selectedEmployee}
                                    className={`w-full h-[45px] px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all placeholder-gray-400 ${
                                        selectedEmployee ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white text-gray-900"
                                    }`}
                                />
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                                    Phone Number<span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="phoneNumber"
                                    value={form.phoneNumber}
                                    onChange={handleInputChange}
                                    disabled={!!selectedEmployee}
                                    className={`w-full h-[45px] px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all font-medium ${
                                        selectedEmployee ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white text-gray-900"
                                    }`}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                                    Create Password<span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={form.password}
                                        onChange={handleInputChange}
                                        placeholder="Enter New Password"
                                        className="w-full h-[45px] px-4 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all bg-white text-gray-900 placeholder-gray-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                                        tabIndex={-1}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Selects */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                            {/* User Role */}
                            <div>
                                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                                    User Role<span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="userRole"
                                    value={form.userRole}
                                    onChange={handleInputChange}
                                    className="w-full h-[45px] px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all bg-white text-gray-900"
                                >
                                    {user?.role === 'cluster_admin' ? (
                                        <option value="store_admin">Store Admin</option>
                                    ) : (
                                        <>
                                            <option value="" disabled>Select User Roles</option>
                                            <option value="super_admin">Super Admin</option>
                                            <option value="admin">Admin</option>
                                            <option value="hr_admin">HR Admin</option>
                                            <option value="cluster_admin">Cluster Admin</option>
                                            <option value="store_admin">Store Admin</option>
                                            <option value="employee">Employee</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Stores */}
                            <div>
                                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                                    Stores<span className="text-red-500">*</span>
                                </label>
                                <Select
                                    placeholder={form.userRole === "employee" ? "Select Store user can access" : "Select Stores user can access"}
                                    options={branches}
                                    isMulti={form.userRole !== "employee"}
                                    value={form.userRole === "employee" ? (selectedBranches[0] || null) : selectedBranches}
                                    onChange={handleSelectBranches}
                                    styles={customSelectStyles}
                                    isDisabled={form.userRole === "super_admin" || form.userRole === "admin" || form.userRole === "hr_admin"}
                                />
                                {(form.userRole === "super_admin" || form.userRole === "admin" || form.userRole === "hr_admin") && (
                                    <span className="text-xs text-gray-400 mt-1 block">Full Access Admin has access to all stores.</span>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                className="px-6 py-3 bg-[#111] hover:bg-black text-white font-medium text-sm rounded-xl transition-all shadow-sm"
                            >
                                Create & Save User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateNewUser;
