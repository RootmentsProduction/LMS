import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "../../components/SideNav/SideNav";
import baseUrl from "../../api/api";
import { toast } from "react-toastify";

/* ── Field component ─────────────────────────────────────────────────────── */
const Field = ({ label, required, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = {
  height: "40px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "0 12px",
  fontSize: "13px",
  color: "#111827",
  background: "#fff",
  outline: "none",
  width: "100%",
  fontFamily: "DM Sans, sans-serif",
  transition: "border-color 0.15s",
};

const BranchForm = () => {
  const navigate = useNavigate();
  const [branch, setBranchData] = useState({
    address: "",
    locCode: "",
    location: "",
    manager: "",
    phoneNumber: "",
    workingBranch: "",
  });
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    const { id, value } = e.target;
    setBranchData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFormSubmit = async () => {
    if (!branch.locCode || !branch.workingBranch) {
      toast.error("Branch ID and Branch Name are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/usercreate/create/branch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(branch),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.message || "Failed to create branch");
        return;
      }
      toast.success("Branch created successfully");
      navigate("/branch");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "DM Sans, sans-serif" }}>
      <SideNav />

      <div className="ml-0 md:ml-[120px]" style={{ paddingTop: "24px", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "24px" }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <button
              onClick={() => navigate("/branch")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "13px", fontWeight: 500, padding: 0, marginBottom: "8px" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Branches
            </button>
            <h1 style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.2, color: "#111827", margin: 0 }}>Add New Branch</h1>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0" }}>Fill in the details below to register a new branch</p>
          </div>
        </div>

        {/* ── Form card ── */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden", maxWidth: "860px" }}>

          {/* Card header */}
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>Branch Information</p>
              <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Basic details about the branch</p>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: "24px" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{}}>

              <Field label="Branch ID" required>
                <input
                  id="locCode"
                  type="text"
                  placeholder="e.g. 101"
                  value={branch.locCode}
                  onChange={handleChange}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#111827"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </Field>

              <Field label="Branch Name" required>
                <input
                  id="workingBranch"
                  type="text"
                  placeholder="e.g. GROOMS Thrissur"
                  value={branch.workingBranch}
                  onChange={handleChange}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#111827"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </Field>

              <Field label="Branch Manager">
                <input
                  id="manager"
                  type="text"
                  placeholder="Enter manager name"
                  value={branch.manager}
                  onChange={handleChange}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#111827"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </Field>

              <Field label="Phone Number">
                <input
                  id="phoneNumber"
                  type="text"
                  placeholder="Enter phone number"
                  value={branch.phoneNumber}
                  onChange={handleChange}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#111827"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </Field>

              <Field label="Location">
                <input
                  id="location"
                  type="text"
                  placeholder="e.g. Thrissur"
                  value={branch.location}
                  onChange={handleChange}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#111827"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </Field>

              <div className="hidden md:block" /> {/* spacer */}

              <div className="col-span-1 md:col-span-2" style={{}}>
                <Field label="Address">
                  <textarea
                    id="address"
                    rows={4}
                    placeholder="Enter full branch address"
                    value={branch.address}
                    onChange={handleChange}
                    style={{ ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: "1.5" }}
                    onFocus={e => e.target.style.borderColor = "#111827"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </Field>
              </div>

            </div>
          </div>

          {/* Card footer */}
          <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              onClick={() => navigate("/branch")}
              style={{ height: "38px", padding: "0 18px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff", color: "#374151", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleFormSubmit}
              disabled={saving}
              style={{ height: "38px", padding: "0 20px", border: "none", borderRadius: "8px", background: saving ? "#9ca3af" : "#111827", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "7px" }}
            >
              {saving ? (
                <>
                  <div style={{ width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "ab-spin 0.7s linear infinite" }} />
                  Saving…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save Branch
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes ab-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default BranchForm;
