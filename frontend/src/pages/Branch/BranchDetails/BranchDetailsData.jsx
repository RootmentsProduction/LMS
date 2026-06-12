import { useEffect, useMemo, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import SideNav from "../../../components/SideNav/SideNav";
import { useParams } from "react-router-dom";
import baseUrl from "../../../api/api";
import { toast } from "react-toastify";
import {
  FaCalendarCheck,
  FaChevronLeft,
  FaLocationDot,
  FaPhone,
  FaRegBuilding,
  FaRegEnvelope,
  FaArrowRight,
  FaBarsStaggered,
} from "react-icons/fa6";

const MetricCard = ({ title, value, subtitle, progress, accent = "bg-[#111111]" }) => (
  <div className="min-h-[136px] rounded-[2px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-none">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[13px] text-[#1f2937]">{title}</p>
        <div className="mt-4 text-[18px] font-medium leading-none text-gray-900">{value}</div>
        <p className="mt-2 text-[12px] text-[#94a3b8]">{subtitle}</p>
      </div>
      <div className={`h-6 w-6 rounded-[6px] ${accent} flex items-center justify-center text-white`}>
        <FaBarsStaggered size={10} />
      </div>
    </div>
    {typeof progress === "number" && (
      <div className="mt-3 h-[6px] rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-[#111111]" style={{ width: `${Math.min(100, progress)}%` }} />
      </div>
    )}
  </div>
);

const BranchDetailsData = () => {
  const token = localStorage.getItem("token");
  const user = useSelector((s) => s.auth.user);
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});

  const fetchBranch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/admin/get/update/branch/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const branchdata = await response.json();
      const branch = branchdata?.branch || {};
      const selectedData = {
        workingBranch: branch.workingBranch || "",
        locCode: branch.locCode || "",
        phoneNumber: branch.phoneNumber || "",
        location: branch.location || "",
        address: branch.address || "",
        manager: branch.manager || "",
        email: branch.email || "",
        totalStaffs: Number(branch.totalStaffs ?? branch.userCount ?? 0),
        needAttention: Number(branch.needAttention ?? 0),
        completionRate: Number(branch.completionRate ?? branch.progressPct ?? 0),
        averageScore: Number(branch.averageScore ?? 0),
        completed: Number(branch.completed ?? 0),
        inProgress: Number(branch.inProgress ?? 0),
        notStarted: Number(branch.notStarted ?? 0),
        avgAssessmentScore: Number(branch.avgAssessmentScore ?? 0),
      };
      setData(selectedData);
    } catch {
      toast.error("Failed to load branch details");
      setData({});
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchBranch();
  }, [fetchBranch]);

  const branchTitle = (() => {
    const raw = String(data.workingBranch || "");
    if (/^grooms\s+/i.test(raw)) return raw.replace(/^grooms\s+/i, "Suitor Guy ");
    return raw || "Branch";
  })();
  const branchBrand = useMemo(() => {
    const n = String(data.workingBranch || "").toLowerCase();
    if (n.includes("zorucci")) return "Zorucci";
    if (n.includes("suitor") || n.includes("grooms") || n.includes("sg")) return "Suitor Guy";
    return "";
  }, [data.workingBranch]);

  if (loading) {
    return (
      <div className="mb-[70px]">
        <SideNav />
        <div className="md:ml-[120px] px-4 sm:px-6 lg:px-6">
          <div className="flex justify-center items-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-[#111111]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-[70px] bg-[#f7f7f7] min-h-screen">
      <SideNav />

      <div className="md:ml-[120px] px-4 sm:px-6 lg:px-6 pb-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-gray-700 hover:bg-gray-50"
              >
                <FaChevronLeft size={14} />
              </button>
              <h1 className="text-[20px] font-semibold leading-tight text-gray-900">{branchTitle}</h1>
              {branchBrand && <p className="mt-1 text-[13px] text-[#2563eb]">{branchBrand}</p>}
            </div>

            {user?.role !== "cluster_admin" && user?.role !== "store_admin" && (
              <div className="flex flex-wrap gap-2 lg:mt-0 lg:self-start">
                <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[12px] font-medium text-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                  <FaCalendarCheck size={10} />
                  Assign Assessment
                </button>
                <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-3 text-[12px] font-medium text-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                  <FaArrowRight size={10} />
                  Create New Assessment
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <MetricCard
              title="dnaskndkj"
              value={data.totalStaffs || 0}
              subtitle="135 active learners"
              accent="bg-[#111111]"
            />
            <MetricCard
              title="Need Attention"
              value={data.needAttention || 0}
              subtitle="Across 2 brands"
              accent="bg-[#111111]"
            />
            <MetricCard
              title="Completion Rate"
              value={`${data.completionRate || 0}%`}
              subtitle=""
              progress={data.completionRate || 0}
              accent="bg-[#111111]"
            />
            <MetricCard
              title="Average Score"
              value={`${data.averageScore || 0}%`}
              subtitle="Assessment performance"
              progress={data.averageScore || 0}
              accent="bg-[#c026d3]"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2px] border border-[#e5e7eb] bg-white p-6 shadow-none">
              <h2 className="text-[13px] font-medium text-gray-700">Store Informations</h2>

              <div className="mt-5 flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white">
                  <FaRegBuilding size={14} />
                </div>
                <div>
                  <div className="text-[16px] font-semibold text-gray-900">{branchTitle}</div>
                  {branchBrand && <div className="text-[13px] text-[#2563eb]">{branchBrand}</div>}
                </div>
              </div>

              <div className="mt-6 grid gap-0 text-sm">
                <InfoRow icon={<FaRegBuilding size={12} />} label="Loc Code" value={data.locCode || "-"} />
                <InfoRow icon={<FaRegBuilding size={12} />} label="Abhishek" value={data.manager || "-"} />
                <InfoRow icon={<FaPhone size={12} />} label="Phone Number" value={data.phoneNumber || "-"} />
                <InfoRow icon={<FaRegEnvelope size={12} />} label="Email" value={data.email || "-"} />
                <InfoRow icon={<FaLocationDot size={12} />} label="Location" value={data.location || "-"} />
              </div>
            </div>

            <div className="rounded-[2px] border border-[#e5e7eb] bg-white p-6 shadow-none">
              <h2 className="text-[13px] font-medium text-gray-700">Training Summary</h2>

              <div className="mt-7">
                <div className="flex items-end justify-between">
                  <div className="text-[18px] font-medium text-gray-900">{data.completionRate || 0}%</div>
                  <div className="text-[13px] text-gray-500">{data.avgAssessmentScore || 0}%</div>
                </div>

                <div className="mt-3 h-[6px] rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-[#111111]" style={{ width: `${Math.min(100, data.completionRate || 0)}%` }} />
                </div>
              </div>

              <div className="mt-8 grid gap-0 text-[13px]">
                <SummaryRow label="Completed" value={data.completed || 0} />
                <SummaryRow label="In Progress" value={data.inProgress || 0} />
                <SummaryRow label="Not Started" value={data.notStarted || 0} />
                <SummaryRow label="Avg Assessment Score" value={`${data.avgAssessmentScore || 0}%`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between gap-4 border-b border-[#eef2f7] py-3">
    <div className="flex items-center gap-2 text-gray-500">
      <span className="text-gray-400">{icon}</span>
      <span className="text-[13px]">{label}</span>
    </div>
    <div className="text-[13px] text-gray-700">{value}</div>
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-[#eef2f7] py-3 text-[13px]">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900">{value}</span>
  </div>
);

export default BranchDetailsData;
