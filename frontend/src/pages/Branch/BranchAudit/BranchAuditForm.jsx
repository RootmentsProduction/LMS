import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SideNav from "../../../components/SideNav/SideNav";
import { FaArrowLeft, FaChevronDown, FaStar } from "react-icons/fa";
import baseUrl from "../../../api/api";

const SECTIONS = [
  {
    title: "Store Exterior & Signage",
    items: [
      "Exterior Cleanliness",
      "Signage Board Condition",
      "Entry Display Compliance",
    ],
  },
  {
    title: "VM Standards",
    items: [
      "Floor Cleanliness",
      "Product Alignment and Color Blocking",
      "Quality of Display Products and Mannequins",
      "Lighting & Aesthetics",
      "Music/Ambience",
      "In-Store Temperature",
    ],
  },
  {
    title: "Staff Presence",
    items: [
      "Uniform & Grooming",
      "Badge & Name Display",
      "Punctuality/Attendance",
      "Staff Professionalism",
    ],
  },
  {
    title: "Guest handling",
    items: [
      "Greeting Etiquette",
      "Customer Waiting Time",
      "Product Presentation & Handling",
      "Style Suggestions",
    ],
  },
  {
    title: "Trial Room",
    items: [
      "Cleanliness & Mirror",
      "Privacy Maintenance",
      "Staff Coordination",
      "Accessories Trial Support",
    ],
  },
  {
    title: "Billing System",
    items: [
      "Accuracy of Billing",
      "Discount Application",
      "Terms & Conditions Explanation",
    ],
  },
  {
    title: "Inventory System",
    items: [
      "Stock Management",
      "Product Tag",
      "Defective Products Isolated",
    ],
  },
  {
    title: "Returned Garments",
    items: [
      "Cleanliness Check",
      "Damage Reporting",
      "Customer Return Delay check",
      "Hang Returned Products in the Designated Area",
    ],
  },
  {
    title: "Software usage & Documents",
    items: [
      "Measurement Books, Qc checklist",
      "Booking, Rent-out & Return Records",
      "Task Management App Walk-in Update",
    ],
  },
  {
    title: "SOP Compliance",
    items: [
      "Booking/Rentout/Return Process",
      "Alteration/Repair Handling",
      "Brand Compliance",
      "Software Compliance (Billing & Walkin)",
      "Store KPI Awareness",
    ],
  },
];

const AuditStar = ({ value, onChange, label }) => {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="text-[16px] font-semibold text-[#30343b]">
        {label}
        <span className="text-red-500">*</span>
      </div>
      <div className="flex items-center gap-5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-[42px] leading-none transition ${
              star <= value ? "text-yellow-400" : "text-[#d1d5db]"
            } hover:text-yellow-400`}
            aria-label={`${label} ${star} stars`}
          >
            <FaStar />
          </button>
        ))}
      </div>
    </div>
  );
};

const SectionBlock = ({ title, items, values, setValues }) => (
  <section className="rounded-[6px] bg-white px-4 py-8">
    <h2 className="mb-6 text-[16px] font-semibold text-black">{title}</h2>

    <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-3 lg:gap-x-8">
      {items.map((label, idx) => {
        const key = `${title}-${idx}`;
        return (
          <AuditStar
            key={key}
            label={label}
            value={values[key] || 0}
            onChange={(next) => setValues((prev) => ({ ...prev, [key]: next }))}
          />
        );
      })}
    </div>

    <div className="mt-8">
      <label className="mb-2 block text-[16px] font-semibold text-[#30343b]">
        Remarks<span className="text-red-500">*</span>
      </label>
      <textarea
        rows={2}
        value={values[`${title}-remarks`] || ""}
        onChange={(e) => setValues((prev) => ({ ...prev, [`${title}-remarks`]: e.target.value }))}
        className="w-full rounded-[6px] border border-gray-300 px-3 py-2 text-[14px] outline-none focus:border-gray-500"
      />
    </div>
  </section>
);

const BranchAuditForm = () => {
  const navigate = useNavigate();
  const [store, setStore] = useState("");
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadBranches = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load branches");
        }

        const json = await response.json();
        const list = Array.isArray(json?.data) ? json.data : [];

        if (mounted) {
          setBranchOptions(list.filter(Boolean));
        }
      } catch {
        if (mounted) {
          setBranchOptions([]);
        }
      }
    };

    loadBranches();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const sections = SECTIONS.map((section) => ({
        title: section.title,
        items: section.items.map((label, idx) => ({
          label,
          score: Number(values[`${section.title}-${idx}`] || 0),
        })),
        remarks: values[`${section.title}-remarks`] || "",
      }));

      const body = {
        store,
        storeId: selectedBranch?._id,
        sections,
        auditorRemarks: {
          observationAcknowledged: values["audit-observation"] || "",
          actionPlanForShortfalls: values["audit-action-plan"] || "",
        },
        ratedOn: new Date().toISOString().slice(0, 10),
        metadata: {
          totalQuestions: sections.reduce((sum, sec) => sum + sec.items.length, 0),
        },
      };

      const response = await fetch(`${baseUrl.baseUrl}api/admin/branch-audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to save audit");
      }

      navigate("/branch/audit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4fb] font-[Poppins,sans-serif]">
      <SideNav />
      <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-[1600px]">
          <Link to="/branch/audit" className="mb-5 inline-flex items-center gap-2 text-[14px] font-semibold text-gray-400">
            <FaArrowLeft />
            Audit Form
          </Link>

          <h1 className="mb-5 text-[22px] font-bold text-black">Store Audit</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-[6px] bg-white px-4 py-5">
              <label className="mb-2 block text-[16px] font-semibold text-[#30343b]">
                Store<span className="text-red-500">*</span>
              </label>
              <div className="relative max-w-[480px]">
                <select
                  value={store}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStore(next);
                    setSelectedBranch(branchOptions.find((b) => b.workingBranch === next) || null);
                  }}
                  className="w-full appearance-none rounded-[8px] border border-gray-300 bg-white px-4 py-3 text-[16px] font-semibold outline-none"
                >
                  <option value="">Select Store</option>
                  {branchOptions.map((opt) => (
                    <option key={opt._id || opt.workingBranch} value={opt.workingBranch}>{opt.workingBranch}</option>
                  ))}
                </select>
                <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {SECTIONS.map((section) => (
              <SectionBlock
                key={section.title}
                title={section.title}
                items={section.items}
                values={values}
                setValues={setValues}
              />
            ))}

            <section className="rounded-[6px] bg-white px-4 py-8">
              <h2 className="mb-8 text-[16px] font-semibold text-black">Auditor Remarks</h2>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[16px] font-semibold text-[#30343b]">
                    Audit Observation Acknowledged<span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={values["audit-observation"] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, ["audit-observation"]: e.target.value }))}
                    className="w-full rounded-[6px] border border-gray-300 px-3 py-2 text-[14px] outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[16px] font-semibold text-[#30343b]">
                    Action Plan for Shortfalls<span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={values["audit-action-plan"] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, ["audit-action-plan"]: e.target.value }))}
                    className="w-full rounded-[6px] border border-gray-300 px-3 py-2 text-[14px] outline-none focus:border-gray-500"
                  />
                </div>
              </div>
            </section>

            <div className="flex justify-center pb-8">
              <button
                type="submit"
                disabled={saving}
                className="min-w-[170px] rounded-[6px] bg-[#1f1b22] px-10 py-3 text-[16px] font-semibold text-white transition hover:bg-black disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BranchAuditForm;
