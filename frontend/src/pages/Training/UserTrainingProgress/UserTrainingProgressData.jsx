import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FaCalendarAlt, FaUsers, FaUserTie, FaBuilding, FaClipboardCheck } from "react-icons/fa";
import baseUrl from "../../../api/api";
import SideNav from "../../../components/SideNav/SideNav";

const StatCard = ({ label, value, icon, accent = "text-[#016E5B]", bg = "bg-[#ecf8f5]" }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${accent}`}>
        {icon}
      </div>
    </div>
  </div>
);

const Badge = ({ children, tone = "gray" }) => {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone] || tones.gray}`}>{children}</span>;
};

const UserTrainingProgressData = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchModules = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${baseUrl.baseUrl}api/user/get/Training/details/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const json = await response.json();
        if (!active) return;
        setData(json);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load training details");
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchModules();
    return () => {
      active = false;
    };
  }, [id]);

  const stats = useMemo(() => {
    const progressDetails = data?.progressDetails || [];
    const completed = progressDetails.filter((item) => {
      const progress = item?.progress;
      const status = String(item?.user?.training?.[0]?.status || "").toLowerCase();
      return progress === "Completed" || progress === 100 || status === "completed";
    }).length;
    const pending = Math.max(0, progressDetails.length - completed);
    return {
      employees: progressDetails.length,
      completed,
      pending,
    };
  }, [data]);

  const formatDate = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
  };

  const training = data?.training || {};
  const progressDetails = data?.progressDetails || [];
  const assignedBranches = data?.uniqueBranches || [];
  const assignedRoles = data?.uniquedesignation || [];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <SideNav />

      <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Training Details</h1>
          <p className="mt-1 text-sm text-gray-500">Assigned employees, progress, and training status in one view.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="h-6 w-44 animate-pulse rounded bg-gray-100" />
            <div className="mt-6 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <StatCard
                label="Employees Assigned"
                value={stats.employees}
                icon={<FaUsers className="text-lg" />}
              />
              <StatCard
                label="Completed"
                value={stats.completed}
                icon={<FaClipboardCheck className="text-lg" />}
                accent="text-emerald-700"
                bg="bg-emerald-50"
              />
              <StatCard
                label="Pending"
                value={stats.pending}
                icon={<FaCalendarAlt className="text-lg" />}
                accent="text-amber-700"
                bg="bg-amber-50"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Training</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">
                      {training?.Trainingtype} : {training?.trainingName}
                    </h2>
                  </div>
                  <Badge tone={String(training?.Trainingtype || "").toLowerCase().includes("mandatory") ? "blue" : "green"}>
                    {training?.Trainingtype || "Training"}
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Assigned Date</p>
                    <p className="mt-2 text-sm font-medium text-gray-800">{formatDate(training?.createdDate)}</p>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Due Date</p>
                    <p className="mt-2 text-sm font-medium text-gray-800">
                      {training?.createdDate && training?.deadline
                        ? formatDate(new Date(new Date(training.createdDate).getTime() + training.deadline * 24 * 60 * 60 * 1000))
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Assigned For</p>
                    <div className="mt-3 space-y-3 rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-600">No. of employees</span>
                        <span className="font-semibold text-gray-900">{stats.employees}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-600">Branch</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {assignedBranches.length ? assignedBranches.join(", ") : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-600">Role</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {assignedRoles.length ? assignedRoles.join(", ") : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Assigned By</p>
                    <div className="mt-3 space-y-3 rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-600">Name</span>
                        <span className="font-semibold text-gray-900">{data?.assignedBy?.name || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-600">Branch</span>
                        <span className="font-semibold text-gray-900">{data?.assignedBy?.branch || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Overview</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">Progress Summary</h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ecf8f5] text-[#016E5B]">
                    <FaUserTie />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Completion</p>
                    <p className="mt-2 text-3xl font-bold text-[#111827]">
                      {stats.employees > 0 ? Math.round((stats.completed / stats.employees) * 100) : 0}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Training status note</p>
                    <p className="mt-2 text-sm text-gray-700">
                      {stats.completed > 0 ? "At least one assigned employee has completed the training." : "No completed training found yet."}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Branch</p>
                    <p className="mt-2 text-sm font-medium text-gray-800">
                      {assignedBranches.length ? assignedBranches.join(", ") : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-lg font-bold text-gray-900">Assigned Employees</h2>
                <p className="mt-1 text-sm text-gray-500">Employee-level progress for this training.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f8fafc] text-gray-500">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold">Emp Id</th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-left font-semibold">Branch</th>
                      <th className="px-4 py-3 text-left font-semibold">Days Left</th>
                      <th className="px-4 py-3 text-left font-semibold">Assessment</th>
                      <th className="px-4 py-3 text-left font-semibold">Training Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressDetails.length > 0 ? (
                      progressDetails.map((employee, index) => {
                        const trainingRecord = employee.user?.training?.[0];
                        const assessment = employee.user?.assignedAssessments?.[0];
                        const progress = employee.progress;

                        let daysLeft = "N/A";
                        if (trainingRecord?.deadline) {
                          const deadline = new Date(trainingRecord.deadline);
                          if (!Number.isNaN(deadline.getTime())) {
                            const today = new Date();
                            daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                          }
                        }

                        const completed = progress === "Completed" || progress === 100 || String(trainingRecord?.status || "").toLowerCase() === "completed";
                        const assessmentStatus = assessment?.status || "Pending";

                        return (
                          <tr key={index} className="border-b border-gray-100 transition hover:bg-slate-50">
                            <td className="px-4 py-4 font-medium text-gray-900">{employee.user.empID}</td>
                            <td className="px-4 py-4 text-gray-700">{employee.user.username}</td>
                            <td className="px-4 py-4 text-gray-700">{employee.user.designation?.toUpperCase()}</td>
                            <td className="px-4 py-4 text-gray-700">{employee.user.workingBranch}</td>
                            <td className="px-4 py-4">
                              {completed ? (
                                <Badge tone="green">Completed</Badge>
                              ) : typeof daysLeft === "number" && daysLeft < 0 ? (
                                <Badge tone="red">Overdue ({Math.abs(daysLeft)} days)</Badge>
                              ) : typeof daysLeft === "number" && daysLeft <= 3 ? (
                                <Badge tone="yellow">{daysLeft} days left</Badge>
                              ) : (
                                <span className="text-gray-700">{daysLeft}</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <Badge tone={assessmentStatus === "Completed" ? "green" : "gray"}>{assessmentStatus}</Badge>
                            </td>
                            <td className="px-4 py-4">
                              <Badge tone={completed ? "green" : "blue"}>{employee.progress || 0}%</Badge>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserTrainingProgressData;
