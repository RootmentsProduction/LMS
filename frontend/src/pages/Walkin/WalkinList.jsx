import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import baseUrl from "../../api/api";
import { FaChevronLeft, FaChevronRight, FaPen, FaDownload, FaEye } from 'react-icons/fa';

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

const isSalesProductType = (val) => {
    if (!val) return false;
    const lower = String(val).toLowerCase().trim();
    return lower === 'sales' || lower === 'sale products' || lower === 'sale';
};

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
    'Cancelled',
    'Billed',
    'Bill Returned'
];

const handleDownloadAndView = (base64Data, filename = 'attachment') => {
    try {
        if (!base64Data) return;

        if (!base64Data.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = base64Data;
            link.download = filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        const parts = base64Data.split(',');
        if (parts.length < 2) return;

        const mimeMatch = parts[0].match(/data:(.*?);base64/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        window.open(blobUrl, '_blank');
    } catch (error) {
        console.error('Error downloading/viewing attachment:', error);
    }
};

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

const normalizeProductType = (val) => {
    if (!val) return '';
    const lower = val.toLowerCase().trim();
    if (lower === '2 piece suite' || lower === '2 piece suit') return '2 Piece Suit';
    if (lower === '3 piece suite' || lower === '3 piece suit') return '3 Piece Suit';
    if (lower === 'bandgala' || lower === 'bandhgala') return 'Bandhgala';
    if (lower === 'indowestern') return 'Indowestern';
    if (lower === 'kurtha') return 'Kurtha';
    if (lower === 'kids suit' || lower === 'kids suite') return 'Kids Suit';
    if (lower === 'lehanga') return 'Lehanga';
    if (lower === 'pakistaani lehagha' || lower === 'pakistani lehagha' || lower === 'pakistani lehenga' || lower === 'pakistaani lehenga') return 'Pakistaani Lehagha';
    if (lower === 'fancy saree') return 'Fancy Saree';
    if (lower === 'partywear') return 'Partywear';
    if (lower === 'heaithy dress' || lower === 'healthy dress') return 'Heaithy Dress';
    if (lower === 'multy colur lehanga' || lower === 'multi color lehenga' || lower === 'multy color lehenga') return 'Multy Colur Lehanga';
    if (lower === 'pakistaani gown' || lower === 'pakistani gown') return 'Pakistaani Gown';
    if (lower === 'ball gown') return 'Ball Gown';
    if (lower === 'body gown') return 'Body Gown';
    if (lower === 'white gown') return 'White Gown';
    if (lower === 'turkish gown') return 'Turkish Gown';
    if (lower === 'arabic gown') return 'Arabic Gown';
    if (lower === 'arabic lehanga' || lower === 'arabic lehenga') return 'Arabic Lehanga';
    if (lower === 'jwellery' || lower === 'jewellery' || lower === 'jewelry') return 'Jwellery';
    if (lower === 'oters' || lower === 'others') return 'Oters';
    if (lower === 'sales' || lower === 'sale' || lower === 'sale products') return 'Sale Products';
    return val.replace(/\b\w/g, c => c.toUpperCase()).replace(/Suite/g, 'Suit').replace(/suite/g, 'suit');
};

const normalizeSubCategory = (val, category = '') => {
    if (!val) return '';
    const lower = val.toLowerCase().trim();
    const catLower = (category || '').toLowerCase().trim();

    if (catLower === 'enquiry') {
        if (lower === 'enquiry without groom/bride' || lower === 'enquiry without groom and bride') {
            return 'Enquiry Without Groom and Bride';
        }
        if (lower === 'enquiry without trail' || lower === 'enquiry without trial') {
            return 'Enquiry Without Trial';
        }
        if (lower === 'confirm later') {
            return 'Confirm Later';
        }
        if (lower === 'shoe') return 'Shoe';
        if (lower === 'shirt') return 'Shirt';
    }

    if (catLower === 'dapper squad') {
        if (lower === 'product already booked') {
            return 'Product Already Booked';
        }
        if (lower === 'design and color unavailable' || lower === 'model, design and colour not available' || lower === 'design and colour not available') {
            return 'Design and Colour Not Available';
        }
        if (lower === 'price') {
            return 'Price';
        }
        if (lower === 'enquiry') {
            return 'Enquiry';
        }
        if (lower === 'size') {
            return 'Size';
        }
        if (lower === 'shoe') return 'Shoe';
        if (lower === 'shirt') return 'Shirt';
    }

    if (catLower === 'product') {
        if (lower === 'product already booked') {
            return 'Product Already Booked';
        }
        if (lower === 'model, design and colour not available' || lower === 'design and color unavailable' || lower === 'design and colour not available') {
            return 'Design and Colour Not Available';
        }
        if (lower === 'price') {
            return 'Price';
        }
        if (lower === 'size') {
            return 'Size';
        }
        if (lower === 'shoe') return 'Shoe';
        if (lower === 'shirt') return 'Shirt';
    }

    if (lower === 'shoe') return 'Shoe';
    if (lower === 'shirt') return 'Shirt';

    return val.replace(/\b\w/g, c => c.toUpperCase());
};

const NON_SALES_REASONS = new Set([
    'Product Already Booked',
    'Design and Colour Not Available',
    'Model, Design and Colour Not Available',
    'Design and Color Unavailable',
    'Price',
    'Size',
    'Enquiry Without Groom and Bride',
    'Enquiry Without Groom/Bride',
    'Enquiry Without Trial',
    'Enquiry Without Trail',
    'Confirm Later'
]);

const SALES_SUBCATEGORIES = new Set([
    'Shoe',
    'Shirt',
    'Select Sub Category',
    'Select sub category'
]);

const getStatusColors = (statusStr) => {
    const colors = {
        'Booked': { bg: '#dcfce7', color: '#16a34a' },
        'New Booking': { bg: '#dcfce7', color: '#16a34a' },
        'Revisit Booking': { bg: '#dcfce7', color: '#16a34a' },
        'Rentout': { bg: '#fce7f3', color: '#be185d' },
        'Rent Out': { bg: '#fce7f3', color: '#be185d' },
        'Booking & Rentout': { bg: '#fce7f3', color: '#be185d' },
        'Return': { bg: '#fef3c7', color: '#d97706' },
        'Trial': { bg: '#e0e7ff', color: '#4338ca' },
        'Loss': { bg: '#fee2e2', color: '#dc2626' },
        'Revisit Loss': { bg: '#fee2e2', color: '#dc2626' },
        'Cancel': { bg: '#fee2e2', color: '#dc2626' },
        'Cancelled': { bg: '#fee2e2', color: '#dc2626' },
        'Enquiry': { bg: '#f3f4f6', color: '#6b7280' },
        'New Walkin': { bg: '#dbeafe', color: '#2563eb' },
        'Reissue': { bg: '#ede9fe', color: '#7c3aed' },
        'Billed': { bg: '#f3e8ff', color: '#7e22ce' },
        'Bill Returned': { bg: '#fae8ff', color: '#a21caf' }
    };
    const s = String(statusStr || '').trim();
    if (colors[s]) return colors[s];
    const priorityList = [
        'Cancelled', 'Cancel', 'Loss', 'Revisit Loss', 'Rentout', 'Rent Out', 
        'Return', 'Bill Returned', 'Booked', 'New Booking', 'Revisit Booking', 'Billed', 'New Walkin'
    ];
    for (const p of priorityList) {
        if (s.toLowerCase().includes(p.toLowerCase())) {
            return colors[p];
        }
    }
    return { bg: '#f3f4f6', color: '#6b7280' };
};

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
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryWalkin, setSelectedHistoryWalkin] = useState(null);


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
        repeatCount: 1,
        lossProductType: '',
        lossSizeColour: '',
        lossSizeOption: '',
        lossPriceReason: '',
        lossBudget: '',
        lossNote: '',
        lossReason: ''
    });

    const [currentAdmin, setCurrentAdmin] = useState(null);

    // Track walkins that already changed status today
    const [statusChangedToday, setStatusChangedToday] = useState({});
    const [updatingStatus, setUpdatingStatus] = useState({});

    const renderLossAndRevisitFields = () => (
        <>
            {formData.status === 'Loss' ? (
                <>
                    {/* 1. Function Type Dropdown (always visible first under Loss) */}
                    <div className="col-span-12 md:col-span-3">
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Function Type<span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                name="functionType"
                                required
                                value={formData.functionType}
                                onChange={handleInputChange}
                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                            >
                                {getFunctionTypeOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* 2. Category Dropdown (appears once Function Type is selected) */}
                    {formData.functionType && !['Select Function Type', 'Select function type', '-', ''].includes(formData.functionType) && (
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Category<span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    name="category"
                                    required
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                >
                                    <option value="">Select Category</option>
                                    {getCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Fields based on Category Selection */}
                    {formData.category === 'Product' && (
                        <>
                            {/* Product Type Dropdown */}
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Product Type<span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        name="lossProductType"
                                        required
                                        value={formData.lossProductType || ''}
                                        onChange={handleInputChange}
                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                    >
                                        <option value="">Select Product Type</option>
                                        {getProductTypeOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* If Product Type is selected: */}
                            {formData.lossProductType && formData.lossProductType !== '' && (
                                <>
                                    {/* IF Product Type is NOT sales -> Show Reason dropdown */}
                                    {!isSalesProductType(formData.lossProductType) ? (
                                        <>
                                            <div className="col-span-12 md:col-span-3">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Select Reason<span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        name="lossReason"
                                                        required
                                                        value={formData.lossReason || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                    >
                                                        {getSubCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Custom fields under non-sales reasons */}
                                            {formData.lossReason === 'Product Already Booked' && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Size<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSize"
                                                                required
                                                                value={formData.lossSize || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Size</option>
                                                                {['32', '34', '36', '38', '40', '42', '44', '46', '48', 'Others'].map((size) => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Colour<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossColour"
                                                            required
                                                            placeholder="Enter Colour"
                                                            value={formData.lossColour || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {((formData.lossReason || '').toLowerCase().trim() === 'design and colour not available' || (formData.lossReason || '').toLowerCase().trim() === 'design and color unavailable' || (formData.lossReason || '').toLowerCase().trim() === 'model, design and colour not available') && (
                                                <>
                                                    {/* Banner */}
                                                    <div className="col-span-12">
                                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-semibold mb-1 w-full">
                                                            💡 Attachment is the best option for this category.
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Attachment <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                id="walkin-attachment-file"
                                                                onChange={handleFileChange}
                                                                className="hidden"
                                                            />
                                                            <label
                                                                htmlFor="walkin-attachment-file"
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 flex items-center justify-between text-sm focus:outline-none text-gray-600 bg-white cursor-pointer hover:border-gray-400 transition-all font-semibold overflow-hidden"
                                                            >
                                                                <span className="truncate">
                                                                    {selectedFile ? selectedFile.name : (formData.attachmentName || 'Choose File...')}
                                                                </span>
                                                                <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                                </svg>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-9">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {formData.lossReason === 'Price' && (
                                                <div className="col-span-12">
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                        Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                    </label>
                                                    <textarea
                                                        name="lossNote"
                                                        rows={1}
                                                        placeholder="Product Category / Item Name"
                                                        value={formData.lossNote || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                    />
                                                </div>
                                            )}

                                            {formData.lossReason === 'Size' && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Size<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSize"
                                                                required
                                                                value={formData.lossSize || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Size</option>
                                                                {['32', '34', '36', '38', '40', '42', '44', '46', '48', 'Others'].map((size) => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-9">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* IF Product Type IS sales -> Show Sales Sub Category dropdown (shoe, shirt) */}
                                            <div className="col-span-12 md:col-span-3">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Select Sub Category<span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        name="subCategory"
                                                        required
                                                        value={formData.subCategory}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                    >
                                                        {getSubCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Custom fields under sales categories */}
                                            {((formData.subCategory || '').toLowerCase().trim() === 'shoe') && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Colour<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossColour"
                                                            required
                                                            placeholder="Enter Colour"
                                                            value={formData.lossColour || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Size<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSize"
                                                                required
                                                                value={formData.lossSize || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Size</option>
                                                                {['6', '7', '8', '9', '10', 'Others'].map((size) => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Price <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossSalesPrice"
                                                            placeholder="Enter Price"
                                                            value={formData.lossSalesPrice || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {((formData.subCategory || '').toLowerCase().trim() === 'shirt') && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Colour<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossColour"
                                                            required
                                                            placeholder="Enter Colour"
                                                            value={formData.lossColour || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Size<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSize"
                                                                required
                                                                value={formData.lossSize || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Size</option>
                                                                {['32', '34', '36', '38', '40', '42', '44', '46', '48', 'Others'].map((size) => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Price <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossSalesPrice"
                                                            placeholder="Enter Price"
                                                            value={formData.lossSalesPrice || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {formData.category === 'Enquiry' && (
                        <>
                            {/* Product Type Dropdown */}
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Product Type<span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        name="lossProductType"
                                        required
                                        value={formData.lossProductType || ''}
                                        onChange={handleInputChange}
                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                    >
                                        <option value="">Select Product Type</option>
                                        {getProductTypeOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Once Product Type is selected */}
                            {formData.lossProductType && formData.lossProductType !== '' && (
                                <>
                                    {!isSalesProductType(formData.lossProductType) ? (
                                        <>
                                            {/* Select Reason Dropdown */}
                                            <div className="col-span-12 md:col-span-3">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Select Reason<span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        name="lossReason"
                                                        required
                                                        value={formData.lossReason || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                    >
                                                        {getSubCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Conditionally render fields based on reason */}
                                            {((formData.lossReason || '').toLowerCase().trim() === 'enquiry without groom and bride' || (formData.lossReason || '').toLowerCase().trim() === 'enquiry without groom/bride') && (
                                                <div className="col-span-12 md:col-span-6">
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                        Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                    </label>
                                                    <textarea
                                                        name="lossNote"
                                                        rows={1}
                                                        placeholder="Product Category / Item Name"
                                                        value={formData.lossNote || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                    />
                                                </div>
                                            )}

                                            {((formData.lossReason || '').toLowerCase().trim() === 'enquiry without trial' || (formData.lossReason || '').toLowerCase().trim() === 'enquiry without trail') && (
                                                <>
                                                    {/* Remarks Dropdown with long date, just visit */}
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Remarks<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossEnquiryTrailOption"
                                                                required
                                                                value={formData.lossEnquiryTrailOption || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Option</option>
                                                                <option value="long date">Long Date</option>
                                                                <option value="just visit">Just Visit</option>
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Note box */}
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {((formData.lossReason || '').toLowerCase().trim() === 'confirm later') && (
                                                <>
                                                    {/* Next visit date calendar selector */}
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Next Visit Date<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            name="lossEnquiryRevisitDate"
                                                            required
                                                            value={formData.lossEnquiryRevisitDate || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold cursor-pointer"
                                                        />
                                                    </div>

                                                    {/* Note box */}
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Select Sub Category Dropdown for sales */}
                                            <div className="col-span-12 md:col-span-3">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Select Sub Category<span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        name="subCategory"
                                                        required
                                                        value={formData.subCategory}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                    >
                                                        {getSubCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Note box when subCategory is selected (shoe or shirt) */}
                                            {((formData.subCategory || '').toLowerCase().trim() === 'shoe' || (formData.subCategory || '').toLowerCase().trim() === 'shirt') && (
                                                <div className="col-span-12 md:col-span-9">
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                        Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                    </label>
                                                    <textarea
                                                        name="lossNote"
                                                        rows={1}
                                                        placeholder="Product Category / Item Name"
                                                        value={formData.lossNote || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {formData.category === 'Dapper Squad' && (
                        <>
                            {/* Product Type Dropdown */}
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Product Type<span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        name="lossProductType"
                                        required
                                        value={formData.lossProductType || ''}
                                        onChange={handleInputChange}
                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                    >
                                        <option value="">Select Product Type</option>
                                        {getProductTypeOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Once Product Type is selected */}
                            {formData.lossProductType && formData.lossProductType !== '' && (
                                <>
                                    {!isSalesProductType(formData.lossProductType) ? (
                                        <>
                                            {/* Select Reason Dropdown */}
                                            <div className="col-span-12 md:col-span-3">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Select Reason<span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        name="lossReason"
                                                        required
                                                        value={formData.lossReason || ''}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                    >
                                                        {getSubCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Conditionally render fields based on reason */}
                                            {((formData.lossReason || '').toLowerCase().trim() === 'product already booked') && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Size<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSize"
                                                                required
                                                                value={formData.lossSize || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Size</option>
                                                                {['32', '34', '36', '38', '40', '42', '44', '46', '48', 'Others'].map((size) => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Colour<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossColour"
                                                            required
                                                            placeholder="Enter Colour"
                                                            value={formData.lossColour || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {((formData.lossReason || '').toLowerCase().trim() === 'design and colour not available' || (formData.lossReason || '').toLowerCase().trim() === 'design and color unavailable' || (formData.lossReason || '').toLowerCase().trim() === 'model, design and colour not available') && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Attachment <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                id="walkin-attachment-file-ds"
                                                                onChange={handleFileChange}
                                                                className="hidden"
                                                            />
                                                            <label
                                                                htmlFor="walkin-attachment-file-ds"
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 flex items-center justify-between text-sm focus:outline-none text-gray-600 bg-white cursor-pointer hover:border-gray-400 transition-all font-semibold overflow-hidden"
                                                            >
                                                                <span className="truncate">
                                                                    {selectedFile ? selectedFile.name : (formData.attachmentName || 'Choose File...')}
                                                                </span>
                                                                <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                                </svg>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-9">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {((formData.lossReason || '').toLowerCase().trim() === 'price') && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Remarks<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSelectRemarks"
                                                                required
                                                                value={formData.lossSelectRemarks || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Option</option>
                                                                <option value="price too high">Price Too High</option>
                                                                <option value="budget restriction">Budget Restriction</option>
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-9">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {((formData.lossReason || '').toLowerCase().trim() === 'enquiry') && (
                                                <>
                                                    {/* Next visit date calendar selector */}
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Next Visit Date<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            name="lossEnquiryRevisitDate"
                                                            required
                                                            value={formData.lossEnquiryRevisitDate || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold cursor-pointer"
                                                        />
                                                    </div>

                                                    {/* Note box */}
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {((formData.lossReason || '').toLowerCase().trim() === 'size') && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Size<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSize"
                                                                required
                                                                value={formData.lossSize || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Size</option>
                                                                {['32', '34', '36', '38', '40', '42', '44', '46', '48', 'Others'].map((size) => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-9">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Select Sub Category Dropdown for sales */}
                                            <div className="col-span-12 md:col-span-3">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Select Sub Category<span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        name="subCategory"
                                                        required
                                                        value={formData.subCategory}
                                                        onChange={handleInputChange}
                                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                    >
                                                        {getSubCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Custom fields under sales categories */}
                                            {((formData.subCategory || '').toLowerCase().trim() === 'shoe') && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Colour<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossColour"
                                                            required
                                                            placeholder="Enter Colour"
                                                            value={formData.lossColour || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Size<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSize"
                                                                required
                                                                value={formData.lossSize || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Size</option>
                                                                {['6', '7', '8', '9', '10', 'Others'].map((size) => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Price <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossSalesPrice"
                                                            placeholder="Enter Price"
                                                            value={formData.lossSalesPrice || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {((formData.subCategory || '').toLowerCase().trim() === 'shirt') && (
                                                <>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Colour<span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossColour"
                                                            required
                                                            placeholder="Enter Colour"
                                                            value={formData.lossColour || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Select Size<span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <select
                                                                name="lossSize"
                                                                required
                                                                value={formData.lossSize || ''}
                                                                onChange={handleInputChange}
                                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                            >
                                                                <option value="">Select Size</option>
                                                                {['32', '34', '36', '38', '40', '42', '44', '46', '48', 'Others'].map((size) => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Price <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="lossSalesPrice"
                                                            placeholder="Enter Price"
                                                            value={formData.lossSalesPrice || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                                        />
                                                    </div>
                                                    <div className="col-span-12">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                                        </label>
                                                        <textarea
                                                            name="lossNote"
                                                            rows={1}
                                                            placeholder="Product Category / Item Name"
                                                            value={formData.lossNote || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {formData.category === 'Customization' && (
                        <>
                            {/* Product Type Dropdown */}
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Product Type<span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        name="lossProductType"
                                        required
                                        value={formData.lossProductType || ''}
                                        onChange={handleInputChange}
                                        className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                    >
                                        <option value="">Select Product Type</option>
                                        {getProductTypeOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Once Product Type is selected */}
                            {formData.lossProductType && formData.lossProductType !== '' && (
                                <>
                                    {/* Size dropdown */}
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Select Size<span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                name="lossSize"
                                                required
                                                value={formData.lossSize || ''}
                                                onChange={handleInputChange}
                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                            >
                                                <option value="">Select Size</option>
                                                {['32', '34', '36', '38', '40', '42', '44', '46', '48', 'Others'].map((size) => (
                                                    <option key={size} value={size}>{size}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Colour input field */}
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Colour<span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="lossColour"
                                            required
                                            placeholder="Enter Colour"
                                            value={formData.lossColour || ''}
                                            onChange={handleInputChange}
                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white font-semibold"
                                        />
                                    </div>

                                    {/* Attach image option */}
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Attachment <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="walkin-attachment-file-custom"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="walkin-attachment-file-custom"
                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 flex items-center justify-between text-sm focus:outline-none text-gray-600 bg-white cursor-pointer hover:border-gray-400 transition-all font-semibold overflow-hidden"
                                            >
                                                <span className="truncate">
                                                    {selectedFile ? selectedFile.name : (formData.attachmentName || 'Choose File...')}
                                                </span>
                                                <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Note field */}
                                    <div className="col-span-12">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Note <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <textarea
                                            name="lossNote"
                                            rows={1}
                                            placeholder="Product Category / Item Name"
                                            value={formData.lossNote || ''}
                                            onChange={handleInputChange}
                                            className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-300 resize-none font-semibold"
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </>
            ) : (
                /* STANDARD FLOW (NOT 'Loss') */
                <>
                    {/* Category Select (Visible only for Revisit) */}
                    {formData.status === 'Revisit' && (
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Category<span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    name="category"
                                    required
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                >
                                    <option value="">Select Category</option>
                                    {getCategoryOptions().map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Standard Remarks Textarea */}
                    {formData.status !== 'New Walkin' && (
                        <div className={formData.status === 'Revisit' ? "col-span-12 md:col-span-6" : "col-span-12 md:col-span-9"}>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Remarks <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                name="remarks"
                                rows={1}
                                placeholder="Enter your remarks..."
                                value={formData.remarks}
                                onChange={handleInputChange}
                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white placeholder-gray-400 resize-none font-semibold"
                            />
                        </div>
                    )}
                </>
            )}
        </>
    );

    const isRestrictedEdit = (user?.role === 'cluster_admin' || user?.role === 'store_admin') && (formData._id || customerExistsNotification);
    const isAdmin = ['super_admin', 'admin', 'hr_admin', 'cluster_admin', 'store_admin'].includes(user?.role);

    const safeDateOnly = (dateStr) => {
        if (!dateStr || dateStr === '-') return new Date().toISOString().split('T')[0];
        return dateStr.split(' ')[0].split('T')[0];
    };

    const parseRemarks = (remarksStr) => {
        let lossProductType = '';
        let lossSizeColour = '';
        let lossSizeOption = '';
        let lossPriceReason = '';
        let lossBudget = '';
        let lossNote = '';
        let lossEnquiryGroomComing = '';
        let lossEnquiryTrailOption = '';
        let lossEnquiryNextVisitDate = '';
        let lossEnquiryConfirmReason = '';
        let lossEnquiryRevisitDate = '';
        let lossColour = '';
        let lossSize = '';
        let lossSelectRemarks = '';
        let lossSalesPrice = '';
        let parsedSubCategory = '';

        if (remarksStr && remarksStr.startsWith('[')) {
            // Check category prefix to parse correctly
            if (remarksStr.startsWith('[Product Already Booked]') || remarksStr.startsWith('[product already booked]')) {
                const productMatch = remarksStr.match(/Product:\s*([^|]+)/);
                if (productMatch) lossProductType = productMatch[1].trim();

                const sizeMatch = remarksStr.match(/Size:\s*([^|]+)/);
                if (sizeMatch) lossSize = sizeMatch[1].trim();

                const colourMatch = remarksStr.match(/Colour:\s*([^|]+)/);
                if (colourMatch) lossColour = colourMatch[1].trim();

                const sizeColourMatch = remarksStr.match(/Size & Colour:\s*([^|]+)/);
                if (sizeColourMatch) lossSizeColour = sizeColourMatch[1].trim();
            } else if (remarksStr.startsWith('[Model, Design and Colour Not Available]') || remarksStr.startsWith('[design and color unavailable]') || remarksStr.startsWith('[design and colour not available]') || remarksStr.startsWith('[Design and Colour Not Available]')) {
                const productMatch = remarksStr.match(/Product:\s*([^|]+)/);
                if (productMatch) lossProductType = productMatch[1].trim();

                const sizeColourMatch = remarksStr.match(/Size & Colour:\s*([^|]+)/);
                if (sizeColourMatch) lossSizeColour = sizeColourMatch[1].trim();
            } else if (remarksStr.startsWith('[Size]') || remarksStr.startsWith('[size]')) {
                const productMatch = remarksStr.match(/Product:\s*([^|]+)/);
                if (productMatch) lossProductType = productMatch[1].trim();

                const sizeMatch = remarksStr.match(/Size:\s*([^|]+)/);
                if (sizeMatch) lossSize = sizeMatch[1].trim();

                const sizeOptionMatch = remarksStr.match(/Selected:\s*([^|]+)/);
                if (sizeOptionMatch) lossSizeOption = sizeOptionMatch[1].trim();
            } else if (remarksStr.startsWith('[Price]') || remarksStr.startsWith('[price]')) {
                const remarksMatch = remarksStr.match(/Remarks:\s*([^|]+)/);
                if (remarksMatch) lossSelectRemarks = remarksMatch[1].trim();

                const priceReasonMatch = remarksStr.match(/Reason:\s*([^|]+)/);
                if (priceReasonMatch) lossPriceReason = priceReasonMatch[1].trim();

                const budgetMatch = remarksStr.match(/Budget:\s*([^|]+)/);
                if (budgetMatch) lossBudget = budgetMatch[1].trim();
            } else if (remarksStr.startsWith('[Sales]') || remarksStr.startsWith('[sales]') || remarksStr.startsWith('[Sale Products]') || remarksStr.startsWith('[sale products]')) {
                lossProductType = 'Sale Products';

                const subCategoryMatch = remarksStr.match(/Sub Category:\s*([^|]+)/);
                if (subCategoryMatch) parsedSubCategory = subCategoryMatch[1].trim();

                const sizeMatch = remarksStr.match(/Size:\s*([^|]+)/);
                if (sizeMatch) lossSize = sizeMatch[1].trim();

                const colourMatch = remarksStr.match(/Colour:\s*([^|]+)/);
                if (colourMatch) lossColour = colourMatch[1].trim();

                const priceMatch = remarksStr.match(/Price:\s*([^|]+)/);
                if (priceMatch) lossSalesPrice = priceMatch[1].trim();
            } else if (remarksStr.startsWith('[Enquiry Without Groom/Bride]') || remarksStr.startsWith('[enquiry without groom and bride]')) {
                const productMatch = remarksStr.match(/Product:\s*([^|]+)/);
                if (productMatch) lossProductType = productMatch[1].trim();

                const groomMatch = remarksStr.match(/Groom Coming:\s*([^|]+)/);
                if (groomMatch) lossEnquiryGroomComing = groomMatch[1].trim();
            } else if (remarksStr.startsWith('[Enquiry Without Trail]') || remarksStr.startsWith('[enquiry without trial]')) {
                const productMatch = remarksStr.match(/Product:\s*([^|]+)/);
                if (productMatch) lossProductType = productMatch[1].trim();

                const trailMatch = remarksStr.match(/Selected:\s*([^|]+)/);
                if (trailMatch) {
                    lossEnquiryTrailOption = trailMatch[1].trim().toLowerCase();
                }

                const nextVisitMatch = remarksStr.match(/Next Visit Date:\s*([^|]+)/);
                if (nextVisitMatch) lossEnquiryNextVisitDate = nextVisitMatch[1].trim();
            } else if (remarksStr.startsWith('[Confirm Later]') || remarksStr.startsWith('[confirm later]')) {
                const productMatch = remarksStr.match(/Product:\s*([^|]+)/);
                if (productMatch) lossProductType = productMatch[1].trim();

                const confirmMatch = remarksStr.match(/Reason:\s*([^|]+)/);
                if (confirmMatch) lossEnquiryConfirmReason = confirmMatch[1].trim();

                const revisitMatch = remarksStr.match(/Revisit Date:\s*([^|]+)/);
                if (revisitMatch) lossEnquiryRevisitDate = revisitMatch[1].trim();
            } else if (remarksStr.startsWith('[Customization]') || remarksStr.startsWith('[customization]')) {
                const productMatch = remarksStr.match(/Product:\s*([^|]+)/);
                if (productMatch) lossProductType = productMatch[1].trim();

                const sizeMatch = remarksStr.match(/Size:\s*([^|]+)/);
                if (sizeMatch) lossSize = sizeMatch[1].trim();

                const colourMatch = remarksStr.match(/Colour:\s*([^|]+)/);
                if (colourMatch) lossColour = colourMatch[1].trim();
            }

            const noteMatch = remarksStr.match(/Note:\s*(.*)$/);
            if (noteMatch) {
                lossNote = noteMatch[1].trim();
            } else {
                const prefixMatch = remarksStr.match(/^\[[^\]]+\]\s*(.*)/);
                if (prefixMatch) {
                    lossNote = prefixMatch[1].trim();
                } else {
                    lossNote = remarksStr;
                }
            }
        } else {
            lossNote = remarksStr || '';
        }

        return {
            lossProductType: normalizeProductType(lossProductType),
            lossSizeColour,
            lossSizeOption,
            lossPriceReason,
            lossBudget,
            lossNote,
            lossEnquiryGroomComing,
            lossEnquiryTrailOption,
            lossEnquiryNextVisitDate,
            lossEnquiryConfirmReason,
            lossEnquiryRevisitDate,
            lossColour,
            lossSize: (lossSize === 'others' || lossSize === 'Others') ? 'Others' : lossSize,
            lossSelectRemarks,
            lossSalesPrice,
            parsedSubCategory: normalizeSubCategory(parsedSubCategory)
        };
    };

    const getResetFormData = (admin = currentAdmin, branchList = branches) => {
        let defStore = '';
        let defStoreId = '';

        if (user?.role === 'store_admin') {
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
        }

        const isStoreAdmin = user?.role === 'store_admin';

        return {
            _id: '',
            date: new Date().toISOString().split('T')[0],
            customerName: '',
            contact: '',
            functionDate: new Date().toISOString().split('T')[0],
            store: defStore,
            storeId: defStoreId,
            staff: '',
            employeeId: '',
            category: '-',
            subCategory: '-',
            functionType: '-',
            remarks: '',
            status: 'New Walkin',
            repeatCount: 1,
            lossProductType: '',
            lossSizeColour: '',
            lossSizeOption: '',
            lossPriceReason: '',
            lossBudget: '',
            lossNote: '',
            lossEnquiryGroomComing: '',
            lossEnquiryTrailOption: '',
            lossEnquiryNextVisitDate: '',
            lossEnquiryConfirmReason: '',
            lossEnquiryRevisitDate: '',
            lossColour: '',
            lossSize: '',
            lossSelectRemarks: '',
            lossSalesPrice: '',
            lossReason: ''
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
                const fetchedWalkins = walkinJson.data || [];
                setWalkins(fetchedWalkins);
                setTotalWalkins(Number(walkinJson.count || 0));

                const initialStatusChanged = {};
                fetchedWalkins.forEach(w => {
                    if (w.statusChangedToday) {
                        initialStatusChanged[w._id] = true;
                    }
                });
                setStatusChangedToday(initialStatusChanged);
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
                if (user?.role === 'store_admin' && branchList.length > 0) {
                    setStoreFilter(branchList[0].workingBranch);
                }

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

    // Load employees dynamically based on storeId or store name
    const loadEmployees = async (storeId, storeName = null) => {
        try {
            let url = `${baseUrl.baseUrl}api/admin/accessible-employees`;
            if (storeId) {
                url += `?storeId=${storeId}`;
            } else if (storeName) {
                url += `?store=${encodeURIComponent(storeName)}`;
            }
            const empRes = await fetch(url, {
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const empJson = await empRes.json();
            const empList = Array.isArray(empJson?.employees) ? empJson.employees : [];
            setEmployees(empList);
        } catch (err) {
        }
    };

    // Auto-load employees when storeId or store changes
    useEffect(() => {
        if (token) {
            loadEmployees(formData.storeId, formData.storeId ? null : formData.store);
        }
    }, [formData.storeId, formData.store, token]);

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
                subCategory: prev.status === 'Loss' ?
                    (value === 'Product' ? (isSalesProductType(prev.lossProductType) ? 'Select Sub Category' : 'Select Reason') : (value === 'Dapper Squad' ? 'Select Reason' : 'Select Sub Category')) : '-',
                lossProductType: '',
                lossColour: '',
                lossSize: '',
                lossSelectRemarks: '',
                lossSalesPrice: '',
                lossSizeColour: '',
                lossSizeOption: '',
                lossPriceReason: '',
                lossBudget: '',
                lossEnquiryGroomComing: '',
                lossEnquiryTrailOption: '',
                lossEnquiryNextVisitDate: '',
                lossEnquiryConfirmReason: '',
                lossEnquiryRevisitDate: ''
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
            let finalFunctionType = formData.functionType || '-';

            if (value === 'Loss') {
                finalCategory = '';
                finalSubCategory = 'Select Sub Category';
                finalFunctionType = 'Select Function Type';
            } else if (value === 'Revisit') {
                if (!['Trial', 'Reissue', 'Loss'].includes(formData.category)) {
                    finalCategory = 'Trial';
                }
                finalSubCategory = '-';
                finalFunctionType = '-';
            } else {
                finalCategory = '-';
                finalSubCategory = '-';
                finalFunctionType = '-';
            }

            setFormData(prev => ({
                ...prev,
                status: value,
                category: finalCategory,
                subCategory: finalSubCategory,
                functionType: finalFunctionType,
                remarks: value === 'New Walkin' ? '' : prev.remarks,
                lossProductType: '',
                lossColour: '',
                lossSize: '',
                lossSelectRemarks: '',
                lossSalesPrice: '',
                lossSizeColour: '',
                lossSizeOption: '',
                lossPriceReason: '',
                lossBudget: '',
                lossEnquiryGroomComing: '',
                lossEnquiryTrailOption: '',
                lossEnquiryNextVisitDate: '',
                lossEnquiryConfirmReason: '',
                lossEnquiryRevisitDate: ''
            }));
            return;
        }

        if (name === 'lossProductType') {
            const isSales = isSalesProductType(value);
            setFormData(prev => ({
                ...prev,
                lossProductType: value,
                subCategory: isSales ? 'Select Sub Category' : '-',
                lossReason: isSales ? '' : 'Select Reason',
                lossColour: '',
                lossSize: '',
                lossSelectRemarks: '',
                lossSalesPrice: '',
                lossEnquiryGroomComing: '',
                lossEnquiryTrailOption: '',
                lossEnquiryNextVisitDate: '',
                lossEnquiryConfirmReason: '',
                lossEnquiryRevisitDate: ''
            }));
            return;
        }

        if (name === 'lossReason' && formData.status === 'Loss') {
            setFormData(prev => ({
                ...prev,
                lossReason: value,
                lossColour: '',
                lossSize: '',
                lossSelectRemarks: '',
                lossSalesPrice: '',
                lossEnquiryGroomComing: '',
                lossEnquiryTrailOption: '',
                lossEnquiryNextVisitDate: '',
                lossEnquiryConfirmReason: '',
                lossEnquiryRevisitDate: ''
            }));
            return;
        }

        if (name === 'subCategory' && formData.status === 'Loss') {
            setFormData(prev => ({
                ...prev,
                subCategory: value,
                lossColour: '',
                lossSize: '',
                lossSelectRemarks: '',
                lossSalesPrice: ''
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
            loadEmployees(branchId, value);
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
                const parsed = parseRemarks(json.data.remarks || '');
                // Override with direct database properties if present and not empty/default
                if (json.data.notes && json.data.notes !== '-' && json.data.notes.trim() !== '') parsed.lossNote = json.data.notes;
                if (json.data.lossProductType && json.data.lossProductType !== '-' && json.data.lossProductType.trim() !== '') {
                    parsed.lossProductType = normalizeProductType(json.data.lossProductType);
                }
                if (json.data.lossSize && json.data.lossSize !== '-' && json.data.lossSize.trim() !== '') parsed.lossSize = json.data.lossSize;
                if (json.data.lossColour && json.data.lossColour !== '-' && json.data.lossColour.trim() !== '') parsed.lossColour = json.data.lossColour;
                if (json.data.lossSalesPrice && json.data.lossSalesPrice !== '-' && json.data.lossSalesPrice.trim() !== '') parsed.lossSalesPrice = json.data.lossSalesPrice;
                if (json.data.lossSelectRemarks && json.data.lossSelectRemarks !== '-' && json.data.lossSelectRemarks.trim() !== '') parsed.lossSelectRemarks = json.data.lossSelectRemarks;
                if (json.data.lossEnquiryTrailOption && json.data.lossEnquiryTrailOption !== '-' && json.data.lossEnquiryTrailOption.trim() !== '') parsed.lossEnquiryTrailOption = json.data.lossEnquiryTrailOption;
                if (json.data.lossEnquiryRevisitDate && json.data.lossEnquiryRevisitDate !== '-' && json.data.lossEnquiryRevisitDate.trim() !== '') parsed.lossEnquiryRevisitDate = json.data.lossEnquiryRevisitDate;

                let subCat = json.data.subCategory || '-';
                if ((!subCat || subCat === '-') && parsed.parsedSubCategory) {
                    subCat = parsed.parsedSubCategory;
                }
                subCat = normalizeSubCategory(subCat, json.data.category);

                let funcType = json.data.functionType || '-';
                if (funcType.toLowerCase().trim() === 'others functions' || funcType.toLowerCase().trim() === 'other functions') {
                    funcType = 'Other Functions';
                }

                setFormData(prev => ({
                    ...prev,
                    customerName: json.data.customerName || prev.customerName,
                    functionDate: safeDateOnly(json.data.functionDate) || prev.functionDate,
                    category: json.data.category || prev.category,
                    subCategory: subCat,
                    functionType: funcType,
                    remarks: json.data.remarks || prev.remarks,
                    status: json.data.status || prev.status,
                    repeatCount: json.data.repeatCount || 1,
                    date: safeDateOnly(json.data.date) || prev.date,
                    ...parsed
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

    const handleShowHistory = (w) => {
        setSelectedHistoryWalkin(w);
        setShowHistoryModal(true);
    };

    // Handle inline status change for walkins
    const handleStatusChange = async (walkinRecord, newStatus) => {
        if (newStatus === 'Loss' || newStatus === 'Revisit') {
            const foundBranch = branches.find(b => b.workingBranch === walkinRecord.store);
            const storeIdToLoad = walkinRecord.storeId || (foundBranch ? foundBranch._id : '');
            const parsed = parseRemarks(walkinRecord.remarks || '');
            if (walkinRecord.notes && walkinRecord.notes !== '-' && walkinRecord.notes.trim() !== '') parsed.lossNote = walkinRecord.notes;
            if (walkinRecord.lossProductType && walkinRecord.lossProductType !== '-' && walkinRecord.lossProductType.trim() !== '') parsed.lossProductType = normalizeProductType(walkinRecord.lossProductType);
            if (walkinRecord.lossSize && walkinRecord.lossSize !== '-' && walkinRecord.lossSize.trim() !== '') parsed.lossSize = walkinRecord.lossSize;
            if (walkinRecord.lossColour && walkinRecord.lossColour !== '-' && walkinRecord.lossColour.trim() !== '') parsed.lossColour = walkinRecord.lossColour;
            if (walkinRecord.lossSalesPrice && walkinRecord.lossSalesPrice !== '-' && walkinRecord.lossSalesPrice.trim() !== '') parsed.lossSalesPrice = walkinRecord.lossSalesPrice;
            if (walkinRecord.lossSelectRemarks && walkinRecord.lossSelectRemarks !== '-' && walkinRecord.lossSelectRemarks.trim() !== '') parsed.lossSelectRemarks = walkinRecord.lossSelectRemarks;
            if (walkinRecord.lossReason && walkinRecord.lossReason !== '-' && walkinRecord.lossReason.trim() !== '') parsed.lossReason = walkinRecord.lossReason;
            if (walkinRecord.lossEnquiryTrailOption && walkinRecord.lossEnquiryTrailOption !== '-' && walkinRecord.lossEnquiryTrailOption.trim() !== '') parsed.lossEnquiryTrailOption = walkinRecord.lossEnquiryTrailOption;
            if (walkinRecord.lossEnquiryRevisitDate && walkinRecord.lossEnquiryRevisitDate !== '-' && walkinRecord.lossEnquiryRevisitDate.trim() !== '') parsed.lossEnquiryRevisitDate = walkinRecord.lossEnquiryRevisitDate;

            let finalCategory = walkinRecord.category || '';
            let finalSubCategory = walkinRecord.subCategory || '-';
            let finalFunctionType = walkinRecord.functionType || '-';

            if (newStatus === 'Loss') {
                finalCategory = '';
                finalSubCategory = 'Select Sub Category';
                finalFunctionType = 'Select Function Type';
            } else if (newStatus === 'Revisit') {
                if (!['Trial', 'Reissue', 'Loss'].includes(walkinRecord.category)) {
                    finalCategory = 'Trial';
                }
                finalSubCategory = '-';
                finalFunctionType = '-';
            }

            setFormData({
                ...walkinRecord,
                ...parsed,
                storeId: storeIdToLoad,
                status: newStatus,
                category: finalCategory,
                subCategory: finalSubCategory,
                functionType: finalFunctionType
            });
            setShowStatusModal(true);
            return;
        }

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

        const parsed = parseRemarks(w.remarks || '');
        // Override with direct database properties if present and not empty/default
        if (w.notes && w.notes !== '-' && w.notes.trim() !== '') parsed.lossNote = w.notes;
        if (w.lossProductType && w.lossProductType !== '-' && w.lossProductType.trim() !== '') {
            parsed.lossProductType = normalizeProductType(w.lossProductType);
        }
        if (w.lossSize && w.lossSize !== '-' && w.lossSize.trim() !== '') parsed.lossSize = w.lossSize;
        if (w.lossColour && w.lossColour !== '-' && w.lossColour.trim() !== '') parsed.lossColour = w.lossColour;
        if (w.lossSalesPrice && w.lossSalesPrice !== '-' && w.lossSalesPrice.trim() !== '') parsed.lossSalesPrice = w.lossSalesPrice;
        if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks.trim() !== '') parsed.lossSelectRemarks = w.lossSelectRemarks;
        if (w.lossEnquiryTrailOption && w.lossEnquiryTrailOption !== '-' && w.lossEnquiryTrailOption.trim() !== '') parsed.lossEnquiryTrailOption = w.lossEnquiryTrailOption;
        if (w.lossEnquiryRevisitDate && w.lossEnquiryRevisitDate !== '-' && w.lossEnquiryRevisitDate.trim() !== '') parsed.lossEnquiryRevisitDate = w.lossEnquiryRevisitDate;
        parsed.lossReason = w.lossReason || (w.status === 'Loss' ? w.subCategory : '');

        let subCat = w.subCategory || '-';
        if ((!subCat || subCat === '-') && parsed.parsedSubCategory) {
            subCat = parsed.parsedSubCategory;
        }
        subCat = normalizeSubCategory(subCat, w.category);

        if (w.status === 'Loss' && NON_SALES_REASONS.has(subCat)) {
            if (!parsed.lossReason || ['Select Reason', 'Select reason', '-', ''].includes(parsed.lossReason)) {
                parsed.lossReason = subCat;
            }
            subCat = '-';
        }

        let funcType = w.functionType || '-';
        if (funcType.toLowerCase().trim() === 'others functions' || funcType.toLowerCase().trim() === 'other functions') {
            funcType = 'Other Functions';
        }

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
            subCategory: subCat,
            functionType: funcType,
            remarks: w.remarks || '',
            status: w.status || 'New Walkin',
            repeatCount: w.repeatCount || 1,
            ...parsed
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
            if (!formData.functionType || ['Select Function Type', 'Select function type', '-', ''].includes(formData.functionType)) {
                alert('Please select a Function Type.');
                return;
            }
            if (!formData.category || formData.category === '-' || formData.category === '') {
                alert('Please select a Category.');
                return;
            }

            const prodTypeLower = (formData.lossProductType || '').toLowerCase().trim();
            const subCatLower = (formData.subCategory || '').toLowerCase().trim();
            const lossReasonLower = (formData.lossReason || '').toLowerCase().trim();

            if (formData.category === 'Product') {
                if (!formData.lossProductType || formData.lossProductType === '') {
                    alert('Please select a Product Type.');
                    return;
                }

                if (isSalesProductType(prodTypeLower)) {
                    if (!formData.subCategory || ['Select Sub Category', 'Select sub category', '-', ''].includes(formData.subCategory)) {
                        alert('Please select a Sales Sub Category.');
                        return;
                    }
                    if (!formData.lossColour || formData.lossColour.trim() === '') {
                        alert('Please enter a Colour.');
                        return;
                    }
                    if (!formData.lossSize || formData.lossSize === '') {
                        alert('Please select a Size.');
                        return;
                    }
                } else {
                    if (!formData.lossReason || ['Select Sub Category', 'Select sub category', 'Select Reason', 'Select reason', '-', ''].includes(formData.lossReason)) {
                        alert('Please select a Reason.');
                        return;
                    }
                    if (lossReasonLower === 'product already booked') {
                        if (!formData.lossSize || formData.lossSize === '') {
                            alert('Please select a Size.');
                            return;
                        }
                        if (!formData.lossColour || formData.lossColour.trim() === '') {
                            alert('Please enter a Colour.');
                            return;
                        }

                    } else if (lossReasonLower === 'size') {
                        if (!formData.lossSize || formData.lossSize === '') {
                            alert('Please select a Size.');
                            return;
                        }
                    }
                }
            } else {
                if (formData.category === 'Enquiry') {
                    if (!formData.lossProductType || formData.lossProductType === '') {
                        alert('Please select a Product Type.');
                        return;
                    }
                    if (isSalesProductType(prodTypeLower)) {
                        if (!formData.subCategory || ['Select Sub Category', 'Select sub category', '-', ''].includes(formData.subCategory)) {
                            alert('Please select a Sales Sub Category.');
                            return;
                        }
                    } else {
                        if (!formData.lossReason || ['Select Reason', 'Select reason', '-', ''].includes(formData.lossReason)) {
                            alert('Please select a Reason.');
                            return;
                        }
                        if (lossReasonLower === 'enquiry without trial' || lossReasonLower === 'enquiry without trail') {
                            if (!formData.lossEnquiryTrailOption || formData.lossEnquiryTrailOption === '') {
                                alert('Please select a Remarks Option.');
                                return;
                            }
                        } else if (lossReasonLower === 'confirm later') {
                            if (!formData.lossEnquiryRevisitDate || formData.lossEnquiryRevisitDate === '') {
                                alert('Please enter when the customer will revisit.');
                                return;
                            }
                        }
                    }
                } else if (formData.category === 'Dapper Squad') {
                    if (!formData.lossProductType || formData.lossProductType === '') {
                        alert('Please select a Product Type.');
                        return;
                    }
                    if (isSalesProductType(prodTypeLower)) {
                        if (!formData.subCategory || ['Select Sub Category', 'Select sub category', '-', ''].includes(formData.subCategory)) {
                            alert('Please select a Sales Sub Category.');
                            return;
                        }
                        if (!formData.lossColour || formData.lossColour.trim() === '') {
                            alert('Please enter a Colour.');
                            return;
                        }
                        if (!formData.lossSize || formData.lossSize === '') {
                            alert('Please select a Size.');
                            return;
                        }
                    } else {
                        if (!formData.lossReason || ['Select Reason', 'Select reason', '-', ''].includes(formData.lossReason)) {
                            alert('Please select a Reason.');
                            return;
                        }
                        if (lossReasonLower === 'product already booked') {
                            if (!formData.lossSize || formData.lossSize === '') {
                                alert('Please select a Size.');
                                return;
                            }
                            if (!formData.lossColour || formData.lossColour.trim() === '') {
                                alert('Please enter a Colour.');
                                return;
                            }
                        } else if (lossReasonLower === 'price') {
                            if (!formData.lossSelectRemarks || formData.lossSelectRemarks === '') {
                                alert('Please select a Price Option.');
                                return;
                            }
                        } else if (lossReasonLower === 'enquiry') {
                            if (!formData.lossEnquiryRevisitDate || formData.lossEnquiryRevisitDate === '') {
                                alert('Please enter when the customer will revisit.');
                                return;
                            }
                        } else if (lossReasonLower === 'size') {
                            if (!formData.lossSize || formData.lossSize === '') {
                                alert('Please select a Size.');
                                return;
                            }
                        }
                    }
                } else if (formData.category === 'Customization') {
                    if (!formData.lossProductType || formData.lossProductType === '') {
                        alert('Please select a Product Type.');
                        return;
                    }
                    if (!formData.lossSize || formData.lossSize === '') {
                        alert('Please select a Size.');
                        return;
                    }
                    if (!formData.lossColour || formData.lossColour.trim() === '') {
                        alert('Please enter a Colour.');
                        return;
                    }
                }
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

            const finalRemarks = formData.remarks || '';

            const isSales = isSalesProductType(formData.lossProductType);
            const cleanSubCategory = (formData.status === 'Loss' && isSales)
                ? ((formData.subCategory && !['Select Sub Category', 'Select sub category', '-', ''].includes(formData.subCategory)) ? formData.subCategory : '-')
                : ((formData.status === 'Loss') ? '-' : formData.subCategory);
            const cleanLossReason = (formData.status === 'Loss' && !isSales)
                ? ((formData.lossReason && !['Select Reason', 'Select reason', '-', ''].includes(formData.lossReason)) ? formData.lossReason : '')
                : '';

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
                    subCategory: cleanSubCategory,
                    functionType: formData.functionType,
                    fileAttachment,
                    remarks: finalRemarks,
                    notes: formData.lossNote || '',
                    lossProductType: formData.lossProductType || '',
                    lossSize: formData.lossSize || '',
                    lossColour: formData.lossColour || '',
                    lossSalesPrice: formData.lossSalesPrice || '',
                    lossSelectRemarks: formData.lossSelectRemarks || '',
                    lossEnquiryTrailOption: formData.lossEnquiryTrailOption || '',
                    lossEnquiryRevisitDate: formData.lossEnquiryRevisitDate || '',
                    lossReason: cleanLossReason,
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

    const showCategory = formData.status === 'Revisit' || (formData.status === 'Loss' && formData.functionType && !['Select Function Type', 'Select function type', '-', ''].includes(formData.functionType));
    const showSubCategory = formData.status === 'Loss' && (
        formData.category === 'Product' || formData.category === 'Enquiry' || formData.category === 'Dapper Squad'
    ) && formData.lossProductType && formData.lossProductType !== '';
    const showFunctionType = formData.status === 'Loss';
    const showAttachmentInput = formData.status === 'Loss' && formData.category === 'Product' && ((formData.subCategory || '').toLowerCase().trim() === 'design and colour not available' || (formData.subCategory || '').toLowerCase().trim() === 'model, design and colour not available' || (formData.subCategory || '').toLowerCase().trim() === 'design and color unavailable');

    const getProductTypeOptions = () => {
        const isCentralAdmin = ['super_admin', 'admin', 'hr_admin', 'cluster_admin'].includes(user?.role);
        let options = [];
        const storeLower = (formData.store || '').toLowerCase().trim();

        if (storeLower) {
            if (storeLower.includes('zorucci') || storeLower.startsWith('z')) {
                options = [
                    'Lehenga', 'Pakistani Lehenga', 'Arabic Lehenga', 'Gown', 'Body Cons', 'Saree', 'Party Wear', 'Sharara', 'Peplum', 'Jewellery', 'Sale Products'
                ];
            } else {
                options = ['2 Piece Suit', '3 Piece Suit', 'Bandhgala', 'Indowestern', 'Kurtha', 'Kids Suit', 'Sale Products'];
            }
        } else {
            if (isCentralAdmin) {
                options = [
                    '2 Piece Suit', '3 Piece Suit', 'Bandhgala', 'Indowestern', 'Kurtha', 'Kids Suit',
                    'Lehenga', 'Pakistani Lehenga', 'Arabic Lehenga', 'Gown', 'Body Cons', 'Saree', 'Party Wear', 'Sharara', 'Peplum', 'Jewellery',
                    'Sale Products'
                ];
            } else {
                options = ['2 Piece Suit', '3 Piece Suit', 'Bandhgala', 'Indowestern', 'Kurtha', 'Kids Suit', 'Sale Products'];
            }
        }

        if (formData.category === 'Customization') {
            options = options.filter(opt => opt !== 'Sale Products');
        }
        return options;
    };

    const getCategoryOptions = () => {
        if (formData.status === 'Loss') {
            return ['Product', 'Enquiry', 'Dapper Squad', 'Customization'];
        }
        if (formData.status === 'Revisit') {
            return ['Trial', 'Reissue', 'Loss'];
        }
        return [];
    };

    const getSubCategoryOptions = () => {
        if (formData.status === 'Loss') {
            if (formData.category === 'Product') {
                if (isSalesProductType(formData.lossProductType)) {
                    return [
                        'Select Sub Category',
                        'Shoe',
                        'Shirt'
                    ];
                } else {
                    return [
                        'Select Reason',
                        'Product Already Booked',
                        'Design and Colour Not Available',
                        'Price',
                        'Size'
                    ];
                }
            }
            if (formData.category === 'Enquiry') {
                if (isSalesProductType(formData.lossProductType)) {
                    return [
                        'Select Sub Category',
                        'Shoe',
                        'Shirt'
                    ];
                } else {
                    return [
                        'Select Reason',
                        'Enquiry Without Groom and Bride',
                        'Enquiry Without Trial',
                        'Confirm Later'
                    ];
                }
            }
            if (formData.category === 'Dapper Squad') {
                if (isSalesProductType(formData.lossProductType)) {
                    return [
                        'Select Sub Category',
                        'Shoe',
                        'Shirt'
                    ];
                } else {
                    return [
                        'Select Reason',
                        'Product Already Booked',
                        'Design and Colour Not Available',
                        'Price',
                        'Enquiry',
                        'Size'
                    ];
                }
            }
            if (formData.category === 'Customization') {
                return ['Select Reason'];
            }
        }
        return ['Select Sub Category'];
    };

    const getFunctionTypeOptions = () => {
        return [
            'Select Function Type',
            'Hindu Function',
            'Christian Function',
            'Muslim Function',
            'Grooms Men',
            'Office or College',
            'Other Functions'
        ];
    };

    let remarksColSpan = "col-span-12 md:col-span-3";
    if (!showCategory && !showSubCategory) {
        remarksColSpan = "col-span-12 md:col-span-9";
    } else if (showCategory && !showSubCategory) {
        remarksColSpan = "col-span-12 md:col-span-6";
    } else if (formData.status === 'Loss') {
        if (showAttachmentInput) {
            remarksColSpan = "col-span-12 md:col-span-9";
        } else {
            remarksColSpan = "col-span-12";
        }
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
        <div className="mb-[70px] text-[14px] min-h-screen" style={{ fontFamily: "DM Sans, sans-serif", background: '#f9fafb' }}>
            <SideNav />
            <div className="md:hidden sm:block">
                <ModileNav />
            </div>

            {/* Layout Grid Container matching standard dashboard spacing perfectly */}
            <div className="md:ml-[120px] transition-all duration-300" style={{ paddingTop: '24px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '40px' }}>
                {showAddView ? (
                    /* ADD WALKIN FORM VIEW MATCHING SCREENSHOT EXACTLY */
                    <div className="mt-6 mb-6 max-w-6xl mx-auto px-4" style={{ fontFamily: "DM Sans, sans-serif" }}>

                        {/* Title with Back Arrow exactly matching mockup */}
                        <div className="flex items-center gap-3 mb-6">
                            <button
                                onClick={() => {
                                    setCustomerExistsNotification(false);
                                    setCustomerData(null);
                                    setSelectedFile(null);
                                    setShowAddView(false);
                                }}
                                className="flex items-center justify-center text-gray-800 hover:text-black transition-colors bg-transparent border-0 cursor-pointer p-1"
                                style={{ fontSize: '24px' }}
                            >
                                ←
                            </button>
                            <h2 className="text-xl font-bold text-gray-900 leading-none">Create New Walk In</h2>
                        </div>

                        {/* Premium White form card matching mockup exactly */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs">
                            <form onSubmit={handleFormSubmit} className="space-y-6">

                                {(formData._id || customerExistsNotification) && (
                                    <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-md flex items-start gap-3 animate-fade-in">
                                        <span className="text-amber-600 text-lg">⚠️</span>
                                        <div>
                                            <h4 className="text-sm font-bold text-amber-800">
                                                {formData._id
                                                    ? `Editing Walk-in Record (Repeat Count: ${formData.repeatCount || 1})`
                                                    : `Existing Customer Found (Walk-in Count: ${formData.repeatCount || 1})`
                                                }
                                            </h4>
                                            <p className="text-xs text-amber-700 mt-1">
                                                {formData._id
                                                    ? 'You are editing the details of this specific walk-in record. Saving will update the details of this record directly.'
                                                    : 'The customer details have been pre-filled. You can update them. Saving with any status other than "New Walkin" will update the existing record. Setting status to "New Walkin" will log a new visit.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Row 1: Mobile, Name, Function Date, Repeat Count */}
                                <div className="grid grid-cols-12 gap-5">
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Customer Mobile Number<span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            name="contact"
                                            required
                                            maxLength={10}
                                            placeholder="Enter Mobile Number"
                                            value={formData.contact}
                                            onChange={handleInputChange}
                                            onBlur={(e) => checkCustomer(e.target.value)}
                                            disabled={isRestrictedEdit}
                                            className={`w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 font-semibold ${isRestrictedEdit
                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                                                : 'bg-white text-gray-800 placeholder-gray-400'
                                                }`}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Customer Name<span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="customerName"
                                            required
                                            placeholder="Enter Customer Name"
                                            value={formData.customerName}
                                            onChange={handleInputChange}
                                            disabled={isRestrictedEdit}
                                            className={`w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 font-semibold ${isRestrictedEdit
                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                                                : 'bg-white text-gray-800 placeholder-gray-400'
                                                }`}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Function Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="functionDate"
                                            required
                                            value={formData.functionDate}
                                            onChange={handleInputChange}
                                            disabled={isRestrictedEdit && formData.status !== 'New Walkin'}
                                            className={`w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 font-semibold ${(isRestrictedEdit && formData.status !== 'New Walkin')
                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                                                : 'bg-white text-gray-800 cursor-pointer placeholder-gray-400'
                                                }`}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Repeat Count
                                        </label>
                                        <input
                                            type="number"
                                            name="repeatCount"
                                            readOnly
                                            value={formData.repeatCount || 1}
                                            className="w-full h-11 border border-gray-200 bg-gray-50 rounded-lg text-center text-sm focus:outline-none text-gray-500 cursor-not-allowed font-semibold"
                                        />
                                    </div>
                                </div>

                                {/* Row 1.5: Store and Staff (Visible only for admins) */}
                                {isAdmin && (
                                    <div className="grid grid-cols-12 gap-5 pt-1">
                                        <div className="col-span-12 md:col-span-6">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                Select Store/Branch<span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    name="store"
                                                    required
                                                    value={formData.store}
                                                    disabled={user?.role === 'store_admin'}
                                                    onChange={handleInputChange}
                                                    className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                >
                                                    <option value="">Select Store</option>
                                                    {branches.map((b, i) => (
                                                        <option key={i} value={b.workingBranch}>
                                                            {b.workingBranch}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-6">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                Select Staff/Employee<span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    name="staff"
                                                    required
                                                    value={formData.staff}
                                                    onChange={handleInputChange}
                                                    className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                                >
                                                    <option value="">Select Employee</option>
                                                    {employees.map((emp, i) => (
                                                        <option key={i} value={emp.username}>
                                                            {emp.username} ({emp.employeeId || emp.empID || ''})
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Row 2: Status, Category, Sub Category, Remarks */}
                                <div className="grid grid-cols-12 gap-5 pt-1">
                                    {/* 1. Status Dropdown */}
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Status<span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                name="status"
                                                required
                                                value={formData.status}
                                                onChange={handleInputChange}
                                                className="w-full h-11 border border-gray-200 rounded-lg px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-800 bg-white cursor-pointer appearance-none pr-8 font-semibold"
                                            >
                                                {!STATUS_OPTIONS.includes(formData.status) && formData.status && (
                                                    <option value={formData.status}>{formData.status}</option>
                                                )}
                                                {STATUS_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* IF STATUS IS 'Loss' -> SEQUENTIAL FLOW */}
                                    {renderLossAndRevisitFields()}
                                </div>

                                {/* Admin metadata fields auto-populated in background */}

                                {/* Save Button under Status exactly like screenshot */}
                                <div className="pt-4 flex justify-start">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-[#111827] hover:bg-black text-white px-6 py-2.5 rounded-lg transition-all duration-200 font-semibold shadow-xs transform active:scale-95 text-center cursor-pointer text-sm"
                                    >
                                        {loading ? 'Saving...' : 'Save Walk In'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* ── WALK-IN LIST VIEW ── */
                    <>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '16px' }}>
                            <h1 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.2, color: '#111827', margin: 0 }}>Walk In List</h1>
                            <button
                                onClick={() => {
                                    setFormData(getResetFormData());
                                    setSelectedFile(null);
                                    setShowAddView(true);
                                }}
                                style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                + New Walk In
                            </button>
                        </div>

                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                placeholder="Search customer, contact, store..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', color: '#374151', outline: 'none', width: '260px', background: '#fff' }}
                            />
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', color: '#374151', outline: 'none', background: '#fff', cursor: 'pointer' }}>
                                <option value="All">All Status</option>
                                {FILTER_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin' || user?.role === 'cluster_admin' || user?.role === 'store_admin') && (
                                <select
                                    value={storeFilter}
                                    disabled={user?.role === 'store_admin'}
                                    onChange={e => setStoreFilter(e.target.value)}
                                    style={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '7px 12px',
                                        fontSize: '13px',
                                        color: '#374151',
                                        outline: 'none',
                                        background: '#fff',
                                        cursor: user?.role === 'store_admin' ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {user?.role !== 'store_admin' && <option value="All">All Stores</option>}
                                    {branches.map((b, i) => <option key={i} value={b.workingBranch}>{b.workingBranch}</option>)}
                                </select>
                            )}

                        </div>

                        {/* Table card */}
                        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '32px' }}>
                            {walkinsLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                                    <div style={{ width: '28px', height: '28px', border: '2px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%', animation: 'walkin-spin 0.7s linear infinite' }} />
                                </div>
                            ) : walkins.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: '13px' }}>No walk-in records found.</div>
                            ) : (
                                <>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '3305px', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "DM Sans, sans-serif" }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                                                    {['#', 'DATE', 'CUSTOMER', 'CONTACT', 'REPEAT COUNT', 'STATUS', 'HISTORY', 'FUNCTION DATE', 'FUNCTION TYPE', 'CATEGORY', 'PRODUCT TYPE', 'LOSS REASON', 'SUB CATEGORY', 'REMARKS', 'SIZE', 'COLOR', 'NOTES', 'STORE', 'STAFF', 'ATTACHMENT', 'BOOKING DATE', 'RENTOUT DATE', 'RETURN DATE', 'BILLED DATE', 'BILL RETURNED DATE', 'EDIT'].map((h, i) => {
                                                        const getColWidth = (header) => {
                                                            const widths = {
                                                              '#': '50px',
                                                              'DATE': '100px',
                                                              'CUSTOMER': '160px',
                                                              'CONTACT': '125px',
                                                              'REPEAT COUNT': '110px',
                                                              'STATUS': '130px',
                                                              'HISTORY': '90px',
                                                              'FUNCTION DATE': '115px',
                                                              'FUNCTION TYPE': '140px',
                                                              'CATEGORY': '115px',
                                                              'PRODUCT TYPE': '130px',
                                                              'LOSS REASON': '200px',
                                                              'SUB CATEGORY': '130px',
                                                              'REMARKS': '200px',
                                                              'SIZE': '70px',
                                                              'COLOR': '85px',
                                                              'NOTES': '200px',
                                                              'STORE': '140px',
                                                              'STAFF': '155px',
                                                              'ATTACHMENT': '110px',
                                                              'BOOKING DATE': '110px',
                                                              'RENTOUT DATE': '110px',
                                                              'RETURN DATE': '110px',
                                                              'BILLED DATE': '110px',
                                                              'BILL RETURNED DATE': '165px',
                                                              'EDIT': '80px'
                                                            };
                                                            return widths[header] || '120px';
                                                        };
                                                        const colWidth = getColWidth(h);
                                                        return (
                                                            <th
                                                                key={i}
                                                                style={{
                                                                    padding: '12px 12px',
                                                                    textAlign: 'center',
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    color: '#9ca3af',
                                                                    letterSpacing: '0.06em',
                                                                    whiteSpace: 'nowrap',
                                                                    width: colWidth,
                                                                    minWidth: colWidth,
                                                                    maxWidth: colWidth,
                                                                    boxSizing: 'border-box'
                                                                }}
                                                            >
                                                                {h}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentItems.map((w, index) => {
                                                    const sc = getStatusColors(w.status);

                                                    const productType = w.lossProductType || '–';
                                                    const notesText = w.notes || '–';

                                                    let displayLossReason = '–';
                                                    let displaySubCategory = '–';

                                                    if (w.status === 'Loss' || w.status === 'Revisit Loss') {
                                                        const isSales = isSalesProductType(w.lossProductType);

                                                        // 1. Loss Reason display
                                                        if (w.lossReason && w.lossReason !== '-' && w.lossReason !== '') {
                                                            displayLossReason = w.lossReason;
                                                            if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
                                                                displayLossReason += ` (${w.lossSelectRemarks})`;
                                                            }
                                                        } else if (w.subCategory && NON_SALES_REASONS.has(w.subCategory)) {
                                                            displayLossReason = w.subCategory;
                                                            if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
                                                                displayLossReason += ` (${w.lossSelectRemarks})`;
                                                            }
                                                        } else if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
                                                            displayLossReason = w.lossSelectRemarks;
                                                        }

                                                        // 2. Sub Category display
                                                        if (isSales) {
                                                            if (w.subCategory && w.subCategory !== '-' && !NON_SALES_REASONS.has(w.subCategory)) {
                                                                displaySubCategory = w.subCategory;
                                                            }
                                                        } else {
                                                            displaySubCategory = '–';
                                                        }
                                                    } else {
                                                        displaySubCategory = (w.subCategory && w.subCategory !== '-') ? w.subCategory : '–';
                                                    }

                                                    return (
                                                        <tr key={w._id || index}
                                                            style={{ borderBottom: '1px solid #f9fafb', background: '#fff', transition: 'background 0.1s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                                        >
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#9ca3af', boxSizing: 'border-box' }}>{indexFirst + index + 1}</td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{safeDateOnly(w.date)}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#111827', fontWeight: 500, boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.customerName || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.contact ? `+91 ${w.contact}` : '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#374151', boxSizing: 'border-box' }}>{w.repeatCount}</td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', boxSizing: 'border-box' }}>
                                                                 <div
                                                                     style={{ position: 'relative', width: '110px', margin: '0 auto' }}
                                                                     onMouseEnter={(e) => {
                                                                         if (!statusChangedToday[w._id] && !updatingStatus[w._id]) {
                                                                             const span = e.currentTarget.querySelector('.walkin-marquee-text');
                                                                             if (span) span.style.border = `1px solid ${sc.color}`;
                                                                         }
                                                                     }}
                                                                     onMouseLeave={(e) => {
                                                                         if (!statusChangedToday[w._id]) {
                                                                             const span = e.currentTarget.querySelector('.walkin-marquee-text');
                                                                             if (span) span.style.border = '1px solid transparent';
                                                                         }
                                                                     }}
                                                                 >
                                                                     <div className="walkin-marquee-container">
                                                                         <span
                                                                             className="walkin-marquee-text walkin-anim-scroll"
                                                                             style={{
                                                                                 padding: '4px 6px',
                                                                                 paddingRight: '18px',
                                                                                 fontSize: '11px',
                                                                                 fontWeight: 900,
                                                                                 borderRadius: '20px',
                                                                                 backgroundColor: sc.bg,
                                                                                 color: sc.color,
                                                                                 whiteSpace: 'nowrap',
                                                                                 display: 'inline-block',
                                                                                 backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${sc.color}' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                                                 backgroundRepeat: 'no-repeat',
                                                                                 backgroundPosition: 'right 4px center',
                                                                                 backgroundSize: '12px',
                                                                                 boxSizing: 'border-box',
                                                                                 textAlign: 'center',
                                                                                 border: statusChangedToday[w._id] ? '1px solid #e5e7eb' : '1px solid transparent',
                                                                                 transition: 'all 0.2s',
                                                                                 opacity: statusChangedToday[w._id] ? 0.6 : 1
                                                                             }}
                                                                         >
                                                                             {w.status || 'New Walkin'}
                                                                         </span>
                                                                     </div>
                                                                     <select
                                                                         value={w.status || 'New Walkin'}
                                                                         onChange={(e) => handleStatusChange(w, e.target.value)}
                                                                         disabled={statusChangedToday[w._id] || updatingStatus[w._id]}
                                                                         style={{
                                                                             position: 'absolute',
                                                                             top: 0,
                                                                             left: 0,
                                                                             width: '100%',
                                                                             height: '100%',
                                                                             opacity: 0,
                                                                             cursor: statusChangedToday[w._id] ? 'not-allowed' : 'pointer',
                                                                             boxSizing: 'border-box'
                                                                         }}
                                                                         title={statusChangedToday[w._id] ? 'Status already changed today. Try again tomorrow.' : 'Change status'}
                                                                     >
                                                                         {!['New Walkin', 'Loss', 'Revisit'].includes(w.status) && w.status && (
                                                                             <option value={w.status}>{w.status}</option>
                                                                         )}
                                                                         <option value="New Walkin">New Walkin</option>
                                                                         <option value="Loss">Loss</option>
                                                                         <option value="Revisit">Revisit</option>
                                                                     </select>
                                                                 </div>
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', boxSizing: 'border-box' }}>
                                                                <button
                                                                    onClick={() => handleShowHistory(w)}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        width: '28px',
                                                                        height: '28px',
                                                                        color: '#4b5563',
                                                                        background: '#f3f4f6',
                                                                        border: '1px solid #e5e7eb',
                                                                        borderRadius: '50%',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s',
                                                                        boxSizing: 'border-box'
                                                                    }}
                                                                    onMouseEnter={e => {
                                                                        e.currentTarget.style.background = '#e5e7eb';
                                                                        e.currentTarget.style.color = '#111827';
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        e.currentTarget.style.background = '#f3f4f6';
                                                                        e.currentTarget.style.color = '#4b5563';
                                                                    }}
                                                                    title="View Status Change History"
                                                                >
                                                                    <FaEye size={12} />
                                                                </button>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.functionDate || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.functionType || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.category || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{productType}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{displayLossReason}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{displaySubCategory}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#6b7280', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container" title={w.remarks}>
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.remarks || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.lossSize || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.lossColour || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#6b7280', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container" title={notesText}>
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{notesText}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.store || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                                                <div className="walkin-marquee-container">
                                                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.staff || '–'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', boxSizing: 'border-box' }}>
                                                                {w.attachment ? (
                                                                    <button
                                                                        onClick={() => handleDownloadAndView(w.attachment, w.attachmentName || 'attachment')}
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            width: '28px',
                                                                            height: '28px',
                                                                            color: '#2563eb',
                                                                            background: '#eff6ff',
                                                                            border: '1px solid #bfdbfe',
                                                                            borderRadius: '50%',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s',
                                                                            boxSizing: 'border-box'
                                                                        }}
                                                                        onMouseEnter={e => {
                                                                            e.currentTarget.style.background = '#dbeafe';
                                                                            e.currentTarget.style.color = '#1d4ed8';
                                                                        }}
                                                                        onMouseLeave={e => {
                                                                            e.currentTarget.style.background = '#eff6ff';
                                                                            e.currentTarget.style.color = '#2563eb';
                                                                        }}
                                                                        title="Download and view attachment"
                                                                    >
                                                                        <FaDownload size={12} />
                                                                    </button>
                                                                ) : '–'}
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                                                {w.bookingDate ? new Date(w.bookingDate).toISOString().split('T')[0] : '–'}
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                                                {w.rentoutDate ? new Date(w.rentoutDate).toISOString().split('T')[0] : '–'}
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                                                {w.returnDate ? new Date(w.returnDate).toISOString().split('T')[0] : '–'}
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                                                {w.billedDate ? new Date(w.billedDate).toISOString().split('T')[0] : '–'}
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                                                {w.billReturnedDate ? new Date(w.billReturnedDate).toISOString().split('T')[0] : '–'}
                                                            </td>
                                                            <td style={{ padding: '11px 12px', textAlign: 'center', boxSizing: 'border-box' }}>
                                                                <button
                                                                    onClick={() => handleEditClick(w)}
                                                                    style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.1s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#111827'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                                                                    title="Edit Details"
                                                                >
                                                                    <FaPen size={12} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '14px 20px',
                                        borderTop: '1px solid #f3f4f6',
                                        fontSize: '13px',
                                        color: '#6b7280'
                                    }}>
                                        <span>Showing {totalWalkins === 0 ? 0 : indexFirst + 1} to {indexFirst + currentItems.length} of {totalWalkins} entries</span>
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
                                                    onClick={() => handlePageChange(currentPage - 1)}
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
                                                    onClick={() => handlePageChange(currentPage + 1)}
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
                                </>
                            )}
                        </div>
                        <style>{`
                            @keyframes walkin-spin { to { transform: rotate(360deg); } }
                            .walkin-marquee-container {
                                container-type: inline-size;
                                overflow: hidden;
                                white-space: nowrap;
                                display: block;
                                width: 100%;
                            }
                            .walkin-marquee-text {
                                display: inline-block;
                                min-width: 100%;
                            }
                            .walkin-marquee-container:hover .walkin-marquee-text {
                                animation-play-state: paused;
                            }
                            .walkin-anim-scroll {
                                animation: walkin-marquee-scroll 8s linear infinite;
                            }
                            @keyframes walkin-marquee-scroll {
                                0%, 15% { transform: translateX(0); }
                                85%, 100% { transform: translateX(calc(-100% + 100cqw)); }
                            }
                        `}</style>
                    </>
                )}
            </div>

            {/* Status Update Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 py-6">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Update Walk-in Details ({formData.status})</h3>
                            <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="statusUpdateForm" onSubmit={(e) => { e.preventDefault(); handleFormSubmit(e).then(() => setShowStatusModal(false)); }} className="space-y-6">
                                <div className="grid grid-cols-12 gap-x-4 gap-y-5">
                                    {renderLossAndRevisitFields()}
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="statusUpdateForm"
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-800 rounded-lg hover:bg-black transition-colors shadow-sm"
                            >
                                Save Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Walk-in Status History Modal */}
            {showHistoryModal && selectedHistoryWalkin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 py-6 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-100 transform transition-all">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Status Change History</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Customer: <span className="font-semibold text-gray-700">{selectedHistoryWalkin.customerName}</span> ({selectedHistoryWalkin.contact})
                                </p>
                            </div>
                            <button onClick={() => { setShowHistoryModal(false); setSelectedHistoryWalkin(null); }} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* Chronological timeline layout */}
                            {(() => {
                                const history = [];
                                
                                // Initial visit
                                const initialDate = selectedHistoryWalkin.createdAt || selectedHistoryWalkin.date;
                                history.push({
                                    status: 'New Walkin',
                                    category: selectedHistoryWalkin.category || '-',
                                    date: initialDate
                                });

                                if (selectedHistoryWalkin.statusHistory && selectedHistoryWalkin.statusHistory.length > 0) {
                                    selectedHistoryWalkin.statusHistory.forEach(h => {
                                        if (h.status !== 'New Walkin') {
                                            history.push({
                                                status: h.status,
                                                category: h.category || '-',
                                                date: h.date
                                            });
                                        }
                                    });
                                }

                                // Helper function to ensure actual DB date overrides sync/manual update date
                                const ensureOrUpdateStatusDate = (statusNames, targetDate, defaultCategory = null) => {
                                    if (!targetDate) return;
                                    const parsedTargetDate = new Date(targetDate);
                                    if (isNaN(parsedTargetDate.getTime())) return;

                                    const existingIndex = history.findIndex(h => statusNames.map(s => s.toLowerCase()).includes(h.status.toLowerCase().trim()));
                                    if (existingIndex !== -1) {
                                        history[existingIndex].date = parsedTargetDate;
                                    } else {
                                        history.push({
                                            status: statusNames[0],
                                            category: defaultCategory || selectedHistoryWalkin.category || 'Product',
                                            date: parsedTargetDate
                                        });
                                    }
                                };

                                // Ensure actual date fields are mapped correctly
                                if (selectedHistoryWalkin.bookingDate) {
                                    ensureOrUpdateStatusDate(['Booked', 'New Booking', 'Revisit Booking'], selectedHistoryWalkin.bookingDate);
                                }
                                if (selectedHistoryWalkin.rentoutDate) {
                                    ensureOrUpdateStatusDate(['Rentout', 'Rent Out', 'Booking & Rentout'], selectedHistoryWalkin.rentoutDate);
                                }
                                if (selectedHistoryWalkin.returnDate) {
                                    ensureOrUpdateStatusDate(['Return'], selectedHistoryWalkin.returnDate);
                                }
                                if (selectedHistoryWalkin.cancelDate || selectedHistoryWalkin.cancellationDate) {
                                    ensureOrUpdateStatusDate(['Cancel', 'Cancelled'], selectedHistoryWalkin.cancelDate || selectedHistoryWalkin.cancellationDate);
                                }
                                if (selectedHistoryWalkin.billedDate) {
                                    ensureOrUpdateStatusDate(['Billed'], selectedHistoryWalkin.billedDate, 'Sales');
                                }
                                if (selectedHistoryWalkin.billReturnedDate) {
                                    ensureOrUpdateStatusDate(['Bill Returned'], selectedHistoryWalkin.billReturnedDate, 'Sales');
                                }

                                // Fallback for the current status if not already present in the history
                                const currentStatus = selectedHistoryWalkin.status || 'New Walkin';
                                if (currentStatus.includes(',')) {
                                    const parts = currentStatus.split(',').map(p => p.trim());
                                    parts.forEach(p => {
                                        const hasPInHistory = history.some(h => h.status.toLowerCase().trim() === p.toLowerCase().trim());
                                        if (!hasPInHistory) {
                                            let statusDate = selectedHistoryWalkin.lastStatusChangeDate || selectedHistoryWalkin.updatedAt;
                                            let cat = selectedHistoryWalkin.category || '-';
                                            if (p === 'Booked') statusDate = selectedHistoryWalkin.bookingDate;
                                            if (p === 'Rentout') statusDate = selectedHistoryWalkin.rentoutDate;
                                            if (p === 'Return') statusDate = selectedHistoryWalkin.returnDate;
                                            if (p === 'Cancelled') statusDate = selectedHistoryWalkin.cancelDate || selectedHistoryWalkin.cancellationDate;
                                            if (p === 'Billed') { statusDate = selectedHistoryWalkin.billedDate; cat = 'Sales'; }
                                            if (p === 'Bill Returned') { statusDate = selectedHistoryWalkin.billReturnedDate; cat = 'Sales'; }

                                            history.push({
                                                status: p,
                                                category: cat,
                                                date: statusDate || new Date()
                                            });
                                        }
                                    });
                                } else {
                                    const hasCurrentInHistory = history.some(h => h.status.toLowerCase().trim() === currentStatus.toLowerCase().trim());
                                    if (!hasCurrentInHistory && currentStatus !== 'New Walkin') {
                                        let statusDate = selectedHistoryWalkin.lastStatusChangeDate || selectedHistoryWalkin.updatedAt;
                                        let cat = selectedHistoryWalkin.category || '-';
                                        if (currentStatus === 'Booked') statusDate = selectedHistoryWalkin.bookingDate;
                                        if (currentStatus === 'Rentout') statusDate = selectedHistoryWalkin.rentoutDate;
                                        if (currentStatus === 'Return') statusDate = selectedHistoryWalkin.returnDate;
                                        if (currentStatus === 'Cancelled') statusDate = selectedHistoryWalkin.cancelDate || selectedHistoryWalkin.cancellationDate;
                                        if (currentStatus === 'Billed') { statusDate = selectedHistoryWalkin.billedDate; cat = 'Sales'; }
                                        if (currentStatus === 'Bill Returned') { statusDate = selectedHistoryWalkin.billReturnedDate; cat = 'Sales'; }

                                        history.push({
                                            status: currentStatus,
                                            category: cat,
                                            date: statusDate || new Date()
                                        });
                                    }
                                }

                                // Parse, sort, and deduplicate consecutive equivalent statuses
                                const parsedHistory = history.map(item => ({
                                    status: item.status,
                                    category: item.category,
                                    date: item.date ? new Date(item.date) : new Date()
                                })).sort((a, b) => a.date - b.date);

                                // Filter out consecutive equivalent statuses (no actual change)
                                const filteredHistory = [];
                                for (let k = 0; k < parsedHistory.length; k++) {
                                    const current = parsedHistory[k];
                                    if (k > 0) {
                                        const prev = parsedHistory[k - 1];
                                        const curStatusLower = String(current.status || '').trim().toLowerCase();
                                        const prevStatusLower = String(prev.status || '').trim().toLowerCase();

                                        const isEquivalent = (curStatusLower === prevStatusLower) ||
                                            (['cancel', 'cancelled'].includes(curStatusLower) && ['cancel', 'cancelled'].includes(prevStatusLower)) ||
                                            (['booked', 'new booking', 'revisit booking'].includes(curStatusLower) && ['booked', 'new booking', 'revisit booking'].includes(prevStatusLower)) ||
                                            (['rentout', 'rent out', 'booking & rentout'].includes(curStatusLower) && ['rentout', 'rent out', 'booking & rentout'].includes(prevStatusLower));

                                        if (isEquivalent) {
                                            continue;
                                        }
                                    }
                                    filteredHistory.push(current);
                                }

                                if (filteredHistory.length === 0) {
                                    return <div className="text-center text-sm text-gray-500 py-6">No status change history found.</div>;
                                }

                                return (
                                    <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-6">
                                        {filteredHistory.map((item, idx) => {
                                            const sc = getStatusColors(item.status);

                                            return (
                                                <div key={idx} className="relative">
                                                    {/* Timeline marker */}
                                                    <span className="absolute -left-[30px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-white border border-gray-300">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                                    </span>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <span style={{
                                                                background: sc.bg,
                                                                color: sc.color,
                                                                borderRadius: '20px',
                                                                padding: '2px 8px',
                                                                fontSize: '9px',
                                                                fontWeight: 800,
                                                                whiteSpace: 'nowrap',
                                                                display: 'inline-block'
                                                            }}>
                                                                {(() => {
                                                                    const statusLower = (item.status || '').toLowerCase();
                                                                    const shouldShowCat = statusLower.includes('loss') || statusLower.includes('lost') || statusLower.includes('revisit');
                                                                    const hasValidCat = item.category && item.category.trim() !== '' && item.category.trim() !== '-' && item.category.trim().toLowerCase() !== 'none' && item.category.trim().toLowerCase() !== 'select category';
                                                                    return `${item.status.toUpperCase()}${shouldShowCat && hasValidCat ? ` (${item.category})` : ''}`;
                                                                })()}
                                                            </span>
                                                            {idx === filteredHistory.length - 1 && (
                                                                <span className="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-semibold">Active</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-gray-500 font-medium">
                                                            {item.date.toLocaleString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                hour12: true
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-2xl">
                            <button
                                onClick={() => { setShowHistoryModal(false); setSelectedHistoryWalkin(null); }}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalkinList;
