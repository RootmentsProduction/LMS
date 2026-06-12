import { FaPlus, FaExternalLinkAlt } from "react-icons/fa";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import baseUrl from "../../api/api";
import SideNav from "../../components/SideNav/SideNav";
import GoogleFormManager from "../../components/GoogleFormManager/GoogleFormManager";

/* ── Assessment card icon ────────────────────────────────────────────────── */
const AssessmentIcon = () => (
  <div style={{
    width: "42px", height: "42px", borderRadius: "10px",
    background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c026d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  </div>
);

/* ── Single assessment card ──────────────────────────────────────────────── */
const AssessmentCard = ({ item }) => {
  const pct = Math.min(100, Math.max(0, Math.round(item.completionPercentage || 0)));

  return (
    <div style={{
        background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb",
        padding: "20px", display: "flex", flexDirection: "column", gap: "14px",
        cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <AssessmentIcon />
          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3 }}>
              {item?.assessmentName || "Untitled Assessment"}
            </p>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "3px 0 0" }}>
              {item?.assessment ?? 0} questions
            </p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", margin: "0 0 6px" }}>Progress</p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "7px", background: "#f3f4f6", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#111827", borderRadius: "99px", transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827", minWidth: "36px", textAlign: "right" }}>{pct}%</span>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {/* Duration */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              {item?.assessmentduration ? `${item.assessmentduration}mins` : "—"}
            </span>
          </div>
          {/* Staffs */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              {item?.totalAssigned ?? 0} Staffs
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}>
          <Link
            to={`/assessment/assign/${item?.assessmentId}`}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              background: "#f3f4f6",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#e5e7eb"}
            onMouseLeave={e => e.currentTarget.style.background = "#f3f4f6"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
            </svg>
            View Details
          </Link>

          <Link
            to="/assign/assessment"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              background: "#111827",
              borderRadius: "10px",
              padding: "10px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#374151"}
            onMouseLeave={e => e.currentTarget.style.background = "#111827"}
          >
            <FaPlus size={11} />
            Assign Assessment
          </Link>
        </div>
      </div>
    );
  };

/* ── Skeleton card ───────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f3f4f6" }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, background: "#f3f4f6", borderRadius: 6, marginBottom: 6, width: "70%" }} />
        <div style={{ height: 11, background: "#f3f4f6", borderRadius: 6, width: "40%" }} />
      </div>
    </div>
    <div>
      <div style={{ height: 11, background: "#f3f4f6", borderRadius: 6, marginBottom: 8, width: "30%" }} />
      <div style={{ height: 7, background: "#f3f4f6", borderRadius: 99 }} />
    </div>
    <div style={{ height: 11, background: "#f3f4f6", borderRadius: 6, width: "50%" }} />
    <div style={{ height: 38, background: "#f3f4f6", borderRadius: 10 }} />
  </div>
);

/* ── Main component ──────────────────────────────────────────────────────── */
const AssessmentsData = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showGoogleFormManager, setShowGoogleFormManager] = useState(false);
  const [activeGoogleForm, setActiveGoogleForm] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseUrl.baseUrl}api/user/get/AllAssessment`);
        if (!response.ok) throw new Error("Failed to fetch data");
        const result = await response.json();
        const list = Array.isArray(result.data) ? result.data : [];

        // Hydrate the card stats from the per-assessment detail endpoint so the
        // staff count and completion percentage stay consistent with the actual
        // assigned-user records.
        const hydrated = await Promise.all(
          list.map(async (item) => {
            try {
              const detailRes = await fetch(`${baseUrl.baseUrl}api/user/get/assessment/full/${item.assessmentId}`);
              if (!detailRes.ok) return item;

              const detailJson = await detailRes.json().catch(() => ({}));
              const stats = detailJson?.data?.stats || {};
              return {
                ...item,
                totalAssigned: typeof stats.totalAssigned === "number" ? stats.totalAssigned : item.totalAssigned,
                completionPercentage:
                  typeof stats.completionPercentage === "number"
                    ? stats.completionPercentage
                    : Number(item.completionPercentage || 0),
              };
            } catch {
              return item;
            }
          })
        );

        const sorted = hydrated.sort((a, b) => Number(b.completionPercentage || 0) - Number(a.completionPercentage || 0));
        setData(sorted);
      } catch {
        setError("Failed to load assessments");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchActiveGoogleForm();
  }, []);

  const fetchActiveGoogleForm = async () => {
    try {
      const res = await fetch(`${baseUrl.baseUrl}api/google-form/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) setActiveGoogleForm(result.data);
      }
    } catch { /* silent */ }
  };

  const handleToggleActive = async () => {
    if (!activeGoogleForm) return;
    try {
      if (activeGoogleForm.isActive) {
        const res = await fetch(`${baseUrl.baseUrl}api/google-form/deactivate`, {
          method: "PUT", headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setActiveGoogleForm(p => ({ ...p, isActive: false }));
      } else {
        const res = await fetch(`${baseUrl.baseUrl}api/google-form`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: activeGoogleForm.title, url: activeGoogleForm.url, description: activeGoogleForm.description }),
        });
        if (res.ok) setActiveGoogleForm(p => ({ ...p, isActive: true }));
      }
    } catch { /* silent */ }
  };

  /* Filter */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchSearch = !q || (item?.assessmentName || "").toLowerCase().includes(q);
      const pct = item.completionPercentage || 0;
      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Completed" && pct >= 100) ||
        (statusFilter === "In Progress" && pct > 0 && pct < 100) ||
        (statusFilter === "Not Started" && pct === 0);
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "DM Sans, sans-serif" }}>
      <SideNav />

      <div className="ml-0 md:ml-[120px]" style={{ paddingTop: "24px", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "24px" }}>

        {/* ── Page header ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6" style={{}}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.2, color: "#111827", margin: 0 }}>Assessments</h1>
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0" }}>
              Monitor module engagement and performance across all trainings
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto" style={{}}>
            <button
              onClick={() => setShowGoogleFormManager(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "9px 16px", fontSize: "13px", fontWeight: 500, color: "#374151", background: "#fff", cursor: "pointer" }}
            >
              <FaExternalLinkAlt size={12} />
              Google Form
            </button>
            <Link to="/assign/Assessment" style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "9px 16px", fontSize: "13px", fontWeight: 500, color: "#374151", background: "#fff", cursor: "pointer" }}>
                <FaPlus size={11} />
                Assign
              </button>
            </Link>
            <Link to="/create/Assessment" style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#111827", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                <FaPlus size={11} />
                New Assessment
              </button>
            </Link>
          </div>
        </div>

        {/* ── Search + filter bar ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 p-4 bg-white rounded-2xl border border-gray-200 shadow-xs" style={{}}>
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 w-full sm:max-w-[320px]" style={{}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search by Training"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "13px", color: "#374151", background: "transparent", width: "100%", fontFamily: "DM Sans, sans-serif" }}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 self-start sm:self-auto" style={{}}>
            <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>Status :</span>
            <div style={{ position: "relative" }}>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ appearance: "none", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px 28px 6px 10px", fontSize: "13px", color: "#374151", background: "#fff", cursor: "pointer", outline: "none", fontFamily: "DM Sans, sans-serif" }}
              >
                {["All", "Completed", "In Progress", "Not Started"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Cards grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{}}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "32px", color: "#ef4444", fontSize: "13px" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "14px" }}>
            No assessments found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{}}>
            {filtered.map(item => (
              <AssessmentCard key={item.assessmentId} item={item} />
            ))}
          </div>
        )}

        {/* ── Active Google Form section ── */}
        {activeGoogleForm && (
          <div style={{ marginTop: "32px", background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FaExternalLinkAlt style={{ color: "#16a34a" }} />
                </div>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: 0 }}>Active Google Form</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0" }}>{activeGoogleForm.title}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end" style={{}}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#374151" }}>
                  <input type="checkbox" checked={activeGoogleForm.isActive} onChange={handleToggleActive} style={{ display: "none" }} />
                  <div style={{ width: 40, height: 22, borderRadius: 99, background: activeGoogleForm.isActive ? "#111827" : "#e5e7eb", position: "relative", transition: "background 0.2s", cursor: "pointer" }}
                    onClick={handleToggleActive}>
                    <div style={{ position: "absolute", top: 3, left: activeGoogleForm.isActive ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                  {activeGoogleForm.isActive ? "Active" : "Inactive"}
                </label>
                <a href={activeGoogleForm.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "#111827", color: "#fff", borderRadius: "10px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                  <FaExternalLinkAlt size={11} />
                  Open Form
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {showGoogleFormManager && (
        <GoogleFormManager onClose={() => { setShowGoogleFormManager(false); fetchActiveGoogleForm(); }} />
      )}
    </div>
  );
};

export default AssessmentsData;
