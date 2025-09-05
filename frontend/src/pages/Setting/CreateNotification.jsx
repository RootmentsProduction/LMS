import { useEffect, useState } from "react";
import Select from "react-select";
import baseUrl from "../../api/api";
import { toast } from "react-toastify";

const CreateCustomNotification = () => {
  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");
  // const [role,setRole]=useState("user")
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    title: "",
    message: "",
    recipient: [],
    role: selectedOption,
    deliveryMethod: "inApp",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssignedToChange = (selectedOptions) => {
    setAssignedTo(selectedOptions);
    setForm((prev) => ({
      ...prev,
      recipient: selectedOptions.map((option) => option.value),

    }));
  };

  useEffect(() => {
    if (!selectedOption) return;

    const fetchUsers = async () => {
      try {
        let options = [];

        if (selectedOption === "user") {
          // Get internal users
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
              label: item.username,
            }));
          }
        } else if (selectedOption === "branch") {
          // Get branches
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
          // Get designations from external API
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

        setUsers(options);
      } catch (error) {
        console.error("Failed to fetch users:", error.message);
        setUsers([]);
      }
    };

    fetchUsers();
    setAssignedTo([]); // Clear assigned users when selectedOption changes
    setForm((prev) => ({ ...prev, recipient: [], role: selectedOption }));
  }, [selectedOption, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Notification Form Data:", form);
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/admin/notification/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const req = await response.json()


      if (!response.ok) {
        const errorData = await response.json();
        toast.warning(response.message)
        throw new Error(errorData.message || "Failed to send notification.");
      }
      toast.success(req.message)


    } catch (error) {
      console.error("Failed to send notification:", error.message);

    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-black flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Create Custom Notification</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Notification Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-gray-700"
            >
              Notification Title/ Subject
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="Enter notification title / subject"
              className="mt-2 block w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Message Content */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-gray-700"
            >
              Message Content
            </label>
            <textarea
              id="message"
              name="message"
              value={form.message}
              onChange={handleInputChange}
              placeholder="Type your message here..."
              rows="4"
              className="mt-2 block w-full p-2 border bg-white border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            ></textarea>
          </div>

          {/* Recipient Selection */}
          <div className="flex flex-col gap-4">
            <label htmlFor="assignToType" className="block text-gray-700 font-medium">
              Assign To
            </label>
            <div className="flex gap-5">
              <label>
                <input
                  type="radio"
                  value="user"
                  checked={selectedOption === "user"}
                  onChange={() => setSelectedOption("user")}
                />{" "}
                User
              </label>
              <label>
                <input
                  type="radio"
                  value="designation"
                  checked={selectedOption === "designation"}
                  onChange={() => setSelectedOption("designation")}
                />{" "}
                Designation
              </label>
              <label>
                <input
                  type="radio"
                  value="branch"
                  checked={selectedOption === "branch"}
                  onChange={() => setSelectedOption("branch")}
                />{" "}
                Branch
              </label>
            </div>
            <Select
              placeholder="Select the users"
              id="assignToUsers"
              options={users}
              isMulti
              value={assignedTo}
              onChange={handleAssignedToChange}
              className="w-full"
            />
          </div>

          {/* Delivery Methods */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Delivery Methods
            </label>
            <div className="flex items-center space-x-4">
              {/* <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="email"
                  checked={form.deliveryMethod === "email"}
                  onChange={handleInputChange}
                  className="focus:ring-green-500 text-green-600 border-gray-300"
                />
                <span>Email</span>
              </label> */}
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="inApp"
                  checked={form.deliveryMethod === "inApp"}
                  onChange={handleInputChange}
                  className="focus:ring-green-500 text-green-600 border-gray-300"
                />
                <span>In-app Notification</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300"
            >
              Send Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCustomNotification;
