import { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import { toast } from "react-toastify";

const Visibility = () => {
    const [visibilityData, setVisibilityData] = useState({

    });

    const [expanded, setExpanded] = useState({
        Assessment: false,
        training: false,
    });

    const toggleSection = (section) => {
        setExpanded((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const toggleVisibility = (section, role) => {
        setVisibilityData((prev) => ({
            ...prev,
            [section]: prev[section].map((item) =>
                item.role === role
                    ? { ...item, visibility: !item.visibility, }
                    : item
            ),
        }));
    };

    const handleSaveChanges = async () => {
        try {
            // Transform visibilityData into the required format
            const training = Object.entries(visibilityData).map(([section, roles]) => ({
                section,
                role: Array.isArray(roles) // Ensure roles is an array before mapping
                    ? roles.map((item) => ({
                        role: item.role.toLowerCase().replace(/\s+/g, "_"),
                        visibility: item.visibility,
                    }))
                    : [],
            }));
            // Send data to the backend
            const response = await fetch(baseUrl.baseUrl + 'api/admin/setting/visibility', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(training),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save changes");
            }

            const result = await response.json();
            console.log("Response from backend:", result); // Debugging log
            toast.success("Visibility settings updated successfully!");
        } catch (error) {
            alert("An error occurred while saving changes. Please try again.");
        }
    };


    useEffect(() => {
        const FetchData = async () => {
            try {
                const request = await fetch(baseUrl.baseUrl + 'api/admin/get/setting/visibility')
                const response = await request.json()
                setVisibilityData(response.Data[0])
            } catch (error) {
                throw new Error(error)
            }
        }
        FetchData()
    }, [])



    return (
        <div className="p-6 min-h-screen text-black">
            <h1 className="text-2xl font-extrabold mb-6">Visibility Settings</h1>
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-4">Content Access</h2>
                <div className="space-y-6">
                    {/* Training Module Section */}
                    <div>
                        <h3
                            className="text-md font-semibold mb-2 cursor-pointer flex justify-between items-center"
                            onClick={() => toggleSection("Assessment")}
                        >
                            Assessment Module Visibility
                            <span>{expanded.Assessment ? "▲" : "▼"}</span>
                        </h3>
                        {expanded.Assessment && (
                            <table className="w-full border-collapse border border-gray-300 text-left">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-300 p-2">Role</th>
                                        <th className="border border-gray-300 p-2">Visibility</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibilityData.Assessment?.map((item) => (
                                        <tr key={item.role}>
                                            <td className="border border-gray-300 p-2">{item.role}</td>
                                            <td className="border border-gray-300 p-2 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span>{item.visibility ? "Visible" : <del>Visible</del>}</span>
                                                    <input
                                                        type="checkbox"
                                                        className="toggle toggle-success"
                                                        checked={item.visibility}
                                                        onChange={() =>
                                                            toggleVisibility("Assessment", item.role)
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Training Progress Section */}
                    <div>
                        <h3
                            className="text-md font-semibold mb-2 cursor-pointer flex justify-between items-center"
                            onClick={() => toggleSection("training")}
                        >
                            Training Progress Visibility
                            <span>{expanded.training ? "▲" : "▼"}</span>
                        </h3>
                        {expanded.training && (
                            <table className="w-full border-collapse border border-gray-300 text-left">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-300 p-2">Role</th>
                                        <th className="border border-gray-300 p-2">Visibility</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibilityData.training?.map((item) => (
                                        <tr key={item.role}>
                                            <td className="border border-gray-300 p-2">{item.role}</td>
                                            <td className="border border-gray-300 p-2 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span>{item.visibility ? "Visible" : <del>Visible</del>}</span>
                                                    <input
                                                        type="checkbox"
                                                        className="toggle toggle-success"
                                                        checked={item.visibility}
                                                        onChange={() =>
                                                            toggleVisibility("training", item.role)
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <button
                        className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        onClick={handleSaveChanges}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Visibility;
