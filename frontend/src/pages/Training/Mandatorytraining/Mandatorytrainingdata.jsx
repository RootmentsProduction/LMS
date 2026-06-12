
// src/pages/Create/Mandatorytrainingdata.jsx
import { useEffect, useState } from "react";
import Select from "react-select";
import baseUrl from "../../../api/api";
import { toast } from "react-toastify";
import SideNav from "../../../components/SideNav/SideNav";

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

const Mandatorytrainingdata = () => {
  const [modules, setModules] = useState([]);                 // select options
  const [roleOptions, setRoleOptions] = useState([]);         // select options
  const [trainingName, setTrainingName] = useState("");
  const [assignedTo, setAssignedTo] = useState([]);           // selected designations
  const [selectedModules, setSelectedModules] = useState([]); // selected modules
  const [days, setDays] = useState("");
  const [token] = useState(localStorage.getItem("token"));
  const [debugInfo, setDebugInfo] = useState("");

  // Debug function to check users for a specific designation
  const debugDesignation = async (designation) => {
    try {
      // Fetch employee data to see what's actually stored
      const res = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
      });
      
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      
      // Find users with this designation
      const usersWithDesignation = (json?.data || []).filter(
        emp => emp?.role_name?.trim() === designation
      );
      if (usersWithDesignation.length === 0) {
        // Check for similar designations (case-insensitive)
        const similarDesignations = (json?.data || [])
          .map(emp => emp?.role_name?.trim())
          .filter(Boolean)
          .filter(role => 
            role.toLowerCase().includes(designation.toLowerCase()) ||
            designation.toLowerCase().includes(role.toLowerCase())
          );
      }
      
      setDebugInfo(`Found ${usersWithDesignation.length} users with designation "${designation}"`);
    } catch (err) {
      setDebugInfo(`Debug failed: ${err.message}`);
    }
  };

  // Test backend API directly to see what's happening
  const testBackendAPI = async () => {
    if (assignedTo.length === 0) {
      toast.info("Please select a designation first");
      return;
    }

    const designations = assignedTo.map((o) => String(o?.value ?? "").trim()).filter(Boolean);
    
    try {
      // Use valid module IDs if available, otherwise create a dummy valid ObjectId
      let testModules = [];
      if (selectedModules.length > 0) {
        testModules = selectedModules.map(m => m.value);
      } else {
        // Create a dummy valid ObjectId for testing (24 character hex string)
        testModules = ["507f1f77bcf86cd799439011"]; // Dummy ObjectId
      }
      
      // Test payload similar to what we'll send
      const testPayload = {
        trainingName: "TEST_TRAINING",
        modules: testModules,
        days: 1,
        workingBranch: designations,
      };
      const res = await fetch(`${baseUrl.baseUrl}api/mandatorytrainings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(testPayload),
      });

      const text = await res.text();
      let data;
      try { 
        data = JSON.parse(text || "{}"); 
      } catch { 
      }

      if (!res.ok) {
        setDebugInfo(`Backend test failed: ${data?.error || data?.message || text}`);
        
        // If it's a "No users found" error, this is the real issue
        if (text.includes("No users found")) {
        }
      } else {
        setDebugInfo("Backend API test successful - the issue might be elsewhere");
      }
      
    } catch (err) {
      setDebugInfo(`Backend test failed: ${err.message}`);
    }
  };

  // Log employee data structure to understand the data format
  const logEmployeeDataStructure = async () => {
    try {
      const res = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
      });
      
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      
      // Log the first few employees to see the data structure
      const sampleEmployees = (json?.data || []).slice(0, 3);
      // Log all unique field names
      const allFields = new Set();
      (json?.data || []).forEach(emp => {
        if (emp && typeof emp === 'object') {
          Object.keys(emp).forEach(key => allFields.add(key));
        }
      });
      // Log all unique role_name values
      const allRoles = [...new Set((json?.data || []).map(e => e?.role_name).filter(Boolean))].sort();
      setDebugInfo(`Logged data structure for ${json?.data?.length || 0} employees`);
    } catch (err) {
      setDebugInfo(`Failed to log data structure: ${err.message}`);
    }
  };

  // Check for potential backend data source mismatch
  const checkBackendDataMismatch = async () => {
    try {
      // Get the selected designation
      const selectedDesignation = assignedTo[0]?.value;
      if (!selectedDesignation) {
        toast.info("Please select a designation first");
        return;
      }
      // Check if there are users with this designation in our employee data
      const res = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
      });
      
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      
      const usersWithDesignation = (json?.data || []).filter(
        emp => emp?.role_name?.trim() === selectedDesignation
      );
      if (usersWithDesignation.length > 0) {
        // Check if there might be a field name mismatch
        const sampleUser = usersWithDesignation[0];
        // Check for potential whitespace or encoding issues
      } else {
      }
      
      setDebugInfo(`Frontend: ${usersWithDesignation.length} users, Backend: Check console for mismatch details`);
    } catch (err) {
      setDebugInfo(`Check failed: ${err.message}`);
    }
  };

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/modules`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();

        const opts = (Array.isArray(data) ? data : [])
          .map((m) => {
            const id = m?._id ?? m?.id ?? m?.moduleId;
            if (!isObjectId(id)) return null;
            return { value: String(id), label: m?.moduleName || m?.name || "Unnamed Module" };
          })
          .filter(Boolean);

        setModules(opts);
      } catch (err) {
        toast.error("Failed to load modules.");
      }
    };

    const fetchRoleOptions = async () => {
      try {
        // Using the same API endpoint as EmployeeData.jsx
        const res = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
        });
        
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();

        // Extract unique roles from employee data, similar to EmployeeData.jsx
        const uniqueRoles = Array.from(
          new Set(
            (json?.data || [])
              .map((e) => e?.role_name?.trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));

        // Convert to react-select options format
        const options = uniqueRoles.map((role) => ({ 
          value: role, 
          label: role 
        }));

        setRoleOptions(options);
      } catch (err) {
        toast.error("Failed to load employee designations.");
      }
    };

    fetchModules();
    fetchRoleOptions();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const moduleIds = (selectedModules || [])
      .map((o) => String(o?.value ?? "").trim())
      .filter((id) => isObjectId(id));

    const designations = (assignedTo || [])
      .map((o) => String(o?.value ?? "").trim())
      .filter(Boolean);

    const dayCount = Number(days);

    if (!trainingName.trim()) return toast.error("Enter a training name.");
    if (!Number.isFinite(dayCount) || dayCount <= 0) return toast.error("Days must be a positive number.");
    if (moduleIds.length === 0) return toast.error("Select at least one module (valid ID).");
    if (designations.length === 0) return toast.error("Select at least one designation.");

    // Enhanced logging for debugging
    // Check if selected designations exist in available options
    const availableDesignations = roleOptions.map(r => r.value);
    const missingDesignations = designations.filter(d => !availableDesignations.includes(d));
    if (missingDesignations.length > 0) {
    }
    
    // Log the exact payload being sent
    const payload = {
      trainingName: trainingName.trim(),
      modules: moduleIds,
      days: dayCount,
      workingBranch: designations,
    };
    try {
      const res = await fetch(`${baseUrl.baseUrl}api/mandatorytrainings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data;
      try { 
        data = JSON.parse(text || "{}"); 
      } catch { 
        data = { message: text }; 
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status} ${res.statusText}`);
      }

      toast.success(data?.message || "Training created successfully!");
      
      // Reset form
      setTrainingName("");
      setDays("");
      setSelectedModules([]);
      setAssignedTo([]);
    } catch (err) {
      const errorMessage = String(err?.message || "Server Error");
      
      // Provide helpful error messages
      if (errorMessage.includes("No users found")) {
        toast.error(`${errorMessage}\n\nTip: Make sure the designation names match exactly with the available options.`);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div>
      <div className="w-full h-full bg-white">
      </div>
      <SideNav />

      <div className="md:ml-[120px]">
        <form onSubmit={handleSubmit} className="text-black w-[800px] mt-10">
          {/* Training Name */}
          <div className="flex flex-col gap-5 mx-20 mt-5">
            <div className="flex flex-col gap-2">
              <p>Training Name</p>
              <input
                type="text"
                placeholder="Training title"
                className="bg-white border p-1 w-full rounded-lg border-black"
                value={trainingName}
                onChange={(e) => setTrainingName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Days */}
          <div className="flex flex-col gap-5 mx-20 mt-5">
            <div className="flex flex-col gap-2">
              <p>Days</p>
              <input
                type="number"
                placeholder="Number of days"
                className="bg-white w-full border p-1 rounded-lg border-black"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
                min={1}
              />
            </div>
          </div>

          {/* Modules */}
          <div className="flex flex-col gap-2 mx-20 mt-5">
            <p>Modules</p>
            <Select
              options={modules}
              isMulti
              value={selectedModules}
              onChange={(opts) => setSelectedModules((opts || []).filter((o) => isObjectId(o?.value)))}
              className="w-full"
              placeholder="Select module(s)…"
            />
          </div>

          {/* Assign To Designation */}
          <div className="flex flex-col gap-2 mx-20 mt-5">
            <p>Assign To Designation</p>
            <Select
              options={roleOptions}
              isMulti
              value={assignedTo}
              onChange={(opts) => setAssignedTo((opts || []).filter((o) => String(o?.value ?? "").trim() !== ""))}
              className="w-full"
              placeholder="Select designation(s)…"
            />
            {roleOptions.length === 0 && (
              <p className="text-sm text-gray-500">Loading designations...</p>
            )}
            
            {/* Debug Section */}
           
          </div>

          {/* Delete All Trainings Section */}
          {/* <div className="mt-10 mx-20 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-3">⚠️ Danger Zone</h3>
            <p className="text-sm text-red-700 mb-4">
              This action will permanently delete ALL mandatory trainings and cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="deleteAllCheckbox"
                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
              />
              <label htmlFor="deleteAllCheckbox" className="text-sm text-red-700 font-medium">
                I understand this will delete ALL mandatory trainings
              </label>
            </div>
            <button
              type="button"
              onClick={async () => {
                const deleteAllCheckbox = document.getElementById('deleteAllCheckbox');
                if (deleteAllCheckbox && deleteAllCheckbox.checked) {
                  if (confirm('Are you absolutely sure you want to delete ALL mandatory trainings? This action cannot be undone!')) {
                    try {
                      // Fetch all mandatory trainings first
                      const response = await fetch(`${baseUrl.baseUrl}api/get/mandatory/allusertraining`, {
                          headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                          }
                      });
                      if (!response.ok) throw new Error("Failed to fetch trainings");
                      
                      const result = await response.json();
                      const mandatoryTrainings = result.data;
                      
                      if (mandatoryTrainings.length === 0) {
                        alert('No mandatory trainings found to delete.');
                        return;
                      }
                      
                      // Delete all mandatory trainings
                      const deletePromises = mandatoryTrainings.map(training =>
                        fetch(`${baseUrl.baseUrl}api/user/delete/training/${training._id}`, {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          }
                        })
                      );
                      
                      const results = await Promise.all(deletePromises);
                      const failedDeletes = results.filter(result => !result.ok);
                      
                      if (failedDeletes.length > 0) {
                        alert(`Failed to delete ${failedDeletes.length} training(s). Please try again.`);
                      } else {
                        alert(`Successfully deleted ${mandatoryTrainings.length} mandatory training(s)`);
                        // Reset the checkbox
                        deleteAllCheckbox.checked = false;
                      }
                    } catch (error) {
                      alert('An error occurred while deleting all trainings. Please try again.');
                    }
                  }
                } else {
                  alert('Please check the confirmation checkbox to delete all trainings.');
                }
              }}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              🗑️ Delete All Mandatory Trainings
            </button>
          </div> */}

          <div className="mt-10 mx-20">
            <button
              type="submit"
              className="border border-black p-2 px-6 rounded-lg bg-[#016E5B] hover:bg-[#017E5B] text-white"
            >
              Assign Training
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Mandatorytrainingdata;
