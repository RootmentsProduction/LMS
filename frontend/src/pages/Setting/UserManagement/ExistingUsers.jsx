import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Select from "react-select";
import { toast } from "react-toastify";
import { FaRegEye, FaPlus, FaSearch, FaChevronDown, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import baseUrl from "../../../api/api";
import SideNav from "../../../components/SideNav/SideNav";
import ModileNav from "../../../components/SideNav/ModileNav";

const ExistingUsers = () => {
    const user = useSelector((s) => s.auth.user);
    const [admins, setAdmins] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Modal states
    const [selectedUser, setSelectedUser] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Edit modal form states
    const [editSelectedBranches, setEditSelectedBranches] = useState([]);
    const [editRole, setEditRole] = useState("");

    const token = localStorage.getItem("token");

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${baseUrl.baseUrl}api/admin/admin/list`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setAdmins(data.data || []);
            } else {
                toast.error("Failed to load users list.");
            }
        } catch (error) {
            console.error("Error fetching admins:", error);
            toast.error("An error occurred while loading users.");
        } finally {
            setLoading(false);
        }
    };

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
                setBranches(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    useEffect(() => {
        fetchAdmins();
        fetchBranches();
    }, [token]);

    const formatRole = (role) => {
        switch (role) {
            case "super_admin":
                return "Super Admin";
            case "admin":
                return "Admin";
            case "hr_admin":
                return "HR Admin";
            case "cluster_admin":
                return "Cluster Admin";
            case "store_admin":
                return "Store Admin";
            case "employee":
                return "Employee";
            default:
                return role;
        }
    };

    // Filter and search
    const filteredAdmins = admins.filter((admin) => {
        if (user?.role === 'cluster_admin') {
            if (admin?.role !== 'store_admin' && admin?.role !== 'employee') return false;
        }

        const query = searchQuery.trim().toLowerCase();
        const cleanQuery = query.replace(/\s+/g, "");

        const name = String(admin?.name || "").toLowerCase();
        const email = String(admin?.email || "").toLowerCase();
        const empId = String(admin?.EmpId || "").toLowerCase();
        const roleStr = String(formatRole(admin?.role) || "").toLowerCase();

        const cleanEmpId = empId.replace(/\s+/g, "");

        const matchesSearch =
            !query ||
            name.includes(query) ||
            email.includes(query) ||
            empId.includes(query) ||
            cleanEmpId.includes(cleanQuery) ||
            roleStr.includes(query);

        const matchesRole = roleFilter === "All" || admin?.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    // Pagination calculations
    const limitValue = itemsPerPage === 'All' ? filteredAdmins.length : Number(itemsPerPage);
    const indexOfLastItem = currentPage * limitValue;
    const indexOfFirstItem = indexOfLastItem - limitValue;
    const currentAdmins = filteredAdmins.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredAdmins.length / limitValue) || 1;

    // Open View Modal
    const handleOpenViewModal = (user) => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
    };

    // Open Edit Modal from View Modal
    const handleOpenEditModal = () => {
        setIsViewModalOpen(false);
        // Initialise role from current user
        setEditRole(selectedUser.role || "employee");
        const userBranches = selectedUser.branches || [];
        const mappedBranches = userBranches.map((b) => {
            const branchId = b._id || b;
            const found = branches.find((branch) => branch._id === branchId || branch._id?.toString() === branchId?.toString());
            return {
                value: branchId,
                label: found?.workingBranch || b.workingBranch || "Store",
            };
        }).filter((b) => b.label && b.label !== "Store" || true);
        setEditSelectedBranches(mappedBranches);
        setIsEditModalOpen(true);
    };

    // Remove a branch pill in edit mode
    const handleRemoveBranchPill = (branchId) => {
        setEditSelectedBranches((prev) => prev.filter((b) => b.value !== branchId));
    };

    // All-stores helper options
    const ALL_STORES_VALUE = "__all_stores__";
    const allStoreOption = { value: ALL_STORES_VALUE, label: "✔ Select All Stores" };

    // Build react-select options for edit modal
    const branchSelectOptions = [
        allStoreOption,
        ...branches.map((branch) => ({
            value: branch._id,
            label: branch.workingBranch,
        })),
    ];

    // Handle multi-select change in edit modal
    const handleEditStoreChange = (selectedOptions) => {
        if (!selectedOptions || selectedOptions.length === 0) {
            setEditSelectedBranches([]);
            return;
        }
        // If "Select All Stores" is chosen, select every branch
        const hasAll = selectedOptions.some((o) => o.value === ALL_STORES_VALUE);
        if (hasAll) {
            setEditSelectedBranches(
                branches.map((branch) => ({
                    value: branch._id,
                    label: branch.workingBranch,
                }))
            );
        } else {
            setEditSelectedBranches(selectedOptions.filter((o) => o.value !== ALL_STORES_VALUE));
        }
    };

    // Save changes from Edit Modal
    const handleSaveChanges = async () => {
        try {
            const payload = {
                name: selectedUser.name,
                email: selectedUser.email,
                phoneNumber: selectedUser.phoneNumber,
                role: editRole,
                Branch: editSelectedBranches.map((b) => b.value),
            };

            const response = await fetch(`${baseUrl.baseUrl}api/admin/admin/update/${selectedUser._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to save changes");
            }

            toast.success("User updated successfully!");
            setIsEditModalOpen(false);
            fetchAdmins();
        } catch (error) {
            toast.error(error.message || "An error occurred while updating user.");
        }
    };

    // Delete User confirmation
    const handleDeleteUser = async () => {
        try {
            const response = await fetch(`${baseUrl.baseUrl}api/admin/admin/delete/${selectedUser._id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to delete user");
            }

            toast.success("User deleted successfully!");
            setIsDeleteModalOpen(false);
            setIsViewModalOpen(false);
            fetchAdmins();
        } catch (error) {
            toast.error(error.message || "An error occurred while deleting user.");
        }
    };

    // react-select custom styles for Edit Modal
    const editSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            borderRadius: "12px",
            borderColor: state.isFocused ? "#111" : "#e5e7eb",
            boxShadow: state.isFocused ? "0 0 0 2px rgba(17,17,17,0.15)" : "none",
            minHeight: "45px",
            fontSize: "14px",
            backgroundColor: "#fff",
            "&:hover": { borderColor: "#111" },
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: "4px 12px",
            flexWrap: "wrap",
            gap: "4px",
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: "#f3f4f6",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            fontSize: "12px",
            fontWeight: "600",
            color: "#374151",
            padding: "2px 4px",
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            borderRadius: "0 8px 8px 0",
            color: "#9ca3af",
            "&:hover": { backgroundColor: "#fee2e2", color: "#ef4444" },
        }),
        placeholder: (provided) => ({
            ...provided,
            color: "#9ca3af",
            fontSize: "13px",
        }),
        option: (provided, state) => ({
            ...provided,
            fontSize: "13px",
            backgroundColor: state.isSelected ? "#111" : state.isFocused ? "#f9fafb" : "#fff",
            color: state.isSelected ? "#fff" : "#111",
            cursor: "pointer",
            fontWeight: state.data?.value === ALL_STORES_VALUE ? "700" : "400",
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            overflow: "hidden",
        }),
        menuList: (provided) => ({
            ...provided,
            padding: "4px",
            maxHeight: "220px",
        }),
    };

    return (
        <div className="flex w-full min-h-screen bg-gray-50 overflow-x-hidden text-gray-800">
            {/* Sidebar */}
            <div className="hidden md:block z-50">
                <SideNav />
            </div>
            <ModileNav />

            {/* Main Page Area */}
            <div className="flex-1 min-w-0 ml-0 md:ml-[110px] p-4 md:p-6 pb-24 md:pb-6 flex flex-col min-h-screen">
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex-1 flex flex-col justify-between">
                    <div>
                        {/* Title & Add User Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-xl font-semibold text-gray-900">Existing Users & Roles</h1>
                            <Link
                                to="/settings/create-user"
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111] hover:bg-black text-white text-sm font-medium rounded-xl transition-all shadow-sm"
                            >
                                <FaPlus size={12} />
                                New User
                            </Link>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                            {/* Search bar */}
                            <div className="relative w-full sm:w-80">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search by name, id, role..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full h-11 pl-11 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all bg-white text-gray-900 placeholder-gray-400"
                                />
                            </div>

                            {/* Filter selection dropdown */}
                            {user?.role !== 'cluster_admin' && (
                                <div className="relative w-full sm:w-auto">
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => {
                                            setRoleFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="appearance-none h-11 pl-4 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all bg-white text-gray-900 font-medium cursor-pointer w-full sm:w-48"
                                    >
                                        <option value="All">Role : All</option>
                                        <option value="super_admin">Super Admin</option>
                                        <option value="admin">Admin</option>
                                        <option value="hr_admin">HR Admin</option>
                                        <option value="cluster_admin">Cluster Admin</option>
                                        <option value="store_admin">Store Admin</option>
                                        <option value="employee">Employee</option>
                                    </select>
                                    <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={10} />
                                </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] md:min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                        <th className="py-4 px-4 font-semibold">EMP ID</th>
                                        <th className="py-4 px-4 font-semibold">USER</th>
                                        <th className="py-4 px-4 font-semibold">EMAIL & PHONE</th>
                                        <th className="py-4 px-4 font-semibold">STORES</th>
                                        <th className="py-4 px-4 font-semibold text-right">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="py-10 text-center text-gray-400 text-sm">
                                                Loading users...
                                            </td>
                                        </tr>
                                    ) : currentAdmins.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-10 text-center text-gray-400 text-sm">
                                                No users found.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentAdmins.map((admin) => (
                                            <tr key={admin._id} className="hover:bg-gray-50/40 transition-all text-[13px] text-gray-700">
                                                {/* EMP ID */}
                                                <td className="py-4 px-4 font-medium text-gray-500 uppercase">{admin.EmpId}</td>

                                                {/* User Info stacked */}
                                                <td className="py-4 px-4">
                                                    <div className="font-semibold text-gray-900 uppercase">{admin.name}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5 uppercase">{formatRole(admin.role)}</div>
                                                </td>

                                                {/* Email, Phone & Password stacked */}
                                                <td className="py-4 px-4 leading-relaxed">
                                                    <div className="font-medium text-gray-800 uppercase">{admin.email}</div>
                                                    <div className="text-gray-500 uppercase">{admin.phoneNumber || "No Phone"}</div>
                                                    <div className="text-xs text-gray-400">password@123</div>
                                                </td>

                                                {/* Stores list */}
                                                <td className="py-4 px-4 max-w-xs truncate">
                                                    {admin.role === "super_admin" || admin.role === "admin" || admin.role === "hr_admin" ? (
                                                        <span className="text-gray-500 italic uppercase">All Stores</span>
                                                    ) : admin.branches && admin.branches.length > 0 ? (
                                                        <span className="uppercase">{admin.branches.map((b) => b.workingBranch).join(", ")}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic uppercase">No assigned stores</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-4 px-4 text-right">
                                                    <button
                                                        onClick={() => handleOpenViewModal(admin)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-black rounded-lg text-xs font-semibold text-gray-700 hover:text-black transition-all bg-white"
                                                    >
                                                        <FaRegEye size={13} />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination Footer */}
                    {!loading && filteredAdmins.length > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '24px',
                            paddingTop: '16px',
                            borderTop: '1px solid #f3f4f6',
                            fontSize: '13px',
                            color: '#6b7280'
                        }}>
                            <div>
                                Showing {itemsPerPage === 'All' ? filteredAdmins.length : Math.min(Number(itemsPerPage), Math.max(0, filteredAdmins.length - (currentPage - 1) * Number(itemsPerPage)))} of {filteredAdmins.length}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                    <span style={{ marginRight: '8px', color: '#6b7280' }}>Show:</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '5px 10px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            background: '#fff',
                                            fontSize: '13px',
                                            color: '#374151',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            outline: 'none',
                                            minWidth: '64px',
                                            justifyContent: 'space-between',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <span>{itemsPerPage}</span>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>
                                    {isDropdownOpen && (
                                        <>
                                            <div
                                                onClick={() => setIsDropdownOpen(false)}
                                                style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                                            />
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '100%',
                                                    right: 0,
                                                    marginBottom: '6px',
                                                    background: '#4b5563',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                                    padding: '4px',
                                                    zIndex: 999,
                                                    minWidth: '80px',
                                                    border: '1px solid rgba(255,255,255,0.08)'
                                                }}
                                            >
                                                {[50, 100, 200, 'All'].map((opt) => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => {
                                                            setItemsPerPage(opt);
                                                            setCurrentPage(1);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            width: '100%',
                                                            padding: '6px 12px 6px 8px',
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: '#fff',
                                                            fontSize: '13px',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            borderRadius: '6px',
                                                            fontWeight: itemsPerPage === opt ? '600' : '400',
                                                            fontFamily: 'inherit'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#2563eb';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span style={{ width: '16px', display: 'inline-flex', alignItems: 'center', marginRight: '4px', fontSize: '11px' }}>
                                                            {itemsPerPage === opt ? '✓' : ''}
                                                        </span>
                                                        <span>{opt}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                        disabled={currentPage === 1}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            background: '#fff',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            opacity: currentPage === 1 ? 0.4 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            color: '#374151'
                                        }}
                                        onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.background = '#f9fafb'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                    >
                                        <FaChevronLeft size={10} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            background: '#fff',
                                            cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                                            opacity: (currentPage === totalPages || totalPages === 0) ? 0.4 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            color: '#374151'
                                        }}
                                        onMouseEnter={e => { if (currentPage !== totalPages && totalPages !== 0) e.currentTarget.style.background = '#f9fafb'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                    >
                                        <FaChevronRight size={10} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── View User Modal (Screenshot 5) ────────────────────────────────── */}
            {isViewModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative animate-fadeIn">
                        {/* Top back button */}
                        <button
                            onClick={() => setIsViewModalOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black mb-6 transition-all"
                        >
                            <FaChevronLeft size={10} />
                            Back
                        </button>

                        {/* Title and Role Badge */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-950 uppercase">{selectedUser.name}</h2>
                            <span className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 uppercase">
                                {formatRole(selectedUser.role)}
                            </span>
                        </div>

                        {/* User Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-left py-2 border-b border-gray-100">
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Email
                                </span>
                                <span className="text-[13px] font-medium text-gray-800 break-all uppercase">{selectedUser.email}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Phone Number
                                </span>
                                <span className="text-[13px] font-medium text-gray-800 uppercase">{selectedUser.phoneNumber || "—"}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Password
                                </span>
                                <span className="text-[13px] font-medium text-gray-800">password@123</span>
                            </div>
                        </div>

                        {/* Assigned Stores */}
                        <div className="mb-8 text-left">
                            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Assigned Stores
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {selectedUser.role === "super_admin" || selectedUser.role === "admin" || selectedUser.role === "hr_admin" ? (
                                    <span className="text-sm font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 uppercase">
                                        All Stores
                                    </span>
                                ) : selectedUser.branches && selectedUser.branches.length > 0 ? (
                                    selectedUser.branches.map((b) => (
                                        <span
                                            key={b._id || b}
                                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-full shadow-sm uppercase"
                                        >
                                            {b.workingBranch || branches.find((branch) => branch._id === (b._id || b))?.workingBranch || "Store"}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-400 italic uppercase">No stores assigned.</span>
                                )}
                            </div>
                        </div>

                        {/* Bottom Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <button
                                onClick={handleOpenEditModal}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                            >
                                Edit User
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit User Modal (Screenshot 3) ────────────────────────────────── */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl relative animate-fadeIn text-left">
                        {/* Top back button */}
                        <button
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setIsViewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black mb-6 transition-all"
                        >
                            <FaChevronLeft size={10} />
                            Back
                        </button>

                        {/* Title and Role Badge */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-950 uppercase">{selectedUser.name}</h2>
                            <span className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 uppercase">
                                {formatRole(selectedUser.role)}
                            </span>
                        </div>

                        {/* Read-only User Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 py-2 border-b border-gray-100">
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Email
                                </span>
                                <span className="text-[13px] font-medium text-gray-800 break-all uppercase">{selectedUser.email}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Phone Number
                                </span>
                                <span className="text-[13px] font-medium text-gray-800 uppercase">{selectedUser.phoneNumber || "—"}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Password
                                </span>
                                <span className="text-[13px] font-medium text-gray-800">password@123</span>
                            </div>
                        </div>

                        {/* Role Change Dropdown */}
                        <div className="mb-5">
                            <label className="block text-[13px] font-medium text-gray-700 mb-2">
                                Role
                            </label>
                            <div className="relative">
                                <select
                                    value={editRole}
                                    onChange={(e) => {
                                        const nextRole = e.target.value;
                                        setEditRole(nextRole);
                                        // Clear stores when switching to full-access roles
                                        if (nextRole === "super_admin" || nextRole === "admin" || nextRole === "hr_admin") {
                                            setEditSelectedBranches([]);
                                        } else if (nextRole === "employee") {
                                            setEditSelectedBranches((prev) => prev.slice(0, 1));
                                        }
                                    }}
                                    className="w-full h-[45px] pl-4 pr-10 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-black transition-all bg-white text-gray-900 appearance-none cursor-pointer"
                                >
                                    {user?.role === 'cluster_admin' ? (
                                        <>
                                            <option value="store_admin">Store Admin</option>
                                            <option value="employee">Employee</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="super_admin">Super Admin</option>
                                            <option value="admin">Admin</option>
                                            <option value="hr_admin">HR Admin</option>
                                            <option value="cluster_admin">Cluster Admin</option>
                                            <option value="store_admin">Store Admin</option>
                                            <option value="employee">Employee</option>
                                        </>
                                    )}
                                </select>
                                <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={11} />
                            </div>
                            {editRole !== selectedUser.role && (
                                <p className="text-xs text-amber-600 mt-1.5 font-medium">
                                    ⚠ Role will change from <span className="font-bold">{formatRole(selectedUser.role)}</span> → <span className="font-bold">{formatRole(editRole)}</span>
                                </p>
                            )}
                        </div>

                        {/* Stores Assignment Multi-Select Dropdown */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[13px] font-medium text-gray-700">
                                    Stores<span className="text-red-500">*</span>
                                </label>
                            {editRole !== "super_admin" && editRole !== "admin" && editRole !== "hr_admin" && (
                                    <div className="flex gap-3 text-xs font-semibold">
                                        {editRole !== "employee" && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditSelectedBranches(
                                                            branches.map((b) => ({ value: b._id, label: b.workingBranch }))
                                                        )
                                                    }
                                                    className="text-black hover:underline"
                                                >
                                                    Select All
                                                </button>
                                                <span className="text-gray-300">|</span>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setEditSelectedBranches([])}
                                            className="text-gray-500 hover:text-black hover:underline"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>

                            {editRole === "super_admin" || editRole === "admin" || editRole === "hr_admin" ? (
                                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                                    <span className="text-sm font-semibold text-gray-700">All Stores Assigned</span>
                                    <span className="ml-auto text-xs text-gray-400 italic">(auto-assigned for this role)</span>
                                </div>
                            ) : (
                                <Select
                                    isMulti={editRole !== "employee"}
                                    placeholder={editRole === "employee" ? "Search and select store…" : "Search and select stores…"}
                                    options={editRole === "employee" ? branches.map((branch) => ({
                                        value: branch._id,
                                        label: branch.workingBranch,
                                    })) : branchSelectOptions}
                                    value={editRole === "employee" ? (editSelectedBranches[0] || null) : editSelectedBranches}
                                    onChange={editRole === "employee" ? (val) => setEditSelectedBranches(val ? [val] : []) : handleEditStoreChange}
                                    styles={editSelectStyles}
                                    closeMenuOnSelect={editRole === "employee"}
                                    hideSelectedOptions={editRole !== "employee"}
                                    noOptionsMessage={() => "No stores found"}
                                />
                            )}

                            {/* Count badge */}
                            {editRole !== "super_admin" && editRole !== "admin" && editRole !== "hr_admin" && editRole !== "employee" && editSelectedBranches.length > 0 && (
                                <p className="text-xs text-gray-400 mt-2">
                                    {editSelectedBranches.length} store{editSelectedBranches.length > 1 ? "s" : ""} selected
                                </p>
                            )}
                        </div>

                        {/* Save Changes button */}
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSaveChanges}
                                className="px-6 py-2.5 bg-[#111] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete User Confirmation Modal (Screenshot 4) ────────────────── */}
            {isDeleteModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center animate-scaleIn">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User</h3>
                        <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this user?</p>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default ExistingUsers;
