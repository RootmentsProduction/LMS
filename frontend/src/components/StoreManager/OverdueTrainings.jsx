import { useEffect, useState } from "react";
import baseUrl from "../../api/api";

const OverdueTrainings = () => {
    const token = localStorage.getItem("token");
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                console.error('No token found for OverdueTrainings');
                return;
            }

            try {
                console.log('Fetching overdue training data from:', `${baseUrl.baseUrl}api/admin/get/storemanagerduedata`);
                console.log('Using token:', token ? 'Token exists' : 'No token');
                
                const response = await fetch(
                    `${baseUrl.baseUrl}api/admin/get/storemanagerduedata`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        credentials: "include",
                    }
                );

                console.log('Overdue training data response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Overdue training data error:', response.status, errorText);
                    
                    if (response.status === 401) {
                        console.error('Authentication failed for overdue training data');
                        return;
                    }
                    
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                console.log('Overdue training data response:', result);
                setData(result.topOverdueUsers || []);
            } catch (error) {
                console.error("Error fetching overdue training data:", error);
                setData([]); // Set empty array on error
            }
        };

        fetchData();
    }, [token]);

    return (
        <div className="w-[600px] border bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Overdue Trainings
            </h3>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-gray-600 text-sm border-b">
                        <th className="py-2">Employee Name</th>
                        <th className="py-2">Trainings</th>
                        <th className="py-2">Assessments</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((user, index) => (
                        <tr key={index} className="text-sm text-gray-800 border-b">
                            <td className="py-2">{user.name}</td>
                            <td className="py-2 text-red-500 font-semibold">
                                {String(user.overdueTrainings.length).padStart(2, "0")}
                            </td>
                            <td className="py-2 text-red-500 font-semibold">
                                {String(user.overdueAssessments.length).padStart(2, "0")}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OverdueTrainings;
