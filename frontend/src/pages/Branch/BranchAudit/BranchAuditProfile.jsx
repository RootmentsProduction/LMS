import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SideNav from "../../../components/SideNav/SideNav";
import { FaArrowLeft } from "react-icons/fa";
import baseUrl from "../../../api/api";

const BranchAuditProfile = () => {
  const { id } = useParams();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseUrl.baseUrl}api/admin/branch-audit/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await response.json();
        if (mounted) setAudit(json?.data || null);
      } catch {
        if (mounted) setAudit(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const average = useMemo(() => Number(audit?.overallRating || 0).toFixed(2), [audit]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4fb]">
        <SideNav />
        <div className="md:ml-[120px] px-4 py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen bg-[#f4f4fb]">
        <SideNav />
        <div className="md:ml-[120px] px-4 py-8">
          <Link to="/branch/audit" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500">
            <FaArrowLeft />
            Back to audits
          </Link>
          <div className="mt-6 text-gray-700">Audit not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4fb] font-[Poppins,sans-serif]">
      <SideNav />
      <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-[1600px]">
          <Link to="/branch/audit" className="mb-5 inline-flex items-center gap-2 text-[14px] font-semibold text-gray-400">
            <FaArrowLeft />
            Back
          </Link>

          <h1 className="mb-5 text-[22px] font-bold text-black">{audit.store} Audit Profile</h1>

          <div className="grid grid-cols-1 gap-4 p-0 lg:grid-cols-3">
            {(audit.sections || []).map((section) => (
              <AuditCard key={section.title} title={section.title} items={section.items || []} remarks={section.remarks || ""} />
            ))}

            <AuditCard
              title="Auditor Remarks"
              items={[]}
              remarks={audit.auditorRemarks?.observationAcknowledged || ""}
              extraTitle="Action Plan for Shortfalls"
              extraRemarks={audit.auditorRemarks?.actionPlanForShortfalls || ""}
            />

            <div className="rounded-[4px] border border-gray-300 bg-white p-4">
              <h3 className="text-[14px] font-semibold text-black">Average Rating</h3>
              <div className="mt-4 text-[15px] text-gray-700">Average of total rating - {average}</div>
              <div className="mt-3 text-[13px] text-gray-500">Rated by {audit.ratedBy} on {audit.createdOn}</div>
              <div className="mt-2 text-[13px] text-gray-500">Total items rated - {audit.totalRatingsCount || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AuditCard = ({ title, items, remarks, extraTitle, extraRemarks }) => (
  <div className="rounded-[4px] border border-gray-300 bg-white p-4">
    <h3 className="text-[14px] font-semibold text-black">{title}</h3>
    <div className="mt-3 space-y-2 text-[13px] text-gray-700">
      {items.map((item) => (
        <div key={item.label} className="leading-snug">
          {item.label} - {item.score}
        </div>
      ))}
    </div>
    {remarks ? (
      <div className="mt-4 border-t border-gray-200 pt-3 text-[13px] font-semibold text-black">{remarks}</div>
    ) : null}
    {extraTitle ? (
      <div className="mt-4">
        <h4 className="text-[13px] font-semibold text-black">{extraTitle}</h4>
        <div className="mt-2 text-[13px] text-gray-700">{extraRemarks}</div>
      </div>
    ) : null}
  </div>
);

export default BranchAuditProfile;
