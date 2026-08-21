import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import baseUrl, { formatStoreDisplayName } from "../../api/api";
import { FiPlus, FiChevronDown, FiX, FiArrowLeft } from "react-icons/fi";

function norm(str) {
  if (!str) return "";
  return String(str).toLowerCase().trim().replace(/\s+/g, " ");
}

function isHiddenBranch(name) {
  const normalized = norm(name);
  const nonSalesBranches = ["office", "production", "warehouse"];
  if (nonSalesBranches.includes(normalized)) return true;
  if (normalized.startsWith("test ") || normalized.startsWith("test")) {
    const afterTest = normalized.replace(/^test\s*/, "").trim();
    if (afterTest.length > 0) return true;
  }
  return (
    normalized === norm("Suitor Guy Kochi") ||
    normalized === norm("GROOMS Kochi") ||
    normalized === norm("Grooms Kochi") ||
    normalized === norm("Suitor Guy Calicut") ||
    normalized === norm("GROOMS Calicut") ||
    normalized === norm("Grooms Calicut")
  );
}

const parseStoreBrandAndName = (workingBranch) => {
  if (!workingBranch) return { displayName: "Unknown", brand: "General" };
  const raw = String(workingBranch).trim();
  const lower = raw.toLowerCase();
  
  let brand = "SG";
  if (lower.startsWith("z-") || lower.startsWith("z.") || lower.startsWith("z ") || lower.startsWith("z")) {
    brand = "Zorucci";
  } else if (lower.startsWith("g-") || lower.startsWith("g.") || lower.startsWith("g ")) {
    brand = "Grooms";
  } else if (lower.startsWith("sg-") || lower.startsWith("sg.") || lower.startsWith("sg ")) {
    brand = "Suitor Guy";
  }
  
  const displayName = formatStoreDisplayName(raw);
  
  return { displayName, brand };
};

const GoogleReviewTask = () => {
  const user = useSelector((state) => state.auth.user);
  const isClusterAdmin = user?.role === "cluster_admin";
  const isStoreAdmin = user?.role === "store_admin";
  const isRestrictedRole = isClusterAdmin || isStoreAdmin;

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cluster Filter states
  const [clusters, setClusters] = useState([]);
  const [selectedClusters, setSelectedClusters] = useState(["All"]);
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false);
  const clusterDropdownRef = useRef(null);

  // Store Filter states (multi-select)
  const [selectedStores, setSelectedStores] = useState(["All"]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef(null);

  // Date Filter state (single-select)
  const [dateFilter, setDateFilter] = useState("Today"); // Today, This Week, This Month

  // Modal form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [openedFromRow, setOpenedFromRow] = useState(false);
  const [selectedModalStore, setSelectedModalStore] = useState("");
  const [totalRatingsInput, setTotalRatingsInput] = useState("");

  // Loaded counts state mapped by workingBranch name
  const [reviewsState, setReviewsState] = useState({});
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Handle click outside for custom popover dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clusterDropdownRef.current && !clusterDropdownRef.current.contains(e.target)) {
        setIsClusterDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
        setIsStoreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch real dashboard data from backend
  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl.baseUrl}api/google-reviews/dashboard`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json?.data) {
          setReviewsState(json.data);
        }
      }
    } catch (err) {
      console.error("Error fetching Google Reviews dashboard:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Fetch active clusters dynamically
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/admin/admin/list`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data)
            ? json.data.filter((item) => item.role === "cluster_admin")
            : [];
          setClusters(list);
        }
      } catch (err) {
        console.error("Error fetching clusters:", err);
      }
    };
    fetchClusters();
  }, []);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data) ? json.data : [];
          let visible = list.filter((b) => !isHiddenBranch(b?.workingBranch));

          // For cluster_admin / store_admin: only show their assigned branches
          if (isRestrictedRole) {
            const assignedBranchIds = new Set((user?.branches || []).map((b) => String(b._id || b)));
            const assignedBranchNames = new Set(
              (user?.branches || [])
                .map((b) => norm(b.workingBranch || b.name || (typeof b === "string" ? b : "")))
                .filter(Boolean)
            );
            visible = visible.filter(
              (b) =>
                assignedBranchIds.has(String(b._id)) ||
                assignedBranchNames.has(norm(b.workingBranch))
            );
          }

          const seenNames = new Set();
          const uniqueVisible = [];
          for (const b of visible) {
            const dispName = formatStoreDisplayName(b?.workingBranch);
            if (dispName && !seenNames.has(dispName)) {
              seenNames.add(dispName);
              uniqueVisible.push(b);
            }
          }
          setBranches(uniqueVisible);
          if (uniqueVisible.length > 0) {
            setSelectedModalStore(uniqueVisible[0].workingBranch);
          }
        }
      } catch (err) {
        console.error("Error fetching branches:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [user, isRestrictedRole]);

  // Filter available stores based on selected clusters
  const availableBranches = useMemo(() => {
    if (isRestrictedRole) {
      const assignedBranchIds = new Set((user?.branches || []).map((b) => String(b._id || b)));
      const assignedBranchNames = new Set(
        (user?.branches || [])
          .map((b) => norm(b.workingBranch || b.name || (typeof b === "string" ? b : "")))
          .filter(Boolean)
      );
      return branches.filter(
        (b) =>
          assignedBranchIds.has(String(b._id)) ||
          assignedBranchNames.has(norm(b.workingBranch))
      );
    }

    if (selectedClusters.includes("All") || selectedClusters.length === 0) {
      return branches;
    }
    const assignedBranchIds = new Set();
    selectedClusters.forEach((clusterId) => {
      const clusterAdmin = clusters.find((c) => String(c._id) === String(clusterId));
      if (clusterAdmin && Array.isArray(clusterAdmin.branches)) {
        clusterAdmin.branches.forEach((b) => {
          assignedBranchIds.add(String(b._id || b));
          if (b.workingBranch) assignedBranchIds.add(norm(b.workingBranch));
        });
      }
    });
    return branches.filter(
      (b) => assignedBranchIds.has(String(b._id)) || assignedBranchIds.has(norm(b.workingBranch))
    );
  }, [branches, selectedClusters, clusters, isRestrictedRole, user]);

  // Merge dynamic branches with reviews counts state
  const tableRows = useMemo(() => {
    const baseBranches = isRestrictedRole ? availableBranches : branches;
    return baseBranches.map((b) => {
      const { displayName, brand } = parseStoreBrandAndName(b.workingBranch);
      const saved = reviewsState[b.workingBranch] || {};
      
      return {
        id: b._id,
        workingBranch: b.workingBranch,
        displayName,
        brand,
        today: saved.today !== undefined ? saved.today : 0,
        thisWeek: saved.thisWeek !== undefined ? saved.thisWeek : 0,
        thisMonth: saved.thisMonth !== undefined ? saved.thisMonth : 0,
        total: saved.total !== undefined ? saved.total : 0,
      };
    });
  }, [branches, availableBranches, reviewsState, isRestrictedRole]);

  // Filter and sort rows based on selected cluster(s), store(s), and date sorting
  const processedRows = useMemo(() => {
    let list = [...tableRows];

    // 1. Cluster Filter (only for central admins)
    if (!isRestrictedRole && !selectedClusters.includes("All") && selectedClusters.length > 0) {
      const assignedBranchIds = new Set();
      selectedClusters.forEach((clusterId) => {
        const clusterAdmin = clusters.find((c) => String(c._id) === String(clusterId));
        if (clusterAdmin && Array.isArray(clusterAdmin.branches)) {
          clusterAdmin.branches.forEach((b) => {
            assignedBranchIds.add(String(b._id || b));
            if (b.workingBranch) assignedBranchIds.add(norm(b.workingBranch));
          });
        }
      });
      list = list.filter(
        (r) => assignedBranchIds.has(String(r.id)) || assignedBranchIds.has(norm(r.workingBranch))
      );
    }

    // 2. Store Filter
    if (!selectedStores.includes("All") && selectedStores.length > 0) {
      list = list.filter((r) => selectedStores.includes(r.workingBranch));
    }

    // 3. Sort depending on active Date Filter
    if (dateFilter === "Today") {
      list.sort((a, b) => b.today - a.today);
    } else if (dateFilter === "This Week") {
      list.sort((a, b) => b.thisWeek - a.thisWeek);
    } else if (dateFilter === "This Month") {
      list.sort((a, b) => b.thisMonth - a.thisMonth);
    }

    return list;
  }, [tableRows, selectedClusters, selectedStores, clusters, dateFilter, isRestrictedRole]);

  // Stores with ratings metric for active period
  const storesWithRatingsPeriod = useMemo(() => {
    if (dateFilter === "Today") {
      return processedRows.filter((r) => r.today > 0).length;
    } else if (dateFilter === "This Week") {
      return processedRows.filter((r) => r.thisWeek > 0).length;
    } else {
      return processedRows.filter((r) => r.thisMonth > 0).length;
    }
  }, [processedRows, dateFilter]);

  const handleRowClick = (branchName) => {
    setSelectedModalStore(branchName);
    const current = reviewsState[branchName] || {};
    setTotalRatingsInput(current.today > 0 ? String(current.today) : "");
    setOpenedFromRow(true);
    setShowAddModal(true);
  };

  const handleAddBtnClick = () => {
    const list = isRestrictedRole ? availableBranches : branches;
    if (list.length > 0) {
      setSelectedModalStore(list[0].workingBranch);
    }
    setTotalRatingsInput("");
    setOpenedFromRow(false);
    setShowAddModal(true);
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedModalStore) return;

    const count = parseInt(totalRatingsInput, 10);
    if (isNaN(count) || count < 0) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl.baseUrl}api/google-reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ branchName: selectedModalStore, count }),
      });

      if (res.ok) {
        // Refresh dashboard counts from backend
        await fetchDashboard();
      }
    } catch (err) {
      console.error("Error saving Google Review:", err);
    }

    setTotalRatingsInput("");
    setShowAddModal(false);
  };

  return (
    <div className="flex w-full min-h-screen bg-[#f9fafb] text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <SideNav />
      <div className="md:hidden">
        <ModileNav />
      </div>

      <div className="flex-1 md:ml-[110px] min-h-screen p-4 sm:p-6 lg:p-8 mb-[70px] md:mb-0">
        
        {/* White Dashboard container */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8 max-w-[1400px] mx-auto mt-2">
          
          {/* Top Row: Title and Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Review Dashboard</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Monitor and manage customer feedback across all Stores.</p>
            </div>
            <button
              onClick={handleAddBtnClick}
              className="flex items-center justify-center gap-2 bg-[#17171f] hover:bg-black text-white text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-all self-start sm:self-center"
            >
              <FiPlus size={16} />
              Add New Review
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-3">

              {/* Multi-Select Cluster Filter Selector */}
              {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'it_admin') && (
                <div ref={clusterDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsClusterDropdownOpen(!isClusterDropdownOpen)}
                    className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none cursor-pointer min-w-[150px] transition-all"
                  >
                    <span className="truncate">
                      {selectedClusters.includes("All") || selectedClusters.length === 0
                        ? "Cluster : All"
                        : selectedClusters.length === 1
                          ? `Cluster : ${clusters.find((c) => String(c._id) === String(selectedClusters[0]))?.name || clusters.find((c) => String(c._id) === String(selectedClusters[0]))?.username || "1 Selected"}`
                          : `Clusters (${selectedClusters.length})`}
                    </span>
                    <FiChevronDown
                      className={`text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                        isClusterDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isClusterDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 text-xs">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 px-1">
                        <span className="font-bold text-gray-500 text-[11px]">Select Cluster(s)</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedClusters(["All"])}
                            className="text-blue-600 hover:underline font-bold text-[10px]"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedClusters([])}
                            className="text-red-500 hover:underline font-bold text-[10px]"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer font-bold">
                          <input
                            type="checkbox"
                            checked={selectedClusters.includes("All")}
                            onChange={() => setSelectedClusters(["All"])}
                            className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                          />
                          <span>All Clusters</span>
                        </label>
                        {clusters.map((c) => {
                          const isChecked = selectedClusters.includes(String(c._id));
                          return (
                            <label
                              key={c._id}
                              className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer font-medium text-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (selectedClusters.includes("All")) {
                                    setSelectedClusters([String(c._id)]);
                                  } else {
                                    if (isChecked) {
                                      const next = selectedClusters.filter(
                                        (id) => id !== String(c._id)
                                      );
                                      setSelectedClusters(next.length === 0 ? ["All"] : next);
                                    } else {
                                      setSelectedClusters([...selectedClusters, String(c._id)]);
                                    }
                                  }
                                }}
                                className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                              />
                              <span>{c.name || c.username}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Multi-Select Store Filter Selector */}
              <div ref={storeDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                  className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none cursor-pointer min-w-[150px] transition-all"
                >
                  <span className="truncate">
                    {selectedStores.includes("All") || selectedStores.length === 0
                      ? "Store : All"
                      : selectedStores.length === 1
                        ? `Store : ${parseStoreBrandAndName(selectedStores[0]).displayName}`
                        : `Stores (${selectedStores.length})`}
                  </span>
                  <FiChevronDown
                    className={`text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                      isStoreDropdownOpen ? "rotate-180" : ""
                    }`}
                    size={14}
                  />
                </button>

                {isStoreDropdownOpen && (
                  <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-gray-200/90 z-50 p-2 text-xs font-sans animate-popoverOpen origin-top-left">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 mb-1">
                      <span className="font-bold text-gray-500 text-[11px]">Select Store(s)</span>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedStores(["All"])}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStores(["All"])}
                          className="text-red-500 font-bold hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedStores.includes("All")}
                          onChange={() => setSelectedStores(["All"])}
                          className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span>All Stores</span>
                      </label>
                      {availableBranches.map((b) => {
                        const isChecked = selectedStores.includes(b.workingBranch);
                        const { displayName } = parseStoreBrandAndName(b.workingBranch);
                        return (
                          <label
                            key={b._id}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer text-gray-700 font-semibold"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (selectedStores.includes("All")) {
                                  setSelectedStores([b.workingBranch]);
                                } else {
                                  if (isChecked) {
                                    const next = selectedStores.filter(
                                      (wb) => wb !== b.workingBranch
                                    );
                                    setSelectedStores(next.length === 0 ? ["All"] : next);
                                  } else {
                                    setSelectedStores([...selectedStores, b.workingBranch]);
                                  }
                                }
                              }}
                              className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                            />
                            <span>{displayName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Date Filter Selector */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">Date :</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-14 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:border-gray-400 appearance-none min-w-[140px] cursor-pointer"
                >
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                </select>
                <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
              </div>
            </div>

            {/* Dynamic Metric */}
            <div className="text-right">
              <span className="text-gray-400 text-xs font-semibold">Stores with Ratings {dateFilter === "Today" ? "Today" : (dateFilter === "This Week" ? "This Week" : "This Month")}</span>
              <p className="text-gray-900 text-lg sm:text-xl font-bold mt-0.5">
                {storesWithRatingsPeriod}
                <span className="text-gray-400 font-medium text-xs sm:text-sm"> /{processedRows.length}</span>
              </p>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-[#f3f4f6] text-gray-500 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold">Store</th>
                  <th className="px-6 py-4 font-semibold text-center">Today</th>
                  <th className="px-6 py-4 font-semibold text-center">This Week</th>
                  <th className="px-6 py-4 font-semibold text-center">This Month</th>
                  <th className="px-6 py-4 font-semibold text-center">Total Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm text-gray-700">
                {loading || loadingReviews ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">Loading stores...</td>
                  </tr>
                ) : processedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">No stores found matching the filters.</td>
                  </tr>
                ) : (
                  processedRows.map((row) => (
                    <tr 
                      key={row.id} 
                      onClick={() => handleRowClick(row.workingBranch)}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer border-l-2 border-l-transparent hover:border-l-blue-500"
                      title="Click to edit rating counts"
                    >
                      {/* Store Details */}
                      <td className="px-6 py-4 border-r border-gray-100">
                        <p className="font-bold text-gray-900 text-xs sm:text-sm">{row.displayName}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400 font-semibold mt-0.5">{row.brand}</p>
                      </td>
                      
                      {/* Counts columns */}
                      <td className="px-6 py-4 text-center font-semibold text-gray-900 border-r border-gray-100">{row.today}</td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-900 border-r border-gray-100">{row.thisWeek}</td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-900 border-r border-gray-100">{row.thisMonth}</td>
                      <td className="px-6 py-4 text-center font-bold text-gray-900">{row.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* Customer Rating Today dialog modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px] transition-all">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-900 hover:text-black transition-colors"
                >
                  <FiArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <h3 className="font-bold text-gray-900 text-base">Customer Rating Today</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveReview} className="space-y-5">
              {!openedFromRow ? (
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Store</label>
                  <select
                    required
                    value={selectedModalStore}
                    onChange={(e) => setSelectedModalStore(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:border-gray-400 cursor-pointer"
                  >
                    {(isRestrictedRole ? availableBranches : branches).map(b => (
                      <option key={b._id} value={b.workingBranch}>
                        {parseStoreBrandAndName(b.workingBranch).displayName} ({parseStoreBrandAndName(b.workingBranch).brand})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Store</p>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">
                      {parseStoreBrandAndName(selectedModalStore).displayName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Brand</p>
                    <p className="font-bold text-gray-500 text-xs mt-0.5">
                      {parseStoreBrandAndName(selectedModalStore).brand}
                    </p>
                  </div>
                </div>
              )}

              {/* Total Ratings Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Total Ratings<span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Enter total customer ratings today"
                  value={totalRatingsInput}
                  onChange={(e) => setTotalRatingsInput(e.target.value)}
                  className="w-full py-3 px-4 border border-gray-200 rounded-2xl text-xs sm:text-sm font-semibold text-gray-800 shadow-sm placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-gray-450 focus:ring-1 focus:ring-gray-450"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-[#17171f] hover:bg-black text-white text-xs sm:text-sm font-bold py-2.5 px-6 rounded-xl shadow-md transition-all"
                >
                  Submit
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GoogleReviewTask;
