import { Link } from "react-router-dom";
import RoundProgressBar from "../../components/RoundBar/RoundBar";
import Header from "../../components/Header/Header";
import { FaPlus } from "react-icons/fa";
import { CiFilter } from "react-icons/ci";
import { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import SideNav from "../../components/SideNav/SideNav";
import Card from "../../components/Skeleton/Card";
import { useSelector } from "react-redux";

const TrainingData = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setloading] = useState(false);
    const [data, setData] = useState([]);
    const [filter, setFilter] = useState(""); // Added filter state
    const user = useSelector((state) => state.auth.user); 
    const toggleDropdown = () => {
        setIsOpen(prev => !prev);
    };

    const handleFilterChange = (range) => {
        setFilter(range);
        setIsOpen(false); // Close the dropdown after selection
    };

    useEffect(() => {
        setloading(true);

        const Fetchdata = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/get/Full/allusertraining`);
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const result = await response.json();
                setData(result.data);
                setloading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        Fetchdata();
    }, []);

    // Filter data based on the selected percentage range
    const filteredData = data.filter(item => {
        if (!filter) return true;
        const percentage = item?.averageCompletionPercentage;
        if (filter === "0-25" && percentage >= 0 && percentage <= 25) return true;
        if (filter === "26-51" && percentage >= 26 && percentage <= 51) return true;
        if (filter === "52-77" && percentage >= 52 && percentage <= 77) return true;
        if (filter === "78-100" && percentage >= 78 && percentage <= 100) return true;
        return false;
    });
    const ChangeFilter = () => {
        setFilter("")
        setIsOpen(false);
    }

    return (
        <div className="w-full h-full bg-white mb-[70px]">
            <div><Header name='All Training' /></div>
            <SideNav />
            <div className="md:ml-[100px] mt-[150px]">
                <div>
                    <div className="flex mx-10 justify-between mt-10">
                        <div className="md:flex hidden">
                            <div className="flex w-56 border-2 justify-evenly items-center py-2 ml-10 cursor-pointer">
                                <div className="text-green-500">
                                    <FaPlus />
                                </div>
                                <Link to={'/createnewtraining'}>
                                    <h4 className="text-black">Create new Training</h4>
                                </Link>
                            </div>
                            {user?.role === 'super_admin' ?<div className="flex w-56 border-2 justify-evenly items-center py-2 ml-10 cursor-pointer">
                                <div className="text-green-500">
                                    <FaPlus />
                                </div>
                                <Link to={'/create/Mandatorytraining'}>
                                    <h4 className="text-black">Create Mandatory Training</h4>
                                </Link>
                            </div>:null}
                            
                        </div>
                        <div className="relative hidden md:inline-block text-left w-36 mr-10">
                            <button
                                type="button"
                                className="flex justify-between items-center w-full border-2 py-2 px-4 bg-white text-black rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                onClick={toggleDropdown}
                            >
                                <h4>{filter ? filter + "%" : "Range"}</h4>
                                <CiFilter className="text-[#016E5B]" />
                            </button>

                            {/* Dropdown Menu */}
                            {isOpen && (
                                <div
                                    className="origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                                    role="menu"
                                    aria-orientation="vertical"
                                >
                                    <div className="py-1">
                                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => ChangeFilter()}>ALL</a>
                                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => handleFilterChange("0-25")}>0-25%</a>
                                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => handleFilterChange("26-51")}>26-51%</a>
                                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => handleFilterChange("52-77")}>52-77%</a>
                                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => handleFilterChange("78-100")}>78-100%</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delete All Trainings Section */}
                <div className="mt-6 ml-10 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 mb-3">⚠️ Danger Zone</h3>
                    <p className="text-sm text-red-700 mb-4">
                        This action will permanently delete ALL trainings and cannot be undone.
                    </p>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="deleteAllCheckbox"
                            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                        />
                        <label htmlFor="deleteAllCheckbox" className="text-sm text-red-700 font-medium">
                            I understand this will delete ALL trainings
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            const deleteAllCheckbox = document.getElementById('deleteAllCheckbox');
                            if (deleteAllCheckbox && deleteAllCheckbox.checked) {
                                if (confirm('Are you absolutely sure you want to delete ALL trainings? This action cannot be undone!')) {
                                    try {
                                        if (filteredData.length === 0) {
                                            alert('No trainings found to delete.');
                                            return;
                                        }
                                        
                                        // Delete all trainings
                                        const deletePromises = filteredData.map(training =>
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
                                            alert(`Successfully deleted ${filteredData.length} training(s)`);
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
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        🗑️ Delete All Trainings
                    </button>
                </div>

                <div className="mt-10 ml-10 flex flex-wrap gap-3">
                    {loading && (
                        <>
                            <Card />
                            <Card />
                            <Card />
                            <Card />
                        </>
                    )}
                    {
                        filteredData.map((item) => (
                            <Link key={item._id} to={`/AssigTraining/${item?.trainingId}`}>
                                <RoundProgressBar
                                    initialProgress={item?.averageCompletionPercentage}
                                    title={item?.trainingName}
                                    Module={`No. of Modules : ${item?.numberOfModules}`}
                                    duration={`No. of users: ${item?.totalUsers}`}
                                    complete={`Completion Rate : ${item?.averageCompletionPercentage}%`}
                                />
                            </Link>
                        ))
                    }
                </div>
            </div>
        </div>
    );
};

export default TrainingData;
