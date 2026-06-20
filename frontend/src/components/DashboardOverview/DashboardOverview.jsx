import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { normalizeBranchProgress } from "../../features/dashboard/dashboardUtils";
import { fetchDashboardTasks, fetchHomeProgress, fetchHomeProgressChart, fetchWeeklyWalkinCount } from "../../features/dashboard/dashboardFetch";

const StatCard = ({ title, value, subtitle, icon, iconBg }) => (
  <div
    style={{
      flex: "1 1 0",
      minWidth: "0",
      height: "100px",
      borderRadius: "12px",
      padding: "14px 18px",
      background: "#ffffff",
      border: "1px solid #f0f0f0",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxSizing: "border-box",
    }}
  >
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "#6b7280",
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </span>
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          backgroundColor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
    <div className="text-[26px] font-bold text-gray-900 leading-none">{value}</div>
    <div className="text-[11px] text-gray-400 leading-tight">{subtitle}</div>
  </div>
);

const WalkinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const TaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const TrainingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const EmployeeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const AssessmentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const formatDateLabel = (value) => {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const DashboardOverview = ({ range = "7", customRange }) => {
  const [summaryResponse, setSummaryResponse] = useState(null);
  const [chartResponse, setChartResponse] = useState(null);
  const [walkinCount, setWalkinCount] = useState(0);
  const [tasksResponse, setTasksResponse] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [walkinLoading, setWalkinLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      setSummaryLoading(true);
      try {
        const progress = await fetchHomeProgress();
        if (!mounted) return;
        setSummaryResponse(progress);
      } catch {
        if (!mounted) return;
        setSummaryResponse(null);
      } finally {
        if (mounted) setSummaryLoading(false);
      }
    };

    const loadChart = async () => {
      setChartLoading(true);
      try {
        const progress = await fetchHomeProgressChart();
        if (!mounted) return;
        setChartResponse(progress);
      } catch {
        if (!mounted) return;
        setChartResponse(null);
      } finally {
        if (mounted) setChartLoading(false);
      }
    };

    const loadWalkins = async () => {
      setWalkinLoading(true);
      try {
        const walkins = await fetchWeeklyWalkinCount({
          range,
          startDate: customRange?.startDate,
          endDate: customRange?.endDate,
        });
        if (!mounted) return;
        setWalkinCount(Number(walkins?.count || 0));
      } catch {
        if (!mounted) return;
        setWalkinCount(0);
      } finally {
        if (mounted) setWalkinLoading(false);
      }
    };

    const loadTasks = async () => {
      setTasksLoading(true);
      try {
        const tasks = await fetchDashboardTasks();
        if (!mounted) return;
        setTasksResponse(tasks);
      } catch {
        if (!mounted) return;
        setTasksResponse(null);
      } finally {
        if (mounted) setTasksLoading(false);
      }
    };

    loadSummary();
    loadChart();
    loadWalkins();
    loadTasks();

    const refresh = () => {
      loadSummary();
      loadChart();
      loadWalkins();
      loadTasks();
    };

    window.addEventListener("dashboard:refresh", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("dashboard:refresh", refresh);
    };
  }, [range, customRange?.startDate, customRange?.endDate]);

  const stats = useMemo(() => {
    const summary = summaryResponse?.data || {};
    const branches = normalizeBranchProgress(chartResponse);
    const totalBranches = branches.length;

    const totalEmp = Number(summary.totalEmployees || branches.reduce((sum, b) => sum + (b.totalEmployees || 0), 0));
    const inTraining = Number(summary.employeesInTraining || 0);
    const completedAssessments = Number(summary.completedAssessments || branches.reduce((sum, b) => sum + Number(b.completeAssessmentCount || 0), 0));
    const overdueAssessmentsCount = Number(summary.overdueAssessments || branches.reduce((sum, b) => sum + Number(b.pendingAssessmentCount || 0), 0));
    const totalAssessments = completedAssessments + overdueAssessmentsCount;

    const tasks = tasksResponse?.data || [];
    const overdueTasksCount = tasks.filter((t) => t.status === "OVERDUE").length;

    const totalWalkins = Number.isFinite(walkinCount) ? walkinCount : 0;
    const trainingTotals = branches.reduce(
      (acc, branch) => {
        const branchTotal = Number(branch.totalTraining || 0);
        const branchCompletePct = Number(branch.completeTraining || 0);
        const branchPendingPct = Number(branch.pendingTraining || 0);

        if (branchTotal > 0) {
          acc.weightedTotal += branchTotal;
          acc.weightedCompleted += (branchCompletePct / 100) * branchTotal;
          acc.weightedPending += (branchPendingPct / 100) * branchTotal;
        } else {
          acc.emptyBranches += 1;
        }
        return acc;
      },
      { weightedTotal: 0, weightedCompleted: 0, weightedPending: 0, emptyBranches: 0 }
    );

    const avgTraining = trainingTotals.weightedTotal > 0
      ? Math.round((trainingTotals.weightedCompleted / trainingTotals.weightedTotal) * 100)
      : totalBranches
      ? Math.round(branches.reduce((sum, b) => sum + Number(b.completeTraining || 0), 0) / totalBranches)
      : 0;

    return {
      totalBranches,
      totalEmp,
      inTraining,
      avgTraining: Number.isFinite(avgTraining) ? avgTraining : 0,
      completedAssessments,
      totalAssessments,
      totalWalkins,
      overdueTasksCount,
    };
  }, [summaryResponse, chartResponse, walkinCount, tasksResponse]);

  const cards = [
    {
      title: "Total Walk Ins",
      value: walkinLoading ? "..." : (stats.totalWalkins || "0"),
      subtitle:
        range === "7"
          ? `This week to date · ${stats.totalBranches} stores`
          : range === "month"
          ? `This month to date · ${stats.totalBranches} stores`
          : range === "custom" && customRange?.startDate && customRange?.endDate
          ? `${formatDateLabel(customRange.startDate)} to ${formatDateLabel(customRange.endDate)} · ${stats.totalBranches} stores`
          : `Last ${range} days · ${stats.totalBranches} stores`,
      icon: <WalkinIcon />,
      iconBg: "#EDE9FE",
    },
    {
      title: "Overdue Tasks",
      value: tasksLoading ? "..." : (stats.overdueTasksCount || "0"),
      subtitle: stats.overdueTasksCount > 0 ? "Require immediate action" : "All tasks on track",
      icon: <TaskIcon />,
      iconBg: "#FFEDD5",
    },
    {
      title: "Avg Training Progress",
      value: chartLoading ? "..." : `${stats.avgTraining}%`,
      subtitle: `${stats.totalEmp} employees`,
      icon: <TrainingIcon />,
      iconBg: "#FEF3C7",
    },
    {
      title: "Employees in Training",
      value: summaryLoading ? "..." : (stats.inTraining || "0"),
      subtitle: `Across ${stats.totalBranches} stores`,
      icon: <EmployeeIcon />,
      iconBg: "#DCFCE7",
    },
    {
      title: "Completed Assessments",
      value: summaryLoading ? "..." : (stats.completedAssessments || "0"),
      subtitle: stats.totalAssessments
        ? `${Math.round((stats.completedAssessments / stats.totalAssessments) * 100)}% of ${stats.totalAssessments} total`
        : "No assessments yet",
      icon: <AssessmentIcon />,
      iconBg: "#DBEAFE",
    },
  ];

  return (
    <div style={{ marginBottom: "24px" }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[22px] font-bold text-gray-900 leading-tight">Dashboard Overview</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">Store walkings, tasks, and training progress across all locations</p>
        </div>
        <Link to="/walkin/list">
          <button className="bg-gray-900 text-white text-[13px] font-semibold px-5 py-2 rounded-xl hover:bg-gray-700 transition-colors flex-shrink-0">
            + Add Walk In
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-3 w-full" style={{}}>
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
};

export default DashboardOverview;
