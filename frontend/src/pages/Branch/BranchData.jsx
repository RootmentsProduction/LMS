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
//           <div className="flex justify-center items-center py-20">
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

import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import { FaPlus, FaEdit, FaBuilding } from "react-icons/fa";
import { HiUsers, HiAcademicCap, HiClipboardCheck } from "react-icons/hi";
import SideNav from "../../components/SideNav/SideNav";
import baseUrl from "../../api/api";
import { Link } from "react-router-dom";

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

const BranchData = () => {
  const [branch, setBranch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const token = localStorage.getItem("token");

  // mobile check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchBranchesAndEmployees = async () => {
      setLoading(true);
      try {
        const branchReq = fetch(baseUrl.baseUrl + "api/usercreate/getBranch", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        const empReq = fetch(baseUrl.baseUrl + "api/employee_range", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
        });

        const [branchRes, empRes] = await Promise.all([branchReq, empReq]);
        if (!branchRes.ok)
          throw new Error(`Branches: HTTP ${branchRes.status} ${branchRes.statusText}`);
        if (!empRes.ok)
          throw new Error(`Employees: HTTP ${empRes.status} ${empRes.statusText}`);

        const branchJson = await branchRes.json();
        const empJson = await empRes.json();

        const branchList = Array.isArray(branchJson?.data) ? branchJson.data : [];
        const employees = Array.isArray(empJson?.data) ? empJson.data : [];

        // Build indices
        const byFull = {};        // "grooms edappally" -> idx
        const byLocBrand = {};    // loc "edappally" -> { suitor: idxA, zorucci: idxB }

        branchList.forEach((b, i) => {
          const full = norm(b?.workingBranch);
          const loc = locationKey(b?.workingBranch);
          const brand = brandKey(b?.workingBranch);

          if (full) byFull[full] = i;

          if (loc) {
            if (!byLocBrand[loc]) byLocBrand[loc] = {};
            if (brand) byLocBrand[loc][brand] = i;
          }
        });

        // Count employees with brand-aware mapping
        const counts = new Array(branchList.length).fill(0);
        const unmatched = {};

        employees.forEach((e) => {
          const raw = e?.store_name || e?.workingBranch || "";
          const full = norm(raw);
          const loc = locationKey(raw);
          const brand = brandKey(raw);

          let idx = byFull[full];

          if (idx === undefined && loc && byLocBrand[loc]) {
            const map = byLocBrand[loc];
            if (brand && map[brand] !== undefined) {
              idx = map[brand];
            } else {
              // if only one branch exists at that location, fallback to it
              const indices = Object.values(map);
              if (indices.length === 1) idx = indices[0];
            }
          }

          if (idx !== undefined) {
            counts[idx] = (counts[idx] || 0) + 1;
          } else {
            const key = `${raw}`.trim() || "(blank)";
            unmatched[key] = (unmatched[key] || 0) + 1;
          }
        });

        if (Object.keys(unmatched).length) {
          console.warn("[Branch headcount] Unmatched store names:", unmatched);
        }

        // Merge computed counts (preserve backend fallback when computed = 0)
        const merged = branchList.map((b, i) => {
          const fallback = typeof b?.userCount === "number" ? b.userCount : 0;
          const computed = counts[i] || 0;
          return { ...b, userCount: computed || fallback };
        });

        setBranch(merged);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to load branch/employee data. Please try again later.");
        setBranch([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBranchesAndEmployees();
  }, [token]);

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
        <Header name="Branch" />
        <SideNav />
        <div className="md:ml-[90px] mt-[160px] px-4 sm:px-6 lg:px-12">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#016E5B]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-[70px]">
      <Header name="Branch" />
      <SideNav />
      <div className="md:ml-[90px] mt-[160px] sm:mt-[140px]">
        <div className="px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-8 sm:mt-12 mb-6">
            <h1 className="text-[#212121] text-xl sm:text-2xl font-semibold">Branch Management</h1>
            <Link
              to={"/Addbranch"}
              className="flex items-center justify-center gap-3 w-full sm:w-auto bg-[#016E5B] hover:bg-[#014C3F] text-white px-4 py-2.5 rounded-md transition-colors font-medium"
            >
              <FaPlus size={14} />
              Add New Branch
            </Link>
          </div>
          <div className="text-sm text-gray-600 mb-4">Total branches: {branch.length}</div>
        </div>

        {error && (
          <div className="text-red-500 text-center my-4 mx-4 sm:mx-6 lg:mx-12 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mx-4 sm:mx-6 lg:mx-12">
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
              {branch.map((b, i) => (
                <MobileBranchCard key={b?.locCode || i} branchData={b} index={i} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#016E5B] text-white">
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[100px]">Location Code</th>
                      <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[180px]">Branch Name</th>
                      <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[120px]">Employees</th>
                      <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[120px] hidden lg:table-cell">Trainings</th>
                      <th className="px-4 py-3 text-center font-semibold border-r border-[#014C3F] min-w-[130px] hidden lg:table-cell">Assessments</th>
                      <th className="px-4 py-3 text-center font-semibold min-w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {branch.map((b, i) => (
                      <tr key={b?.locCode || i} className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-all`}>
                        <td className="px-4 py-3 text-center font-medium text-[#016E5B] border-r border-gray-200">{b?.locCode || "N/A"}</td>
                        <td className="px-4 py-3 border-r border-gray-200">
                          <div className="text-center lg:text-left">
                            <div className="font-medium text-gray-900">{b?.workingBranch || "N/A"}</div>
                            <div className="lg:hidden mt-1 text-xs text-gray-500 space-y-1">
                              <div>Training: {b?.totalTrainingCount || 0}</div>
                              <div>Assessments: {b?.totalAssessmentCount || 0}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium border-r border-gray-200">
                          <div className="flex items-center justify-center gap-1">
                            <HiUsers className="text-blue-600" size={14} />
                            {b?.userCount || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium border-r border-gray-200 hidden lg:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <HiAcademicCap className="text-green-600" size={14} />
                            {b?.totalTrainingCount || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium border-r border-gray-200 hidden lg:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <HiClipboardCheck className="text-purple-600" size={14} />
                            {b?.totalAssessmentCount || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/branch/detailed/${b?.locCode}`}
                            className="inline-flex items-center gap-1 text-[#016E5B] font-semibold hover:text-[#014C3F] hover:underline transition-colors text-sm px-2 py-1 rounded"
                          >
                            <FaEdit size={12} />
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchData;
