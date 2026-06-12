import { Link, useNavigate } from "react-router-dom";
import Select from "react-select";
import { useEffect, useMemo, useState } from "react";
import baseUrl from "../../../api/api";
import SideNav from "../../../components/SideNav/SideNav";
import { toast } from "react-toastify";

const ASSIGN_OPTIONS = [
  { value: "user", label: "User" },
  { value: "designation", label: "Designation" },
  { value: "branch", label: "Branch" },
];

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? "#016E5B" : "#e5e7eb",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(1,110,91,0.08)" : "none",
    fontSize: 13,
    "&:hover": { borderColor: "#016E5B" },
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    backgroundColor: state.isSelected ? "#016E5B" : state.isFocused ? "#f0fdf4" : "white",
    color: state.isSelected ? "white" : "#111827",
  }),
  multiValue: (base) => ({ ...base, backgroundColor: "#ecfdf5", borderRadius: 8 }),
  multiValueLabel: (base) => ({ ...base, color: "#016E5B", fontWeight: 600, fontSize: 11 }),
  multiValueRemove: (base) => ({ ...base, color: "#016E5B", "&:hover": { backgroundColor: "#d1fae5", color: "#014d43" } }),
};

const AssignAssessmentData = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [assignedTo, setAssignedTo] = useState([]);
  const [days, setDays] = useState("");
  const [selectedOption, setSelectedOption] = useState("user");
  const [reassign, setReassign] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isReady = selectedModules.length > 0 && assignedTo.length > 0 && Number(days) >= 1;

  const assignLabel = useMemo(
    () => ASSIGN_OPTIONS.find((o) => o.value === selectedOption)?.label || "User",
    [selectedOption]
  );

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/user/get/AllAssessment`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setModules((data?.data || []).map((m) => ({ value: m.assessmentId, label: m.assessmentName })));
      } catch {}
    };
    fetchAssessments();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setAssignedTo([]);
      try {
        let options = [];
        if (selectedOption === "user") {
          const res = await fetch(`${baseUrl.baseUrl}api/usercreate/getAllUser`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            credentials: "include",
          });
          if (res.ok) {
            const d = await res.json();
            options = (d.data || []).map((u) => ({ value: u._id, label: u.username }));
          }
        } else if (selectedOption === "branch") {
          const res = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            credentials: "include",
          });
          if (res.ok) {
            const d = await res.json();
            options = (d.data || []).map((b) => ({ value: b.locCode, label: b.workingBranch }));
          }
        } else {
          const res = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
          });
          if (res.ok) {
            const d = await res.json();
            const unique = [...new Set((d?.data || []).map((e) => e.role_name).filter(Boolean))].sort();
            options = unique.map((r) => ({ value: r, label: r }));
          }
        }
        setUsers(options);
      } catch {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [selectedOption, token]);

  const handleAssign = async () => {
    if (!selectedModules.length) return toast.error("Please select at least one assessment");
    if (!assignedTo.length) return toast.error(`Please select at least one ${assignLabel.toLowerCase()}`);
    if (!days || Number(days) < 1) return toast.error("Please enter a valid number of days");

    setSubmitting(true);
    try {
      const payload = {
        assignedTo: assignedTo.map((i) => i.value),
        assessmentId: selectedModules.map((i) => i.value),
        selectedOption,
        days,
        Reassign: reassign,
      };

      const res = await fetch(`${baseUrl.baseUrl}api/user/post/createAssessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Error assigning assessment");
      if (data.message === "already Assigned") toast.error(data.message);
      else toast.success(data.message || "Assessment assigned");
      navigate("/assessments");
    } catch (err) {
      toast.error(err?.message || "Error assigning assessment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <SideNav />

      <div className="ml-[150px] px-6 pt-6 pb-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <Link to="/assessments" className="text-[12px] text-gray-500 hover:text-gray-700 inline-flex items-center gap-2 mb-2">
                <span>←</span>
                <span>Back to Assessments</span>
              </Link>
              <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Assign Assessment</h1>
              <p className="text-[12px] text-gray-400 mt-1">Select an assessment, target group, and completion deadline.</p>
            </div>

            <button
              onClick={handleAssign}
              disabled={!isReady || submitting}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                isReady && !submitting ? "bg-gray-900 text-white hover:bg-gray-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Assigning..." : "Assign Assessment"}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white border border-[#f0f0f0] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <h2 className="text-[16px] font-bold text-gray-900 mb-1">Select Assessment</h2>
              <p className="text-[11px] text-gray-400 mb-4">Choose one or more assessments.</p>
              <Select
                placeholder="Search and select assessments..."
                options={modules}
                isMulti
                value={selectedModules}
                onChange={setSelectedModules}
                styles={selectStyles}
              />

              <div className="mt-4">
                <Link to="/create/Assessment" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#016E5B] hover:text-[#014d43]">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-[#016E5B]">+</span>
                  Create New Assessment
                </Link>
              </div>
            </div>

            <div className="bg-white border border-[#f0f0f0] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <h2 className="text-[16px] font-bold text-gray-900 mb-1">Assign To</h2>
              <p className="text-[11px] text-gray-400 mb-4">Choose user, designation, or branch.</p>

              <div className="flex gap-2 mb-4 flex-wrap">
                {ASSIGN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedOption(opt.value)}
                    className={`px-3 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                      selectedOption === opt.value
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <Select
                placeholder={loadingUsers ? "Loading..." : `Select ${assignLabel.toLowerCase()}s...`}
                options={users}
                isMulti
                isLoading={loadingUsers}
                value={assignedTo}
                onChange={setAssignedTo}
                styles={selectStyles}
              />

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-2">Days to complete</label>
                  <input
                    type="number"
                    min="1"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-[180px] rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] outline-none focus:border-[#016E5B]"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={reassign} onChange={() => setReassign((p) => !p)} className="w-4 h-4 accent-[#016E5B]" />
                  <span className="text-[12px] text-gray-700 font-medium">Reassign if already assigned</span>
                </label>
              </div>

              <div className="mt-4 text-[12px]">
                {!isReady ? (
                  <span className="text-amber-600">Fill all fields to continue</span>
                ) : (
                  <span className="text-emerald-600 font-medium">Ready to assign</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignAssessmentData;
