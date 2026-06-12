import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Select from "react-select";
import baseUrl from "../../api/api";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";

const CreateCustomNotification = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOption, setSelectedOption] = useState("branch"); // Matches default 'Store' in mockup
  const [assignedTo, setAssignedTo] = useState([]); // Array of { value, label } options
  const [deadline, setDeadline] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("inApp"); // Matches default 'In App Notification'
  
  // Data options fetched from API
  const [recipientsOptions, setRecipientsOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch options based on recipient type (user, branch, designation)
  useEffect(() => {
    if (selectedOption === "all_employees") {
      setRecipientsOptions([]);
      setAssignedTo([]);
      return;
    }

    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        let options = [];

        if (selectedOption === "user") {
          // Fetch employees (Individual)
          const response = await fetch(`${baseUrl.baseUrl}api/usercreate/getAllUser`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            options = data.data.map((item) => ({
              value: item._id,
              label: `${item.username} (${item.empID})`,
            }));
          }
        } else if (selectedOption === "branch") {
          // Fetch branches (Store)
          const response = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            options = data.data.map((item) => ({
              value: item.locCode,
              label: item.workingBranch,
            }));
          }
        } else if (selectedOption === "designation") {
          // Fetch designations (Role)
          const response = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
          });

          if (response.ok) {
            const data = await response.json();
            const uniqueDesignations = [...new Set(
              (data?.data || [])
                .map(emp => emp.role_name)
                .filter(Boolean)
            )].sort();

            options = uniqueDesignations.map((designation) => ({
              value: designation,
              label: designation,
            }));
          }
        }

        setRecipientsOptions(options);
      } catch (error) {
        console.error("Error loading recipient options:", error);
        toast.error("Failed to load options.");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
    setAssignedTo([]); // Clear selected options when recipient type changes
  }, [selectedOption, token]);

  const handleSelectChange = (selectedOptions) => {
    setAssignedTo(selectedOptions || []);
  };

  const handleRemovePill = (valueToRemove) => {
    setAssignedTo((prev) => prev.filter((item) => item.value !== valueToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning("Please enter a notification title.");
      return;
    }
    if (!message.trim()) {
      toast.warning("Please enter the message content.");
      return;
    }
    if (selectedOption !== "all_employees" && assignedTo.length === 0) {
      toast.warning(`Please select at least one recipient ${selectedOption === "branch" ? "store" : selectedOption === "designation" ? "role" : "employee"}.`);
      return;
    }
    if (!deadline) {
      toast.warning("Please select a deadline.");
      return;
    }

    setSending(false);
    try {
      // Determine final recipient payload
      let finalRecipient = [];
      let finalRole = selectedOption;

      if (selectedOption === "all_employees") {
        // If All Employees, fetch and pass all user IDs
        setSending(true);
        const res = await fetch(`${baseUrl.baseUrl}api/usercreate/getAllUser`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          finalRecipient = (json.data || []).map(u => u._id);
          finalRole = "user"; // Save in user notification array
        } else {
          throw new Error("Failed to fetch all employees to send notifications.");
        }
      } else {
        finalRecipient = assignedTo.map(item => item.value);
      }

      const payload = {
        title,
        message,
        recipient: finalRecipient,
        role: finalRole,
        deliveryMethod,
        deadline,
      };

      const response = await fetch(`${baseUrl.baseUrl}api/admin/notification/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "Failed to send notification.");
      }

      toast.success(json.message || "Notification sent successfully!");
      
      // Reset form
      setTitle("");
      setMessage("");
      setAssignedTo([]);
      setDeadline("");
    } catch (error) {
      toast.error(error.message || "An error occurred while sending notification.");
    } finally {
      setSending(false);
    }
  };

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      borderRadius: "12px",
      borderColor: state.isFocused ? "#000" : "#e5e7eb",
      boxShadow: state.isFocused ? "0 0 0 1px #000" : "none",
      minHeight: "45px",
      fontSize: "14px",
      backgroundColor: "#fff",
      "&:hover": {
        borderColor: "#000",
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: "2px 12px",
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#9ca3af",
    }),
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-gray-800">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
          <Link
            to="/settings/users"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <FaArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Create Custom Notification</h1>
            <p className="mt-1 text-sm text-slate-500">Send a notification to employees, stores, roles, or individual users.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-slate-700">
                Notification Title/ Subject<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title, subject"
                className="h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#016E5B] focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-slate-700">
                Message Content<span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows="1"
                className="h-[48px] w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#016E5B] focus:ring-4 focus:ring-emerald-100"
              ></textarea>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <label className="mb-3 block text-[13px] font-semibold text-slate-700">
              Assign to <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-4 sm:gap-8 items-center">
              <label className="flex items-center gap-3 rounded-full border border-transparent px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-white">
                <input
                  type="radio"
                  name="assignTo"
                  value="all_employees"
                  checked={selectedOption === "all_employees"}
                  onChange={() => setSelectedOption("all_employees")}
                  className="w-4 h-4 border-gray-300 text-black focus:ring-black accent-black"
                />
                <span>All Employees</span>
              </label>
              <label className="flex items-center gap-3 rounded-full border border-transparent px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-white">
                <input
                  type="radio"
                  name="assignTo"
                  value="branch"
                  checked={selectedOption === "branch"}
                  onChange={() => setSelectedOption("branch")}
                  className="w-4 h-4 border-gray-300 text-black focus:ring-black accent-black"
                />
                <span>Store</span>
              </label>
              <label className="flex items-center gap-3 rounded-full border border-transparent px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-white">
                <input
                  type="radio"
                  name="assignTo"
                  value="designation"
                  checked={selectedOption === "designation"}
                  onChange={() => setSelectedOption("designation")}
                  className="w-4 h-4 border-gray-300 text-black focus:ring-black accent-black"
                />
                <span>Role</span>
              </label>
              <label className="flex items-center gap-3 rounded-full border border-transparent px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-white">
                <input
                  type="radio"
                  name="assignTo"
                  value="user"
                  checked={selectedOption === "user"}
                  onChange={() => setSelectedOption("user")}
                  className="w-4 h-4 border-gray-300 text-black focus:ring-black accent-black"
                />
                <span>Individual</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-slate-700">
                {selectedOption === "branch"
                  ? "Stores"
                  : selectedOption === "designation"
                  ? "Roles"
                  : "Employees"}
                <span className="text-red-500">*</span>
              </label>
              {selectedOption === "all_employees" ? (
                <div className="flex h-[48px] w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400">
                  All Employees selected
                </div>
              ) : (
                <Select
                  placeholder={
                    selectedOption === "branch"
                      ? "Select Stores user can access"
                      : selectedOption === "designation"
                      ? "Select roles"
                      : "Select employees"
                  }
                  options={recipientsOptions}
                  isMulti
                  value={assignedTo}
                  onChange={handleSelectChange}
                  styles={{
                    ...customSelectStyles,
                    control: (provided, state) => ({
                      ...provided,
                      minHeight: "48px",
                      borderRadius: "12px",
                      borderColor: state.isFocused ? "#016E5B" : "#cbd5e1",
                      boxShadow: state.isFocused ? "0 0 0 4px rgba(16,185,129,0.10)" : "none",
                      "&:hover": { borderColor: "#016E5B" },
                    }),
                  }}
                  isLoading={loadingOptions}
                />
              )}
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-slate-700">
                Deadline<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-[#016E5B] focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              {selectedOption !== "all_employees" && assignedTo.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    ASSIGNED TO
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {assignedTo.map((item) => (
                      <span
                        key={item.value}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                      >
                        {item.label}
                        <button
                          type="button"
                          onClick={() => handleRemovePill(item.value)}
                          className="text-slate-400 transition-colors hover:text-red-500 font-bold text-sm"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <label className="mb-3 block text-[13px] font-semibold text-slate-700">
                Delivery Method<span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4 sm:gap-8 items-center">
                <label className="flex items-center gap-3 rounded-full border border-transparent px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="email"
                    checked={deliveryMethod === "email"}
                    onChange={() => setDeliveryMethod("email")}
                    className="w-4 h-4 border-gray-300 text-black focus:ring-black accent-black"
                  />
                  <span>Email</span>
                </label>
                <label className="flex items-center gap-3 rounded-full border border-transparent px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="inApp"
                    checked={deliveryMethod === "inApp"}
                    onChange={() => setDeliveryMethod("inApp")}
                    className="w-4 h-4 border-gray-300 text-black focus:ring-black accent-black"
                  />
                  <span>In App Notification</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-start">
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center rounded-xl bg-[#111827] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default CreateCustomNotification;
