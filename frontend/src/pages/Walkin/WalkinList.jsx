import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import baseUrl from "../../api/api";
import { FaChevronLeft, FaChevronRight, FaPen } from 'react-icons/fa';

/* ---------- Normalization and Spelling fixes helpers ---------- */
const BRAND_TOKENS = new Set(["zorucci", "grooms", "suitor", "guy", "sg"]);

function canonFixes(s) {
    return s
        .replace(/\bedap{1,2}a?l{1,3}y\b/g, "edappally")
        .replace(/\bedap{1,2}a?l{1,3}i\b/g, "edappally")
        .replace(/\bmanjeri\b/g, "manjery")
        .replace(/\bperinthalmana\b/g, "perinthalmanna")
        .replace(/\bkottakal\b/g, "kottakkal")
        .replace(/\bkalpeta\b/g, "kalpetta")
        .replace(/\bzoruc+i\b/g, "zorucci");
}

function norm(s) {
    const x = String(s || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    return canonFixes(x);
}

function locationKey(name) {
    const tokens = norm(name)
        .split(" ")
        .filter((t) => t && !BRAND_TOKENS.has(t));
    return tokens.join(" ");
}

const STATUS_OPTIONS = [
    'Loss',
    'Revisit',
    'New Walkin'
];

const FILTER_STATUS_OPTIONS = [
    'New Walkin',
    'Loss',
    'Revisit',
    'Booked',
    'Rentout',
    'Return',
    'Trial',
    'Enquiry',
    'Reissue',
    'Cancel'
];

const UPDATE_STATUS_OPTIONS = [
    'Loss',
    'Revisit',
    'New Walkin'
];

const HARDCODED_STORES = [
    'Z-Edapally1', 'G-Edappally', 'SG-Trivandrum', 'Z- Edappal', 'Z.Perinthalmanna',
    'Z.Kottakkal', 'G.Kottayam', 'G.Perumbavoor', 'G.Thrissur', 'G.Chavakkad',
    'G.Calicut', 'G.Vadakara', 'G.Edappal', 'G.Perinthalmanna', 'G.Kottakkal',
    'G.Manjeri', 'G.Palakkad', 'G.Kalpetta', 'G.Kannur', 'G.MG Road',
    'Dappr Squad', 'office', 'production', 'WAREHOUSE'
];

const WalkinList = () => {
    const user = useSelector((state) => state.auth.user);
    const token = localStorage.getItem('token');

    // Keep the font aligned with the global DM Sans stack.
    useEffect(() => {
        if (!document.getElementById('dm-sans-font')) {
            const link = document.createElement('link');
            link.id = 'dm-sans-font';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap';
            document.head.appendChild(link);
        }
    }, []);

    // State for walkins list
    const [walkins, setWalkins] = useState([]);
    const [totalWalkins, setTotalWalkins] = useState(0);

    // API Data
    const [branches, setBranches] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [walkinsLoading, setWalkinsLoading] = useState(true);

    // Filters and UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [storeFilter, setStoreFilter] = useState('All');

    // Toggle state between Walkin List View and dynamic Add Walkin Form Page View matching screenshot
    const [showAddView, setShowAddView] = useState(false);

    // Customer Exists detection
    const [customerExistsNotification, setCustomerExistsNotification] = useState(false);
    const [customerData, setCustomerData] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Form state for adding Walk-in
    const [formData, setFormData] = useState({
        _id: '',
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        contact: '',
        functionDate: new Date().toISOString().split('T')[0],
        store: '',
        storeId: '',
        staff: '',
        employeeId: '',
        category: '-',
        subCategory: '-',
        remarks: '',
        status: 'New Walkin',
        repeatCount: 1
    });

    const [currentAdmin, setCurrentAdmin] = useState(null);
    
    // Track walkins that already changed status today
    const [statusChangedToday, setStatusChangedToday] = useState({});
    const [updatingStatus, setUpdatingStatus] = useState({});
    const isRestrictedEdit = (user?.role === 'cluster_admin' || user?.role === 'store_admin') && (formData._id || customerExistsNotification);
    const isAdmin = ['super_admin', 'admin', 'hr_admin', 'cluster_admin', 'store_admin'].includes(user?.role);

    const safeDateOnly = (dateStr) => {
        if (!dateStr || dateStr === '-') return new Date().toISOString().split('T')[0];
        return dateStr.split(' ')[0].split('T')[0];
    };

    const getResetFormData = (admin = currentAdmin, branchList = branches) => {
        let defStore = '';
        let defStoreId = '';

        if (admin) {
            if (admin.branches && admin.branches.length > 0) {
                const adminBranchId = admin.branches[0]?._id || admin.branches[0];
                const matchedBranch = branchList.find(b =>
                    b._id === adminBranchId ||
                    b.workingBranch === admin.branches[0].workingBranch
                );
                if (matchedBranch) {
                    defStore = matchedBranch.workingBranch;
                    defStoreId = matchedBranch._id;
                }
            }
        }

        if (!defStore && branchList.length > 0) {
            defStore = branchList[0].workingBranch;
            defStoreId = branchList[0]._id;
        }

        return {
            _id: '',
            date: new Date().toISOString().split('T')[0],
            customerName: '',
            contact: '',
            functionDate: new Date().toISOString().split('T')[0],
            store: defStore,
            storeId: defStoreId,
            staff: admin?.name || '',
            employeeId: admin?._id || '',
            category: '-',
            subCategory: '-',
            remarks: '',
            status: 'New Walkin',
            repeatCount: 1
        };
    };

    // Fetch walkins dynamically from live API
    const loadWalkinsList = async (pageToLoad = 1) => {
        try {
            setWalkinsLoading(true);
            const params = new URLSearchParams({
                search: searchQuery.trim(),
                status: statusFilter,
                store: storeFilter,
                page: pageToLoad,
                limit: itemsPerPage === 'All' ? 0 : itemsPerPage
            });
            const walkinRes = await fetch(`${baseUrl.baseUrl}api/walkin/list?${params.toString()}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const walkinJson = await walkinRes.json();
            if (walkinJson?.success) {
                setWalkins(walkinJson.data || []);
                setTotalWalkins(Number(walkinJson.count || 0));
            }
        } catch (err) {
        } finally {
            setWalkinsLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch branches and walkins in parallel — employees stay lazy
                const [branchRes, adminRes] = await Promise.all([
                    fetch(`${baseUrl.baseUrl}api/admin/accessible-stores`, {
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${baseUrl.baseUrl}api/admin/get/current/admin`, {
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                    })
                ]);

                const branchJson = await branchRes.json();
                let branchList = Array.isArray(branchJson?.stores) ? branchJson.stores : (Array.isArray(branchJson?.data) ? branchJson.data : []);

                if (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin') {
                    // Force the dropdown to show the hardcoded stores to ensure it's not empty,
                    // and merge any DB ones to prevent duplicates.
                    const existing = new Set(branchList.map(b => b.workingBranch));
                    const missing = HARDCODED_STORES.filter(s => !existing.has(s));
                    branchList = [...missing.map(name => ({ workingBranch: name })), ...branchList];
                }

                setBranches(branchList);

                let adminData = null;
                const adminJson = await adminRes.json();
                if (adminJson?.message === 'OK' && adminJson?.data) {
                    adminData = adminJson.data;
                    setCurrentAdmin(adminData);
                }

                const initialForm = getResetFormData(adminData, branchList);
                setFormData(initialForm);
            } catch (err) {
                console.error("Error fetching initial walkin data:", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchData();
    }, [token, user?.role]);

    // Load employees dynamically based on storeId
    const loadEmployees = async (storeId) => {
        try {
            const url = storeId
                ? `${baseUrl.baseUrl}api/admin/accessible-employees?storeId=${storeId}`
                : `${baseUrl.baseUrl}api/admin/accessible-employees`;
            const empRes = await fetch(url, {
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const empJson = await empRes.json();
            const empList = Array.isArray(empJson?.employees) ? empJson.employees : [];
            setEmployees(empList);
        } catch (err) {
        }
    };

    // Auto-load employees when storeId changes
    useEffect(() => {
        if (token && formData.storeId) {
            loadEmployees(formData.storeId);
        } else {
            setEmployees([]);
        }
    }, [formData.storeId, token]);

    // Reset page to 1 when filters or page limit changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, storeFilter, itemsPerPage]);

    // Fetch walkins whenever page, limit, filters, or loading state changes
    // Debounce search-triggered fetches so we don't fire on every keystroke
    useEffect(() => {
        if (!token || loading) return;
        if (searchQuery.trim().length > 0) {
            // Debounce search input — wait 350ms before calling API
            const timer = setTimeout(() => loadWalkinsList(1), 350);
            return () => clearTimeout(timer);
        } else {
            loadWalkinsList(currentPage);
        }
    }, [currentPage, itemsPerPage, searchQuery, statusFilter, storeFilter, loading]);

    // Auto-refresh the list page data every 5 minutes
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (token && !loading && !showAddView) {
                loadWalkinsList(currentPage);
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [currentPage, itemsPerPage, searchQuery, statusFilter, storeFilter, token, loading, showAddView]);

    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(totalWalkins / itemsPerPage);
    const indexFirst = itemsPerPage === 'All' ? 0 : (currentPage - 1) * itemsPerPage;
    const currentItems = walkins;

    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    const getBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'category') {
            setFormData(prev => ({
                ...prev,
                category: value,
                subCategory: prev.status === 'Loss' ? 'Select sub category' : '-'
            }));
            return;
        }

        if (name === 'contact') {
            const cleanVal = value.replace(/[^0-9]/g, '');
            setFormData(prev => ({
                ...prev,
                contact: cleanVal
            }));
            if (cleanVal.length === 10) {
                checkCustomer(cleanVal);
            } else {
                setCustomerExistsNotification(false);
                setCustomerData(null);
                setFormData(prev => ({ ...prev, status: 'New Walkin', repeatCount: 1 }));
            }
            return;
        }

        if (name === 'status') {
            let finalCategory = formData.category;
            let finalSubCategory = formData.subCategory;

            if (value === 'Loss') {
                finalCategory = 'Product';
                finalSubCategory = 'Select sub category';
            } else if (value === 'Revisit') {
                if (!['Trial', 'Reissue', 'Loss'].includes(formData.category)) {
                    finalCategory = 'Trial';
                }
                finalSubCategory = '-';
            } else {
                finalCategory = '-';
                finalSubCategory = '-';
            }

            setFormData(prev => ({
                ...prev,
                status: value,
                category: finalCategory,
                subCategory: finalSubCategory
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'store') {
            const selectedBranch = branches.find(b => b.workingBranch === value);
            const branchId = selectedBranch ? selectedBranch._id : '';
            setFormData(prev => ({
                ...prev,
                store: value,
                storeId: branchId,
                staff: '',
                employeeId: ''
            }));
            if (branchId) {
                loadEmployees(branchId);
            } else {
                setEmployees([]);
            }
        } else if (name === 'staff') {
            const selectedEmp = employees.find(e => e.username === value);
            setFormData(prev => ({
                ...prev,
                staff: value,
                employeeId: selectedEmp ? selectedEmp._id : ''
            }));
        }
    };

    // Check if customer phone number already exists in the database
    const checkCustomer = async (contactVal) => {
        if (formData._id) return; // Do not auto-check if we are in Edit mode
        if (!contactVal || contactVal.trim().length < 5) return;
        try {
            const res = await fetch(`${baseUrl.baseUrl}api/walkin/check/${contactVal.trim()}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const json = await res.json();
            if (json.success && json.exists) {
                setCustomerExistsNotification(true);
                setCustomerData(json.data);

                // Pre-populate fields automatically (Do not override store & staff with historical ones)
                setFormData(prev => ({
                    ...prev,
                    customerName: json.data.customerName || prev.customerName,
                    functionDate: safeDateOnly(json.data.functionDate) || prev.functionDate,
                    category: json.data.category || prev.category,
                    subCategory: json.data.subCategory || prev.subCategory,
                    remarks: json.data.remarks || prev.remarks,
                    status: json.data.status || prev.status,
                    repeatCount: json.data.repeatCount || 1,
                    date: safeDateOnly(json.data.date) || prev.date
                }));
            } else {
                setCustomerExistsNotification(false);
                setCustomerData(null);
                setFormData(prev => ({
                    ...prev,
                    status: 'New Walkin',
                    repeatCount: 1
                }));
            }
        } catch (err) {
        }
    };

    // Handle inline status change for walkins
    const handleStatusChange = async (walkinRecord, newStatus) => {
        const walkinId = walkinRecord._id;
        if (updatingStatus[walkinId]) return; // Prevent double-click
        
        setUpdatingStatus(prev => ({ ...prev, [walkinId]: true }));
        
        try {
            const res = await fetch(`${baseUrl.baseUrl}api/walkin/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    _id: walkinId,
                    status: newStatus,
                    customerName: walkinRecord.customerName,
                    contact: walkinRecord.contact
                })
            });
            
            const json = await res.json();
            if (json.success) {
                // Mark this walkin as changed today
                setStatusChangedToday(prev => ({ ...prev, [walkinId]: true }));
                // Reload walkins list
                loadWalkinsList(currentPage);
            } else {
                if (json.message && json.message.includes('only be changed once')) {
                    alert('Status can only be changed once per day. Please try again tomorrow.');
                    setStatusChangedToday(prev => ({ ...prev, [walkinId]: true }));
                } else {
                    alert(`Error: ${json.message}`);
                }
            }
        } catch (err) {
            alert('Failed to update status. Please try again.');
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [walkinId]: false }));
        }
    };
    
    const handleEditClick = (w) => {
        const foundBranch = branches.find(b => b.workingBranch === w.store);
        const storeIdToLoad = w.storeId || (foundBranch ? foundBranch._id : '');

        setFormData({
            _id: w._id,
            date: safeDateOnly(w.date),
            customerName: w.customerName || '',
            contact: w.contact || '',
            functionDate: safeDateOnly(w.functionDate),
            store: w.store || '',
            storeId: storeIdToLoad,
            staff: w.staff || '',
            employeeId: w.employeeId || '',
            category: w.category || '-',
            subCategory: w.subCategory || '-',
            remarks: w.remarks || '',
            status: w.status || 'New Walkin',
            repeatCount: w.repeatCount || 1
        });

        if (storeIdToLoad) {
            loadEmployees(storeIdToLoad);
        } else {
            setEmployees([]);
        }

        setShowAddView(true);
    };

    // Save Walkin Form directly to live MongoDB database
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerName || !formData.contact || !formData.store) {
            alert('Please fill out all required fields.');
            return;
        }
        if (customerExistsNotification && (!formData.status || formData.status === '')) {
            alert('Please select a Walk-in Status.');
            return;
        }
        if (formData.status === 'Loss') {
            if (!formData.category || formData.category === '-' || formData.category === '') {
                alert('Please select a Category.');
                return;
            }
            if (!formData.subCategory || formData.subCategory === 'Select sub category' || formData.subCategory === '-' || formData.subCategory === '') {
                alert('Please select a Sub Category.');
                return;
            }
        } else if (formData.status === 'Revisit') {
            if (!formData.category || formData.category === '-' || formData.category === '') {
                alert('Please select a Category.');
                return;
            }
        }

        setLoading(true);
        try {
            let fileAttachment = undefined;
            if (selectedFile) {
                const base64Str = await getBase64(selectedFile);
                fileAttachment = {
                    name: selectedFile.name,
                    base64: base64Str
                };
            }

            const res = await fetch(`${baseUrl.baseUrl}api/walkin/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    _id: formData._id || undefined,
                    customerName: formData.customerName,
                    contact: formData.contact,
                    functionDate: formData.functionDate,
                    store: formData.store,
                    storeId: formData.storeId || undefined,
                    staff: formData.staff || 'None',
                    employeeId: formData.employeeId || undefined,
                    category: formData.category,
                    subCategory: formData.subCategory,
                    fileAttachment,
                    remarks: formData.remarks || '-',
                    status: formData.status,
                    date: formData.date
                })
            });

            const json = await res.json();
            if (json.success) {
                // Reset form to defaults and hide form view immediately for instant redirect
                setFormData(getResetFormData());
                setCustomerExistsNotification(false);
                setCustomerData(null);
                setSelectedFile(null);
                setShowAddView(false);

                // Reload walkins list and refresh dashboard in the background
                loadWalkinsList(currentPage);
                window.dispatchEvent(new Event('dashboard:refresh'));
            } else {
                alert(`Error: ${json.message}`);
            }
        } catch (err) {
            alert("Connection error while attempting to save walk-in.");
        } finally {
            setLoading(false);
        }
    };

    const currentStoreEmployees = employees; // Already filtered by loadEmployees API

    const showCategory = formData.status === 'Loss' || formData.status === 'Revisit';
    const showSubCategory = formData.status === 'Loss';
    const showAttachmentInput = formData.status === 'Loss' && formData.subCategory === 'Model, Design and Colour Not Available';

    const getCategoryOptions = () => {
        if (formData.status === 'Loss') {
            return ['Product', 'Enquiry', 'Dapper Squad'];
        }
        if (formData.status === 'Revisit') {
            return ['Trial', 'Reissue', 'Loss'];
        }
        return [];
    };

    const getSubCategoryOptions = () => {
        if (formData.status === 'Loss') {
            if (formData.category === 'Product') {
                return [
                    'Select sub category',
                    'Product Already Booked',
                    'Model, Design and Colour Not Available',
                    'Size',
                    'Price',
                    'Budget Restriction'
                ];
            }
            if (formData.category === 'Enquiry') {
                return [
                    'Select sub category',
                    'Enquiry Without Groom/Bride',
                    'Enquiry Without Trail',
                    'Confirm Later',
                    'Shoe and Shirt'
                ];
            }
            if (formData.category === 'Dapper Squad') {
                return [
                    'Select sub category',
                    'Product Already Booked',
                    'Model, Design and Colour Not Available',
                    'Size',
                    'Price'
                ];
            }
        }
        return ['Select sub category'];
    };

    let remarksColSpan = "col-span-12 md:col-span-3";
    if (!showCategory && !showSubCategory) {
        remarksColSpan = "col-span-12 md:col-span-9";
    } else if (showCategory && !showSubCategory) {
        remarksColSpan = "col-span-12 md:col-span-6";
    } else if (showAttachmentInput) {
        remarksColSpan = "col-span-12";
    }

    // Sort Arrows double-indicator icon matching mockup image exactly
    const SortArrow = () => (
        <span className="inline-flex flex-col ml-1.5 align-middle text-[8px] text-gray-300">
            <span>▲</span>
            <span className="-mt-1">▼</span>
        </span>
    );

    return (
        <div className="mb-[70px] min-h-screen" style={{ fontFamily: "DM Sans, sans-serif", background: '#f9fafb' }}>
            <SideNav />
            <div className="md:hidden sm:block">
                <ModileNav />
            </div>

            {/* Layout Grid Container matching standard dashboard spacing perfectly */}
            <div className="md:ml-[120px] transition-all duration-300" style={{ paddingTop: '24px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '40px' }}>
                {showAddView ? (
                    /* ── CREATE / EDIT WALK-IN FORM ── */
                    <div className="max-w-5xl mx-auto">

                        {/* ── Page header ── */}
                        <div className="flex items-center gap-3 mb-8">
                            <button
                                type="button"
                                onClick={() => {
                                    setCustomerExistsNotification(false);
                                    setCustomerData(null);
                                    setSelectedFile(null);
                                    setShowAddView(false);
                                }}
                                className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h2 className="text-[22px] font-bold text-gray-900 leading-tight">
                                    {formData._id ? 'Edit Walk In' : 'Create New Walk In'}
                                </h2>
                                <p className="text-[12px] text-gray-400 mt-0.5">
                                    {formData._id ? 'Update the details of this walk-in record' : 'Register a customer\'s physical store visit'}
                                </p>
                            </div>
                        </div>

                        {/* ── Existing customer / edit banner ── */}
                        {(formData._id || customerExistsNotification) && (
                            <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-amber-800">
                                        {formData._id
                                            ? `Editing Walk-in Record · Visit #${formData.repeatCount || 1}`
                                            : `Returning Customer · ${formData.repeatCount || 1} previous visit${(formData.repeatCount || 1) > 1 ? 's' : ''}`
                                        }
                                    </p>
                                    <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
                                        {formData._id
                                            ? 'Saving will update this record directly.'
                                            : 'Details pre-filled. "New Walkin" logs a new visit; other statuses update the existing record.'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── Form ── */}
                        <form onSubmit={handleFormSubmit}>
                            <div className="grid grid-cols-12 gap-5">

                                {/* ════ LEFT COLUMN ════ */}
                                <div className="col-span-12 lg:col-span-8 space-y-5">

                                    {/* Card: Customer Info */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        {/* Card header strip */}
                                        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                                            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-[13px] font-semibold text-gray-900">Customer Information</h3>
                                                <p className="text-[11px] text-gray-400">Phone number, name and function date</p>
                                            </div>
                                        </div>

                                        <div className="p-6 grid grid-cols-12 gap-4">
                                            {/* Mobile */}
                                            <div className="col-span-12 sm:col-span-6">
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Mobile Number <span className="text-red-500 normal-case font-normal">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                    </span>
                                                    <input
                                                        type="tel"
                                                        name="contact"
                                                        required
                                                        maxLength={10}
                                                        placeholder="10-digit mobile number"
                                                        value={formData.contact}
                                                        onChange={handleInputChange}
                                                        onBlur={(e) => checkCustomer(e.target.value)}
                                                        disabled={isRestrictedEdit}
                                                        className={`w-full h-10 pl-10 pr-4 text-[13px] border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all ${
                                                            isRestrictedEdit
                                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                                                                : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                                                        }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Name */}
                                            <div className="col-span-12 sm:col-span-6">
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Customer Name <span className="text-red-500 normal-case font-normal">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        name="customerName"
                                                        required
                                                        placeholder="Full name"
                                                        value={formData.customerName}
                                                        onChange={handleInputChange}
                                                        disabled={isRestrictedEdit}
                                                        className={`w-full h-10 pl-10 pr-4 text-[13px] border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all ${
                                                            isRestrictedEdit
                                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                                                                : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                                                        }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Function Date */}
                                            <div className="col-span-12 sm:col-span-7">
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Function Date <span className="text-red-500 normal-case font-normal">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </span>
                                                    <input
                                                        type="date"
                                                        name="functionDate"
                                                        required
                                                        value={formData.functionDate}
                                                        onChange={handleInputChange}
                                                        disabled={isRestrictedEdit}
                                                        className={`w-full h-10 pl-10 pr-4 text-[13px] border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all ${
                                                            isRestrictedEdit
                                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                                                                : 'bg-white border-gray-200 text-gray-800 cursor-pointer'
                                                        }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Repeat Count badge */}
                                            <div className="col-span-12 sm:col-span-5">
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Visit Count
                                                </label>
                                                <div className="h-10 px-4 flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                                                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                                                    </svg>
                                                    <span className="text-[13px] font-semibold text-gray-600">{formData.repeatCount || 1}</span>
                                                    {(formData.repeatCount || 1) > 1 && (
                                                        <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Repeat</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card: Remarks */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                                            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-[13px] font-semibold text-gray-900">Remarks</h3>
                                                <p className="text-[11px] text-gray-400">Optional notes about this visit</p>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <textarea
                                                name="remarks"
                                                rows={4}
                                                placeholder="Add any notes or observations about this walk-in..."
                                                value={formData.remarks}
                                                onChange={handleInputChange}
                                                className="w-full text-[13px] border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 text-gray-800 bg-white placeholder-gray-400 resize-none transition-all"
                                            />
                                        </div>
                                    </div>

                                </div>

                                {/* ════ RIGHT COLUMN ════ */}
                                <div className="col-span-12 lg:col-span-4 space-y-5">

                                    {/* Card: Assignment & Status */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                                            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-[13px] font-semibold text-gray-900">Assignment & Status</h3>
                                                <p className="text-[11px] text-gray-400">Branch, staff and visit status</p>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4">

                                            {isAdmin && (
                                                <>
                                                    {/* Store */}
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                            Store / Branch <span className="text-red-500 normal-case font-normal">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                </svg>
                                                            </span>
                                                            <select
                                                                name="store"
                                                                required
                                                                value={formData.store}
                                                                onChange={handleInputChange}
                                                                className="w-full h-10 pl-10 pr-9 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 text-gray-800 bg-white cursor-pointer appearance-none transition-all"
                                                            >
                                                                <option value="">Select Store</option>
                                                                {branches.map((b, i) => (
                                                                    <option key={i} value={b.workingBranch}>{b.workingBranch}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Staff */}
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                            Staff / Employee <span className="text-red-500 normal-case font-normal">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                            </span>
                                                            <select
                                                                name="staff"
                                                                required
                                                                value={formData.staff}
                                                                onChange={handleInputChange}
                                                                className="w-full h-10 pl-10 pr-9 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 text-gray-800 bg-white cursor-pointer appearance-none transition-all"
                                                            >
                                                                <option value="">Select Employee</option>
                                                                {employees.map((emp, i) => (
                                                                    <option key={i} value={emp.username}>
                                                                        {emp.username} ({emp.employeeId || emp.empID || ''})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* Status */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                    Visit Status <span className="text-red-500 normal-case font-normal">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                    </span>
                                                    <select
                                                        name="status"
                                                        required
                                                        value={formData.status}
                                                        onChange={handleInputChange}
                                                        className="w-full h-10 pl-10 pr-9 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 text-gray-800 bg-white cursor-pointer appearance-none transition-all"
                                                    >
                                                        {!STATUS_OPTIONS.includes(formData.status) && formData.status && (
                                                            <option value={formData.status}>{formData.status}</option>
                                                        )}
                                                        {STATUS_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {showCategory && (
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                        Category <span className="text-red-500 normal-case font-normal">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                            </svg>
                                                        </span>
                                                        <select
                                                            name="category"
                                                            required
                                                            value={formData.category}
                                                            onChange={handleInputChange}
                                                            className="w-full h-10 pl-10 pr-9 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 text-gray-800 bg-white cursor-pointer appearance-none transition-all"
                                                        >
                                                            <option value="">Select Category</option>
                                                            {getCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        {showSubCategory && (
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                        Sub Category <span className="text-red-500 normal-case font-normal">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </span>
                                                        <select
                                                            name="subCategory"
                                                            value={formData.subCategory}
                                                            onChange={handleInputChange}
                                                            className="w-full h-10 pl-10 pr-9 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 text-gray-800 bg-white cursor-pointer appearance-none transition-all"
                                                        >
                                                            {getSubCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {showAttachmentInput && (
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                                        Attachment <span className="text-gray-400 normal-case font-normal">(Optional)</span>
                                                    </label>
                                                    <input type="file" id="walkin-attachment-file" onChange={handleFileChange} className="hidden" />
                                                    <label
                                                        htmlFor="walkin-attachment-file"
                                                        className="flex items-center gap-3 h-10 px-4 border border-dashed border-gray-300 rounded-xl text-[13px] text-gray-500 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-all overflow-hidden"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                        </svg>
                                                        <span className="truncate">{selectedFile ? selectedFile.name : (formData.attachmentName || 'Choose file to upload')}</span>
                                                    </label>
                                                </div>
                                            )}

                                        </div>{/* end card body */}
                                    </div>{/* end assignment card */}

                                    {/* Save / Cancel */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full h-11 bg-gray-900 hover:bg-black text-white text-[13px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-0 shadow-sm"
                                        >
                                            {loading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    {formData._id ? 'Update Walk In' : 'Save Walk In'}
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCustomerExistsNotification(false);
                                                setCustomerData(null);
                                                setSelectedFile(null);
                                                setShowAddView(false);
                                            }}
                                            className="w-full mt-2.5 h-10 bg-transparent border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 text-[13px] font-medium rounded-xl transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                </div>

                            </div>
                        </form>
                    </div>
                ) : (
                    /* ── WALK-IN LIST VIEW ── */
                    <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Walk In List</h1>
                                <p className="text-[12px] text-gray-400 mt-1">Manage physical store customer visits and follow-ups</p>
                            </div>
                            <button
                                onClick={() => {
                                    setFormData(getResetFormData());
                                    setSelectedFile(null);
                                    setShowAddView(true);
                                }}
                                className="bg-black hover:bg-zinc-800 text-white rounded-xl px-5 py-2.5 font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 hover:shadow active:scale-95 cursor-pointer border-0 w-full sm:w-auto"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                New Walk In
                            </button>
                        </div>

                        {/* Filters Panel */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-wrap gap-4 items-center">
                            {/* Search Box */}
                            <div className="relative flex-1 min-w-[260px]">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search customer name, contact, store..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full h-11 pl-11 pr-4 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-black focus:ring-4 focus:ring-gray-100 transition-all font-semibold bg-white text-gray-800 placeholder-gray-400"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="relative min-w-[150px]">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </span>
                                <select 
                                    value={statusFilter} 
                                    onChange={e => setStatusFilter(e.target.value)} 
                                    className="w-full h-11 pl-11 pr-10 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-black focus:ring-4 focus:ring-gray-100 text-gray-800 bg-white cursor-pointer appearance-none font-semibold transition-all"
                                >
                                    <option value="All">All Status</option>
                                    {FILTER_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Store Filter */}
                            {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin' || user?.role === 'cluster_admin') && (
                                <div className="relative min-w-[150px]">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </span>
                                    <select 
                                        value={storeFilter} 
                                        onChange={e => setStoreFilter(e.target.value)} 
                                        className="w-full h-11 pl-11 pr-10 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-black focus:ring-4 focus:ring-gray-100 text-gray-800 bg-white cursor-pointer appearance-none font-semibold transition-all"
                                    >
                                        <option value="All">All Stores</option>
                                        {branches.map((b, i) => <option key={i} value={b.workingBranch}>{b.workingBranch}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Table Card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                            {walkinsLoading ? (
                                <div className="flex justify-center items-center py-24">
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                                    </div>
                                </div>
                            ) : walkins.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                    <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span className="text-sm font-semibold">No walk-in records found</span>
                                    <p className="text-xs text-gray-400 mt-1">Try resetting filters or registering a new walk-in.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[1200px] border-collapse text-left">
                                            <thead>
                                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                                    <th className="py-4 px-4 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-12">#</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-24">Date</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-36">Customer</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-36">Contact</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-28">Function Date</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-36">Store</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-36">Staff</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-28">Category</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-36">Sub Category</th>
                                                    <th className="py-4 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] min-w-[160px]">Remarks</th>
                                                    <th className="py-4 px-4 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-24">Repeat</th>
                                                    <th className="py-4 px-4 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-36">Status</th>
                                                    <th className="py-4 px-4 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-[0.04em] w-14">Edit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {currentItems.map((w, index) => {
                                                    const statusColors = {
                                                        'Booked': { text: 'text-emerald-600', dot: 'bg-emerald-500' },
                                                        'New Booking': { text: 'text-emerald-600', dot: 'bg-emerald-500' },
                                                        'Revisit Booking': { text: 'text-emerald-600', dot: 'bg-emerald-500' },
                                                        'Rentout': { text: 'text-pink-600', dot: 'bg-pink-500' },
                                                        'Rent Out': { text: 'text-pink-600', dot: 'bg-pink-500' },
                                                        'Booking & Rentout': { text: 'text-pink-600', dot: 'bg-pink-500' },
                                                        'Return': { text: 'text-amber-600', dot: 'bg-amber-500' },
                                                        'Trial': { text: 'text-indigo-600', dot: 'bg-indigo-500' },
                                                        'Loss': { text: 'text-red-600', dot: 'bg-red-500' },
                                                        'Revisit Loss': { text: 'text-red-600', dot: 'bg-red-500' },
                                                        'Cancel': { text: 'text-red-600', dot: 'bg-red-500' },
                                                        'Enquiry': { text: 'text-gray-500', dot: 'bg-gray-400' },
                                                        'New Walkin': { text: 'text-blue-600', dot: 'bg-blue-500' },
                                                        'Reissue': { text: 'text-purple-600', dot: 'bg-purple-500' },
                                                    };
                                                    const sc = statusColors[w.status] || { text: 'text-gray-500', dot: 'bg-gray-400' };
                                                    
                                                    // Beautifully format phone number (+91 XXXXX XXXXX)
                                                    const formattedContact = w.contact 
                                                        ? w.contact.length === 10 
                                                            ? `+91 ${w.contact.slice(0, 5)} ${w.contact.slice(5)}` 
                                                            : `+91 ${w.contact}` 
                                                        : '–';

                                                    return (
                                                        <tr 
                                                            key={w._id || index}
                                                            className="hover:bg-gray-50/40 transition-colors duration-150 text-gray-700"
                                                        >
                                                            <td className="py-3.5 px-4 text-center text-[13px] text-gray-400 font-normal">{indexFirst + index + 1}</td>
                                                            <td className="py-3.5 px-4 text-[13px] whitespace-nowrap">{safeDateOnly(w.date)}</td>
                                                            <td className="py-3.5 px-4 text-[13px] font-medium text-gray-900 max-w-[144px] truncate" title={w.customerName}>{w.customerName || '–'}</td>
                                                            <td className="py-3.5 px-4 text-[13px] whitespace-nowrap font-medium text-gray-500">{formattedContact}</td>
                                                            <td className="py-3.5 px-4 text-[13px] whitespace-nowrap">{w.functionDate || '–'}</td>
                                                            <td className="py-3.5 px-4 text-[13px] max-w-[144px] truncate" title={w.store}>{w.store || '–'}</td>
                                                            <td className="py-3.5 px-4 text-[13px] max-w-[144px] truncate" title={w.staff}>{w.staff || '–'}</td>
                                                            <td className="py-3.5 px-4 text-[13px]">{w.category || '–'}</td>
                                                            <td className="py-3.5 px-4 text-[13px]">
                                                                <div className="flex items-center gap-1.5 max-w-[144px]">
                                                                    <span className="truncate" title={w.subCategory}>{w.subCategory || '–'}</span>
                                                                    {w.attachment && (
                                                                        <a 
                                                                            href={w.attachment} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer" 
                                                                            className="text-blue-600 hover:text-blue-800 transition-colors shrink-0 flex items-center justify-center p-1 bg-blue-50/50 hover:bg-blue-50 rounded"
                                                                            title={`View attachment: ${w.attachmentName || 'Attachment'}`}
                                                                        >
                                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                            </svg>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-[13px] text-gray-400 font-normal max-w-[180px] truncate" title={w.remarks}>{w.remarks || '–'}</td>
                                                            <td className="py-3.5 px-4 text-[13px] text-center font-medium text-gray-900">{w.repeatCount}</td>
                                                            <td className="py-3 px-4 text-center">
                                                                <div className="relative inline-flex items-center justify-center">
                                                                    <select
                                                                        value={w.status || 'New Walkin'}
                                                                        onChange={(e) => handleStatusChange(w, e.target.value)}
                                                                        disabled={statusChangedToday[w._id] || updatingStatus[w._id]}
                                                                        className={`bg-transparent border-0 font-bold text-xs cursor-pointer appearance-none focus:outline-none pr-4 text-center ${sc.text} ${
                                                                            statusChangedToday[w._id] ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80 active:scale-98'
                                                                        }`}
                                                                        title={statusChangedToday[w._id] ? 'Status already changed today. Try again tomorrow.' : 'Change status'}
                                                                    >
                                                                        {!['New Walkin', 'Loss', 'Revisit'].includes(w.status) && w.status && (
                                                                            <option className="text-gray-800 bg-white" value={w.status}>{w.status}</option>
                                                                        )}
                                                                        <option className="text-gray-800 bg-white" value="New Walkin">New Walkin</option>
                                                                        <option className="text-gray-800 bg-white" value="Loss">Loss</option>
                                                                        <option className="text-gray-800 bg-white" value="Revisit">Revisit</option>
                                                                    </select>
                                                                    <div className={`pointer-events-none absolute right-0 flex items-center ${sc.text} opacity-60`}>
                                                                        <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                <button
                                                                    onClick={() => handleEditClick(w)}
                                                                    className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all flex items-center justify-center cursor-pointer mx-auto border-0 bg-transparent"
                                                                    title="Edit Details"
                                                                >
                                                                    <FaPen size={11} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-6 border-t border-gray-100 text-xs font-semibold text-gray-500">
                                        <div>
                                            Showing <span className="text-gray-900 font-bold">{itemsPerPage === 'All' ? '1' : indexFirst + 1}</span> to <span className="text-gray-900 font-bold">{itemsPerPage === 'All' ? totalWalkins : Math.min(indexFirst + itemsPerPage, totalWalkins)}</span> of <span className="text-gray-900 font-bold">{totalWalkins}</span> entries
                                        </div>
                                        <div className="flex items-center gap-5">
                                            {/* Show Rows Dropdown */}
                                            <div className="flex items-center relative">
                                                <span className="mr-2 text-gray-400">Show:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-xs text-gray-800 hover:border-gray-300 font-bold cursor-pointer transition-all shadow-xs justify-between min-w-[64px]"
                                                >
                                                    <span>{itemsPerPage}</span>
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                                                        <polyline points="6 9 12 15 18 9" />
                                                    </svg>
                                                </button>
                                                {isDropdownOpen && (
                                                    <>
                                                        <div
                                                            onClick={() => setIsDropdownOpen(false)}
                                                            className="fixed inset-0 z-40"
                                                        />
                                                        <div className="absolute bottom-full right-0 mb-2 bg-zinc-800 text-white rounded-xl shadow-lg p-1 z-50 min-w-[80px] border border-zinc-700/50">
                                                            {[50, 100, 200, 'All'].map((opt) => (
                                                                <button
                                                                    key={opt}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setItemsPerPage(opt);
                                                                        setCurrentPage(1);
                                                                        setIsDropdownOpen(false);
                                                                    }}
                                                                    className={`flex items-center w-full px-3 py-1.5 text-left text-xs rounded-lg cursor-pointer hover:bg-black font-semibold transition-all ${
                                                                        itemsPerPage === opt ? 'bg-black text-white' : 'text-zinc-300'
                                                                    }`}
                                                                >
                                                                    <span className="w-4 inline-flex items-center mr-1 text-[9px] text-emerald-400 font-bold">
                                                                        {itemsPerPage === opt ? '✓' : ''}
                                                                    </span>
                                                                    <span>{opt}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Page navigation buttons */}
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="w-8 h-8 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:cursor-not-allowed bg-white text-gray-700"
                                                >
                                                    <FaChevronLeft size={9} />
                                                </button>
                                                <div className="flex items-center px-1 text-xs font-bold text-gray-700">
                                                    Page {currentPage} of {totalPages || 1}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                    disabled={currentPage === totalPages || totalPages === 0}
                                                    className="w-8 h-8 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:cursor-not-allowed bg-white text-gray-700"
                                                >
                                                    <FaChevronRight size={9} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WalkinList;
