import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link, useParams, useNavigate } from "react-router-dom";
import SideNav from "../../../components/SideNav/SideNav";
import { GoPencil } from "react-icons/go";
import { FaRegTrashCan } from "react-icons/fa6";
import baseUrl from "../../../api/api.js";
import { toast } from "react-toastify";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

const statusColor = (status = "") => {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
  if (s === "IN PROGRESS") return "bg-blue-50 text-blue-600 border border-blue-100";
  if (s === "PENDING" || s === "UNDER REVIEW") return "bg-purple-50 text-purple-600 border border-purple-100";
  if (s === "OVERDUE") return "bg-rose-50 text-rose-600 border border-rose-100";
  return "bg-gray-50 text-gray-500 border border-gray-100";
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  } catch {
    return dateStr;
  }
};

const deduplicateTrainings = (trainings) => {
  if (!Array.isArray(trainings)) return [];
  const uniqueTrainingsMap = new Map();
  for (const item of trainings) {
    if (!item || !item.trainingId) continue;
    
    let key = '';
    if (typeof item.trainingId === 'object') {
      key = item.trainingId._id || item.trainingId.id || JSON.stringify(item.trainingId);
    } else {
      key = item.trainingId;
    }
    
    if (key) {
      const keyStr = key.toString();
      if (uniqueTrainingsMap.has(keyStr)) {
        const existing = uniqueTrainingsMap.get(keyStr);
        const merged = {
          ...existing,
          ...item,
          isMandatory: !!(existing.isMandatory || item.isMandatory),
          status: (item.status === 'Completed' || item.status === 'COMPLETED' || item.pass === true) ? item.status : existing.status,
          pass: existing.pass || item.pass || existing.pass === true || item.pass === true
        };
        uniqueTrainingsMap.set(keyStr, merged);
      } else {
        uniqueTrainingsMap.set(keyStr, item);
      }
    }
  }
  return Array.from(uniqueTrainingsMap.values());
};

const EmployeeDetaileData = () => {
  const user = useSelector((state) => state.auth.user);
  const token = localStorage.getItem("token");
  const isRestrictedRole = user?.role === 'cluster_admin' || user?.role === 'store_admin';
  const { id } = useParams();
  const navigate = useNavigate();

  const [isEditing, setIsEditing]   = useState(false);
  const [isExternal, setIsExternal] = useState(false);
  const [data, setData]             = useState({});
  const [fulldata, setfullData]     = useState({});
  const [loading, setLoading]       = useState(true);
  const [branches, setBranches]     = useState([]);

  // Integrations states
  const [tasks, setTasks] = useState([]);
  const [walkins, setWalkins] = useState([]);

  // Filters states
  const [trainingsFilter, setTrainingsFilter] = useState("All");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("All");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("All");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");

  const handleChange = (e) => setData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Fetch branches for the branch-change dropdown
  const fetchBranches = async () => {
    if (branches.length > 0) return; // already loaded
    try {
      const res = await fetch(`${baseUrl.baseUrl}api/admin/accessible-stores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || json.stores || []);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // API Call: Save Edited Profile
  const handleSave = async () => {
    if (isExternal) { toast.error("External source — editing disabled."); return; }
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/admin/user/update/${data.empID || id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) { toast.error(result?.message || "Failed to update"); return; }
      toast.success(result?.message || "Profile updated");
      await FetchUserData();
      setIsEditing(false);
    } catch { toast.error("Error updating data"); }
  };

  // API Call: Delete Employee
  const handleDelete = async () => {
    const targetId = data._id || id;
    if (!targetId) {
      toast.error("Employee database record missing, cannot delete.");
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete employee ${data.username || id}? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${baseUrl.baseUrl}api/admin/admin/delete/${targetId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result?.message || "Failed to delete employee");
        return;
      }
      toast.success(result?.message || "Employee deleted successfully");
      navigate("/employee");
    } catch {
      toast.error("Error deleting employee");
    }
  };

  // Fetch Tasks assigned to user
  const FetchTasks = async (userId) => {
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/task/list?employeeId=${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (response.ok) {
        const json = await response.json();
        setTasks(json.data || []);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  // Fetch Walkins added by user
  const FetchWalkins = async (userId) => {
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/walkin/list?employeeId=${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (response.ok) {
        const json = await response.json();
        setWalkins(json.data || []);
      }
    } catch (err) {
      console.error("Error fetching walkins:", err);
    }
  };

  // Main API Call: User detailed info
  const FetchUserData = async () => {
    setLoading(true);
    try {
      const userdata = await fetch(
        `${baseUrl.baseUrl}api/admin/user/detailed/info/${id}?t=${Date.now()}`,
        { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      if (!userdata.ok) throw new Error("DB route failed");
      const userdetail = await userdata.json();
      
      const dbUser = userdetail?.data || {};
      const selectedData = {
        _id: dbUser._id || "",
        username: dbUser.username || "",
        email: dbUser.email || "",
        phoneNumber: dbUser.phoneNumber || "",
        locCode: dbUser.locCode || "",
        empID: dbUser.empID || "",
        designation: dbUser.designation || "",
        workingBranch: dbUser.workingBranch ? (dbUser.workingBranch.split(',').length > 5 ? "All Stores" : dbUser.workingBranch) : "",
      };

      try {
        const trainingUserId = dbUser._id || dbUser.empID || id;
        const progressRes = await fetch(`${baseUrl.baseUrl}api/user/training-progress/${trainingUserId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const rawTrainings = [
            ...(dbUser.training || []),
            ...(progressData.mandatoryTrainings || [])
          ];
          setfullData({
            ...dbUser,
            training: deduplicateTrainings(rawTrainings)
          });
        } else {
          setfullData({
            ...dbUser,
            training: deduplicateTrainings(dbUser.training)
          });
        }
      } catch {
        setfullData({
          ...dbUser,
          training: deduplicateTrainings(dbUser.training)
        });
      }
      
      setData(selectedData);
      setIsExternal(false);
      
      // Fetch dependent listings if userId exists
      if (dbUser._id) {
        FetchTasks(dbUser._id);
        FetchWalkins(dbUser._id);
      }
      
      setLoading(false);
      return;
    } catch (err) {
      console.warn("DB failed, trying external.", err?.message);
    }
    
    try {
      const res = await fetch(`${baseUrl.baseUrl}api/employee_detail`,
        { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ empId: id }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const emp = Array.isArray(json?.data) ? json.data[0] : null;
      if (!emp) throw new Error("No record");
      
      const selectedData = {
        _id: "",
        username: emp?.name || "",
        email: emp?.email || "",
        phoneNumber: emp?.phone || "",
        locCode: emp?.store_code || "",
        empID: emp?.emp_code || id,
        designation: emp?.role_name || "",
        workingBranch: emp?.store_name ? (emp.store_name.split(',').length > 5 ? "All Stores" : emp.store_name) : ""
      };
      
      setData(selectedData);
      setfullData({ training: [], assignedAssessments: [], __external: true });
      setIsExternal(true);
    } catch {
      toast.error("Failed to load employee details");
      setfullData({ training: [], assignedAssessments: [] });
      setData({});
      setIsExternal(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    FetchUserData();
  }, [id]);

  // Combined unified Trainings & Assessments table rows
  const combinedRows = useMemo(() => {
    const list = [];
    
    // Process trainings
    (fulldata?.training || []).forEach((t) => {
      if (!t.trainingId) return;
      const title = t.trainingId.trainingName || "—";
      const isMandatory = !!t.isMandatory;
      const type = isMandatory ? "Mandatory Training" : "Assigned Training";
      const progress = t.progressPercentage !== undefined ? t.progressPercentage : (t.pass ? 100 : 0);
      
      let status = "PENDING";
      if (progress === 100 || t.pass || t.status?.toLowerCase() === "completed") {
        status = "COMPLETED";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = t.deadline ? new Date(t.deadline) : null;
        if (deadlineDate && deadlineDate < today) {
          status = "OVERDUE";
        } else if (progress > 0) {
          status = "IN PROGRESS";
        }
      }

      list.push({
        id: `training-${t.trainingId._id || t.trainingId}`,
        title,
        type,
        typeColor: isMandatory ? "text-emerald-500" : "text-blue-500",
        progress,
        isPercentage: true,
        status,
        deadline: t.deadline
      });
    });

    // Process assessments
    (fulldata?.assignedAssessments || []).forEach((a) => {
      if (!a.assessmentId) return;
      const title = a.assessmentId.title || "—";
      const type = "Assessment";
      const progressText = `${a.correctAnswers || 0} / ${a.totalQuestions || 0}`;

      let status = "PENDING";
      if (a.status?.toLowerCase() === "completed" || a.pass) {
        status = "COMPLETED";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = a.deadline ? new Date(a.deadline) : null;
        if (deadlineDate && deadlineDate < today) {
          status = "OVERDUE";
        }
      }

      list.push({
        id: `assessment-${a.assessmentId._id || a.assessmentId}`,
        title,
        type,
        typeColor: "text-amber-500",
        progress: progressText,
        isPercentage: false,
        status,
        deadline: a.deadline
      });
    });

    return list;
  }, [fulldata]);

  // Filter unified table rows
  const filteredCombinedRows = useMemo(() => {
    if (!trainingsFilter || trainingsFilter === "All") return combinedRows;
    return combinedRows.filter(r => r.status.toUpperCase() === trainingsFilter.toUpperCase());
  }, [combinedRows, trainingsFilter]);

  // Task unique categories
  const taskCategories = useMemo(() => {
    const cats = new Set();
    tasks.forEach(t => { if (t.category) cats.add(t.category); });
    return ["All", ...Array.from(cats)];
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskCategoryFilter !== "All" && t.category !== taskCategoryFilter) return false;
      if (taskPriorityFilter !== "All" && t.priority?.toLowerCase() !== taskPriorityFilter.toLowerCase()) return false;
      if (taskStatusFilter !== "All" && t.status?.toUpperCase() !== taskStatusFilter.toUpperCase()) return false;
      return true;
    });
  }, [tasks, taskCategoryFilter, taskPriorityFilter, taskStatusFilter]);

  // Metrics computations
  const metrics = useMemo(() => {
    // 1. Walk-ins
    const totalWalkins = walkins.length;
    const convertedWalkins = walkins.filter(w => w.status?.toLowerCase() === "booked").length;

    // 2. Trainings Completion
    const trainingsList = combinedRows.filter(r => r.type !== "Assessment");
    const completedTrainings = trainingsList.filter(t => t.status === "COMPLETED").length;
    const totalTrainingsCount = trainingsList.length;
    const avgTrainingProgress = totalTrainingsCount > 0
      ? Math.round(trainingsList.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTrainingsCount)
      : 0;

    // 3. Tasks Completed
    const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
    const tasksInReview = tasks.filter(t => t.status === "UNDER REVIEW").length;

    // 4. Overdue Tasks
    const overdueTasks = tasks.filter(t => t.status === "OVERDUE").length;

    // 5. Assessments completion and scores
    const assessmentsList = combinedRows.filter(r => r.type === "Assessment");
    const completedAssessments = assessmentsList.filter(a => a.status === "COMPLETED").length;
    
    // Calculate average assessment score from raw assignedAssessments completed attempts
    const completedAssesDocs = (fulldata?.assignedAssessments || []).filter(a => a.status?.toLowerCase() === "completed");
    const avgAssessmentsScore = completedAssesDocs.length > 0
      ? Math.round(completedAssesDocs.reduce((sum, a) => sum + (a.score || 0), 0) / completedAssesDocs.length)
      : 0;

    return {
      totalWalkins,
      convertedWalkins,
      avgTrainingProgress,
      completedTrainings,
      totalTrainingsCount,
      completedTasks,
      tasksInReview,
      overdueTasks,
      avgAssessmentsScore,
      completedAssessments,
      totalAssessmentsCount: assessmentsList.length
    };
  }, [walkins, combinedRows, tasks, fulldata]);

  return (
    <div className="min-h-screen bg-[#f4f5f7]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <SideNav />

      {/* Header spacing layout offset for SideNav width */}
      <div className="md:ml-[110px] min-h-screen bg-[#f4f5f7]">
        <div className="px-8 py-6 max-w-[1600px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-[500px]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#016E5B] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-gray-500">Loading Employee profile details...</p>
              </div>
            </div>
          ) : (
            /* Main columns layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Profile Card, Trainings table, Tasks table */}
              <div className="lg:col-span-9 flex flex-col gap-6">
                
                {/* 1. Profile Informations Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  {/* Card Header row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
                    <div className="flex items-center gap-4">
                      {/* Back button */}
                      <Link to="/employee" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </Link>
                      <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">Profile Informations</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Basic Employee Details</p>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex items-center gap-2.5">
                      {!isRestrictedRole && (
                        <>
                          <button
                            onClick={() => {
                              if (isEditing) handleSave();
                              else { setIsEditing(true); fetchBranches(); }
                            }}
                            disabled={isExternal}
                            className={`inline-flex items-center gap-2 px-5 py-2 border rounded-full text-sm font-medium transition-all ${
                              isExternal
                                ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                : isEditing
                                  ? "bg-[#016E5B] text-white border-[#016E5B] hover:bg-[#015849] shadow-sm shadow-[#016E5B]/20"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <GoPencil className="w-4 h-4" />
                            {isEditing ? "Save" : "Edit"}
                          </button>

                          <button
                            onClick={handleDelete}
                            className="inline-flex items-center gap-2 px-5 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-full text-sm font-medium transition-all"
                          >
                            <FaRegTrashCan className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      )}

                      <button
                        onClick={FetchUserData}
                        className="w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-500 flex items-center justify-center transition-all flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Profile grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                    {/* Full Name */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Full Name</p>
                      {isEditing ? (
                        <input type="text" name="username" value={data.username || ""} onChange={handleChange}
                          className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-600 focus:outline-none" />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 mt-1.5 uppercase">{data.username || "—"}</p>
                      )}
                    </div>

                    {/* Designation */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Designation</p>
                      {isEditing ? (
                        <input type="text" name="designation" value={data.designation || ""} onChange={handleChange}
                          className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-600 focus:outline-none" />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 mt-1.5 uppercase">{data.designation || "—"}</p>
                      )}
                    </div>

                    {/* EMPID */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">EMPID</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1.5 uppercase">{data.empID || "—"}</p>
                    </div>

                    {/* Branch */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Branch</p>
                      {isEditing ? (
                        <select
                          name="workingBranch"
                          value={data.workingBranch || ""}
                          onChange={(e) => {
                            const selected = branches.find(b => b.workingBranch === e.target.value || b.name === e.target.value);
                            setData(prev => ({
                              ...prev,
                              workingBranch: e.target.value,
                              locCode: selected?.locCode || prev.locCode,
                            }));
                          }}
                          className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-600 focus:outline-none bg-white"
                        >
                          <option value="">Select branch...</option>
                          {branches.map((b) => (
                            <option key={b._id || b.locCode} value={b.workingBranch || b.name}>
                              {b.workingBranch || b.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 mt-1.5 uppercase">{data.workingBranch || "—"}</p>
                      )}
                    </div>

                    {/* EMail */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">EMail</p>
                      {isEditing ? (
                        <input type="text" name="email" value={data.email || ""} onChange={handleChange}
                          className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-600 focus:outline-none" />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 mt-1.5">{data.email || "—"}</p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Phone Number</p>
                      {isEditing ? (
                        <input type="text" name="phoneNumber" value={data.phoneNumber || ""} onChange={handleChange}
                          className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-600 focus:outline-none" />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 mt-1.5">{data.phoneNumber || "—"}</p>
                      )}
                    </div>

                    {/* Loc Code */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Loc Code</p>
                      {isEditing ? (
                        <input type="text" name="locCode" value={data.locCode || ""} onChange={handleChange}
                          className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-emerald-600 focus:outline-none" />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 mt-1.5">
                          {data.locCode && data.locCode.length > 15 ? "ALL" : (data.locCode || "—")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Trainings & Assessments Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Card Header row */}
                  <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Training's & Assessments</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Assigned & Mandatory Training's, Assessments records</p>
                      </div>
                    </div>

                    {/* Status filter select */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Status :</span>
                      <select
                        value={trainingsFilter}
                        onChange={(e) => setTrainingsFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-emerald-600 font-medium"
                      >
                        <option value="All">All</option>
                        <option value="Completed">Completed</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Pending">Pending</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  </div>

                  {/* Unified Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 border-collapse">
                      <thead className="bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        <tr className="border-b border-gray-100">
                          <th className="px-6 py-4 w-16">N.O</th>
                          <th className="px-6 py-4">Training / Assessment Title</th>
                          <th className="px-6 py-4 w-52">Progress</th>
                          <th className="px-6 py-4 w-36">Status</th>
                          <th className="px-6 py-4 w-44">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredCombinedRows.length > 0 ? (
                          filteredCombinedRows.map((row, idx) => {
                            let daysLeftStr = "";
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            
                            if (row.status === "COMPLETED") {
                              daysLeftStr = "Completed";
                            } else if (row.deadline) {
                              const deadlineDate = new Date(row.deadline);
                              const diffTime = deadlineDate - today;
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              if (diffDays < 0) {
                                daysLeftStr = "Overdue";
                              } else if (diffDays === 0) {
                                daysLeftStr = "Due Today";
                              } else {
                                daysLeftStr = `${diffDays} Days Left`;
                              }
                            } else {
                              daysLeftStr = "No deadline";
                            }

                            return (
                              <tr key={row.id} className="hover:bg-slate-50/55 transition-colors">
                                <td className="px-6 py-4.5 font-medium text-gray-400">
                                  {String(idx + 1).padStart(2, "0")}
                                </td>
                                <td className="px-6 py-4.5">
                                  <p className="font-semibold text-gray-800 leading-normal">{row.title}</p>
                                  <span className={`text-[11px] font-semibold ${row.typeColor} mt-1 block`}>
                                    {row.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4.5">
                                  {row.isPercentage ? (
                                    <div className="flex items-center gap-3">
                                      {/* Progress bar */}
                                      <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            row.status === "COMPLETED" ? "bg-emerald-500" :
                                            row.status === "OVERDUE" ? "bg-rose-500" :
                                            "bg-blue-500"
                                          }`}
                                          style={{ width: `${row.progress}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-semibold text-gray-600">{row.progress}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-gray-600">{row.progress}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4.5">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusColor(row.status)}`}>
                                    {row.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4.5">
                                  <p className="font-medium text-gray-700">{formatDisplayDate(row.deadline)}</p>
                                  <span className={`text-[11px] mt-0.5 block ${
                                    row.status === "COMPLETED" ? "text-emerald-500 font-semibold" :
                                    row.status === "OVERDUE" ? "text-rose-500 font-semibold" :
                                    "text-gray-400 font-medium"
                                  }`}>
                                    {daysLeftStr}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center py-12 text-gray-400 font-medium">
                              No records found for this status.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Tasks Assigned Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Card Header row */}
                  <div className="px-6 py-5 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Tasks Assigned</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Complete Tasks Records</p>
                      </div>
                    </div>

                    {/* Filter selects */}
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Categories dropdown */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Categories :</span>
                        <select
                          value={taskCategoryFilter}
                          onChange={(e) => setTaskCategoryFilter(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-emerald-600 font-medium"
                        >
                          {taskCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Priority dropdown */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Priority :</span>
                        <select
                          value={taskPriorityFilter}
                          onChange={(e) => setTaskPriorityFilter(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-emerald-600 font-medium"
                        >
                          <option value="All">All</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>

                      {/* Status dropdown */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Status :</span>
                        <select
                          value={taskStatusFilter}
                          onChange={(e) => setTaskStatusFilter(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-emerald-600 font-medium"
                        >
                          <option value="All">All</option>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Tasks Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 border-collapse">
                      <thead className="bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        <tr className="border-b border-gray-100">
                          <th className="px-6 py-4">Task Title</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Priority</th>
                          <th className="px-6 py-4">Start Date</th>
                          <th className="px-6 py-4">End Date</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4 w-32">Status</th>
                          <th className="px-6 py-4 w-24">View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredTasks.length > 0 ? (
                          filteredTasks.map((task) => (
                            <tr key={task.id} className="hover:bg-slate-50/55 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-900">{task.title}</td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-800 leading-normal">{task.category}</p>
                                <span className="text-[11px] text-gray-400 mt-0.5 block">{task.categorySub || "—"}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-700">
                                  <span className={`w-2 h-2 rounded-full ${
                                    task.priority === 'High' ? 'bg-red-500' :
                                    task.priority === 'Medium' ? 'bg-blue-500' :
                                    'bg-emerald-500'
                                  }`} />
                                  <span>{task.priority}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-800 leading-normal">{task.startDate}</p>
                                <span className="text-[11px] text-gray-400 mt-0.5 block">{task.startTime || "—"}</span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-800 leading-normal">{task.endDate}</p>
                                <span className="text-[11px] text-gray-400 mt-0.5 block">{task.endTime || "—"}</span>
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold text-gray-500 leading-normal max-w-xs truncate">
                                {task.description}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <Link to="/task" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors font-medium">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span className="text-xs">View</span>
                                </Link>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="text-center py-12 text-gray-400 font-medium">
                              No tasks assigned under these filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Right Column: Metrics Panel */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                
                {/* Metric Card 1: Total Walk Ins */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Walk Ins</p>
                    <p className="text-[28px] font-bold text-gray-900 mt-2 leading-none">{metrics.totalWalkins}</p>
                    <p className="text-xs font-semibold text-emerald-500 mt-2.5">
                      {metrics.convertedWalkins} Converted to bill
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>

                {/* Metric Card 2: Avg Training Progress */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Training Progress</p>
                    <p className="text-[28px] font-bold text-gray-900 mt-2 leading-none">{metrics.avgTrainingProgress}%</p>
                    <p className="text-xs font-medium text-gray-400 mt-2.5">
                      {metrics.completedTrainings}/{metrics.totalTrainingsCount} Completed
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>

                {/* Metric Card 3: Tasks Completed */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tasks Completed</p>
                    <p className="text-[28px] font-bold text-gray-900 mt-2 leading-none">{metrics.completedTasks}</p>
                    <p className="text-xs font-medium text-gray-400 mt-2.5">
                      {metrics.tasksInReview} Tasks in Review
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                    </svg>
                  </div>
                </div>

                {/* Metric Card 4: Overdue Tasks */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overdue Tasks</p>
                    <p className="text-[28px] font-bold text-rose-500 mt-2 leading-none">
                      {String(metrics.overdueTasks).padStart(2, "0")}
                    </p>
                    <p className="text-xs font-semibold text-rose-500 mt-2.5">
                      Require immediate action
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                {/* Metric Card 5: Avg Assessments Score */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Assessments Score</p>
                    <p className="text-[28px] font-bold text-gray-900 mt-2 leading-none">{metrics.avgAssessmentsScore}%</p>
                    <p className="text-xs font-medium text-gray-400 mt-2.5">
                      {metrics.completedAssessments}/{metrics.totalAssessmentsCount} Completed
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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

export default EmployeeDetaileData;
