
import { useParams } from "react-router-dom";
import Header from "../../../components/Header/Header"
import baseUrl from "../../../api/api";
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
                console.log(Data);

            } catch (error) {
                console.error("Failed to fetch modules:", error.message);
            }
        };

        fetchModules(); // Invoke the function

    }, [id]);


    return (
        <div className="w-full h-full bg-white">
            <div><Header name='Training Details' /></div>
            <div>
                <div className="mx-10  mt-10 text-2xl text-black  flex gap-2 flex-col">
                    <h3>Training Details</h3>
                    <hr className="border-b-0 border-black" />
                </div>
                <div className="flex text-black mx-20 text-lg justify-between">


                    <div className=" flex gap-8 ">
                        <div className=" flex  flex-col gap-6">
                            <h4>{Data?.training?.Trainingtype} Training :</h4>
                            <h4>Date Assigned :</h4>
                            <h4>Due Date :</h4>
                        </div>
                        <div className="flex  flex-col gap-6">
                            <h4>{Data?.training?.trainingName}</h4>
                            <h4>{new Date(Data?.training?.createdDate).toLocaleString()}</h4>
                            <h4>
                                {new Date(
                                    new Date(Data?.training?.createdDate).getTime() +
                                    Data?.training?.deadline * 24 * 60 * 60 * 1000
                                ).toLocaleString()}
                            </h4>


                        </div>

                    </div>



                    <div className="flex flex-col gap-4">

                        <div className="flex flex-col gap-8 ">
                            <h1 className=" font-bold">Assigned for</h1>
                            <div className="flex flex-col gap-4">
                                <div className="flex   gap-6">
                                    <h4>No. of employees : </h4>
                                    <h4>{Data?.progressDetails?.length}</h4>
                                </div>
                                <div className="flex  gap-6">
                                    <h4>Branch :</h4>
                                    <h4>{Data?.uniqueBranches?.map((item) => {
                                        return <span key={item}>{item} , </span>
                                    })}</h4>


                                </div>
                                <div className="flex  gap-6">
                                    <h4>Role  :</h4>
                                    <h4>{Data?.uniquedesignation?.map((item) => {
                                        return <span key={item}>{item} , </span>
                                    })}</h4>


                                </div>
                            </div>

                        </div>
                        <div className="flex flex-col gap-8 ">
                            <h1 className=" font-bold">Assigned By</h1>
                            <div className="flex flex-col gap-4">
                                <div className="flex   gap-6">
                                    <h4>Name </h4>
                                    <h4>Branch</h4>
                                </div>
                                <div className="flex  gap-6">
                                    <h4>Branch :</h4>
                                    <h4>Kottayam</h4>


                                </div>

                            </div>

                        </div>
                    </div>


                </div>

            </div>
            <div className="mb-10">
                <div className="overflow-x-auto mx-10 mt-5 flex justify-center text-black">
                    <table className="min-w-full border-2 border-gray-300">
                        <thead>
                            <tr className="bg-[#016E5B] text-white">
                                <th className="px-3 py-1 border-2 border-gray-300">Emp Id</th>
                                <th className="px-3 py-1 border-2 border-gray-300">Name</th>
                                <th className="px-3 py-1 border-2 border-gray-300">Role</th>
                                <th className="px-3 py-1 border-2 border-gray-300">Branch</th>
                                <th className="px-3 py-1 border-2 border-gray-300">Days Left</th>
                                <th className="px-3 py-1 border-2 border-gray-300">Assessment</th>
                                <th className="px-3 py-1 border-2 border-gray-300"> Training Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Data?.progressDetails?.length > 0 ? (
                                Data.progressDetails.map((employee, index) => {
                                    const training = employee.user?.training?.[0]; // Access training safely
                                    const deadline = new Date(training?.deadline);
                                    const today = new Date();
                                    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)); // Calculate days left

                                    return (
                                        <tr key={index} className="border-b hover:bg-gray-100">
                                            <td className="px-3 py-1 border-2 border-gray-300">{employee.user.empID}</td>
                                            <td className="px-3 py-1 border-2 border-gray-300">{employee.user.username}</td>
                                            <td className="px-3 py-1 border-2 border-gray-300">{employee.user.designation}</td>
                                            <td className="px-3 py-1 border-2 border-gray-300">{employee.user.workingBranch}</td>
                                            <td className="px-3 py-1 border-2 border-gray-300">{daysLeft}</td>
                                            <td className="px-3 py-1 border-2 border-gray-300">{training?.status || 'N/A'}</td>
                                            <td className="px-3 py-1 border-2 border-gray-300">
                                                {employee.progress || 0}%
                                            </td>
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
        </div >
    )
}

export default UserTrainingProgressData