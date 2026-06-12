import { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import Select from "react-select";
import { toast } from "react-toastify";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa";


const CreateUser = () => {
  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState([]);
  const [selectedOption, setSelectedOption] = useState("user");
  const [Open, setOpen] = useState(false)
  const [Subrole, GetSubRole] = useState([]);
  const token = localStorage.getItem('token');

  // const subrole={}

  const [form, setForm] = useState({
    userId: "",
    userName: "",
    email: "",
    userRole: "",
    clusterBranch: "",
    password: "",
    Branch: [],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Assign role based on selected option
    const userRole =
      selectedOption === "user" ? "super_admin" :
        selectedOption === "admin" ? "admin" :
          selectedOption === "designation" ? "cluster_admin" : "store_admin";
    const updatedForm = {
      ...form,
      userRole,
      Branch: Array.isArray(assignedTo)
        ? assignedTo.map((branch) => branch.value)
        : [assignedTo?.value],
      subRole: form.subRole || null,
      // Default to an empty array if not an array
    };


    if (!updatedForm.userId || !updatedForm.userName || !updatedForm.email) {
      toast.warning("Please fill in all required fields.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/admin/admin/createadmin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save changes");
      }

      const result = await response.json();
      toast.success("User created successfully!");
    } catch (error) {
      toast.error("An error occurred while saving the user. Please try again.");
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
          method: "GET",
          headers: { "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`,
           },
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch branch data");

        const data = await response.json();
        setUsers(
          data.data.map((item) => ({
            value: item._id,
            label: item.workingBranch,
          }))
        );
      } catch (error) {
        toast.error("Failed to fetch branch data.");
      }
    };

    const FetchSubrole = async () => {
      try {
        const response = await fetch(`${baseUrl.baseUrl}api/admin/getSubrole`)
        if (response.ok) {
          // subrole fetch placeholder
        }
      } catch (error) {
        throw new Error(error)
      }
    }

    fetchUsers();
    FetchSubrole();
  }, []); // Ensure this only runs on component mount

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-160px)] flex text-black justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <h1 className="text-2xl font-extrabold mb-6">Create User/Admin</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User ID */}
          <div>
            <label htmlFor="userId" className="block text-sm font-semibold text-gray-700">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              name="userId"
              value={form.userId}
              onChange={handleInputChange}
              placeholder="Enter employee ID"
              className="mt-2 block w-full p-2 border bg-white border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* User Name */}
          <div>
            <label htmlFor="userName" className="block text-sm font-semibold text-gray-700">
              User Name
            </label>
            <input
              type="text"
              id="userName"
              name="userName"
              value={form.userName}
              onChange={handleInputChange}
              placeholder="Enter employee name"
              className="mt-2 block w-full p-2 border bg-white border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleInputChange}
              placeholder="Enter employee email address"
              className="mt-2 block w-full p-2 border bg-white border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="relative">
            <div className="absolute top-10 right-5 cursor-pointer">
              {!Open ? <FaEye onClick={() => setOpen((prev) => !prev)} /> : <FaEyeSlash onClick={() => setOpen((prev) => !prev)} />}
            </div>

            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <input
              type={!Open ? "password" : "text"}
              id="password"
              name="password"
              value={form.password}
              onChange={handleInputChange}
              placeholder="Enter Password"
              className="mt-2 block w-full p-2 border bg-white border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            />
          </div>


          {/* Assign To */}
          {/* Assign To */}
          <div className="flex flex-col gap-4">
            <label htmlFor="assignToType" className="block text-gray-700 font-medium">
              Role
            </label>
            <div className="flex gap-5">
              <label>
                <input
                  type="radio"
                  value="user"
                  checked={selectedOption === "user"}
                  onChange={() => setSelectedOption("user")}
                />{" "}
                Super Admin
              </label>
              <label>
                <input
                  type="radio"
                  value="admin"
                  checked={selectedOption === "admin"}
                  onChange={() => setSelectedOption("admin")}
                />{" "}
                Admin
              </label>
              <label>
                <input
                  type="radio"
                  value="designation"
                  checked={selectedOption === "designation"}
                  onChange={() => setSelectedOption("designation")}
                />{" "}
                Cluster Manager
              </label>
              <label>
                <input
                  type="radio"
                  value="branch"
                  checked={selectedOption === "branch"}
                  onChange={() => setSelectedOption("branch")}
                />{" "}
                Store Manager
              </label>
            </div>

            {(selectedOption === "user" || selectedOption === "admin") && (
              <div>
                <label htmlFor="subRole" className="block text-sm font-semibold text-gray-700">
                  Sub Role
                </label>
                <select
                  id="subRole"
                  name="subRole"
                  value={form.subRole || ""}
                  onChange={handleInputChange}
                  className="mt-2 block w-full p-2 border bg-white border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Sub Role</option>
                  {Subrole?.map((item) => {
                    return <option key={item._id} value={item.level
                    }>{item.subrole}</option>
                  })}
                  {/* <option value="TM">Training Manager</option>
                  <option value="HR">HR</option>
                  <option value="MG">management</option> */}
                </select>
              </div>
            )}

            {(selectedOption === "designation" || selectedOption === "branch") && (
              <Select
                placeholder="Select the users"
                id="assignToUsers"
                options={users}
                isMulti={selectedOption === "designation"} // Properly sets isMulti based on selectedOption
                value={assignedTo}
                onChange={setAssignedTo}
                className="w-full"
              />
            )}
          </div>


          {/* Save Button */}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300"
            >
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;
