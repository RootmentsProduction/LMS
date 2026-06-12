import { useEffect, useMemo, useState } from "react";
import baseUrl from "../../../api/api";
import Select from "react-select";
import { useParams } from "react-router-dom";
import SideNav from "../../../components/SideNav/SideNav";
import ModileNav from "../../../components/SideNav/ModileNav";

const ReassignData = () => {
    const { id } = useParams();
    const [training, setTraining] = useState(null);
    const [assignedTo, setAssignedTo] = useState([]);
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedRole, setSelectedRole] = useState("");
    const [availableRoles, setAvailableRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [userError, setUserError] = useState("");
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchTrainingDetails = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/trainings/${id}`);
                if (!response.ok) throw new Error("Failed to fetch training details");
                const result = await response.json();
                setTraining(result);
            } catch (err) {
                setError(err?.message || "Failed to load training");
            }
        };

        const fetchUsers = async () => {
            try {
                const params = new URLSearchParams({
                    page: "1",
                    limit: "500",
                    search: "",
                    store: "All",
                    role: "All",
                });

                const response = await fetch(
                    `${baseUrl.baseUrl}api/employee/app-users?${params}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) throw new Error(`Error: ${response.statusText}`);

                const data = await response.json();
                const employees = Array.isArray(data?.data) ? data.data : [];
                const options = employees.map((employee) => ({
                    value: employee.empID || employee.emp_code || "",
                    label: `EmpId: ${employee.empID || employee.emp_code || "N/A"} | Name: ${employee.username || employee.name || "N/A"} | Role: ${employee.designation || employee.role_name || "N/A"}`,
                    role: employee.designation || employee.role_name || "",
                    empID: employee.empID || employee.emp_code || "",
                    username: employee.username || employee.name || "",
                    branch: employee.workingBranch || employee.store_name || "",
                    email: employee.email || "",
                })).filter((employee) => employee.value);

                setAllUsers(options);
                setUsers(options);
                setAvailableRoles([...new Set(employees.map((emp) => emp.designation || emp.role_name).filter(Boolean))]);
            } catch (err) {
                setUserError(err?.message || "Failed to load users");
            }
        };

        Promise.all([fetchTrainingDetails(), fetchUsers()]).finally(() => setLoading(false));
    }, [id]);

    const modules = training?.data?.modules || [];
    const trainingMeta = useMemo(() => {
        return [
            { label: "Modules", value: training?.data?.numberOfModules ?? 0 },
            { label: "Users", value: training?.users?.length ?? 0 },
            { label: "Type", value: training?.data?.Trainingtype || "-" },
        ];
    }, [training]);

    const handleRoleFilter = (role) => {
        setSelectedRole(role);
        setUsers(role ? allUsers.filter((user) => user.role === role) : allUsers);
        setAssignedTo([]);
    };

    const handleSelectAllByRole = () => {
        setAssignedTo(allUsers.filter((user) => user.role === selectedRole));
    };

    const HandleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const request = await fetch(`${baseUrl.baseUrl}api/user/reassign/training`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignedTo: assignedTo.map((user) => user.value),
                    trainingId: id,
                }),
            });
            const response = await request.json();
            alert(response.message);
            window.location.reload();
        } catch (err) {
            setError(err?.message || "Failed to reassign training");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <SideNav />
                <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-8">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                        Loading training details...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black">
            <div className="md:hidden sm:block">
                <ModileNav />
            </div>

            <div className="hidden md:block">
                <SideNav />
            </div>

            <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
                {error ? (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}
                {userError ? (
                    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        {userError}
                    </div>
                ) : null}

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-950">
                            {training?.data?.trainingName || "Training"}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">Reassign this training to more employees.</p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap gap-3">
                            {trainingMeta.map((item) => (
                                <div key={item.label} className="rounded-xl bg-slate-50 px-4 py-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        {item.label}
                                    </p>
                                    <p className="mt-1 text-xl font-semibold text-slate-950">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Modules
                            </h2>

                            <div className="mt-4 space-y-3">
                                {modules.length > 0 ? (
                                    modules.map((module) => (
                                        <div
                                            key={module._id}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-slate-950">{module.moduleName}</p>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {module.videos.length} videos
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm text-slate-500">
                                                    {module.videos.map((video) => (
                                                        <p key={video._id} title={video.title} className="max-w-[220px] truncate">
                                                            {video.title}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                                        No modules found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={HandleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-950">Assign users</h2>
                        <p className="mt-1 text-sm text-slate-500">Filter by role, then choose employees to reassign.</p>

                        <div className="mt-5">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Filter by Role</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => handleRoleFilter(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#016E5B]"
                            >
                                <option value="">All Roles</option>
                                {availableRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedRole ? (
                            <button
                                type="button"
                                onClick={handleSelectAllByRole}
                                className="mt-4 inline-flex rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                            >
                                Select all {selectedRole}
                            </button>
                        ) : null}

                        <div className="mt-5">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Select Users</label>
                            <Select
                                placeholder="Select or search users"
                                options={users}
                                isMulti
                                value={assignedTo}
                                onChange={setAssignedTo}
                                className="w-full"
                                isSearchable
                                maxMenuHeight={220}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        minHeight: "48px",
                                        borderRadius: "12px",
                                        borderColor: "#d1d5db",
                                        boxShadow: "none",
                                    }),
                                }}
                            />
                        </div>

                        {assignedTo.length > 0 ? (
                            <p className="mt-3 text-sm text-slate-500">
                                Selected: {assignedTo.length} user{assignedTo.length !== 1 ? "s" : ""}
                            </p>
                        ) : null}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#016E5B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#014C3F] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? "Reassigning..." : `Reassign Training (${assignedTo.length} users)`}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReassignData;
