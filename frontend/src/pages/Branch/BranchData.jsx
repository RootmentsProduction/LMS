                                                                                                                                      // // src/pages/Branch/BranchData.jsx
// import { useEffect, useState } from "react";
// import Header from "../../components/Header/Header";
// import { FaPlus, FaEdit, FaBuilding } from "react-icons/fa";
// import { HiUsers, HiAcademicCap, HiClipboardCheck } from "react-icons/hi";
// import SideNav from "../../components/SideNav/SideNav";
// import baseUrl from "../../api/api";
// import { Link } from "react-router-dom";

// /* --------- Name normalization & matching helpers ---------- */
// const BRAND_TOKENS = new Set([
//   "zorucci", "grooms", "suitor", "guy", "store", "sg", "rmnts"               
// ]);

// function canonFixes(s) {
//   // common spelling variants you’ve shown
//   return s
//     .replace(/\bedapaly\b/g, "edappally")
//     .replace(/\bedapally\b/g, "edappally")
//     .replace(/\bmanjeri\b/g, "manjery")
//     .replace(/\bperinthalmana\b/g, "perinthalmanna")
//     .replace(/\bkottakal\b/g, "kottakkal")
//     .replace(/\bkalpeta\b/g, "kalpetta");
// }

// function norm(s) {
//   const x = String(s || "")
//     .normalize("NFKD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, " ")
//     .trim();
//   return canonFixes(x);
// }

// function locationKey(name) {
//   // drop brand words; keep only location tokens
//   const tokens = norm(name)
//     .split(" ")
//     .filter(t => t && !BRAND_TOKENS.has(t));
//   return tokens.join(" ");
// }

// const BranchData = () => {
//   const [branch, setBranch] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [isMobile, setIsMobile] = useState(false);
//   const token = localStorage.getItem("token");

//   // mobile check
//   useEffect(() => {
//     const check = () => setIsMobile(window.innerWidth < 768);
//     check();
//     window.addEventListener("resize", check);
//     return () => window.removeEventListener("resize", check);
//   }, []);

//   useEffect(() => {
//     const fetchBranchesAndEmployees = async () => {
//       setLoading(true);
//       try {
//         const branchReq = fetch(baseUrl.baseUrl + "api/usercreate/getBranch", {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           credentials: "include",
//         });

//         const empReq = fetch(baseUrl.baseUrl + "api/employee_range", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
//         });

//         const [branchRes, empRes] = await Promise.all([branchReq, empReq]);
//         if (!branchRes.ok) throw new Error(`Branches: HTTP ${branchRes.status} ${branchRes.statusText}`);
//         if (!empRes.ok) throw new Error(`Employees: HTTP ${empRes.status} ${empRes.statusText}`);

//         const branchJson = await branchRes.json();
//         const empJson = await empRes.json();

//         const branchList = Array.isArray(branchJson?.data) ? branchJson.data : [];
//         const employees = Array.isArray(empJson?.data) ? empJson.data : [];

//         // Build branch indices
//         const byFull = {};      // normalized full name -> index
//         const byLocKey = {};    // location-only key -> index (brand stripped)
//         branchList.forEach((b, i) => {
//           const full = norm(b?.workingBranch);
//           const loc = locationKey(b?.workingBranch);
//           if (full) byFull[full] = i;
//           if (loc) byLocKey[loc] = i;
//         });

//         // Count employees per branch using full match -> location match
//         const counts = new Array(branchList.length).fill(0);
//         const unmatched = {};

//         employees.forEach(e => {
//           const raw = e?.store_name || e?.workingBranch || "";
//           const full = norm(raw);
//           const loc = locationKey(raw);

//           let idx = byFull[full];
//           if (idx === undefined) idx = byLocKey[loc];

//           if (idx !== undefined) {
//             counts[idx] = (counts[idx] || 0) + 1;
//           } else {
//             if (!/^(no\s*store)?$/.test(loc)) {
//               unmatched[raw] = (unmatched[raw] || 0) + 1;
//             }
//           }
//         });

//         if (Object.keys(unmatched).length) {
//           console.warn("[Branch headcount] Unmatched store names (check spelling/aliases):", unmatched);
//         }

//         const merged = branchList.map((b, i) => {
//           const fallback = typeof b?.userCount === "number" ? b.userCount : 0;
//           const computed = counts[i] || 0;
//           return { ...b, userCount: computed || fallback };
//         });

//         setBranch(merged);
//         setError("");
//       } catch (err) {
//         console.error(err);
//         setError("Failed to load branch/employee data. Please try again later.");
//         setBranch([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchBranchesAndEmployees();
//   }, [token]);

//   // ---- Mobile card ----
//   const MobileBranchCard = ({ branchData, index }) => (
//     <div className={`p-4 rounded-lg border ${index % 2 === 0 ? "bg-gray-50" : "bg-white"} mb-4 shadow-sm`}>
//       <div className="flex justify-between items-start mb-3">
//         <div className="flex-1">
//           <div className="flex items-center gap-2 mb-1">
//             <FaBuilding className="text-[#016E5B]" size={16} />
//             <h3 className="font-semibold text-[#016E5B] text-lg">
//               {branchData?.workingBranch || "N/A"}
//             </h3>
//           </div>
//           <p className="text-sm text-gray-600 font-medium">Code: {branchData?.locCode || "N/A"}</p>
//         </div>
//         <Link
//           to={`/branch/detailed/${branchData?.locCode}`}
//           className="bg-[#016E5B] text-white px-3 py-1.5 rounded-md text-sm hover:bg-[#014C3F] transition-colors flex items-center gap-1"
//         >
//           <FaEdit size={12} />
//           Edit
//         </Link>
//       </div>

//       <div className="grid grid-cols-3 gap-3">
//         <div className="text-center p-3 bg-blue-50 rounded-lg">
//           <HiUsers className="mx-auto text-blue-600 mb-1" size={20} />
//           <div className="font-semibold text-blue-700 text-lg">{branchData?.userCount || 0}</div>
//           <div className="text-xs text-blue-600 font-medium">Employees</div>
//         </div>
//         <div className="text-center p-3 bg-green-50 rounded-lg">
//           <HiAcademicCap className="mx-auto text-green-600 mb-1" size={20} />
//           <div className="font-semibold text-green-700 text-lg">{branchData?.totalTrainingCount || 0}</div>
//           <div className="text-xs text-green-600 font-medium">Trainings</div>
//         </div>
//         <div className="text-center p-3 bg-purple-50 rounded-lg">
//           <HiClipboardCheck className="mx-auto text-purple-600 mb-1" size={20} />
//           <div className="font-semibold text-purple-700 text-lg">{branchData?.totalAssessmentCount || 0}</div>
//           <div className="text-xs text-purple-600 font-medium">Assessments</div>
//         </div>
//       </div>
//     </div>
//   );

//   if (loading) {
//     return (
//       <div className="mb-[70px]">
//         <Header name="Branch" />
//         <SideNav />
//         <div className="md:ml-[90px] mt-[160px] px-4 sm:px-6 lg:px-12">
//           <div className="flex justify-center items-center py-14">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#016E5B]"></div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="mb-[70px]">
//       <Header name="Branch" />
//       <SideNav />
//       <div className="md:ml-[90px] mt-[160px] sm:mt-[140px]">
//         <div className="px-4 sm:px-6 lg:px-12">
//           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-8 sm:mt-12 mb-6">
//             <h1 className="text-[#212121] text-xl sm:text-2xl font-semibold">Branch Management</h1>
//             <Link
//               to={"/Addbranch"}
//               className="flex items-center justify-center gap-3 w-full sm:w-auto bg-[#016E5B] hover:bg-[#014C3F] text-white px-4 py-2.5 rounded-md transition-colors font-medium"
//             >
//               <FaPlus size={14} />
//               Add New Branch
//             </Link>
//           </div>
//           <div className="text-sm text-gray-600 mb-4">Total branches: {branch.length}</div>
//         </div>

//         {error && (
//           <div className="text-red-500 text-center my-4 mx-4 sm:mx-6 lg:mx-12 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
//             {error}
//           </div>
//         )}

//         <div className="mx-4 sm:mx-6 lg:mx-12">
//           {branch.length === 0 ? (
//             <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
//               <div className="flex flex-col items-center gap-3">
//                 <FaBuilding className="text-4xl text-gray-400" />
//                 <span className="text-lg font-medium">No branches found</span>
//                 <span className="text-sm">Get started by adding a new branch</span>
//                 <Link to={"/Addbranch"} className="mt-2 bg-[#016E5B] text-white px-4 py-2 rounded-md hover:bg-[#014C3F] transition-colors text-sm">
//                   Add First Branch
//                 </Link>
//               </div>
//             </div>
//           ) : isMobile ? (
//             <div className="space-y-4">
//               {branch.map((b, i) => (
//                 <MobileBranchCard key={b?.locCode || i} branchData={b} index={i} />
//               ))}
//             </div>
//           ) : (
//             <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm">
//                   <thead className="bg-[#016E5B] text-white">
//                     <tr>
//                       <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[100px]">Location Code</th>
//                       <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[180px]">Branch Name</th>
//                       <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[120px]">Employees</th>
//                       <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[120px] hidden lg:table-cell">Trainings</th>
//                       <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[130px] hidden lg:table-cell">Assessments</th>
//                       <th className="px-4 py-3 text-center font-semibold min-w-[80px]">Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {branch.map((b, i) => (
//                       <tr key={b?.locCode || i} className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-all`}>
//                         <td className="px-4 py-3 text-center font-medium text-[#016E5B] border-r border-gray-200">{b?.locCode || "N/A"}</td>
//                         <td className="px-4 py-3 border-r border-gray-200">
//                           <div className="text-center lg:text-left">
//                             <div className="font-medium text-gray-900">{b?.workingBranch || "N/A"}</div>
//                             <div className="lg:hidden mt-1 text-xs text-gray-500 space-y-1">
//                               <div>Training: {b?.totalTrainingCount || 0}</div>
//                               <div>Assessments: {b?.totalAssessmentCount || 0}</div>
//                             </div>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3 text-center font-medium border-r border-gray-200">
//                           <div className="flex items-center justify-center gap-1">
//                             <HiUsers className="text-blue-600" size={14} />
//                             {b?.userCount || 0}
//                           </div>
//                         </td>
//                         <td className="px-4 py-3 text-center font-medium border-r border-gray-200 hidden lg:table-cell">
//                           <div className="flex items-center justify-center gap-1">
//                             <HiAcademicCap className="text-green-600" size={14} />
//                             {b?.totalTrainingCount || 0}
//                           </div>
//                         </td>
//                         <td className="px-4 py-3 text-center font-medium border-r border-gray-200 hidden lg:table-cell">
//                           <div className="flex items-center justify-center gap-1">
//                             <HiClipboardCheck className="text-purple-600" size={14} />
//                             {b?.totalAssessmentCount || 0}
//                           </div>
//                         </td>
//                         <td className="px-4 py-3 text-center">
//                           <Link
//                             to={`/branch/detailed/${b?.locCode}`}
//                             className="inline-flex items-center gap-1 text-[#016E5B] font-semibold hover:text-[#014C3F] hover:underline transition-colors text-sm px-2 py-1 rounded"
//                           >
//                             <FaEdit size={12} />
//                             Edit
//                           </Link>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BranchData;

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FaPlus, FaEdit, FaBuilding, FaSearch, FaEye, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaChevronDown } from "react-icons/fa";
import { HiUsers, HiAcademicCap, HiClipboardCheck } from "react-icons/hi";
import SideNav from "../../components/SideNav/SideNav";
import baseUrl from "../../api/api";
import { Link } from "react-router-dom";
import { normalizeBranchProgress } from "../../features/dashboard/dashboardUtils";
import { fetchHomeProgressChart as fetchHomeProgress } from "../../features/dashboard/dashboardFetch";

/* ---------- Normalization helpers ---------- */

// tokens that indicate brand words inside names
const BRAND_TOKENS = new Set(["zorucci", "grooms", "suitor", "guy", "sg"]);

// spelling fixes (make Edappally bulletproof + common fixes you saw)
function canonFixes(s) {
  return s
    // Edappally variants: edapaly/edapally/edappaly/edapplly/edaplly/edapply/edapalli…
    .replace(/\bedap{1,2}a?l{1,3}y\b/g, "edappally")
    .replace(/\bedap{1,2}a?l{1,3}i\b/g, "edappally")

    // Other locations you mentioned
    .replace(/\bmanjeri\b/g, "manjery")
    .replace(/\bperinthalmana\b/g, "perinthalmanna")
    .replace(/\bkottakal\b/g, "kottakkal")
    .replace(/\bkalpeta\b/g, "kalpetta")

    // brand typos that appear in data (optional but helpful)
    .replace(/\bzoruc+i\b/g, "zorucci");
}

// base normalizer
function norm(s) {
  const x = String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return canonFixes(x);
}

// location-only key (drop brand tokens)
function locationKey(name) {
  const tokens = norm(name)
    .split(" ")
    .filter((t) => t && !BRAND_TOKENS.has(t));
  return tokens.join(" ");
}

// canonical brand (treat GROOMS/SUITOR GUY/SG as one brand)
function brandKey(name) {
  const n = norm(name);
  if (/\bzorucci\b/.test(n)) return "zorucci";
  if (/\b(grooms|suitor|guy|sg)\b/.test(n)) return "suitor";
  return ""; // unknown/none
}

function displayBranchName(name) {
  const raw = String(name || "");
  if (/^grooms\s+/i.test(raw)) {
    return raw.replace(/^grooms\s+/i, "Suitor Guy ");
  }
  return raw;
}

function isHiddenBranch(name) {
  const normalized = norm(name);
  return (
    normalized === norm("Suitor Guy Kochi") ||
    normalized === norm("GROOMS Kochi") ||
    normalized === norm("Grooms Kochi") ||
    normalized === norm("Suitor Guy Calicut") ||
    normalized === norm("GROOMS Calicut") ||
    normalized === norm("Grooms Calicut")
  );
}

const BranchData = () => {
  const user = useSelector((s) => s.auth.user);
  const [branch, setBranch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("All Branches");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [progressResponse, setProgressResponse] = useState(null);
  const token = localStorage.getItem("token");

  // mobile check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchBranchesAndEmployees = async () => {
      setLoading(true);
      try {
        const branchRes = await fetch(baseUrl.baseUrl + "api/usercreate/getBranch", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!branchRes.ok) {
          throw new Error(`Branches: HTTP ${branchRes.status} ${branchRes.statusText}`);
        }

        const branchJson = await branchRes.json();
        const branchList = Array.isArray(branchJson?.data) ? branchJson.data : [];

        // Paint the page immediately with branch metadata.
        const visibleBranches = branchList.filter((b) => !isHiddenBranch(b?.workingBranch));
        setBranch(visibleBranches);
        setError("");

        // Hydrate employee counts from the local LMS employee directory used by the Employee page.
        const employees = [];
        let employeePage = 1;
        let employeeTotalPages = 1;

        do {
          const params = new URLSearchParams({
            page: String(employeePage),
            limit: "500",
            search: "",
            store: "All",
            role: "All",
          });
          const empRes = await fetch(baseUrl.baseUrl + `api/employee/app-users?${params}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          });

          if (!empRes.ok) {
            throw new Error(`Employees: HTTP ${empRes.status} ${empRes.statusText}`);
          }

          const empJson = await empRes.json();
          const pageEmployees = Array.isArray(empJson?.data) ? empJson.data : [];
          employees.push(...pageEmployees);
          employeeTotalPages = Number(empJson?.totalPages || 1);
          employeePage += 1;
        } while (employeePage <= employeeTotalPages);

        const byFull = {};

        visibleBranches.forEach((b, i) => {
          const full = norm(b?.workingBranch);
          const code = String(b?.locCode || "").trim().toLowerCase();

          if (full) byFull[full] = i;
          if (code) byFull[code] = i;
        });

        const counts = new Array(visibleBranches.length).fill(0);

        employees.forEach((e) => {
          const raw = e?.workingBranch || e?.store_name || "";
          const full = norm(raw);
          const code = String(e?.locCode || "").trim().toLowerCase();

          let idx = byFull[full];
          if (idx === undefined && code) idx = byFull[code];

          if (idx !== undefined) {
            counts[idx] = (counts[idx] || 0) + 1;
          }
        });

        setBranch((current) =>
          current.map((b, i) => ({
            ...b,
            userCount: counts[i] || 0,
          }))
        );
      } catch {
        setError("Failed to load branch data. Please try again later.");
        setBranch([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBranchesAndEmployees();
    fetchHomeProgress().then((data) => {
      if (mounted) setProgressResponse(data);
    }).catch(() => {
      if (mounted) setProgressResponse(null);
    });
    return () => {
      mounted = false;
    };
  }, [token]);

  const progressRows = useMemo(() => normalizeBranchProgress(progressResponse), [progressResponse]);

  const progressByKey = useMemo(() => {
    const map = new Map();
    progressRows.forEach((item) => {
      const full = norm(item?.branchName || item?.workingBranch || item?.locCode);
      const code = String(item?.locCode || "").trim().toLowerCase();
      if (full) map.set(full, item);
      if (code) map.set(code, item);
    });
    return map;
  }, [progressRows]);

  const branchOptions = useMemo(
    () => ["All Branches", ...Array.from(new Set(branch.map((b) => b?.workingBranch).filter(Boolean)))],
    [branch]
  );

  const roleOptions = useMemo(() => {
    const roles = new Set();
    branch.forEach((b) => {
      const brand = brandKey(b?.workingBranch);
      if (brand === "zorucci") roles.add("Zorucci");
      if (brand === "suitor") roles.add("Suitor Guy");
    });
    return ["All Roles", ...Array.from(roles)];
  }, [branch]);

  const enrichedBranch = useMemo(() => {
    return branch.map((b) => {
      const key = norm(b?.workingBranch || b?.locCode);
      const progress = progressByKey.get(key) || progressByKey.get(String(b?.locCode || "").toLowerCase()) || {};
      const totalTraining = progress?.totalTraining ?? b?.totalTrainingCount ?? 0;
      const completeTrainingRaw = Number(progress?.completeTraining ?? 0);
      const pendingTrainingRaw = Number(progress?.pendingTraining ?? 0);
      const totalTrainingRaw = Number(totalTraining || 0);
      const completeTraining = Number.isFinite(completeTrainingRaw) ? Math.max(0, Math.min(100, completeTrainingRaw)) : 0;
      const pendingTraining = Number.isFinite(pendingTrainingRaw) ? Math.max(0, Math.min(100, pendingTrainingRaw)) : 0;
      const trainingsDisplay = Number.isFinite(totalTrainingRaw)
        ? Math.max(0, Math.round(totalTrainingRaw))
        : Math.round(Number(b?.totalTrainingCount ?? 0));
      const progressPct = Number.isFinite(completeTrainingRaw)
        ? completeTraining
        : Math.min(100, Math.max(0, Number(b?.userCount || 0) * 10));
      return {
        ...b,
        progressPct,
        completeTraining,
        pendingTraining,
        trainingsDisplay,
        roleLabel: brandKey(b?.workingBranch) === "zorucci" ? "Zorucci" : brandKey(b?.workingBranch) === "suitor" ? "Suitor Guy" : "Branch",
      };
    });
  }, [branch, progressByKey]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedBranch.filter((row) => {
      const matchesSearch =
        !q ||
        `${row?.workingBranch || ""} ${row?.locCode || ""}`.toLowerCase().includes(q);
      const matchesBranch =
        branchFilter === "All Branches" || row?.workingBranch === branchFilter;
      const matchesRole =
        roleFilter === "All Roles" || row?.roleLabel === roleFilter;
      return matchesSearch && matchesBranch && matchesRole;
    });
  }, [branchFilter, enrichedBranch, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, rowsPerPage, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, branchFilter, roleFilter, rowsPerPage]);

  const pctColor = (pct) => {
    if (pct >= 85) return "bg-emerald-500";
    if (pct >= 65) return "bg-sky-500";
    if (pct >= 45) return "bg-amber-500";
    return "bg-rose-500";
  };

  const PaginationButton = ({ children, disabled, onClick, active = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors ${
        active
          ? "border-[#016E5B] bg-[#016E5B] text-white"
          : disabled
          ? "border-gray-200 bg-gray-100 text-gray-300"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );

  // ---- Mobile card ----
  const MobileBranchCard = ({ branchData, index }) => (
    <div className={`p-4 rounded-lg border ${index % 2 === 0 ? "bg-gray-50" : "bg-white"} mb-4 shadow-sm`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FaBuilding className="text-[#016E5B]" size={16} />
            <h3 className="font-semibold text-[#016E5B] text-lg">
              {branchData?.workingBranch || "N/A"}
            </h3>
          </div>
          <p className="text-sm text-gray-600 font-medium">Code: {branchData?.locCode || "N/A"}</p>
        </div>
        <Link
          to={`/branch/detailed/${branchData?.locCode}`}
          className="bg-[#016E5B] text-white px-3 py-1.5 rounded-md text-sm hover:bg-[#014C3F] transition-colors flex items-center gap-1"
        >
          <FaEdit size={12} />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <HiUsers className="mx-auto text-blue-600 mb-1" size={20} />
          <div className="font-semibold text-blue-700 text-lg">{branchData?.userCount || 0}</div>
          <div className="text-xs text-blue-600 font-medium">Employees</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <HiAcademicCap className="mx-auto text-green-600 mb-1" size={20} />
          <div className="font-semibold text-green-700 text-lg">{branchData?.totalTrainingCount || 0}</div>
          <div className="text-xs text-green-600 font-medium">Trainings</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <HiClipboardCheck className="mx-auto text-purple-600 mb-1" size={20} />
          <div className="font-semibold text-purple-700 text-lg">{branchData?.totalAssessmentCount || 0}</div>
          <div className="text-xs text-purple-600 font-medium">Assessments</div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="mb-[70px]">
        <SideNav />
        <div className="md:ml-[120px] px-4 sm:px-6 lg:px-12">
          <div className="flex justify-center items-center py-14">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#016E5B]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-[70px]">
      <SideNav />
      <div className="md:ml-[120px]">
        <div className="px-4 sm:px-6 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-4 sm:mt-6 mb-6">
            <h1 className="text-[#212121] text-[22px] font-bold leading-tight">Branch Management</h1>
            {user?.role !== "cluster_admin" && user?.role !== "store_admin" && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link
                  to={"/branch/audit"}
                  className="flex items-center justify-center gap-3 w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-2.5 rounded-md transition-colors font-medium"
                >
                  Branch Audit
                </Link>
                <Link
                  to={"/Addbranch"}
                  className="flex items-center justify-center gap-3 w-full sm:w-auto bg-[#212121] hover:bg-[#111111] text-white px-4 py-2.5 rounded-md transition-colors font-medium"
                >
                  <FaPlus size={14} />
                  Add New Branch
                </Link>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-4">Total branches: {branch.length}</div>
        </div>

        {error && (
          <div className="text-red-500 text-center my-4 mx-4 sm:mx-6 lg:mx-12 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="px-4 sm:px-6 lg:px-6">
          {branch.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <FaBuilding className="text-4xl text-gray-400" />
                <span className="text-lg font-medium">No branches found</span>
                <span className="text-sm">Get started by adding a new branch</span>
                <Link to={"/Addbranch"} className="mt-2 bg-[#016E5B] text-white px-4 py-2 rounded-md hover:bg-[#014C3F] transition-colors text-sm">
                  Add First Branch
                </Link>
              </div>
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              {pagedRows.map((b, i) => (
                <MobileBranchCard key={b?.locCode || i} branchData={b} index={i} />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full max-w-[420px]">
                    <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, id, branch..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-[#016E5B] focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative">
                      <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm text-gray-700 outline-none focus:border-[#016E5B] focus:bg-white"
                      >
                        {branchOptions.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="relative">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm text-gray-700 outline-none focus:border-[#016E5B] focus:bg-white"
                      >
                        {roleOptions.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f8fafc] text-gray-500">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold">Branch</th>
                      <th className="px-4 py-3 text-center font-semibold">Loc Code</th>
                      <th className="px-4 py-3 text-center font-semibold">No. of Staffs</th>
                      <th className="px-4 py-3 text-left font-semibold">Progress</th>
                      <th className="px-4 py-3 text-center font-semibold">Trainings</th>
                      <th className="px-4 py-3 text-center font-semibold">Assessments</th>
                      <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((b, i) => (
                      <tr key={b?.locCode || i} className="border-b border-gray-100 transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{displayBranchName(b?.workingBranch) || "N/A"}</div>
                          <div className="text-xs text-gray-500">{b?.roleLabel}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-700">{b?.locCode || "N/A"}</td>
                        <td className="px-4 py-3 text-center font-medium text-gray-700">{b?.userCount || 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-full max-w-[140px] overflow-hidden rounded-full bg-gray-200">
                              <div className={`h-full rounded-full ${pctColor(b?.progressPct || 0)}`} style={{ width: `${Math.min(100, b?.progressPct || 0)}%` }} />
                            </div>
                            <span className="w-10 text-xs font-medium text-gray-500">{b?.progressPct || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-700">{b?.trainingsDisplay ?? b?.totalTrainingCount ?? 0}</td>
                        <td className="px-4 py-3 text-center font-medium text-gray-700">{b?.totalAssessmentCount || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/branch/detailed/${b?.locCode}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-white transition hover:bg-black"
                          >
                            <FaEye size={12} />
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
                  >
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    Page {safePage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <PaginationButton disabled={safePage === 1} onClick={() => setPage(1)}>
                      <FaAngleDoubleLeft size={12} />
                    </PaginationButton>
                    <PaginationButton disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <FaAngleLeft size={12} />
                    </PaginationButton>
                    <PaginationButton disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      <FaAngleRight size={12} />
                    </PaginationButton>
                    <PaginationButton disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>
                      <FaAngleDoubleRight size={12} />
                    </PaginationButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchData;

