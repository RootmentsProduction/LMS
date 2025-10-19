
import { useParams } from "react-router-dom";
import Header from "../../../components/Header/Header"
import baseUrl from "../../../api/api";
import SideNav from "../../../components/SideNav/SideNav";
import { useEffect, useState } from "react";
const UserTrainingProgressData = () => {
    const { id } = useParams();
    const [Data, setData] = useState([]); // State to store fetched data

    useEffect(() => {
        const fetchModules = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/user/get/Training/details/${id}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (!response.ok) { // Check for HTTP errors
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                setData(data); // Update state with fetched data
                console.log("Training Details API Response:", data);
                
                console.log("Training loaded successfully");
                

            } catch (error) {
                console.error("Failed to fetch modules:", error.message);
            }
        };

        fetchModules(); // Invoke the function

    }, [id]);


    return (
        <div className="w-full mb-[70px] h-full bg-white">
            <div><Header name='Training Details' /></div>

            <SideNav />
            <div className="md:ml-[100px] mt-[150px]">

                <div className="px-4 md:px-10 mt-10 text-2xl text-black">
                    <div className="text-2xl text-black flex gap-2 flex-col">
                        <h3>Training Details</h3>
                        <hr className="border-b-0 border-black" />
                    </div>

                    <div className="flex flex-col md:flex-row md:mx-20 text-xl text-black justify-between gap-6 md:gap-8">
                        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
                            <div className="flex flex-col gap-6">
                                <h4>{Data?.training?.Trainingtype} : {Data?.training?.trainingName}</h4>
                                <h4>Assigned : {new Date(Data?.training?.createdDate).toLocaleString()}</h4>
                                <h4>Due Date : {new Date(
                                    new Date(Data?.training?.createdDate).getTime() +
                                    Data?.training?.deadline * 24 * 60 * 60 * 1000
                                ).toLocaleString()}</h4>
                            </div>
                            <div className="flex flex-col gap-6">
                                <h4></h4>
                                <h4>

                                </h4>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 md:gap-8">
                            <div className="flex flex-col gap-6">
                                <h1 className="font-bold">Assigned for</h1>
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-4">
                                        <h4>No. of employees:</h4>
                                        <h4>{Data?.progressDetails?.length}</h4>
                                    </div>
                                    <div className="flex gap-4">
                                        <h4>Branch:</h4>
                                        <h4>
                                            {Data?.uniqueBranches?.map((item) => (
                                                <span key={item}>{item}, </span>
                                            ))}
                                        </h4>
                                    </div>
                                    <div className="flex gap-4">
                                        <h4>Role:</h4>
                                        <h4>
                                            {Data?.uniquedesignation?.map((item) => (
                                                <span key={item}>{item}, </span>
                                            ))}
                                        </h4>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                <h1 className="font-bold">Assigned By</h1>
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-4">
                                        <h4>Name</h4>
                                        <h4>Branch</h4>
                                    </div>
                                    <div className="flex gap-4">
                                        <h4>Branch:</h4>
                                        <h4>Kottayam</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-10">
                    <div className="overflow-x-auto mx-4 mt-5 text-black">
                        <table className="min-w-full border-2 border-gray-300">
                            <thead>
                                <tr className="bg-[#016E5B] text-white">
                                    <th className="px-3 py-2 border-2 border-gray-300 text-left">Emp Id</th>
                                    <th className="px-3 py-2 border-2 border-gray-300 text-left">Name</th>
                                    <th className="px-3 py-2 border-2 border-gray-300 text-left">Role</th>
                                    <th className="px-3 py-2 border-2 border-gray-300 text-left">Branch</th>
                                    <th className="px-3 py-2 border-2 border-gray-300 text-left">Days Left</th>
                                    <th className="px-3 py-2 border-2 border-gray-300 text-left">Assessment</th>
                                    <th className="px-3 py-2 border-2 border-gray-300 text-left">Training Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Data?.progressDetails?.length > 0 ? (
                                    Data.progressDetails.map((employee, index) => {
                                        const training = employee.user?.training?.[0];
                                        const assessment = employee.user?.assignedAssessments?.[0];
                                        
                                        // Calculate days left with proper validation
                                        let daysLeft = 'N/A';
                                        if (training?.deadline) {
                                            const deadline = new Date(training.deadline);
                                            const today = new Date();
                                            
                                            
                                            // Check if deadline is a valid date
                                            if (!isNaN(deadline.getTime())) {
                                                const timeDiff = deadline - today;
                                                const calculatedDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                                                daysLeft = calculatedDays;
                                            }
                                        }

                                        // Get assessment status - should be independent of training status
                                        const assessmentStatus = assessment?.status || 'Pending';

                                        return (
                                            <tr key={index} className="border-b hover:bg-gray-100">
                                                <td className="px-3 py-2 border-2 border-gray-300">{employee.user.empID}</td>
                                                <td className="px-3 py-2 border-2 border-gray-300">{employee.user.username}</td>
                                                <td className="px-3 py-2 border-2 border-gray-300">{employee.user.designation?.toUpperCase()}</td>
                                                <td className="px-3 py-2 border-2 border-gray-300">{employee.user.workingBranch}</td>
                                                <td className={`px-3 py-2 border-2 border-gray-300 ${
                                                    employee.progress === 'Completed' || employee.progress === 100 ? 'bg-green-100 text-green-800' :
                                                    typeof daysLeft === 'number' && daysLeft < 0 ? 'bg-red-100 text-red-800' : 
                                                    typeof daysLeft === 'number' && daysLeft <= 3 ? 'bg-yellow-100 text-yellow-800' : ''
                                                }`}>
                                                    {employee.progress === 'Completed' || employee.progress === 100 ? 'Completed' : 
                                                     typeof daysLeft === 'number' && daysLeft < 0 ? `Overdue (${Math.abs(daysLeft)} days)` : 
                                                     typeof daysLeft === 'number' && daysLeft <= 3 ? `${daysLeft} days (Due Soon)` :
                                                     daysLeft}
                                                </td>
                                                <td className="px-3 py-2 border-2 border-gray-300">{assessmentStatus}</td>
                                                <td className="px-3 py-2 border-2 border-gray-300">{employee.progress || 0}%</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-3">No data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div >
    )
}

export default UserTrainingProgressData