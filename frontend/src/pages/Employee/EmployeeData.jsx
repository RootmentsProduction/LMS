// // ... other imports remain unchanged
// import { useEffect, useState, useMemo } from "react";
// import Header from "../../components/Header/Header";
// import SideNav from "../../components/SideNav/SideNav";
// import { CiFilter } from "react-icons/ci";
// import { HiDownload } from "react-icons/hi";
// import { BiChevronDown } from "react-icons/bi";
// import baseUrl from "../../api/api";
// import { Link } from "react-router-dom";

// const EmployeeData = () => {
//   const [data, setData] = useState([]);
//   const [filteredData, setFilteredData] = useState([]);
//   const [filterRole, setFilterRole] = useState("");
//   const [filterBranch, setFilterBranch] = useState("");
//   const [isRoleOpen, setIsRoleOpen] = useState(false);
//   const [isBranchOpen, setIsBranchOpen] = useState(false);
//   const [error, setError] = useState("");
//   const [isMobile, setIsMobile] = useState(false);
//   const token = localStorage.getItem('token');

//   // Check for mobile viewport
//   useEffect(() => {
//     const checkMobile = () => {
//       setIsMobile(window.innerWidth < 768);
//     };
    
//     checkMobile();
//     window.addEventListener('resize', checkMobile);
    
//     return () => window.removeEventListener('resize', checkMobile);
//   }, []);

//   useEffect(() => {
//     const fetchEmployees = async () => {
//       try {
//         const response = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
//         });

//         if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
//         const json = await response.json();

//         const normalized = (json?.data || []).map((e) => ({
//           empID: e?.emp_code || "",
//           username: e?.name || "",
//           designation: e?.role_name || "",
//           workingBranch: e?.store_name || "",
//           trainingCount: 0,
//           passCountTraining: 0,
//           Trainingdue: 0,
//           assignedAssessmentsCount: 0,
//           passCountAssessment: 0,
//           AssessmentDue: 0,
//         }));

//         setData(normalized);
//         setFilteredData(normalized);
//         setError("");
//       } catch (error) {
//         console.error("Failed to fetch employees:", error.message);
//         setError("Failed to fetch employee data. Please try again later.");
//         setData([]);
//         setFilteredData([]);
//       }
//     };

//     fetchEmployees();
//   }, []);

//   const roles = useMemo(() => [...new Set(data.map(emp => emp.designation))], [data]);
//   const branches = useMemo(() => [...new Set(data.map(emp => emp.workingBranch))], [data]);

//   const filterData = (role, branch) => {
//     const filtered = data.filter(
//       employee =>
//         (!role || employee.designation === role) &&
//         (!branch || employee.workingBranch === branch)
//     );
//     setFilteredData(filtered);
//   };

//   const handleRoleChange = (role) => {
//     setFilterRole(role);
//     filterData(role, filterBranch);
//     setIsRoleOpen(false);
//   };

//   const handleBranchChange = (branch) => {
//     setFilterBranch(branch);
//     filterData(filterRole, branch);
//     setIsBranchOpen(false);
//   };

//   // Close dropdowns when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (!event.target.closest('.dropdown-container')) {
//         setIsRoleOpen(false);
//         setIsBranchOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

//   const exportToCSV = () => {
//     const headers = [
//       "Emp ID",
//       "Name",
//       "Role",
//       "Branch",
//       "Training",
//       "Trng. Comp",
//       "Trng. Overdue",
//       "Assessments",
//       "Assmt. Comp",
//       "Assmt. Overdue"
//     ];

//     const rows = filteredData.map(emp => [
//       emp.empID,
//       emp.username,
//       emp.designation,
//       emp.workingBranch,
//       emp.trainingCount,
//       `${emp.passCountTraining}%`,
//       emp.Trainingdue,
//       emp.assignedAssessmentsCount,
//       `${emp.passCountAssessment}%`,
//       emp.AssessmentDue
//     ]);

//     const csvContent =
//       "data:text/csv;charset=utf-8," +
//       [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

//     const encodedUri = encodeURI(csvContent);
//     const link = document.createElement("a");
//     link.setAttribute("href", encodedUri);
//     link.setAttribute("download", "employee_data.csv");
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   // Mobile Card Component
//   const MobileEmployeeCard = ({ employee, index }) => (
//     <div className={`p-4 rounded-lg border ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} mb-4 shadow-sm`}>
//       <div className="flex justify-between items-start mb-3">
//         <div>
//           <h3 className="font-semibold text-[#016E5B] text-lg">#{employee.empID}</h3>
//           <p className="font-medium text-gray-800">{employee.username}</p>
//         </div>
//         <Link 
//           to={`/detailed/${employee.empID}`} 
//           className="bg-[#016E5B] text-white px-3 py-1 rounded text-sm hover:bg-[#014C3F] transition-colors"
//         >
//           View
//         </Link>
//       </div>
      
//       <div className="grid grid-cols-1 gap-2 text-sm">
//         <div className="flex justify-between">
//           <span className="text-gray-600">Role:</span>
//           <span className="font-medium text-right flex-1 ml-2" title={employee.designation}>
//             {employee.designation}
//           </span>
//         </div>
//         <div className="flex justify-between">
//           <span className="text-gray-600">Branch:</span>
//           <span className="font-medium text-right flex-1 ml-2" title={employee.workingBranch}>
//             {employee.workingBranch}
//           </span>
//         </div>
        
//         {/* Training Stats */}
//         <div className="mt-2 pt-2 border-t border-gray-200">
//           <p className="font-medium text-gray-700 mb-1">Training:</p>
//           <div className="grid grid-cols-3 gap-2 text-xs">
//             <div className="text-center">
//               <div className="font-semibold text-[#016E5B]">{employee.trainingCount}</div>
//               <div className="text-gray-500">Total</div>
//             </div>
//             <div className="text-center">
//               <div className="font-semibold text-green-600">{employee.passCountTraining}%</div>
//               <div className="text-gray-500">Completed</div>
//             </div>
//             <div className="text-center">
//               <div className="font-semibold text-red-600">{employee.Trainingdue}</div>
//               <div className="text-gray-500">Overdue</div>
//             </div>
//           </div>
//         </div>

//         {/* Assessment Stats */}
//         <div className="mt-2 pt-2 border-t border-gray-200">
//           <p className="font-medium text-gray-700 mb-1">Assessments:</p>
//           <div className="grid grid-cols-3 gap-2 text-xs">
//             <div className="text-center">
//               <div className="font-semibold text-[#016E5B]">{employee.assignedAssessmentsCount}</div>
//               <div className="text-gray-500">Total</div>
//             </div>
//             <div className="text-center">
//               <div className="font-semibold text-green-600">{employee.passCountAssessment}%</div>
//               <div className="text-gray-500">Completed</div>
//             </div>
//             <div className="text-center">
//               <div className="font-semibold text-red-600">{employee.AssessmentDue}</div>
//               <div className="text-gray-500">Overdue</div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );

//   return (
//     <div className="mb-[70px] text-[14px]">
//       <Header name="Employee" />
//       <SideNav />

//       <div className="md:ml-[90px] mt-[160px] sm:mt-[140px]">
//         {/* Header Section */}
//         <div className="px-4 sm:px-6 lg:px-12">
//           <div className="flex flex-col gap-4 mt-8 sm:mt-12 lg:mt-16 mb-6">
//             <h1 className="text-[#212121] text-xl sm:text-2xl font-semibold">Employee Management</h1>

//             {/* Filters and Actions */}
//             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
//               {/* Filters Container */}
//               <div className="flex flex-col sm:flex-row gap-3 flex-1">
//                 {/* Role Dropdown */}
//                 <div className="relative dropdown-container flex-1 sm:flex-none sm:min-w-[140px] sm:max-w-[180px]">
//                   <button
//                     className="flex justify-between items-center w-full border-2 py-2.5 px-3 bg-white text-black rounded-md hover:bg-gray-200 transition-all duration-150"
//                     onClick={() => {
//                       setIsRoleOpen(prev => !prev);
//                       setIsBranchOpen(false);
//                     }}
//                   >
//                     <span className="truncate text-sm font-medium">
//                       {filterRole || "All Roles"}
//                     </span>
//                     <BiChevronDown className={`text-[#016E5B] ml-2 flex-shrink-0 transition-transform ${isRoleOpen ? 'rotate-180' : ''}`} size={18} />
//                   </button>
//                   {isRoleOpen && (
//                     <div className="absolute left-0 right-0 mt-2 bg-white rounded-md shadow-lg z-30 max-h-60 overflow-y-auto border border-gray-200">
//                       <button 
//                         onClick={() => handleRoleChange("")} 
//                         className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 border-b border-gray-100 font-medium"
//                       >
//                         All Roles
//                       </button>
//                       {roles.filter(role => role).map((role, index) => (
//                         <button 
//                           key={index} 
//                           onClick={() => handleRoleChange(role)} 
//                           className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
//                           title={role}
//                         >
//                           {role}
//                         </button>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Branch Dropdown */}
//                 <div className="relative dropdown-container flex-1 sm:flex-none sm:min-w-[140px] sm:max-w-[200px]">
//                   <button
//                     className="flex justify-between items-center w-full border-2 py-2.5 px-3 bg-white text-black rounded-md hover:bg-gray-200 transition-all duration-150"
//                     onClick={() => {
//                       setIsBranchOpen(prev => !prev);
//                       setIsRoleOpen(false);
//                     }}
//                   >
//                     <span className="truncate text-sm font-medium">
//                       {filterBranch || "All Branches"}
//                     </span>
//                     <BiChevronDown className={`text-[#016E5B] ml-2 flex-shrink-0 transition-transform ${isBranchOpen ? 'rotate-180' : ''}`} size={18} />
//                   </button>
//                   {isBranchOpen && (
//                     <div className="absolute left-0 right-0 mt-2 bg-white rounded-md shadow-lg z-30 max-h-60 overflow-y-auto border border-gray-200">
//                       <button 
//                         onClick={() => handleBranchChange("")} 
//                         className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 border-b border-gray-100 font-medium"
//                       >
//                         All Branches
//                       </button>
//                       {branches.filter(branch => branch).map((branch, index) => (
//                         <button 
//                           key={index} 
//                           onClick={() => handleBranchChange(branch)} 
//                           className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
//                           title={branch}
//                         >
//                           {branch}
//                         </button>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* CSV Download Button */}
//               <button
//                 className="bg-[#016E5B] text-white px-4 py-2.5 rounded-md hover:bg-[#014C3F] transition-all duration-150 text-sm font-medium flex items-center justify-center gap-2 sm:whitespace-nowrap"
//                 onClick={exportToCSV}
//               >
//                 <HiDownload size={16} />
//                 <span className="hidden sm:inline">Download CSV</span>
//                 <span className="sm:hidden">CSV</span>
//               </button>
//             </div>

//             {/* Results count */}
//             <div className="text-sm text-gray-600">
//               Showing {filteredData.length} of {data.length} employees
//               {(filterRole || filterBranch) && (
//                 <button 
//                   onClick={() => {
//                     setFilterRole("");
//                     setFilterBranch("");
//                     setFilteredData(data);
//                   }}
//                   className="ml-2 text-[#016E5B] hover:underline"
//                 >
//                   Clear filters
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Error Message */}
//         {error && (
//           <div className="text-red-500 text-center my-4 mx-4 sm:mx-6 lg:mx-12 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
//             {error}
//           </div>
//         )}

//         {/* Content Container */}
//         <div className="mx-4 sm:mx-6 lg:mx-12">
//           {/* Mobile View */}
//           {isMobile ? (
//             <div className="space-y-4">
//               {filteredData.length > 0 ? (
//                 filteredData.map((employee, index) => (
//                   <MobileEmployeeCard key={index} employee={employee} index={index} />
//                 ))
//               ) : (
//                 <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
//                   <div className="flex flex-col items-center gap-3">
//                     <span className="text-4xl">📋</span>
//                     <span className="text-lg font-medium">No employees found</span>
//                     <span className="text-sm">Try adjusting your filters</span>
//                   </div>
//                 </div>
//               )}
//             </div>
//           ) : (
//             /* Desktop/Tablet Table View */
//             <div className="overflow-x-auto text-black bg-white rounded-lg shadow-sm border border-gray-200">
//               <div className="max-h-[70vh] overflow-y-auto">
//                 <table className="w-full text-sm">
//                   <thead className="sticky top-0 z-20 bg-[#016E5B] text-white">
//                     <tr>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[90px]">Emp ID</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[150px]">Name</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[140px] hidden lg:table-cell">Role</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[180px] hidden lg:table-cell">Branch</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[80px] hidden md:table-cell">Training</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[90px] hidden md:table-cell">Trng. Comp</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[100px] hidden xl:table-cell">Trng. Overdue</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[100px] hidden md:table-cell">Assessments</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[100px] hidden md:table-cell">Assmt. Comp</th>
//                       <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[110px] hidden xl:table-cell">Assmt. Overdue</th>
//                       <th className="px-3 py-3 text-center font-semibold min-w-[70px]">View</th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white">
//                     {filteredData.length > 0 ? (
//                       filteredData.map((employee, index) => (
//                         <tr 
//                           key={index} 
//                           className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-all border-b border-gray-200`}
//                         >
//                           <td className="px-3 py-3 border-r border-gray-200 text-center font-medium text-[#016E5B]">
//                             #{employee.empID}
//                           </td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center" title={employee.username}>
//                             <div className="lg:hidden">
//                               <div className="font-medium">{employee.username}</div>
//                               <div className="text-xs text-gray-500 mt-1">{employee.designation}</div>
//                               <div className="text-xs text-gray-500">{employee.workingBranch}</div>
//                             </div>
//                             <div className="hidden lg:block">{employee.username}</div>
//                           </td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center text-sm hidden lg:table-cell" title={employee.designation}>
//                             {employee.designation}
//                           </td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center text-sm hidden lg:table-cell" title={employee.workingBranch}>
//                             {employee.workingBranch}
//                           </td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden md:table-cell">{employee.trainingCount}</td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden md:table-cell">{employee.passCountTraining}%</td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden xl:table-cell">{employee.Trainingdue}</td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden md:table-cell">{employee.assignedAssessmentsCount}</td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden md:table-cell">{employee.passCountAssessment}%</td>
//                           <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden xl:table-cell">{employee.AssessmentDue}</td>
//                           <td className="px-3 py-3 text-center">
//                             <Link 
//                               to={`/detailed/${employee.empID}`} 
//                               className="text-[#016E5B] font-semibold hover:underline hover:text-[#014C3F] transition-colors text-sm px-2 py-1 rounded"
//                             >
//                               View
//                             </Link>
//                           </td>
//                         </tr>
//                       ))
//                     ) : (
//                       <tr>
//                         <td colSpan="11" className="text-center py-12 text-gray-500 bg-gray-50">
//                           <div className="flex flex-col items-center gap-3">
//                             <span className="text-4xl">📋</span>
//                             <span className="text-lg font-medium">No employees found</span>
//                             <span className="text-sm">Try adjusting your filters</span>
//                           </div>
//                         </td>
//                       </tr>
//                     )}
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

// export default EmployeeData;


import { useEffect, useState, useMemo } from "react";
import Header from "../../components/Header/Header";
import SideNav from "../../components/SideNav/SideNav";
import { HiDownload } from "react-icons/hi";
import { BiChevronDown } from "react-icons/bi";
import { HiRefresh } from "react-icons/hi";
import baseUrl from "../../api/api";
import { Link } from "react-router-dom";

/* ---------- Helpers (no brand merging here) ---------- */
function canonFixes(s) {
  return s
    .replace(/\bedap{1,2}a?l{1,3}y\b/g, "edappally")
    .replace(/\bedap{1,2}a?l{1,3}i\b/g, "edappally")
    .replace(/\bmanjeri\b/g, "manjery")
    .replace(/\bperinthalmana\b/g, "perinthalmanna")
    .replace(/\bkottakal\b/g, "kottakkal")
    .replace(/\bkalpeta\b/g, "kalpetta");
}
const norm = (s) =>
  canonFixes(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  );

const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const EmployeeData = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filterRole, setFilterRole] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // mobile viewport check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsRefreshing(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authentication required. Please login again.");
        return;
      }

        // Use the new API endpoint that includes training details with cache-busting
        const cacheBuster = `?t=${Date.now()}`;
        const response = await fetch(`${baseUrl.baseUrl}api/employee/management/with-training-details${cacheBuster}`, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`,
          },
          credentials: "include",
        });

      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const json = await response.json();

      if (json.success && json.data) {
        const normalized = json.data.map((employee) => {
          const branchRaw = employee.workingBranch || "";
          return {
            empID: employee.empID || "",
            username: employee.username || "",
            designation: employee.designation || "",
            workingBranch: branchRaw,                // raw value (for CSV)
            workingBranchLabel: titleCase(branchRaw),// UI label
            // Training data from the API
            trainingCount: employee.trainingCount || 0,
            passCountTraining: employee.passCountTraining || 0,
            Trainingdue: employee.trainingDue || 0,
            trainingCompletionPercentage: employee.trainingCompletionPercentage || 0,
            // Assessment data from the API
            assignedAssessmentsCount: employee.assignedAssessmentsCount || 0,
            passCountAssessment: employee.passCountAssessment || 0,
            AssessmentDue: employee.assessmentDue || 0,
            assessmentCompletionPercentage: employee.assessmentCompletionPercentage || 0,
            // Additional info
            isLocalUser: employee.isLocalUser || false,
            hasTrainingData: employee.hasTrainingData || false,
          };
        });

        setData(normalized);
        setFilteredData(normalized);
        setError("");
        
        console.log(`✅ Loaded ${normalized.length} employees with training details`);
        console.log(`📊 Employees with training data: ${json.employeesWithTraining}`);
      } else {
        throw new Error(json.message || "Invalid response format");
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error.message);
      setError("Failed to fetch employee data. Please try again later.");
      setData([]);
      setFilteredData([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // unique lists
  const roles = useMemo(
    () => [...new Set(data.map((emp) => emp.designation).filter(Boolean))],
    [data]
  );

  // keep brand distinctions; show clean labels
  const branches = useMemo(() => {
    const set = new Map(); // label -> raw
    data.forEach((emp) => {
      if (emp.workingBranch) set.set(emp.workingBranchLabel, emp.workingBranch);
    });
    return Array.from(set.entries()).map(([label, raw]) => ({ label, raw }));
  }, [data]);

  const filterData = (role, branchRaw) => {
    const r = norm(role);
    const b = norm(branchRaw);
    const filtered = data.filter((employee) => {
      const roleOk = !r || norm(employee.designation) === r;
      const branchOk = !b || norm(employee.workingBranch) === b; // robust to Edappally variants
      return roleOk && branchOk;
    });
    setFilteredData(filtered);
  };

  const handleRoleChange = (role) => {
    setFilterRole(role);
    filterData(role, filterBranch);
    setIsRoleOpen(false);
  };

  const handleBranchChange = (branchRaw) => {
    setFilterBranch(branchRaw);
    filterData(filterRole, branchRaw);
    setIsBranchOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setIsRoleOpen(false);
        setIsBranchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    await fetchEmployees();
  };

  const exportToCSV = () => {
    const headers = [
      "Emp ID",
      "Name",
      "Role",
      "Branch",
      "Training",
      "Trng. Comp",
      "Trng. Overdue",
      "Assessments",
      "Assmt. Comp",
      "Assmt. Overdue",
    ];

    const rows = filteredData.map((emp) => [
      emp.empID,
      emp.username,
      emp.designation,
      emp.workingBranch,
      emp.trainingCount,
      `${emp.trainingCompletionPercentage}%`,
      emp.Trainingdue,
      emp.assignedAssessmentsCount,
      `${emp.assessmentCompletionPercentage}%`,
      emp.AssessmentDue,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "employee_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mobile Card
  const MobileEmployeeCard = ({ employee, index }) => (
    <div className={`p-4 rounded-lg border ${index % 2 === 0 ? "bg-gray-50" : "bg-white"} mb-4 shadow-sm`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-[#016E5B] text-lg">#{employee.empID}</h3>
          <p className="font-medium text-gray-800">{employee.username}</p>
        </div>
        <Link
          to={`/detailed/${employee.empID}`}
          className="bg-[#016E5B] text-white px-3 py-1 rounded text-sm hover:bg-[#014C3F] transition-colors"
        >
          View
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Role:</span>
          <span className="font-medium text-right flex-1 ml-2" title={employee.designation}>
            {employee.designation}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Branch:</span>
          <span className="font-medium text-right flex-1 ml-2" title={employee.workingBranch}>
            {employee.workingBranchLabel}
          </span>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="font-medium text-gray-700 mb-1">Training:</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-[#016E5B]">{employee.trainingCount}</div>
              <div className="text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{employee.passCountTraining}%</div>
              <div className="text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{employee.Trainingdue}</div>
              <div className="text-gray-500">Overdue</div>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="font-medium text-gray-700 mb-1">Assessments:</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-[#016E5B]">{employee.assignedAssessmentsCount}</div>
              <div className="text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{employee.passCountAssessment}%</div>
              <div className="text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{employee.AssessmentDue}</div>
              <div className="text-gray-500">Overdue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mb-[70px] text-[14px]">
      <Header name="Employee" />
      <SideNav />

      <div className="md:ml-[90px] mt-[160px] sm:mt-[140px]">
        <div className="px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col gap-4 mt-8 sm:mt-12 lg:mt-16 mb-6">
            <h1 className="text-[#212121] text-xl sm:text-2xl font-semibold">Employee Management</h1>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Role */}
                <div className="relative dropdown-container flex-1 sm:flex-none sm:min-w-[140px] sm:max-w-[180px]">
                  <button
                    className="flex justify-between items-center w-full border-2 py-2.5 px-3 bg-white text-black rounded-md hover:bg-gray-200 transition-all duration-150"
                    onClick={() => {
                      setIsRoleOpen((prev) => !prev);
                      setIsBranchOpen(false);
                    }}
                  >
                    <span className="truncate text-sm font-medium">
                      {filterRole || "All Roles"}
                    </span>
                    <BiChevronDown
                      className={`text-[#016E5B] ml-2 flex-shrink-0 transition-transform ${
                        isRoleOpen ? "rotate-180" : ""
                      }`}
                      size={18}
                    />
                  </button>
                  {isRoleOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-md shadow-lg z-30 max-h-60 overflow-y-auto border border-gray-200">
                      <button
                        onClick={() => handleRoleChange("")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 border-b border-gray-100 font-medium"
                      >
                        All Roles
                      </button>
                      {roles.map((role, index) => (
                        <button
                          key={index}
                          onClick={() => handleRoleChange(role)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          title={role}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Branch */}
                <div className="relative dropdown-container flex-1 sm:flex-none sm:min-w-[160px] sm:max-w-[220px]">
                  <button
                    className="flex justify-between items-center w-full border-2 py-2.5 px-3 bg-white text-black rounded-md hover:bg-gray-200 transition-all duration-150"
                    onClick={() => {
                      setIsBranchOpen((prev) => !prev);
                      setIsRoleOpen(false);
                    }}
                  >
                    <span className="truncate text-sm font-medium">
                      {filterBranch ? titleCase(filterBranch) : "All Branches"}
                    </span>
                    <BiChevronDown
                      className={`text-[#016E5B] ml-2 flex-shrink-0 transition-transform ${
                        isBranchOpen ? "rotate-180" : ""
                      }`}
                      size={18}
                    />
                  </button>
                  {isBranchOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-md shadow-lg z-30 max-h-60 overflow-y-auto border border-gray-200">
                      <button
                        onClick={() => handleBranchChange("")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 border-b border-gray-100 font-medium"
                      >
                        All Branches
                      </button>
                      {branches.map(({ label, raw }) => (
                        <button
                          key={raw}
                          onClick={() => handleBranchChange(raw)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          title={label}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Refresh Button */}
              <button
                className="bg-blue-600 text-white px-4 py-2.5 rounded-md hover:bg-blue-700 transition-all duration-150 text-sm font-medium flex items-center justify-center gap-2 sm:whitespace-nowrap"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <HiRefresh size={16} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                <span className="sm:hidden">{isRefreshing ? '...' : '↻'}</span>
              </button>

              {/* CSV Download Button */}
              <button
                className="bg-[#016E5B] text-white px-4 py-2.5 rounded-md hover:bg-[#014C3F] transition-all duration-150 text-sm font-medium flex items-center justify-center gap-2 sm:whitespace-nowrap"
                onClick={exportToCSV}
              >
                <HiDownload size={16} />
                <span className="hidden sm:inline">Download CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-600">
              Showing {filteredData.length} of {data.length} employees
              {(filterRole || filterBranch) && (
                <button
                  onClick={() => {
                    setFilterRole("");
                    setFilterBranch("");
                    setFilteredData(data);
                  }}
                  className="ml-2 text-[#016E5B] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-500 text-center my-4 mx-4 sm:mx-6 lg:mx-12 p-3 bg-red-50 border border-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="mx-4 sm:mx-6 lg:mx-12">
          {isMobile ? (
            <div className="space-y-4">
              {filteredData.length > 0 ? (
                filteredData.map((employee, index) => (
                  <MobileEmployeeCard key={index} employee={employee} index={index} />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl">📋</span>
                    <span className="text-lg font-medium">No employees found</span>
                    <span className="text-sm">Try adjusting your filters</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto text-black bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-20 bg-[#016E5B] text-white">
                    <tr>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[90px]">Emp ID</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[150px]">Name</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[140px] hidden lg:table-cell">Role</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[180px] hidden lg:table-cell">Branch</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[80px] hidden md:table-cell">Training</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[90px] hidden md:table-cell">Trng. Comp</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[100px] hidden xl:table-cell">Trng. Overdue</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[100px] hidden md:table-cell">Assessments</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[100px] hidden md:table-cell">Assmt. Comp</th>
                      <th className="px-3 py-3 border-r border-[#014C3F] text-center font-semibold min-w-[110px] hidden xl:table-cell">Assmt. Overdue</th>
                      <th className="px-3 py-3 text-center font-semibold min-w-[70px]">View</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredData.length > 0 ? (
                      filteredData.map((employee, index) => (
                        <tr
                          key={index}
                          className={`${index % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-all border-b border-gray-200`}
                        >
                          <td className="px-3 py-3 border-r border-gray-200 text-center font-medium text-[#016E5B]">
                            #{employee.empID}
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center" title={employee.username}>
                            <div className="lg:hidden">
                              <div className="font-medium">{employee.username}</div>
                              <div className="text-xs text-gray-500 mt-1">{employee.designation}</div>
                              <div className="text-xs text-gray-500">{employee.workingBranchLabel}</div>
                            </div>
                            <div className="hidden lg:block">{employee.username}</div>
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center text-sm hidden lg:table-cell" title={employee.designation}>
                            {employee.designation}
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center text-sm hidden lg:table-cell" title={employee.workingBranch}>
                            {employee.workingBranchLabel}
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden md:table-cell">
                            {employee.trainingCount}
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden md:table-cell">
                            {employee.trainingCompletionPercentage}%
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden xl:table-cell">
                            {employee.Trainingdue}
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden md:table-cell">
                            {employee.assignedAssessmentsCount}
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden md:table-cell">
                            {employee.assessmentCompletionPercentage}%
                          </td>
                          <td className="px-3 py-3 border-r border-gray-200 text-center font-medium hidden xl:table-cell">
                            {employee.AssessmentDue}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Link
                              to={`/detailed/${employee.empID}`}
                              className="text-[#016E5B] font-semibold hover:underline hover:text-[#014C3F] transition-colors text-sm px-2 py-1 rounded"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="11" className="text-center py-12 text-gray-500 bg-gray-50">
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-4xl">📋</span>
                            <span className="text-lg font-medium">No employees found</span>
                            <span className="text-sm">Try adjusting your filters</span>
                          </div>
                        </td>
                      </tr>
                    )}
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

export default EmployeeData;
