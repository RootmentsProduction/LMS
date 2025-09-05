import { useEffect, useState } from "react";
import baseUrl from "../../../api/api";
import Select from "react-select";
import { useParams } from "react-router-dom";
import Header from "../../../components/Header/Header";
import SideNav from '../../../components/SideNav/SideNav';
// Users options

const ReassignData = () => {
    const { id } = useParams(); // Get training ID from URL params
    const [training, setTraining] = useState(null);
    const [assignedTo, setAssignedTo] = useState([]); // Multi-select values
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // Store all users for filtering
    const [selectedRole, setSelectedRole] = useState(""); // Role filter
    const [availableRoles, setAvailableRoles] = useState([]); // Available roles
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchTrainingDetails = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/trainings/${id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch training details');
                }
                const result = await response.json();
                setTraining(result);
                if (training) {
                    console.log(training)
                }

            } catch (err) {

                throw new Error(err)
            }
        };
        const fetchUsers = async () => {
            try {
                // Fetch from external employee API
                const response = await fetch(`${baseUrl.baseUrl}api/employee_range`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('External employee data:', data);

                // Map external employee data to options required by react-select
                const options = (data?.data || []).map((employee) => ({
                    value: employee.emp_code, // Use emp_code as the value
                    label: `EmpId: ${employee.emp_code || 'N/A'} | Name: ${employee.name || 'N/A'} | Role: ${employee.role_name || 'N/A'}`,
                    role: employee.role_name, // Add role for filtering
                    empID: employee.emp_code,
                    username: employee.name,
                    branch: employee.store_name,
                    email: employee.email
                }));
                
                setAllUsers(options);
                setUsers(options);
                
                // Extract unique roles for filtering
                const roles = [...new Set((data?.data || []).map(emp => emp.role_name).filter(Boolean))];
                setAvailableRoles(roles);

            } catch (error) {
                console.error("Failed to fetch users:", error.message);
            }
        };
        fetchTrainingDetails();
        fetchUsers()



    }, [id]);

    // Filter users by role
    const handleRoleFilter = (role) => {
        setSelectedRole(role);
        if (role === "") {
            setUsers(allUsers);
        } else {
            const filteredUsers = allUsers.filter(user => user.role === role);
            setUsers(filteredUsers);
        }
        // Clear selected users when filter changes
        setAssignedTo([]);
    };

    // Quick select all users of a specific role
    const handleSelectAllByRole = (role) => {
        const roleUsers = allUsers.filter(user => user.role === role);
        setAssignedTo(roleUsers);
    };

    const HandleSubmit = async (e) => {
        e.preventDefault()
        console.log(assignedTo, id);
        // setAssignedTo({ ...assignedTo, id: id })

        try {
            const request = await fetch(baseUrl.baseUrl + 'api/user/reassign/training', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignedTo: assignedTo.map(user => user.value), trainingId: id }),
            });
            const response = await request.json()
            alert(response.message)
            window.location.reload();
        } catch (error) {
            throw new Error(error)
        }

    }
    return (
        <div className="w-full h-full bg-white text-black">
            <div><Header name='Reassign Training' /></div>
            <SideNav />

            <div className="md:ml-[100px] mt-[150px]">
                <div className="text-xl mt-10  ">
                    <div className="flex justify-evenly">
                        <p>Training Name: <span className="text-[#016E5B]">{training?.data.trainingName}</span></p>
                        <p>Number of Modules : <span className="text-[#016E5B]">{training?.data.numberOfModules}</span></p>
                        <p>Number of user : <span className="text-[#016E5B]">{training?.users.length}</span></p>
                    </div>
                </div>
                <div className="flex mx-32 justify-between ">
                    <div>
                        {
                            training?.data?.modules.map((module) => {
                                return (
                                    <div className="text-xl mt-5 " key={module._id}>
                                        Module {module.moduleName} has {module.videos.length} videos
                                        <ul className="text-[16px] text-[#016E5B]">
                                            {module.videos.map((video) => {
                                                return (
                                                    <li key={video._id} title={video.title}>
                                                        {video.title.length < 20 ? video.title : video.title.slice(0, 20) + "..."}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                );
                            })
                        }
                    </div>
                    <div className="mt-5 flex justify-start items-center">
                        <form action="" onSubmit={HandleSubmit} className="flex flex-col gap-5">
                            {/* Role Filter Section */}
                            <div className="w-96">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Filter by Role:
                                </label>
                                <select 
                                    value={selectedRole} 
                                    onChange={(e) => handleRoleFilter(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#016E5B]"
                                >
                                    <option value="">All Roles</option>
                                    {availableRoles.map((role, index) => (
                                        <option key={index} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Quick Select Buttons */}
                            {selectedRole && (
                                <div className="w-96">
                                    <button 
                                        type="button"
                                        onClick={() => handleSelectAllByRole(selectedRole)}
                                        className="px-4 py-2 bg-[#016E5B] text-white rounded-md hover:bg-[#014C3F] text-sm"
                                    >
                                        Select All {selectedRole}s
                                    </button>
                                </div>
                            )}

                            <div className="mt-5 flex justify-start items-center">
                                <div className="w-96">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Users:
                                    </label>
                                    <Select
                                        placeholder="Select or search users"
                                        options={users}
                                        isMulti
                                        value={assignedTo}
                                        onChange={setAssignedTo} // Updates state
                                        className="w-full"
                                        isSearchable={true}
                                        maxMenuHeight={200}
                                    />
                                </div>
                            </div>
                            
                            {/* Selected Users Count */}
                            {assignedTo.length > 0 && (
                                <div className="text-sm text-gray-600">
                                    Selected: {assignedTo.length} user{assignedTo.length !== 1 ? 's' : ''}
                                </div>
                            )}

                            <button type="submit" className="btn text-white btn-accent">
                                Reassign Training ({assignedTo.length} users)
                            </button>
                        </form>
                    </div>
                </div>
            </div>


        </div >
    )
}

export default ReassignData