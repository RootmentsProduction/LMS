// import Header from "../../components/Header/Header";
// // import { MdGroups2 } from "react-icons/md";
// import { GiProgression } from "react-icons/gi";
// import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
// import { MdOutlinePendingActions } from "react-icons/md";
// import { useEffect, useState } from "react";
// import baseUrl from "../../api/api";
// import HomeSkeleton from "../../components/Skeleton/HomeSkeleton";
// import SideNav from "../../components/SideNav/SideNav";
// import { Link } from "react-router-dom";
// import HomeBar from "../../components/HomeBar/HomeBar";
// import TopEmployeeAndBranch from "../../components/TopEmployeeAndBranch/TopEmployeeAndBranch";
// import Notification from "../../components/Notification/Notification";
// import Quick from "../../components/Quick/Quick";
// import { RiIdCardLine } from "react-icons/ri";
// import LMSWebsiteLoginStats from "../../components/LMSWebsiteLoginStats/LMSWebsiteLoginStats";


// const HomeData = ({ user }) => {
//     const [data, setData] = useState([]);
//     const [loading, setLoading] = useState(true); // Loading state
//     const [employeeCount, setEmployeeCount] = useState(0);
//     const token = localStorage.getItem('token');

//     useEffect(() => {
//         const fetchData = async () => {
//             if (!token) {
//                 console.error('No token found, cannot fetch data');
//                 setLoading(false);
//                 return;
//             }

//             try {
//                 console.log('Fetching dashboard data from:', baseUrl.baseUrl + 'api/get/progress');
//                 console.log('Using token:', token ? 'Token exists' : 'No token');
                
//                 const response = await fetch(baseUrl.baseUrl + 'api/get/progress', {
//                     method: "GET",
//                     headers: {
//                         "Content-Type": "application/json",
//                         'Authorization': `Bearer ${token}`,
//                     },
//                     credentials: "include",
//                 });
                
//                 console.log('Progress API response status:', response.status);
                
//                 if (!response.ok) {
//                     const errorText = await response.text();
//                     console.error('Progress API error:', response.status, errorText);
                    
//                     if (response.status === 401) {
//                         console.error('Authentication failed, redirecting to login');
//                         localStorage.removeItem('token');
//                         window.location.href = '/login';
//                         return;
//                     }
                    
//                     throw new Error(`HTTP ${response.status}: ${errorText}`);
//                 }
                
//                 const result = await response.json();
//                 console.log('Progress API response:', result);
                
//                 if (result.success && result.data) {
//                     setData(result.data);
//                     console.log('Dashboard data set successfully:', result.data);
//                 } else {
//                     console.error('Unexpected API response structure:', result);
//                     setData({
//                         assessmentCount: 0,
//                         branchCount: 0,
//                         userCount: 0,
//                         averageProgress: 0,
//                         assessmentProgress: 0,
//                         trainingPending: 0,
//                         uniqueLoginUserCount: 0,
//                         loginPercentage: 0
//                     });
//                 }
                
//                 setLoading(false);
//             } catch (err) {
//                 console.error('Error fetching dashboard data:', err);
//                 setLoading(false);
//                 setData({
//                     assessmentCount: 0,
//                     branchCount: 0,
//                     userCount: 0,
//                     averageProgress: 0,
//                     assessmentProgress: 0,
//                     trainingPending: 0,
//                     uniqueLoginUserCount: 0,
//                     loginPercentage: 0
//                 });
//             }
//         };

//         const fetchEmployeeCount = async () => {
//             try {
//                 console.log('Fetching employee count from:', baseUrl.baseUrl + 'api/employee_range');
                
//                 const response = await fetch(baseUrl.baseUrl + 'api/employee_range', {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json"
//                     },
//                     credentials: "include",
//                     body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
//                 });
                
//                 console.log('Employee count response status:', response.status);
                
//                 if (!response.ok) {
//                     const errorText = await response.text();
//                     console.error('Employee count response not ok:', response.status, errorText);
//                     throw new Error(`HTTP ${response.status}: ${errorText}`);
//                 }
                
//                 const json = await response.json();
//                 console.log('Employee count response:', json);
                
//                 if (json?.data && Array.isArray(json.data)) {
//                     setEmployeeCount(json.data.length);
//                     console.log('Employee count fetched successfully:', json.data.length);
//                 } else {
//                     console.error('Employee count response structure unexpected:', json);
//                     setEmployeeCount(0);
//                 }
//             } catch (error) {
//                 console.error('Failed to fetch employee count:', error.message);
//                 // Fallback to data from progress API
//                 setEmployeeCount(data?.userCount || 0);
//             }
//         };

//         if (token) {
//             fetchData();
//             fetchEmployeeCount();
//         } else {
//             console.error('No token found, cannot fetch data');
//             setLoading(false);
//         }
//     }, [token]);



//     return (
//         <div className=" mx-0 mb-[90px]" >
//             <div>
//                 <Header name="Dashboard" />
//             </div>
//             <div className="flex">
//                 <div>
//                     <SideNav />
//                 </div>
//                 <div className="md:ml-[100px] mt-[100px] ">
//                     <div className="ml-12 text-black">
//                         <div className="flex items-center gap-3 mt-5 mb-4">
//                             <div className="flex items-center gap-2">
//                                 <p className="text-lg font-medium text-gray-700">Hello,</p>
//                                 <div className="bg-gradient-to-r from-[#016E5B] to-[#01997A] text-white px-4 py-2 rounded-full shadow-lg">
//                                     <span className="text-lg font-bold capitalize">
//                                         {user.role?.replace('_', ' ')}
//                                     </span>
//                                 </div>
//                             </div>
//                         </div>
//                         <p className="text-sm md:text-lg">Your dashboard is ready, Let’s create a productive learning environment!</p>
//                     </div>
//                     {loading && (
//                         <div className="flex mb-[70px] gap-3 lg:gap-10 mx-10 lg:mx-15 md:flex-wrap flex-wrap sm:w-full md:gap-9  md:mx-10 md:justify-start mt-10 font-semibold">
//                             <HomeSkeleton />
//                             <HomeSkeleton />
//                             <HomeSkeleton />
//                             <HomeSkeleton />
//                             <HomeSkeleton />
//                         </div>
//                     )}
//                     {!loading && (
//                         <div className="">
//                             {Object.keys(data).length === 0 && (
//                                 <div className="text-center py-8 mb-4">
//                                     <div className="text-red-600 text-lg font-semibold mb-2">
//                                         ⚠️ Dashboard Data Unavailable
//                                     </div>
//                                     <p className="text-gray-600">
//                                         Unable to load dashboard data. Please check your connection and try refreshing the page.
//                                     </p>
//                                     <button 
//                                         onClick={() => window.location.reload()} 
//                                         className="mt-4 px-4 py-2 bg-[#016E5B] text-white rounded-lg hover:bg-[#014f42]"
//                                     >
//                                         Refresh Dashboard
//                                     </button>
//                                 </div>
//                             )}
//                             <div className="flex mb-[70px] gap-3 lg:gap-6 mx-10 lg:mx-15 md:flex-wrap flex-wrap sm:w-full md:gap-9  md:mx-10 md:justify-start mt-10 font-semibold">
//                                 <Link to={'/employee'}>
//                                     <div className="lg:w-56 w-48 md:w-52 h-28 relative border-gray-300 border rounded-xl shadow-lg text-black flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
//                                         <div className="flex gap-3">
//                                             <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
//                                                 <RiIdCardLine />
//                                             </div>
//                                             <div className="flex flex-col absolute top-5 left-2 w-10">
//                                                 <p className="text-sm">Total employee</p>
//                                                 <h2 className="md:text-2xl sm:text-lg font-bold text-[#016E5B]">
//                                                     {employeeCount || data?.userCount || 0}
//                                                 </h2>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </Link>
//                                 <Link to={'/training'}>
//                                     <div className="lg:w-56 w-48 md:w-52 h-28 relative border-gray-300 border rounded-xl shadow-lg text-black flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
//                                         <div className="flex gap-3">
//                                             <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
//                                                 <GiProgression />
//                                             </div>
//                                             <div className="flex flex-col absolute top-5 left-2 w-10">
//                                                 <p className="text-sm">Training progress</p>
//                                                 <h2 className="md:text-2xl sm:text-lg font-bold text-[#016E5B]">
//                                                     {Math.round(data?.averageProgress)}%
//                                                 </h2>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </Link>
//                                 <Link to={'/branch'}>
//                                     <div className="lg:w-56 w-48 md:w-52 h-28 relative border-gray-300 border rounded-xl shadow-lg text-black flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
//                                         <div className="flex gap-3">
//                                             <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
//                                                 <HiOutlineBuildingOffice2 />
//                                             </div>
//                                             <div className="flex flex-col absolute top-5 left-2 w-10">
//                                                 <p className="text-sm">Total
//                                                     Branches</p>
//                                                 <h2 className="md:text-2xl sm:text-lg font-bold text-[#016E5B]">
//                                                     {data?.branchCount}
//                                                 </h2>

//                                             </div>
//                                         </div>
//                                     </div>
//                                 </Link>
//                                 <Link to={'/admin/overdue/assessment'}>
//                                     <div className="lg:w-56 w-48  text-red-600 md:w-52 h-28 relative border-red-600 border-2 rounded-xl shadow-lg flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
//                                         <div className="flex gap-3">
//                                             <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
//                                                 <MdOutlinePendingActions />
//                                             </div>
//                                             <div className="flex flex-col absolute top-5 left-2 w-10">
//                                                 <p className="text-sm text-black">Overdue Assessment </p>
//                                                 <h2 className="md:text-2xl sm:text-lg font-bold ">
//                                                     {data?.assessmentProgress}
//                                                 </h2>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </Link>
//                                 <Link to={'/admin/overdue/training'}>
//                                     <div className="lg:w-56 w-48  text-red-600 md:w-52 h-28 relative border-red-600 border-2 rounded-xl shadow-lg flex flex-col justify-center items-center gap-3 cursor-pointer sm:mr-4">
//                                         <div className="flex gap-3">
//                                             <div className="text-xl absolute top-2 right-2 bg-slate-200 h-10 w-10 rounded-full flex items-center justify-center">
//                                                 <MdOutlinePendingActions />
//                                             </div>
//                                             <div className="flex flex-col absolute top-5 left-2 w-10">
//                                                 <p className="text-sm text-black">Overdue Training</p>
//                                                 <h2 className="md:text-2xl sm:text-lg font-bold ">
//                                                     {data?.trainingPending}
//                                                 </h2>

//                                             </div>
//                                         </div>
//                                     </div>
//                                 </Link>
//                                 {/* LMS Website Login Statistics Box */}
//                                 <LMSWebsiteLoginStats />
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             </div>
//             <div className="flex gap-20">
//                 <div>
//                     <HomeBar />
//                 </div>
//                 <div className="h-[360px] w-[600px]  rounded-xl" >
//                     <TopEmployeeAndBranch />


//                 </div>
//             </div>
//             <div className="flex ml-[200px] gap-52">
//                 <div>
//                     <Quick />
//                 </div>
//                 <div>
//                     <Notification />
//                 </div>
//             </div>


//         </div >
//     );
// };

// export default HomeData;


import Header from "../../components/Header/Header";
// import { MdGroups2 } from "react-icons/md";
import { GiProgression } from "react-icons/gi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { MdOutlinePendingActions } from "react-icons/md";
import { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import HomeSkeleton from "../../components/Skeleton/HomeSkeleton";
import SideNav from "../../components/SideNav/SideNav";
import { Link } from "react-router-dom";
import HomeBar from "../../components/HomeBar/HomeBar";
import TopEmployeeAndBranch from "../../components/TopEmployeeAndBranch/TopEmployeeAndBranch";
import Notification from "../../components/Notification/Notification";
import Quick from "../../components/Quick/Quick";
import { RiIdCardLine } from "react-icons/ri";
import LMSWebsiteLoginStats from "../../components/LMSWebsiteLoginStats/LMSWebsiteLoginStats";


const HomeData = ({ user }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state
    const [employeeCount, setEmployeeCount] = useState(0);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                console.error('No token found, cannot fetch data');
                setLoading(false);
                return;
            }

            try {
                console.log('Fetching dashboard data from:', baseUrl.baseUrl + 'api/get/progress');
                console.log('Using token:', token ? 'Token exists' : 'No token');
                
                const response = await fetch(baseUrl.baseUrl + 'api/get/progress', {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        'Authorization': `Bearer ${token}`,
                    },
                    credentials: "include",
                });
                
                console.log('Progress API response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Progress API error:', response.status, errorText);
                    
                    if (response.status === 401) {
                        console.error('Authentication failed, redirecting to login');
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                        return;
                    }
                    
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const result = await response.json();
                console.log('Progress API response:', result);
                
                if (result.success && result.data) {
                    setData(result.data);
                    console.log('Dashboard data set successfully:', result.data);
                } else {
                    console.error('Unexpected API response structure:', result);
                    setData({
                        assessmentCount: 0,
                        branchCount: 0,
                        userCount: 0,
                        averageProgress: 0,
                        assessmentProgress: 0,
                        trainingPending: 0,
                        uniqueLoginUserCount: 0,
                        loginPercentage: 0
                    });
                }
                
                setLoading(false);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setLoading(false);
                setData({
                    assessmentCount: 0,
                    branchCount: 0,
                    userCount: 0,
                    averageProgress: 0,
                    assessmentProgress: 0,
                    trainingPending: 0,
                    uniqueLoginUserCount: 0,
                    loginPercentage: 0
                });
            }
        };

        const fetchEmployeeCount = async () => {
            try {
                console.log('Fetching employee count from:', baseUrl.baseUrl + 'api/employee_range');
                
                const response = await fetch(baseUrl.baseUrl + 'api/employee_range', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({ startEmpId: "EMP1", endEmpId: "EMP9999" }),
                });
                
                console.log('Employee count response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Employee count response not ok:', response.status, errorText);
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const json = await response.json();
                console.log('Employee count response:', json);
                
                if (json?.data && Array.isArray(json.data)) {
                    setEmployeeCount(json.data.length);
                    console.log('Employee count fetched successfully:', json.data.length);
                } else {
                    console.error('Employee count response structure unexpected:', json);
                    setEmployeeCount(0);
                }
            } catch (error) {
                console.error('Failed to fetch employee count:', error.message);
                // Fallback to data from progress API
                setEmployeeCount(data?.userCount || 0);
            }
        };

        if (token) {
            fetchData();
            fetchEmployeeCount();
        } else {
            console.error('No token found, cannot fetch data');
            setLoading(false);
        }
    }, [token]);



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
                                        {user.role?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm md:text-lg">Your dashboard is ready, Let’s create a productive learning environment!</p>
                    </div>
                    {loading && (
                        <div className="flex mb-[70px] gap-3 lg:gap-10 mx-10 lg:mx-15 md:flex-wrap flex-wrap sm:w-full md:gap-9  md:mx-10 md:justify-start mt-10 font-semibold">
                            <HomeSkeleton />
                            <HomeSkeleton />
                            <HomeSkeleton />
                            <HomeSkeleton />
                            <HomeSkeleton />
                        </div>
                    )}
                    {!loading && (
                        <div className="">
                            {Object.keys(data).length === 0 && (
                                <div className="text-center py-8 mb-4">
                                    <div className="text-red-600 text-lg font-semibold mb-2">
                                        ⚠️ Dashboard Data Unavailable
                                    </div>
                                    <p className="text-gray-600">
                                        Unable to load dashboard data. Please check your connection and try refreshing the page.
                                    </p>
                                    <button 
                                        onClick={() => window.location.reload()} 
                                        className="mt-4 px-4 py-2 bg-[#016E5B] text-white rounded-lg hover:bg-[#014f42]"
                                    >
                                        Refresh Dashboard
                                    </button>
                                </div>
                            )}
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
                                {/* LMS Website Login Statistics Box */}
                                <LMSWebsiteLoginStats />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex gap-20">
                <div>
                    <HomeBar />
                </div>
                <div className="h-[360px] w-[600px]  rounded-xl" >
                    <TopEmployeeAndBranch />


                </div>
            </div>
            <div className="flex ml-[200px] gap-52">
                <div>
                    <Quick />
                </div>
                <div>
                    <Notification />
                </div>
            </div>


        </div >
    );
};

export default HomeData;