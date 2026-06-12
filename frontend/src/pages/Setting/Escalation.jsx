import { useEffect, useState } from "react";
import baseUrl from "../../api/api";

const Escalation = () => {
    // Initial table data state
    const [tableData, setTableData] = useState([
    ]);

    // Track the editable row ID
    const [editRowId, setEditRowId] = useState(null);

    // Track the updated value for `numberOfDays`
    const [updatedValue, setUpdatedValue] = useState("");

    // Start editing a specific row
    const handleEdit = (id, currentValue) => {
        setEditRowId(id);
        setUpdatedValue(currentValue);
    };

    // Save the updated value for a specific row
    const handleSave = (id) => {
        const updatedData = tableData.map((row) => {
            if (row.id === id) {
                return { ...row, numberOfDays: updatedValue };
            }
            return row;
        });
        setTableData(updatedData);
        setEditRowId(null);
        setUpdatedValue("");
    };

    // Save button at the bottom to log the table data
    const handleFormSave = async () => {
        try {
            const response = await fetch(`${baseUrl.baseUrl}api/admin/escalation/level`, {
                method: 'POST', // Set the method to POST
                headers: {
                    'Content-Type': 'application/json', // Set the content type to JSON
                },
                body: JSON.stringify({ tableData }), // Convert table data to a JSON string
            });

            // Handle the response
            if (!response.ok) {
                const error = await response.json();
                alert(`Failed to save data: ${error.message}`);
                return;
            }

            const data = await response.json();
            alert("Data successfully saved!");
        } catch (error) {
            // Catch network errors or other exceptions
            alert("An error occurred while saving data.");
        }
    };
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/admin/escalation/level/get`);
                if (!response.ok) {
                    throw new Error("Failed to fetch escalation levels");
                }
                const data = await response.json();
                const sortedData = data.data.sort((a, b) => a.id - b.id);

                setTableData(sortedData)
                    ; // Update the state with fetched data
            } catch (error) {
                alert("Failed to load data. Please try again.");
            }
        };

        fetchData();
    }, []);

    // Rows that should not be editable
    const nonEditableRows = ["On-the-day deadline alert", "Recurring escalation every two days after the 5-day mark"];

    return (
        <div className="min-h-[calc(100vh-160px)] flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-4xl bg-white shadow-md rounded-lg p-6">
                <h1 className="text-xl font-extrabold text-gray-800 mb-4">Escalation Levels</h1>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 border-b border-gray-200 text-left text-sm font-medium text-gray-600">
                                    Level
                                </th>
                                <th className="px-4 py-2 border-b border-gray-200 text-left text-sm font-medium text-gray-600">
                                    Context
                                </th>
                                <th className="px-4 py-2 border-b border-gray-200 text-left text-sm font-medium text-gray-600">
                                    Number of Days
                                </th>
                                <th className="px-4 py-2 border-b border-gray-200 text-left text-sm font-medium text-gray-600">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row) => (
                                <tr key={row.id} className={row.id % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                    <td className="px-4 py-2 border-b border-gray-200 text-sm text-gray-800">{row.level}</td>
                                    <td className="px-4 py-2 border-b border-gray-200 text-sm text-gray-800">{row.context}</td>
                                    <td className="px-4 py-2 border-b border-gray-200 text-sm text-gray-800 relative">
                                        {editRowId === row.id ? (
                                            <input
                                                type="text"
                                                value={updatedValue}
                                                onChange={(e) => setUpdatedValue(e.target.value)}
                                                className="px-2 py-1 border rounded bg-white w-[100px]"
                                            />
                                        ) : (
                                            row.numberOfDays
                                        )}
                                    </td>
                                    <td className="px-4 py-2 border-b border-gray-200 text-sm text-gray-800">
                                        {!nonEditableRows.includes(row.context) ? (
                                            editRowId === row.id ? (
                                                <button
                                                    className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                                    onClick={() => handleSave(row.id)}
                                                >
                                                    Done
                                                </button>
                                            ) : (
                                                <button
                                                    className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                    onClick={() => handleEdit(row.id, row.numberOfDays)}
                                                >
                                                    Edit
                                                </button>
                                            )
                                        ) : (
                                            <span className="text-gray-400 italic">Not Editable</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    onClick={handleFormSave}
                >
                    Save Form
                </button>
            </div>
        </div>
    );
};

export default Escalation;
