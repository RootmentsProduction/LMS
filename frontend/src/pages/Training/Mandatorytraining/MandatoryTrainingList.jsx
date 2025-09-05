
import { useEffect, useState } from "react";
import { FaTrashAlt, FaPlus } from "react-icons/fa";
import { CiFilter } from "react-icons/ci";
import baseUrl from "../../../api/api";
import Header from "../../../components/Header/Header";
import SideNav from "../../../components/SideNav/SideNav";
import RoundProgressBar from "../../../components/RoundBar/RoundBar";
import Card from "../../../components/Skeleton/Card";
import { Link } from "react-router-dom";

const MandatoryTrainingList = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [filterRange, setFilterRange] = useState("");
    const [uniqueBranches, setUniqueBranches] = useState([]);
    const [uniqueItems, setUniqueItems] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [selectedItem, setSelectedItem] = useState("");
    const [isOpen, setIsOpen] = useState({ range: false, branch: false, role: false });
    
    // State for multiple selection and bulk delete
    const [selectedTrainings, setSelectedTrainings] = useState(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const toggleDropdown = (type) => {
        setIsOpen((prev) => ({ ...prev, [type]: !prev[type] }));
    };

    // Handle training selection
    const handleTrainingSelection = (trainingId) => {
        setSelectedTrainings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(trainingId)) {
                newSet.delete(trainingId);
            } else {
                newSet.add(trainingId);
            }
            return newSet;
        });
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectedTrainings.size === filteredData.length) {
            setSelectedTrainings(new Set());
        } else {
            setSelectedTrainings(new Set(filteredData.map(item => item._id)));
        }
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedTrainings.size === 0) return;
        
        setIsDeleting(true);
        try {
            const deletePromises = Array.from(selectedTrainings).map(trainingId =>
                fetch(`${baseUrl.baseUrl}api/user/delete/training/${trainingId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
            );

            const results = await Promise.all(deletePromises);
            const failedDeletes = results.filter(result => !result.ok);

            if (failedDeletes.length > 0) {
                alert(`Failed to delete ${failedDeletes.length} training(s). Please try again.`);
            } else {
                // Remove deleted trainings from data
                setData(prev => prev.filter(item => !selectedTrainings.has(item._id)));
                setFilteredData(prev => prev.filter(item => !selectedTrainings.has(item._id)));
                setSelectedTrainings(new Set());
                setShowDeleteConfirm(false);
                alert(`Successfully deleted ${selectedTrainings.size} training(s)`);
            }
        } catch (error) {
            console.error('Error deleting trainings:', error);
            alert('An error occurred while deleting trainings. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch mandatory trainings using the dedicated API
                const response = await fetch(`${baseUrl.baseUrl}api/get/mandatory/allusertraining`);
                if (!response.ok) {
                    throw new Error("Failed to fetch data");
                }
                const result = await response.json();

                // All trainings from this API are mandatory trainings
                const mandatoryTrainings = result.data;

                // Extract uniqueBranches and uniqueItems
                const branches = new Set();
                const items = new Set();
                mandatoryTrainings.forEach((training) => {
                    if (training.uniqueBranches) {
                        training.uniqueBranches.forEach((branch) => branches.add(branch));
                    }
                    if (training.uniqueItems) {
                        training.uniqueItems.forEach((item) => items.add(item));
                    }
                });

                setUniqueBranches([...branches]);
                setUniqueItems([...items]);
                setData(mandatoryTrainings);
                setFilteredData(mandatoryTrainings);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+A for select all
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                handleSelectAll();
            }
            // Escape to close delete confirmation
            if (e.key === 'Escape' && showDeleteConfirm) {
                setShowDeleteConfirm(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showDeleteConfirm, filteredData.length]);

    // Filter data based on completion range, branch, and item
    const applyFilters = () => {
        let filtered = [...data];

        if (filterRange) {
            switch (filterRange) {
                case "0-25":
                    filtered = filtered.filter(
                        (item) =>
                            item.averageCompletionPercentage >= 0 &&
                            item.averageCompletionPercentage <= 25
                    );
                    break;
                case "26-51":
                    filtered = filtered.filter(
                        (item) =>
                            item.averageCompletionPercentage >= 26 &&
                            item.averageCompletionPercentage <= 51
                    );
                    break;
                case "52-77":
                    filtered = filtered.filter(
                        (item) =>
                            item.averageCompletionPercentage >= 52 &&
                            item.averageCompletionPercentage <= 77
                    );
                    break;
                case "78-100":
                    filtered = filtered.filter(
                        (item) =>
                            item.averageCompletionPercentage >= 78 &&
                            item.averageCompletionPercentage <= 100
                    );
                    break;
                default:
                    break;
            }
        }

        if (selectedBranch) {
            filtered = filtered.filter((item) =>
                item.uniqueBranches && item.uniqueBranches.includes(selectedBranch)
            );
        }

        if (selectedItem) {
            filtered = filtered.filter((item) =>
                item.uniqueItems && item.uniqueItems.includes(selectedItem)
            );
        }

        setFilteredData(filtered);
    };

    useEffect(() => {
        applyFilters();
    }, [filterRange, selectedBranch, selectedItem]);

    return (
        <>
            <div className="mb-[70px] w-full h-full bg-white">
                <div>
                    <Header name="Mandatory Training List" />
                </div>
                <SideNav />
                <div className="md:ml-[100px] mt-[100px]">
                    <div>
                        <div className="flex justify-end mr-20">
                            <Link to={"/training"}>
                                <div className="flex w-56 mt-5 border-2 justify-center items-center py-2 ml-10 cursor-pointer">
                                    <h4 className="text-black">Create New Training</h4>
                                </div>
                            </Link>
                        </div>
                        <div className="flex text-black ml-10 gap-5 text-xl w-auto">
                            <h4 className="border-b-[3px] border-[#016E5B] text-[#016E5B] ">
                                Mandatory Trainings
                            </h4>
                            <Link to="/assignedtrainings">
                                <h4 className="cursor-pointer">Assigned Trainings</h4>
                            </Link>
                        </div>
                        <hr className="mx-10 mt-[-1px] border-[#016E5B]" />

                        {/* Filter Section */}
                        <div className="flex mx-10 justify-end mt-10 gap-5">
                            {/* Filter by Range */}
                            <div className="flex gap-2">
                                <div className="relative text-left w-36">
                                    <button
                                        type="button"
                                        className="flex justify-between items-center w-full border-2 py-2 px-4 bg-white text-black rounded-md hover:bg-gray-200"
                                        onClick={() => toggleDropdown("range")}
                                    >
                                        <h4>{filterRange ? `${filterRange}%` : "Range"}</h4>
                                        <CiFilter className="text-[#016E5B]" />
                                    </button>
                                    {isOpen.range && (
                                        <div className="absolute mt-2 w-full rounded-md shadow-lg bg-white z-10">
                                            <div className="py-1">
                                                {["", "0-25", "26-51", "52-77", "78-100"].map((range) => (
                                                    <a
                                                        key={range}
                                                        href="#"
                                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setFilterRange(range);
                                                            toggleDropdown("range");
                                                        }}
                                                    >
                                                        {range ? `${range}%` : "All"}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Filter by Branch */}
                                <div className="relative text-left w-36">
                                    <button
                                        type="button"
                                        className="flex justify-between items-center w-full border-2 py-2 px-4 bg-white text-black rounded-md hover:bg-gray-200"
                                        onClick={() => toggleDropdown("branch")}
                                    >
                                        <h4>{selectedBranch || "Branch"}</h4>
                                        <CiFilter className="text-[#016E5B]" />
                                    </button>
                                    {isOpen.branch && (
                                        <div className="absolute mt-2 w-full rounded-md shadow-lg bg-white z-10">
                                            <div className="py-1">
                                                {["", ...uniqueBranches].map((branch) => (
                                                    <a
                                                        key={branch}
                                                        href="#"
                                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setSelectedBranch(branch);
                                                            toggleDropdown("branch");
                                                        }}
                                                    >
                                                        {branch || "All"}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Filter by Role */}
                                <div className="relative text-left w-36">
                                    <button
                                        type="button"
                                        className="flex justify-between items-center w-full border-2 py-2 px-4 bg-white text-black rounded-md hover:bg-gray-200"
                                        onClick={() => toggleDropdown("role")}
                                    >
                                        <h4>{selectedItem || "Role"}</h4>
                                        <CiFilter className="text-[#016E5B]" />
                                    </button>
                                    {isOpen.role && (
                                        <div className="absolute mt-2 w-full rounded-md shadow-lg bg-white z-10">
                                            <div className="py-1">
                                                {["", ...uniqueItems].map((item) => (
                                                    <a
                                                        key={item}
                                                        href="#"
                                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setSelectedItem(item);
                                                            toggleDropdown("role");
                                                        }}
                                                    >
                                                        {item || "All"}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions Bar */}
                    <div className="mt-6 ml-10 flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                        {filteredData.length > 0 ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedTrainings.size === filteredData.length && filteredData.length > 0}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                    />
                                    <span className="text-sm text-gray-700">
                                        {selectedTrainings.size === 0 
                                            ? "Select All (Ctrl+A)" 
                                            : `${selectedTrainings.size} of ${filteredData.length} selected`
                                        }
                                    </span>
                                </div>
                                
                                {selectedTrainings.size > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedTrainings(new Set())}
                                            className="px-3 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                                        >
                                            Clear Selection
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            disabled={isDeleting}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <FaTrashAlt />
                                            Delete Selected ({selectedTrainings.size})
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-sm text-gray-500">
                                No trainings available for selection
                            </div>
                        )}
                        
                        {/* Delete All Trainings Option - Always Visible */}
                        <div className="ml-auto flex items-center gap-3 border-l border-gray-300 pl-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="deleteAllCheckbox"
                                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                                />
                                <label htmlFor="deleteAllCheckbox" className="text-sm text-gray-700 font-medium">
                                    Delete All Trainings
                                </label>
                            </div>
                            <button
                                onClick={async () => {
                                    const deleteAllCheckbox = document.getElementById('deleteAllCheckbox');
                                    if (deleteAllCheckbox && deleteAllCheckbox.checked) {
                                        if (confirm('Are you absolutely sure you want to delete ALL mandatory trainings? This action cannot be undone!')) {
                                                                try {
                      // Fetch all mandatory trainings first
                      const response = await fetch(`${baseUrl.baseUrl}api/get/mandatory/allusertraining`);
                      if (!response.ok) throw new Error("Failed to fetch trainings");
                      
                      const result = await response.json();
                      const mandatoryTrainings = result.data;
                                                
                                                if (mandatoryTrainings.length === 0) {
                                                    alert('No mandatory trainings found to delete.');
                                                    return;
                                                }
                                                
                                                // Delete all mandatory trainings
                                                const deletePromises = mandatoryTrainings.map(training =>
                                                    fetch(`${baseUrl.baseUrl}api/user/delete/training/${training._id}`, {
                                                        method: 'DELETE',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                        }
                                                    })
                                                );
                                                
                                                const results = await Promise.all(deletePromises);
                                                const failedDeletes = results.filter(result => !result.ok);
                                                
                                                if (failedDeletes.length > 0) {
                                                    alert(`Failed to delete ${failedDeletes.length} training(s). Please try again.`);
                                                } else {
                                                    alert(`Successfully deleted ${mandatoryTrainings.length} mandatory training(s)`);
                                                    // Reset the checkbox and refresh data
                                                    deleteAllCheckbox.checked = false;
                                                    window.location.reload(); // Refresh to show updated data
                                                }
                                            } catch (error) {
                                                console.error('Error deleting all trainings:', error);
                                                alert('An error occurred while deleting all trainings. Please try again.');
                                            }
                                        }
                                    } else {
                                        alert('Please check the confirmation checkbox to delete all trainings.');
                                    }
                                }}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <FaTrashAlt />
                                Delete All
                            </button>
                        </div>
                    </div>

                    <div className="mt-10 ml-10 flex flex-wrap gap-3">
                        {loading ? (
                            <>
                                <Card />
                                <Card />
                                <Card />
                                <Card />
                            </>
                        ) : filteredData.length === 0 ? (
                            <div className="w-full text-center py-10">
                                <p className="text-gray-500 text-lg">No mandatory trainings found</p>
                                <Link to="/training" className="text-blue-600 hover:underline mt-2 inline-block">
                                    Create your first mandatory training
                                </Link>
                            </div>
                        ) : (
                            filteredData.map((item) => (
                                <div key={item._id} className={`relative group ${
                                    selectedTrainings.has(item._id) ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                                }`}>
                                    {/* Selection Checkbox */}
                                    <div className={`absolute top-2 left-2 z-10 transition-opacity ${
                                        selectedTrainings.has(item._id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTrainings.has(item._id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleTrainingSelection(item._id);
                                            }}
                                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                        />
                                    </div>
                                    
                                    {/* Training Card */}
                                    <Link to={`/assigtraining/${item._id}`}>
                                        <RoundProgressBar
                                            initialProgress={item.averageCompletionPercentage || 0}
                                            title={item.trainingName}
                                            Module={`No. of Modules : ${item.numberOfModules || 0}`}
                                            duration={`Total Users: ${item.totalUsers || 0} | Assigned: ${item.totalAssignedUsers || 0}`}
                                            complete={`Completion Rate : ${item.averageCompletionPercentage || 0}%`}
                                        />
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <FaTrashAlt className="text-red-600 text-xl" />
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Bulk Delete</h3>
                        </div>
                        
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete <span className="font-semibold">{selectedTrainings.size}</span> mandatory training(s)? 
                            This action cannot be undone and will also remove all associated training progress records.
                        </p>
                        
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <FaTrashAlt />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MandatoryTrainingList;
