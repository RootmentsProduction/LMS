import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiBook,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiSave,
  FiTag,
  FiUsers,
} from "react-icons/fi";
import Select, { components } from "react-select";
import baseUrl from "../../../api/api";
import SideNav from "../../../components/SideNav/SideNav";

const ASSIGN_OPTIONS = [
  { value: "designation", label: "Role" },
  { value: "user", label: "User" },
  { value: "branch", label: "Branch" },
];

const TRAINING_TYPES = [
  { value: "Assigned", label: "Assigned" },
  { value: "Mandatory", label: "Mandatory" },
];

const CATEGORY_OPTIONS = [
  { value: "Onboarding", label: "Onboarding" },
  { value: "Compliance", label: "Compliance" },
  { value: "Technical", label: "Technical" },
  { value: "Soft Skills", label: "Soft Skills" },
  { value: "Leadership", label: "Leadership" },
  { value: "Product", label: "Product" },
  { value: "Other", label: "Other" },
];

const getModuleId = (module) => module?._id || module?.moduleId || module?.id;

const CheckboxOption = (props) => (
  <components.Option {...props}>
    <div className="flex w-full items-center gap-3">
      <input
        type="checkbox"
        checked={props.isSelected}
        onChange={() => null}
        className="h-4 w-4 shrink-0 cursor-pointer accent-slate-950"
      />
      <span className="text-sm text-slate-700">{props.label}</span>
    </div>
  </components.Option>
);

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "40px",
    height: "40px",
    borderRadius: "8px",
    borderColor: state.isFocused ? "#111827" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(15, 23, 42, 0.08)" : "none",
    "&:hover": { borderColor: "#111827" },
    backgroundColor: "#fff",
    fontSize: "14px",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.14)",
    marginTop: 8,
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: 280,
    paddingTop: 6,
    paddingBottom: 6,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#f1f5f9" : state.isFocused ? "#f8fafc" : "#fff",
    color: "#0f172a",
    cursor: "pointer",
    padding: "11px 12px",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#f1f5f9",
    borderRadius: "999px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#0f172a",
    fontSize: "12px",
    paddingLeft: 8,
    paddingRight: 8,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#64748b",
    borderRadius: "999px",
    "&:hover": {
      backgroundColor: "#e2e8f0",
      color: "#0f172a",
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94a3b8",
  }),
  valueContainer: (base) => ({
    ...base,
    paddingLeft: 12,
    paddingRight: 8,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    minHeight: "40px",
    height: "40px",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#64748b",
    paddingTop: 6,
    paddingBottom: 6,
  }),
  indicatorSeparator: () => ({
    width: 1,
    backgroundColor: "#cbd5e1",
    marginTop: 8,
    marginBottom: 8,
  }),
};

const fieldShell =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-900/5";

const labelShell = "mb-1.5 block text-sm font-medium text-slate-700";

const SectionHeader = ({ icon: Icon, title, meta }) => (
  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon size={18} />
      </span>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
    </div>
    {meta ? <span className="text-xs font-medium text-slate-500">{meta}</span> : null}
  </div>
);

const CreateTrainingDatas = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const token = localStorage.getItem("token");

  const [trainingName, setTrainingName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [trainingType, setTrainingType] = useState("Assigned");
  const [assignType, setAssignType] = useState("designation");
  const [assignedTo, setAssignedTo] = useState([]);
  const [assignOptions, setAssignOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [days, setDays] = useState("");
  const [loading, setLoading] = useState(false);

  const assignLabel =
    trainingType === "Mandatory"
      ? "Roles"
      : assignType === "user"
        ? "Users"
        : assignType === "branch"
          ? "Branches"
          : "Roles";

  const assigneeOptions = useMemo(() => {
    if (trainingType === "Mandatory") return assignOptions;
    if (assignType === "branch") return branchOptions;
    return assignOptions;
  }, [trainingType, assignType, branchOptions, assignOptions]);

  const summary = useMemo(
    () => [
      { label: "Deadline", value: days ? `${days} days` : "Not set" },
      { label: "Assignees", value: assignedTo.length || 0 },
      { label: "Modules", value: selectedModules.length || 0 },
    ],
    [assignedTo.length, days, selectedModules.length]
  );

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/modules`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setModules(Array.isArray(data) ? data : []);
      } catch (_) {}
    };

    fetchModules();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const branches = Array.isArray(data?.data) ? data.data : [];
        setBranchOptions(
          branches.map((branch) => ({
            value: branch.locCode || branch._id,
            label: `${branch.workingBranch || branch.location || branch.locCode || "Branch"}${
              branch.locCode ? ` (${branch.locCode})` : ""
            }`,
          }))
        );
      } catch (_) {}
    };

    fetchBranches();
  }, [token]);

  useEffect(() => {
    if (!id) return;

    const fetchTraining = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/trainings/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load training");

        const result = await res.json();
        const training = result?.data || result;
        setTrainingName(training?.trainingName || "");
        setCategory(training?.category || "");
        setDescription(training?.description || "");
        setTrainingType(training?.Trainingtype || "Assigned");
        setDays(String(training?.deadline || ""));
        setAssignType(
          Array.isArray(training?.Assignedfor) && training.Assignedfor.includes("All")
            ? "designation"
            : Array.isArray(training?.Assignedfor) && training.Assignedfor.includes("New")
              ? "designation"
              : "designation"
        );
        setAssignedTo([]);
        setSelectedModules(Array.isArray(training?.modules) ? training.modules : []);
      } catch (error) {
        toast.error(`Failed to load training: ${error.message}`);
      }
    };

    fetchTraining();
  }, [id, token]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/employee/app-users?page=1&limit=500`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const employees = Array.isArray(data?.data) ? data.data : [];

        if (assignType === "user") {
          setAssignOptions(
            employees.map((e) => ({
              value: e.empID,
              label: `${e.username || "N/A"}${e.empID ? ` - ${e.empID}` : ""}${
                e.designation ? ` - ${e.designation}` : ""
              }`,
            }))
          );
        } else if (assignType === "designation") {
          const roles = [...new Set(employees.map((e) => e.designation).filter(Boolean))];
          setAssignOptions(roles.map((role) => ({ value: role, label: role })));
        } else if (assignType === "branch") {
          setAssignOptions(branchOptions);
        }
      } catch (_) {}
    };

    fetchOptions();
    setAssignedTo([]);
  }, [assignType, token, branchOptions]);

  useEffect(() => {
    if (trainingType === "Mandatory") {
      setAssignType("designation");
    }
  }, [trainingType]);

  const toggleModule = (mod) => {
    const moduleId = getModuleId(mod);
    if (!moduleId) return;

    setSelectedModules((prev) =>
      prev.some((m) => getModuleId(m) === moduleId)
        ? prev.filter((m) => getModuleId(m) !== moduleId)
        : [...prev, mod]
    );
  };

  const handleSubmit = async () => {
    if (!trainingName.trim()) return toast.error("Training title is required");
    if (!category) return toast.error("Please select a category");
    if (!days || Number(days) <= 0) return toast.error("Please enter valid number of days");
    if (selectedModules.length === 0) return toast.error("Please select at least one module");

    let assignedfor = [];
    if (trainingType === "Mandatory") {
      assignedfor = assignedTo.map((x) => x.value);
      if (assignedfor.length === 0) {
        return toast.error("Please select at least one designation");
      }
    } else {
      assignedfor = assignedTo.map((x) => x.value);
      if (assignedfor.length === 0) {
        return toast.error("Please select at least one assignee");
      }
    }

    const moduleIds = selectedModules.map(getModuleId).filter(Boolean);
    if (moduleIds.length === 0) return toast.error("Please select a valid module");

    const payload = {
      trainingName: trainingName.trim(),
      description: description.trim(),
      modules: moduleIds,
      days: Number(days),
      deadline: Number(days),
      Trainingtype: trainingType,
      Assignedfor: assignedfor,
      selectedOption: trainingType === "Mandatory" ? "designation" : assignType,
      workingBranch: assignedfor,
      category,
    };

    try {
      setLoading(true);
      const res = await fetch(`${baseUrl.baseUrl}api/trainings${isEditMode ? `/${id}` : ""}`, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Create training failed:", { status: res.status, data, payload });
        return toast.error(data.details || data.error || data.message || "Failed to create training");
      }
      toast.success(data.message || (isEditMode ? "Training updated successfully!" : "Training created successfully!"));
      navigate(-1);
    } catch (_) {
      toast.error("Error submitting training.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <SideNav />

      <main className="flex-1 px-4 py-5 md:ml-[120px] md:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="Go back"
              >
                <FiArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-950">
                  {isEditMode ? "Edit Training" : "Create New Training"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">Build a training, choose the audience, and attach modules.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {summary.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-950">{item.value}</p>
                </div>
              ))}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiSave size={15} />
                {loading ? "Saving..." : isEditMode ? "Update Training" : "Save Training"}
              </button>
            </div>
          </header>

          <section className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
            <SectionHeader icon={FiFileText} title="Training Details" />
            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
              <div>
                <label className={labelShell}>
                  Training Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter training title"
                  value={trainingName}
                  onChange={(e) => setTrainingName(e.target.value)}
                  className={fieldShell}
                />
              </div>

              <div>
                <label className={labelShell}>
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiTag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`${fieldShell} pl-9`}
                  >
                    <option value="">Select Category</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelShell}>Description</label>
                <input
                  type="text"
                  placeholder="Enter description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={fieldShell}
                />
              </div>

              <div>
                <label className={labelShell}>
                  Deadline <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="number"
                    placeholder="Number of days"
                    value={days}
                    min={1}
                    onChange={(e) => setDays(e.target.value)}
                    className={`${fieldShell} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className={labelShell}>
                  Training Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TRAINING_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setTrainingType(type.value)}
                      className={`h-10 rounded-lg border px-3 text-left text-sm font-medium transition ${
                        trainingType === type.value
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
            <SectionHeader icon={FiUsers} title="Assignment" meta={`${assignedTo.length} selected`} />
            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-6">
              {trainingType !== "Mandatory" ? (
                <div className="lg:col-span-2">
                  <label className={labelShell}>
                    Assign To <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ASSIGN_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAssignType(opt.value)}
                        className={`h-10 rounded-lg border px-3 text-sm font-medium transition ${
                          assignType === opt.value
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={trainingType === "Mandatory" ? "lg:col-span-2" : "lg:col-span-2"}>
                <label className={labelShell}>
                  Select {assignLabel} <span className="text-red-500">*</span>
                </label>
                <Select
                  isMulti
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  options={assigneeOptions}
                  value={assignedTo}
                  onChange={(value) => setAssignedTo(value || [])}
                  placeholder={
                    trainingType === "Mandatory"
                      ? "Search and select roles"
                      : assignType === "user"
                        ? "Search users"
                        : assignType === "branch"
                          ? "Search branches"
                          : "Search roles"
                  }
                  styles={selectStyles}
                  components={{ Option: CheckboxOption }}
                  noOptionsMessage={() => `No ${assignLabel.toLowerCase()} found`}
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <SectionHeader icon={FiBook} title="Training Modules" meta={`${selectedModules.length} selected`} />

            <div className="p-5">
              {modules.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No modules available.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {modules.filter(getModuleId).map((mod) => {
                    const moduleId = getModuleId(mod);
                    const isSelected = selectedModules.some((m) => getModuleId(m) === moduleId);
                    const videoCount = mod.videos?.length ?? 0;
                    const totalMins = videoCount * 15;
                    const hrs = Math.floor(totalMins / 60).toString().padStart(2, "0");
                    const mins = (totalMins % 60).toString().padStart(2, "0");

                    return (
                      <button
                        key={moduleId}
                        type="button"
                        onClick={() => toggleModule(mod)}
                        className={`flex min-h-[78px] items-start gap-3 rounded-lg border p-4 text-left transition ${
                          isSelected
                            ? "border-slate-950 bg-slate-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            isSelected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-400 bg-white"
                          }`}
                        >
                          {isSelected ? <FiCheckCircle size={13} /> : null}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-950">{mod.moduleName}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <FiClock size={12} />
                              {hrs} hr {mins} mins
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <FiBook size={12} />
                              {videoCount} {videoCount === 1 ? "Video" : "Videos"}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CreateTrainingDatas;
