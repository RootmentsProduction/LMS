


import Header from "../../components/Header/Header";

import { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import SideNav from "../../components/SideNav/SideNav";

// import { MdGroups2 } from "react-icons/md";
import { GiProgression } from "react-icons/gi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { MdOutlinePendingActions } from "react-icons/md";
import HomeSkeleton from "../../components/Skeleton/HomeSkeleton";
import { Link } from "react-router-dom";

import { RiIdCardLine } from "react-icons/ri";
// import HomeBar from "../../components/HomeBar/HomeBar";
import TopEmployeeAndBranch from "../../components/TopEmployeeAndBranch/TopEmployeeAndBranch";
// import Quick from "../../components/Quick/Quick";
import Notification from "../../components/Notification/Notification";
import TrainingProgress from "../../components/StoreManager/TrainingProgress";
import OverdueTrainings from "../../components/StoreManager/OverdueTrainings";



const HomeDatastore = ({ user }) => {
    const token = localStorage.getItem('token');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state
    const [employeeCount, setEmployeeCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(baseUrl.baseUrl + 'api/get/progress', {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        'Authorization': `Bearer ${token}`,
                    },
                    credentials: "include",
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const result = await response.json(); // Parse JSON
                setData(result.data); // Assuming the data you need is inside 'result.data'
                setLoading(false); // Set loading to false
                console.log(data);
            } catch (err) {
                console.error('Error fetching data:', err);
                setLoading(false); // Stop loading
            }
        };

        const fetchEmployeeCount = async () => {
            try {
                const response = await fetch(baseUrl.baseUrl + 'api/employee_range', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
                const json = await response.json();
                
                if (json?.data && Array.isArray(json.data)) {
                    setEmployeeCount(json.data.length);
                    console.log('Employee count fetched:', json.data.length);
                }
            } catch (error) {
                console.error('Failed to fetch employee count:', error.message);
                // Fallback to data from progress API
                setEmployeeCount(data?.userCount || 0);
            }
        };

        fetchData();
        fetchEmployeeCount();
    }, [data, token]);



    return (
        <div className=" mx-0 mb-[90px]" >
            <div>
                <Header name="Dashboard" />
            </div>
            <div className="flex">
                <div>
                    <SideNav />
                </div>
                <div className="md:ml-[100px] mt-[100px] ">
                    <div className="ml-12 text-black">
                        <div className="flex items-center gap-3 mt-5 mb-4">
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-medium text-gray-700">Hello,</p>
                                <div className="bg-gradient-to-r from-[#016E5B] to-[#01997A] text-white px-4 py-2 rounded-full shadow-lg">
                                    <span className="text-lg font-bold capitalize">
                                        {!loading && user.role?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm md:text-lg">Your dashboard is ready, Let’s create a productive learning environment!</p>
                    </div>
                </div>
            </div>
            <div className="ml-[100px]">
                {loading && (
                    <div className="flex mb-[70px] gap-3 lg:gap-6 mx-10 lg:mx-15 md:flex-wrap flex-wrap sm:w-full md:gap-9 md:mx-10 md:justify-start mt-10 font-semibold">
                        <HomeSkeleton />
                        <HomeSkeleton />
                        <HomeSkeleton />
                        <HomeSkeleton />
                        <HomeSkeleton />
                    </div>
                )}
                {!loading && (
                    <div className="">
                        <div className="flex mb-[70px] gap-3 lg:gap-6 mx-10 lg:mx-15 md:flex-wrap flex-wrap sm:w-full md:gap-9  md:mx-10 md:justify-start mt-10 font-semibold">
                            <Link to={'/employee'}>
                                <div className="lg:w-56 w-48 md:w-52 h-28 relative border-gray-300 border rounded-xl shadow-lg text-black flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
                                    <div className="flex gap-3">
                                        <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
                                            <RiIdCardLine />
                                        </div>
                                        <div className="flex flex-col absolute top-5 left-2 w-10">
                                            <p className="text-sm">Total employee</p>
                                            <h2 className="md:text-2xl sm:text-lg font-bold text-[#016E5B]">
                                                {employeeCount || data?.userCount || 0}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            <Link to={'/training'}>
                                <div className="lg:w-56 w-48 md:w-52 h-28 relative border-gray-300 border rounded-xl shadow-lg text-black flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
                                    <div className="flex gap-3">
                                        <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
                                            <GiProgression />
                                        </div>
                                        <div className="flex flex-col absolute top-5 left-2 w-10">
                                            <p className="text-sm">Training progress</p>
                                            <h2 className="md:text-2xl sm:text-lg font-bold text-[#016E5B]">
                                                {Math.round(data?.averageProgress)}%
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            <Link to={'/branch'}>
                                <div className="lg:w-56 w-48 md:w-52 h-28 relative border-gray-300 border rounded-xl shadow-lg text-black flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
                                    <div className="flex gap-3">
                                        <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
                                            <HiOutlineBuildingOffice2 />
                                        </div>
                                        <div className="flex flex-col absolute top-5 left-2 w-10">
                                            <p className="text-sm">Total
                                                Branches</p>
                                            <h2 className="md:text-2xl sm:text-lg font-bold text-[#016E5B]">
                                                {data?.branchCount}
                                            </h2>

                                        </div>
                                    </div>
                                </div>
                            </Link>
                            <Link to={'/admin/overdue/assessment'}>
                                <div className="lg:w-56 w-48  text-red-600 md:w-52 h-28 relative border-red-600 border-2 rounded-xl shadow-lg flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
                                    <div className="flex gap-3">
                                        <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
                                            <MdOutlinePendingActions />
                                        </div>
                                        <div className="flex flex-col absolute top-5 left-2 w-10">
                                            <p className="text-sm text-black">Overdue Assessment </p>
                                            <h2 className="md:text-2xl sm:text-lg font-bold ">
                                                {data?.assessmentProgress}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            <Link to={'/admin/overdue/training'}>
                                <div className="lg:w-56 w-48  text-red-600 md:w-52 h-28 relative border-red-600 border-2 rounded-xl shadow-lg flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
                                    <div className="flex gap-3">
                                        <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
                                            <MdOutlinePendingActions />
                                        </div>
                                        <div className="flex flex-col absolute top-5 left-2 w-10">
                                            <p className="text-sm text-black">Overdue Training</p>
                                            <h2 className="md:text-2xl sm:text-lg font-bold ">
                                                {data?.trainingPending}
                                            </h2>

                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap gap-10">
                <div className="ml-[150px]">
                    <TrainingProgress />
                </div>
                <div className="h-[360px] w-[600px]  rounded-xl" >
                    <TopEmployeeAndBranch />


                </div>

                <div className="ml-[150px] mt-[-100px]">
                    <Notification />
                </div>

                <div className="ml-[-100px] mt-10">
                    <OverdueTrainings />
                </div>
            </div>




        </div >
    );
};

export default HomeDatastore;
