import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SideNav from "../../../components/SideNav/SideNav";
import baseUrl from "../../../api/api";

const AssessmentDetailsData = () => {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [assessmentRes, detailsRes] = await Promise.all([
          fetch(`${baseUrl.baseUrl}api/user/get/AllAssessment`),
          fetch(`${baseUrl.baseUrl}api/user/get/assessment/details/${id}`),
        ]);

        const assessmentJson = await assessmentRes.json().catch(() => ({}));
        const detailsJson = await detailsRes.json().catch(() => ({}));

        const found = (assessmentJson?.data || []).find((item) => String(item.assessmentId) === String(id));
        setAssessment(found || null);
        setUsers(detailsJson?.data?.users || []);
      } catch {
        setError("Failed to load assessment details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const summary = useMemo(() => {
    const questions = assessment?.assessment || 0;
    const duration = assessment?.assessmentduration || "—";
    const assigned = users.length;
    const completed = users.filter((u) => {
      const currentAssessment = u.assignedAssessments?.find(
        (a) => String(a.assessmentId?._id || a.assessmentId) === String(id)
      );
      const status = String(currentAssessment?.status || "").toLowerCase();
      return status === "completed" || status === "passed";
    }).length;
    const completionPercentage = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    return { questions, duration, assigned, completed, completionPercentage };
  }, [assessment, users]);

  return (
    <div className="min-h-screen bg-[#f9fafb]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <SideNav />

      <div className="ml-0 md:ml-[110px] px-6 pt-6 pb-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <Link to="/assessments" className="text-[12px] text-gray-500 hover:text-gray-700 inline-flex items-center gap-2 mb-2">
                <span>←</span>
                <span>Back to Assessments</span>
              </Link>
              <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
                {assessment?.assessmentName || "Assessment Details"}
              </h1>
              <p className="text-[12px] text-gray-400 mt-1">
                Assessment overview and assigned employees
              </p>
            </div>
          </div>

          {loading ? (
            <div className="bg-white border border-[#f0f0f0] rounded-2xl p-8 text-center text-gray-400">
              Loading assessment details...
            </div>
          ) : error ? (
            <div className="bg-white border border-[#f0f0f0] rounded-2xl p-8 text-center text-red-500">
              {error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-white border border-[#f0f0f0] rounded-2xl p-4">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Questions</div>
                  <div className="text-[20px] font-bold text-gray-900 mt-1">{summary.questions}</div>
                </div>
                <div className="bg-white border border-[#f0f0f0] rounded-2xl p-4">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Duration</div>
                  <div className="text-[20px] font-bold text-gray-900 mt-1">{summary.duration} mins</div>
                </div>
                <div className="bg-white border border-[#f0f0f0] rounded-2xl p-4">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Assigned</div>
                  <div className="text-[20px] font-bold text-gray-900 mt-1">{summary.assigned}</div>
                </div>
                <div className="bg-white border border-[#f0f0f0] rounded-2xl p-4">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Completion</div>
                  <div className="text-[20px] font-bold text-gray-900 mt-1">{summary.completionPercentage}%</div>
                  <div className="text-[11px] text-gray-400 mt-1">{summary.completed} of {summary.assigned} completed</div>
                </div>
              </div>

              <div className="bg-white border border-[#f0f0f0] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-[16px] font-bold text-gray-900">Assigned Users</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Users who received this assessment</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] md:min-w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Branch</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? users.map((user, idx) => {
                        const a = user.assignedAssessments?.find(
                          (item) => String(item.assessmentId?._id || item.assessmentId) === String(id)
                        );
                        return (
                          <tr key={idx} className="border-b border-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">{user.username || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{user.workingBranch || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{user.designation || "—"}</td>
                            <td className="px-4 py-3 text-gray-700">{a?.status || "Pending"}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-gray-400">No assigned users found.</td>
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
    </div>
  );
};

export default AssessmentDetailsData;
