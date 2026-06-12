import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSearch, FiClock, FiBook, FiUsers, FiCheckCircle, FiPlus } from "react-icons/fi";
import { HiOutlineBookOpen } from "react-icons/hi";
import baseUrl from "../../api/api";
import SideNav from "../../components/SideNav/SideNav";
import Card from "../../components/Skeleton/Card";

const FILTER_OPTIONS = [
  { label: "All", value: "" },
  { label: "0 – 25%", value: "0-25" },
  { label: "26 – 51%", value: "26-51" },
  { label: "52 – 77%", value: "52-77" },
  { label: "78 – 100%", value: "78-100" },
];

const TAB_OPTIONS = [
  { label: "All Trainings", value: "all" },
  { label: "Assigned Trainings", value: "Assigned" },
];

const TrainingData = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/get/allusertraining`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const result = await res.json();
        setData(result.data || []);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = data.filter((item) => {
    const pct = item?.averageCompletionPercentage ?? 0;

    // Tab filter
    const trainingType = item?.Trainingtype || item?.trainingType;
    if (tab === "Assigned" && trainingType !== "Assigned") return false;

    // Search filter
    if (search && !item?.trainingName?.toLowerCase().includes(search.toLowerCase())) return false;

    // Progress range filter
    if (filter === "0-25" && !(pct >= 0 && pct <= 25)) return false;
    if (filter === "26-51" && !(pct >= 26 && pct <= 51)) return false;
    if (filter === "52-77" && !(pct >= 52 && pct <= 77)) return false;
    if (filter === "78-100" && !(pct >= 78 && pct <= 100)) return false;

    return true;
  });

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "All";

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <SideNav />

      <div className="flex-1 md:ml-[120px] p-6">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold leading-tight text-gray-900">Training Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create, assign, and monitor training programs across your organization
            </p>
          </div>
          <button
            onClick={() => navigate("/createnewtraining")}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
          >
            <FiPlus size={16} />
            New Training
          </button>
        </div>

        {/* Toolbar: tabs + search + filter */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex flex-wrap items-center gap-3 mb-5">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {TAB_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  tab === t.value
                    ? "bg-gray-900 text-white shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[180px] relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search by Training"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((p) => !p)}
              className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              Training : {activeFilterLabel}
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilter(opt.value); setFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition ${
                      filter === opt.value ? "font-semibold text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card /><Card /><Card /><Card /><Card /><Card />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <HiOutlineBookOpen size={48} className="mb-3 opacity-40" />
            <p className="text-sm">No trainings found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, index) => (
              <TrainingCard key={item?._id || item?.trainingId || item?.trainingName || index} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Individual training card ── */
const TrainingCard = ({ item }) => {
  const pct = Math.round(item?.averageCompletionPercentage ?? 0);
  const modules = item?.numberOfModules ?? 0;
  const videos = item?.totalVideos ?? 0;
  const staffs = item?.totalAssignedUsers ?? item?.totalUsers ?? 0;
  const totalMins = item?.durationMinutes ?? 0;
  const hrs = Math.floor(totalMins / 60).toString().padStart(2, "0");
  const mins = (totalMins % 60).toString().padStart(2, "0");

  return (
    <Link to={`/AssigTraining/${item?.trainingId}`}>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer h-full">
        {/* Icon + title */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <HiOutlineBookOpen size={20} className="text-purple-500" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">
              {item?.trainingName}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {modules} Modules | {videos} Videos
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-semibold text-gray-800">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <FiClock size={12} className="flex-shrink-0" />
            {hrs} hr {mins} mins
          </span>
          <span className="flex items-center gap-1.5">
            <FiBook size={12} className="flex-shrink-0" />
            {modules} Modules
          </span>
          <span className="flex items-center gap-1.5">
            <FiUsers size={12} className="flex-shrink-0" />
            {staffs} Staffs
          </span>
          <span className="flex items-center gap-1.5">
            <FiCheckCircle size={12} className="flex-shrink-0" />
            {pct}% Completed
          </span>
        </div>
      </div>
    </Link>
  );
};

export default TrainingData;
