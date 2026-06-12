import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SideNav from "../../components/SideNav/SideNav";
import baseUrl from "../../api/api";
import { FaPlus, FaSearch } from "react-icons/fa";
import { LuClock, LuBookOpen, LuEye, LuArrowLeft, LuX, LuPencil } from "react-icons/lu";

/* ─────────────────────────────────────────────────────────── */
/*  Detail Modal                                               */
/* ─────────────────────────────────────────────────────────── */
const ModuleDetailModal = ({ module, onClose }) => {
  if (!module) return null;

  const videoCount = module.videos?.length ?? 0;
  const createdDate = module.createdAt
    ? new Date(module.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not available";
  const createdBy = module.createdBy || module.adminName || "Not available";

  // close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full max-w-[420px] rounded-[16px] bg-white shadow-2xl"
        style={{ fontFamily: "DM Sans, sans-serif", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* ── Modal header ── */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          >
            <LuArrowLeft size={18} />
          </button>
          <h2 className="text-[18px] font-bold text-gray-900 flex-1 leading-tight">
            {module.moduleName || "Module Name"}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400"
          >
            <LuX size={16} />
          </button>
        </div>

        {/* ── Meta info ── */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-2">
          <MetaRow label="No. of videos" value={`${videoCount} Videos`} />
          <MetaRow label="Module Created" value={createdDate} />
          <MetaRow label="Created By" value={createdBy} bold />
        </div>

        {/* ── Video list ── */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {module.videos?.length > 0 ? (
            <div className="space-y-3">
              {module.videos.map((video, idx) => (
                <div
                  key={idx}
                  className="rounded-[10px] border border-gray-200 px-4 py-3"
                >
                  <p className="text-[14px] font-semibold text-gray-900">
                    {video.title || `Video ${idx + 1}`}
                  </p>
                  <p className="mt-0.5 text-[12px] text-gray-500 truncate">
                    URL : {video.videoUri || video.url || "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 text-center py-6">No videos added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const MetaRow = ({ label, value, bold }) => (
  <div className="flex items-center justify-between">
    <span className="text-[12px] text-gray-500">{label}</span>
    <span className={`text-[13px] ${bold ? "font-bold text-gray-900" : "text-gray-700"}`}>
      {value}
    </span>
  </div>
);

/* ─────────────────────────────────────────────────────────── */
/*  Main Page                                                  */
/* ─────────────────────────────────────────────────────────── */
const ModuleData = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState(null);

  useEffect(() => {
    if (!document.getElementById("dm-sans-font")) {
      const link = document.createElement("link");
      link.id = "dm-sans-font";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/modules`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setModules(Array.isArray(data) ? data : []);
      } catch {
        setModules([]);
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, []);

  const filtered = modules.filter((m) =>
    (m.moduleName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="flex min-h-screen bg-[#f9fafb]"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <SideNav />

      {/* Detail modal */}
      {selectedModule && (
        <ModuleDetailModal
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
        />
      )}

      <div className="flex-1 md:ml-[120px] px-6 py-6 pb-6">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
              Module Management
            </h1>
            <p className="mt-1 text-[12px] text-gray-500">
              Monitor module engagement and performance across all trainings
            </p>
          </div>
          <Link to="/createmodule">
            <button className="inline-flex items-center gap-2 bg-[#111111] hover:bg-[#333] text-white text-[13px] font-semibold px-4 py-2.5 rounded-[10px] transition-colors whitespace-nowrap">
              <FaPlus size={12} />
              Add New Module
            </button>
          </Link>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-5 max-w-[340px]">
          <FaSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={13}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Training"
            style={{ fontFamily: "DM Sans, sans-serif" }}
            className="w-full h-10 pl-9 pr-4 rounded-[8px] border border-gray-200 bg-white text-[13px] text-gray-700 outline-none placeholder:text-gray-400 focus:border-gray-400"
          />
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex justify-center items-center py-14">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800" />
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400">
            <LuBookOpen size={40} className="mb-3 opacity-40" />
            <p className="text-[14px] font-medium">No modules found</p>
            <p className="text-[12px] mt-1">
              {search
                ? "Try a different search term"
                : "Get started by adding a new module"}
            </p>
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <ModuleCard
                key={item._id || item.moduleId}
                module={item}
                onViewDetails={() => setSelectedModule(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  Module Card                                                */
/* ─────────────────────────────────────────────────────────── */
const ModuleCard = ({ module, onViewDetails }) => {
  const videoCount = module.videos?.length ?? 0;
  const hours = module.durationHours
    ? `${module.durationHours} hours`
    : videoCount > 0
    ? `${Math.max(1, Math.round(videoCount * 0.5))} hours`
    : "—";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        minHeight: "254px",
        height: "100%",
        cursor: "pointer",
        transition: "box-shadow 0.15s, transform 0.15s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <ModuleIcon />
        <div>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3 }}>
            {module.moduleName || "Untitled Module"}
          </p>
          <p style={{ fontSize: "11px", color: "#9ca3af", margin: "3px 0 0" }}>
            {module.description || "Customer Service Excellence"}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
        <MetaItem icon={<LuClock size={13} />} label={hours} />
        <MetaItem icon={<LuBookOpen size={13} />} label={`${videoCount} Videos`} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
        <Link
          to={`/createmodule/${module._id || module.moduleId}`}
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
          <LuPencil size={14} />
          Edit
        </Link>
        <button
          onClick={onViewDetails}
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
            border: "none",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#374151"}
          onMouseLeave={e => e.currentTarget.style.background = "#111827"}
        >
          <LuEye size={14} />
          View Details
        </button>
      </div>
    </div>
  );
};

const ModuleIcon = () => (
  <div style={{
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#fdf4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c026d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  </div>
);

const MetaItem = ({ icon, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
    <span style={{ color: "#6b7280" }}>{icon}</span>
    <span style={{ fontSize: "11px", color: "#6b7280" }}>{label}</span>
  </div>
);

export default ModuleData;
