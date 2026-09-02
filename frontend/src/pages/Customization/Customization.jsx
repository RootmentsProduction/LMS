import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import baseUrl from "../../api/api";
import { 
  FaCalendarAlt, 
  FaStore, 
  FaRupeeSign, 
  FaReceipt, 
  FaBoxes, 
  FaSave, 
  FaTrash, 
  FaSync, 
  FaCut,
  FaCalendarWeek,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaExclamationCircle,
  FaBuilding,
  FaDownload
} from 'react-icons/fa';

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS_LIST = [2025, 2026, 2027, 2028];

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDerivedWeekNumber = (dateStr) => {
  if (!dateStr) return 1;
  const day = new Date(dateStr).getDate();
  if (day > 21) return 4;
  if (day > 14) return 3;
  if (day > 7) return 2;
  return 1;
};

const Customization = () => {
  const user = useSelector((state) => state.auth.user);
  const token = localStorage.getItem('token');

  // Controls
  const todayStr = getTodayDateString();
  const currentMonthName = MONTHS_LIST[new Date().getMonth()];
  const currentYearNum = new Date().getFullYear();

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [selectedYear, setSelectedYear] = useState(currentYearNum);
  const [selectedWeek, setSelectedWeek] = useState(getDerivedWeekNumber(todayStr));
  const [selectedStore, setSelectedStore] = useState('All');
  const [targetStoreForEntry, setTargetStoreForEntry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Data Entry Fields
  const [entryValue, setEntryValue] = useState('');
  const [entryBills, setEntryBills] = useState('');
  const [entryQty, setEntryQty] = useState('');
  const [saving, setSaving] = useState(false);

  // Data & List
  const [branches, setBranches] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync entry target store when top filter changes
  useEffect(() => {
    if (selectedStore !== 'All') {
      setTargetStoreForEntry(selectedStore);
    }
  }, [selectedStore]);

  // When date changes, auto update Month, Year, and Week
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (newDate) {
      const d = new Date(newDate);
      setSelectedMonth(MONTHS_LIST[d.getMonth()] || currentMonthName);
      setSelectedYear(d.getFullYear() || currentYearNum);
      setSelectedWeek(getDerivedWeekNumber(newDate));
    }
  };

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch/public`);
        const json = await res.json();
        let branchList = json.data || json.branches || json || [];
        if (Array.isArray(branchList) && branchList.length > 0) {
          setBranches(branchList);
        } else {
          const resAuth = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const jsonAuth = await resAuth.json();
          if (jsonAuth.data) setBranches(jsonAuth.data);
        }
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };
    fetchBranches();
  }, [token]);

  // Fetch Customization Entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      let queryUrl = `${baseUrl.baseUrl}api/customization-attributions?month=${selectedMonth}&year=${selectedYear}`;
      if (selectedWeek !== 'All') {
        queryUrl += `&week=${selectedWeek}`;
      }
      if (selectedStore && selectedStore !== 'All') {
        queryUrl += `&storeName=${encodeURIComponent(selectedStore)}`;
      }

      const res = await fetch(queryUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();

      if (json.success && json.data) {
        const dataArr = Array.isArray(json.data) ? json.data : [json.data];
        setEntries(dataArr);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Error fetching customization entries:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedDate, selectedMonth, selectedYear, selectedWeek, selectedStore, token]);

  const isStoreMatch = (a, b) => {
    if (!a || !b) return false;
    if (String(a).toLowerCase() === String(b).toLowerCase()) return true;
    const cleanA = String(a).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/edappally/g, 'edapally');
    const cleanB = String(b).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/edappally/g, 'edapally');
    return cleanA === cleanB;
  };

  // Pre-fill entry form when date or target store changes
  useEffect(() => {
    const storeToLookup = targetStoreForEntry || (selectedStore !== 'All' ? selectedStore : '');
    if (!storeToLookup) {
      setEntryValue('');
      setEntryBills('');
      setEntryQty('');
      return;
    }

    const existing = entries.find(
      e => (e.date === selectedDate || e.createdAt?.split('T')[0] === selectedDate) && 
      isStoreMatch(e.storeName, storeToLookup)
    );

    if (existing) {
      setEntryValue(existing.totalValue ?? existing.attributions?.[0]?.billWtd ?? '');
      setEntryBills(existing.totalBills ?? existing.attributions?.[0]?.valWtd ?? '');
      setEntryQty(existing.totalQuantity ?? existing.attributions?.[0]?.qtyWtd ?? '');
    } else {
      setEntryValue('');
      setEntryBills('');
      setEntryQty('');
    }
  }, [entries, selectedDate, targetStoreForEntry, selectedStore]);

  // Save / Submit Customization Total Entry
  const handleSaveEntry = async (e) => {
    e.preventDefault();
    const storeToSave = targetStoreForEntry || (selectedStore !== 'All' ? selectedStore : '');

    if (!storeToSave || storeToSave === 'All') {
      alert("Please select a specific store branch to save customization totals.");
      return;
    }

    setSaving(true);
    try {
      const val = Number(entryValue) || 0;
      const bills = Number(entryBills) || 0;
      const qty = Number(entryQty) || 0;

      const payload = {
        storeName: storeToSave,
        date: selectedDate,
        month: selectedMonth,
        year: Number(selectedYear),
        week: Number(selectedWeek === 'All' ? 1 : selectedWeek),
        totalValue: val,
        totalBills: bills,
        totalQuantity: qty,
        attributions: [{
          staffName: 'Store Total',
          billWtd: val,
          valWtd: bills,
          qtyWtd: qty
        }]
      };

      const response = await fetch(`${baseUrl.baseUrl}api/customization-attributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await response.json();

      if (json.success || response.ok) {
        alert(`Customization total saved successfully for ${storeToSave}!`);
        fetchEntries();
      } else {
        alert(json.message || "Failed to save customization entry");
      }
    } catch (err) {
      console.error("Error saving customization total:", err);
      alert("Error saving customization entry");
    } finally {
      setSaving(false);
    }
  };

  // Delete an Entry
  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customization entry?")) return;
    try {
      const res = await fetch(`${baseUrl.baseUrl}api/customization-attributions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        fetchEntries();
      } else {
        alert(json.message || "Failed to delete entry");
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  // Deduplicated store branch options
  const uniqueStoreNames = Array.from(
    new Set(
      branches
        .map(b => b.workingBranch || b.branchName || b.name)
        .filter(n => n && typeof n === 'string' && n.trim() !== '' && n.toLowerCase() !== 'store')
    )
  );

  const normalizeDateStr = (d) => {
    if (!d) return '';
    const str = String(d).split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return str;
  };

  // Filtered table entries strictly matching selectedStore, selectedDate, and searchTerm
  const filteredEntries = entries.filter(e => {
    if (selectedStore && selectedStore !== 'All') {
      if (!isStoreMatch(e.storeName, selectedStore)) return false;
    }
    if (selectedDate) {
      const entryDateStr = normalizeDateStr(e.date || e.createdAt);
      if (entryDateStr && entryDateStr !== normalizeDateStr(selectedDate)) return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(e.storeName || '').toLowerCase().includes(q) ||
      String(e.date || '').toLowerCase().includes(q) ||
      String(e.month || '').toLowerCase().includes(q) ||
      String(e.year || '').toLowerCase().includes(q)
    );
  });

  // Aggregate totals for current filtered view
  const aggregateValue = filteredEntries.reduce((sum, e) => sum + (Number(e.totalValue) || Number(e.attributions?.[0]?.billWtd) || 0), 0);
  const aggregateBills = filteredEntries.reduce((sum, e) => sum + (Number(e.totalBills) || Number(e.attributions?.[0]?.valWtd) || 0), 0);
  const aggregateQty = filteredEntries.reduce((sum, e) => sum + (Number(e.totalQuantity) || Number(e.attributions?.[0]?.qtyWtd) || 0), 0);
  const uniqueStoresCount = new Set(filteredEntries.map(e => e.storeName)).size;

  // Export filtered customization entries as CSV file
  const handleExportCSV = () => {
    if (!filteredEntries || filteredEntries.length === 0) {
      alert("No customization entries available to export.");
      return;
    }

    const headers = [
      "Entry Date",
      "Store Branch",
      "Month",
      "Year",
      "Week",
      "Customization Value (INR)",
      "Quantity (Items)",
      "Bills Count"
    ];

    const rows = filteredEntries.map(entry => {
      const val = entry.totalValue ?? entry.attributions?.[0]?.billWtd ?? 0;
      const bills = entry.totalBills ?? entry.attributions?.[0]?.valWtd ?? 0;
      const qty = entry.totalQuantity ?? entry.attributions?.[0]?.qtyWtd ?? 0;

      return [
        entry.date || selectedDate,
        entry.storeName || '',
        entry.month || selectedMonth,
        entry.year || selectedYear,
        `Week ${entry.week || 1}`,
        val,
        qty,
        bills
      ];
    });

    const csvContent = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const storeLabel = selectedStore && selectedStore !== 'All' ? selectedStore : 'ALL STORES';
    const sanitizedStoreName = String(storeLabel).toUpperCase().replace(/[/\\?%*:|"<>]/g, '').trim();
    const dateStr = `${selectedMonth}-${selectedYear}`;
    const fileName = `${sanitizedStoreName} - CUSTOMIZATION ENTRIES REPORT - ${dateStr}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeStoreName = targetStoreForEntry || (selectedStore !== 'All' ? selectedStore : '');

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* Navigation */}
      <SideNav />
      <ModileNav />

      {/* Main Content Area — FULL WIDTH */}
      <div className="flex-1 md:ml-[110px] p-4 md:p-8 pt-20 md:pt-8 w-full max-w-[1700px] mx-auto transition-all">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-emerald-200">
                Warehouse Portal
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-semibold text-gray-400">Customization Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <FaCut className="text-emerald-500" /> Customization Entry & Management
            </h1>
            <p className="text-xs md:text-sm font-medium text-gray-500 mt-1">
              Enter daily customization sales totals, item quantities, and bill counts per store branch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDateChange(todayStr)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <FaCalendarAlt className="text-gray-400" /> Today
            </button>
            <button
              onClick={fetchEntries}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <FaSync className={loading ? "animate-spin text-emerald-600" : "text-gray-500"} /> Refresh Data
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shadow-emerald-600/20"
              title="Download Customization Entries CSV"
            >
              <FaDownload /> Download CSV
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <FaFilter className="text-emerald-600 text-xs" />
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filter Dashboard & Entries</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Store Branch */}
            <div>
              <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FaStore className="text-amber-500" /> Store Branch
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-black cursor-pointer shadow-sm"
              >
                <option value="All">All Stores</option>
                <option value="WAREHOUSE">WAREHOUSE</option>
                {uniqueStoreNames.map(name => {
                  if (name.toUpperCase() === 'WAREHOUSE') return null;
                  return (
                    <option key={name} value={name}>{name}</option>
                  );
                })}
              </select>
            </div>

            {/* Date Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <FaCalendarAlt className="text-blue-500" /> Entry Date
                </label>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    title="View entries across all dates"
                  >
                    All Dates
                  </button>
                )}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-black cursor-pointer shadow-sm"
              />
            </div>

            {/* Month Filter */}
            <div>
              <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-black cursor-pointer shadow-sm"
              >
                {MONTHS_LIST.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-black cursor-pointer shadow-sm"
              >
                {YEARS_LIST.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Week Filter */}
            <div>
              <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FaCalendarWeek className="text-purple-500" /> Week Filter
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-black cursor-pointer shadow-sm"
              >
                <option value={1}>Week 1 (1 - 7)</option>
                <option value={2}>Week 2 (8 - 14)</option>
                <option value={3}>Week 3 (15 - 21)</option>
                <option value={4}>Week 4 (22 - 31)</option>
                <option value="All">All Weeks</option>
              </select>
            </div>
          </div>
        </div>

        {/* Aggregated KPI Overview Cards — 4 Column Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          {/* Card 1: Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
            <div className="p-3.5 bg-emerald-500 text-white rounded-xl shadow-md shrink-0">
              <FaRupeeSign className="text-2xl" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Total Value (₹)</p>
              <h3 className="text-2xl font-black text-gray-900 mt-0.5">₹ {aggregateValue.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{selectedMonth} {selectedYear}</p>
            </div>
          </div>

          {/* Card 2: Quantity */}
          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
            <div className="p-3.5 bg-blue-500 text-white rounded-xl shadow-md shrink-0">
              <FaBoxes className="text-2xl" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Total Quantity</p>
              <h3 className="text-2xl font-black text-gray-900 mt-0.5">{aggregateQty} <span className="text-sm font-bold text-gray-500">Items</span></h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{selectedMonth} {selectedYear}</p>
            </div>
          </div>

          {/* Card 3: Bills */}
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
            <div className="p-3.5 bg-purple-500 text-white rounded-xl shadow-md shrink-0">
              <FaReceipt className="text-2xl" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-purple-600 uppercase tracking-wider">Total Bills</p>
              <h3 className="text-2xl font-black text-gray-900 mt-0.5">{aggregateBills} <span className="text-sm font-bold text-gray-500">Bills</span></h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{selectedMonth} {selectedYear}</p>
            </div>
          </div>

          {/* Card 4: Stores Count */}
          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
            <div className="p-3.5 bg-amber-500 text-white rounded-xl shadow-md shrink-0">
              <FaBuilding className="text-2xl" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">Stores Recorded</p>
              <h3 className="text-2xl font-black text-gray-900 mt-0.5">{uniqueStoresCount} <span className="text-sm font-bold text-gray-500">Branches</span></h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{entries.length} total entries</p>
            </div>
          </div>

        </div>

        {/* Data Entry Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200/80 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-gray-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-black text-white rounded-xl shadow-sm">
                <FaCut className="text-base" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-gray-900 leading-snug">
                  {activeStoreName ? (
                    <>Record Totals for <span className="text-emerald-600 underline decoration-emerald-300">{activeStoreName}</span></>
                  ) : (
                    <>Record Customization Total Entry</>
                  )}
                </h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Entry Date: <span className="font-bold text-gray-700">{selectedDate}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-3 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                {selectedMonth} {selectedYear} • Week {selectedWeek}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveEntry} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              {/* Target Store Selection inside Entry Form */}
              <div>
                <label className="block text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FaStore className="text-amber-500" /> Target Branch*
                </label>
                <select
                  value={targetStoreForEntry}
                  onChange={(e) => setTargetStoreForEntry(e.target.value)}
                  className={`w-full h-12 px-3.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-black transition-all cursor-pointer ${
                    !targetStoreForEntry ? "border-amber-300 bg-amber-50/40" : "border-gray-200"
                  }`}
                >
                  <option value="">-- Select Store Branch --</option>
                  <option value="WAREHOUSE">WAREHOUSE</option>
                  {uniqueStoreNames.map(name => {
                    if (name.toUpperCase() === 'WAREHOUSE') return null;
                    return (
                      <option key={name} value={name}>{name}</option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Select branch to attribute entry</p>
              </div>

              {/* Customization Value */}
              <div>
                <label className="block text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FaRupeeSign className="text-emerald-600" /> Customization Value (₹)*
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-base">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="e.g. 15000"
                    value={entryValue}
                    onChange={(e) => setEntryValue(e.target.value)}
                    className="w-full h-12 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-black transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Total customization sales value</p>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FaBoxes className="text-blue-600" /> Quantity (Items)*
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 8"
                  value={entryQty}
                  onChange={(e) => setEntryQty(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-black transition-all"
                />
                <p className="text-[11px] text-gray-400 mt-1">Total customized item quantity</p>
              </div>

              {/* Bills Count */}
              <div>
                <label className="block text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FaReceipt className="text-purple-600" /> Bills Count*
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 5"
                  value={entryBills}
                  onChange={(e) => setEntryBills(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-black transition-all"
                />
                <p className="text-[11px] text-gray-400 mt-1">Total number of customization bills</p>
              </div>

            </div>

            {/* Prompt banner if no target store selected */}
            {!activeStoreName && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                <FaExclamationCircle className="text-amber-600 shrink-0 text-base" />
                <span>Please select a <strong>Store Branch</strong> above to record daily customization totals.</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving || !activeStoreName}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                  !activeStoreName 
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-600/20"
                }`}
              >
                <FaSave className="text-sm" /> {saving ? 'Saving Entry...' : 'Save Customization Total'}
              </button>
            </div>

          </form>
        </div>

        {/* Entries List Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="p-5 bg-gray-50/80 border-b border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                Saved Entries <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">{entries.length} records</span>
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Showing customization entries for {selectedMonth} {selectedYear} ({selectedWeek === 'All' ? 'All Weeks' : `Week ${selectedWeek}`})
              </p>
            </div>

            {/* Search Box & CSV Button */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search store date, month..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-black transition-all shadow-xs"
                />
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                title="Export current table entries as CSV file"
              >
                <FaDownload className="text-emerald-600 text-xs" /> Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-gray-400">
              <FaSync className="animate-spin text-2xl mx-auto mb-3 text-emerald-600" />
              <p className="text-xs font-bold text-gray-600">Loading Customization Records...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <FaCut className="text-3xl mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-bold text-gray-700">No Customization Entries Found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                No total records match your current filters. Select a store branch above to add daily customization totals.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Entry Date</th>
                    <th className="py-3.5 px-6">Store Branch</th>
                    <th className="py-3.5 px-6">Month & Year</th>
                    <th className="py-3.5 px-6">Week</th>
                    <th className="py-3.5 px-6">Customization Value</th>
                    <th className="py-3.5 px-6">Quantity</th>
                    <th className="py-3.5 px-6">Bills Count</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                  {filteredEntries.map((entry) => {
                    const val = entry.totalValue ?? entry.attributions?.[0]?.billWtd ?? 0;
                    const bills = entry.totalBills ?? entry.attributions?.[0]?.valWtd ?? 0;
                    const qty = entry.totalQuantity ?? entry.attributions?.[0]?.qtyWtd ?? 0;

                    return (
                      <tr key={entry._id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-4 px-6 font-extrabold text-gray-900">
                          {entry.date || selectedDate}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-50 text-amber-900 border border-amber-200">
                            <FaStore className="text-amber-600 text-[10px]" />
                            {entry.storeName}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-semibold">
                          {entry.month} {entry.year}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Week {entry.week || 1}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-black text-emerald-700 text-sm">
                          ₹ {Number(val).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 font-bold text-blue-700">
                          {qty} <span className="text-[10px] text-gray-400 font-medium">items</span>
                        </td>
                        <td className="py-4 px-6 font-bold text-purple-700">
                          {bills} <span className="text-[10px] text-gray-400 font-medium">bills</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleDeleteEntry(entry._id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Delete entry"
                          >
                            <FaTrash size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Customization;
