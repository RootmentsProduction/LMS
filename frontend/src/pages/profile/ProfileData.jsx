import SideNav from "../../components/SideNav/SideNav";
import { FaRegIdCard } from "react-icons/fa";
import { CiMail } from "react-icons/ci";
import { IoPhonePortraitOutline } from "react-icons/io5";
import { HiOutlinePencil } from "react-icons/hi2";
import { FaRegSave } from "react-icons/fa";
import { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import { toast } from 'react-toastify';

const ProfileData = () => {
    const token = localStorage.getItem("token");
    const [data, setData] = useState({});
    const [editData, setEditData] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);

    const GETCurrentAdmin = async () => {
        try {
            const GetAdmin = await fetch(`${baseUrl.baseUrl}api/admin/get/current/admin`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "include",
            });
            const response = await GetAdmin.json();
            const selectedData = {
                EmpId: response.data.EmpId || "(update EmpId number)",
                name: response.data.name || "(update name)",
                role: response.data.role || "(update role)",
                email: response.data.email || "(update email)",
                subRole: response.data.subRole || "(update subrole)",
                phoneNumber: response.data.phoneNumber || "(update phone number)",
            };
            setData(selectedData);
            setEditData(selectedData);
        } catch (error) {
        }
    };


    const UpdataData = async () => {
        try {
            const details = await fetch(`${baseUrl.baseUrl}api/admin/update/admin/detaile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "include",
                body: JSON.stringify(editData)
            })
            if (!details.ok) {
                toast.error("error updating data")
            }
            GETCurrentAdmin();

        } catch (error) {
            throw new Error(error)
        }
    }

    useEffect(() => {
        GETCurrentAdmin();
    }, [token]);

    const handleSave = () => {
        setData(editData); // Update the profile data with the edited values
        setIsModalOpen(false); // Close the modal
        UpdataData()
    };

    return (
        <div className="mb-[70px]">
            <SideNav />
            <div className="flex ml-[120px] w-[1300px] bg-gray-100">
                <div className="bg-white rounded-2xl w-full shadow-md p-6">
                    <div className="flex gap-10 items-start space-y-4 relative">
                        <div className="w-[150px]">
                            <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-green-400 rounded-full flex justify-center items-center shadow-lg">
                                <span className="text-white text-3xl font-semibold">Admin</span>
                            </div>
                        </div>

                        <div className="w-full">
                            <h2 className="text-xl font-bold text-gray-800">{data?.name}</h2>
                            <div className="flex gap-4">
                                <p className="text-sm text-gray-500">{data?.subRole}</p>
                                <p className="text-sm text-gray-500">{data?.role}</p>
                            </div>
                            <div className="flex items-center space-x-3 mb-3">
                                <FaRegIdCard className="text-xl text-[#016E5B]" />
                                <p className="text-sm text-gray-700">{data?.EmpId}</p>
                            </div>
                            <div className="flex items-center space-x-3 mb-3">
                                <CiMail className="text-xl text-[#016E5B]" />
                                <p className="text-sm text-gray-700">{data?.email}</p>
                            </div>
                            <div className="flex items-center space-x-3 mb-3">
                                <IoPhonePortraitOutline className="text-xl text-[#016E5B]" />
                                <p className="text-sm text-gray-700">{data?.phoneNumber}</p>
                            </div>
                        </div>
                        <div className="flex w-full justify-end absolute bottom-3">
                            <button
                                className="px-4 py-2 text-sm font-medium text-[#016E5B] border-[#016E5B] border rounded-lg flex items-center gap-2"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <HiOutlinePencil />
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Popup */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
                        {/* <select name="" id="">

                        </select> */}
                        {/* <input
                            type="text"
                            className="border bg-white w-full p-2 mb-2 rounded-md"
                            value={editData.subRole}
                            onChange={(e) => setEditData({ ...editData, subRole: e.target.value })}
                            placeholder="Name"
                        /> */}
                        <input
                            type="text"
                            className="border bg-white w-full p-2 mb-2 rounded-md"
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            placeholder="Name"
                        />
                        <input
                            type="text"
                            className="border bg-white w-full p-2 mb-2 rounded-md"
                            value={editData.email}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            placeholder="Email"
                        />
                        <input
                            type="text"
                            className="border bg-white w-full p-2 mb-2 rounded-md"
                            value={editData.phoneNumber}
                            onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                            placeholder="Phone Number"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                className="bg-red-500 text-white px-4 py-2 rounded-md"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center gap-2"
                                onClick={handleSave}
                            >
                                <FaRegSave />
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileData;
