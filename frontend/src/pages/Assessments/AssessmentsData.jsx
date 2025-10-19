import Header from "../../components/Header/Header";
import { FaPlus, FaExternalLinkAlt } from "react-icons/fa";
import { useEffect, useState } from "react";
import RoundProgressBarAssessment from "../../components/RoundBar/RoundAssessment";
import { Link } from "react-router-dom";
import baseUrl from "../../api/api";
import SideNav from "../../components/SideNav/SideNav";
import GoogleFormManager from "../../components/GoogleFormManager/GoogleFormManager";

const AssessmentsData = () => {
    const [data, setData] = useState([]);
    const [error, setError] = useState(null); // Error handling
    const [loading, setLoading] = useState(true); // Loading indicator
    const [showGoogleFormManager, setShowGoogleFormManager] = useState(false);
    const [activeGoogleForm, setActiveGoogleForm] = useState(null);

    const token = localStorage.getItem('token');

    // Fetch Assessments Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${baseUrl.baseUrl}api/user/get/AllAssessment`);
                if (!response.ok) throw new Error('Failed to fetch data');

                const result = await response.json();

                // Sort data by completionPercentage in descending order
                const sortedData = result.data.sort(
                    (a, b) => a.completionPercentage - b.completionPercentage
                );

                setData(sortedData);
                console.log(sortedData);

            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load assessments'); // Set error state
            } finally {
                setLoading(false); // Stop loading indicator
            }
        };

        fetchData();
        fetchActiveGoogleForm();
    }, []);

    // Fetch Active Google Form Link
    const fetchActiveGoogleForm = async () => {
        try {
            const response = await fetch(`${baseUrl.baseUrl}api/google-form/active`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setActiveGoogleForm(result.data);
                }
            }
        } catch (error) {
            console.error('Error fetching active Google Form:', error);
        }
    };

    // Toggle Active/Inactive status
    const handleToggleActive = async () => {
        if (!activeGoogleForm) return;

        try {
            if (activeGoogleForm.isActive) {
                // Deactivate the form
                const response = await fetch(`${baseUrl.baseUrl}api/google-form/deactivate`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        // Update local state
                        setActiveGoogleForm(prev => ({
                            ...prev,
                            isActive: false
                        }));
                    }
                }
            } else {
                // Reactivate the form by updating it
                const response = await fetch(`${baseUrl.baseUrl}api/google-form`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        title: activeGoogleForm.title,
                        url: activeGoogleForm.url,
                        description: activeGoogleForm.description
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        // Update local state
                        setActiveGoogleForm(prev => ({
                            ...prev,
                            isActive: true
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling form status:', error);
        }
    };

    return (
        <div className="w-full h-full bg-white">
            {/* Header */}
            <Header name='Assessments' />
            <SideNav />
            {/* Top Bar */}
            <div className="md:ml-[100px] mt-[150px]">
                <div className="flex md:mx-10 justify-between mt-10">
                    {/* Create Assessment */}
                    <Link to={'/create/Assessment'}>
                        <div className="flex w-56 border-2 justify-evenly items-center py-2 ml-10 cursor-pointer">
                            <div className="text-[#016E5B]"><FaPlus /></div>
                            <h4 className="text-black">Create New Assessment</h4>
                        </div>
                    </Link>
                    <Link to={'/assign/Assessment'}>
                        <div className="flex w-56 border-2 justify-evenly items-center py-2 ml-10 cursor-pointer">
                            <div className="text-[#016E5B]"><FaPlus /></div>
                            <h4 className="text-black">Assign Assessment</h4>
                        </div>
                    </Link>
                    {/* Google Form Management */}
                    <button
                        onClick={() => setShowGoogleFormManager(true)}
                        className="group flex w-56 border-2 border-green-600 justify-evenly items-center py-3 ml-10 cursor-pointer bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 rounded-lg shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                        <div className="text-green-600 group-hover:text-green-700 transition-colors">
                            <FaExternalLinkAlt className="text-lg" />
                        </div>
                        <h4 className="text-green-700 font-semibold group-hover:text-green-800 transition-colors">
                            Manage Google Form
                        </h4>
                    </button>
                </div>

                {/* Assessment Cards */}
                <div className="mt-10 ml-10 flex flex-wrap gap-3">
                    {loading ? (
                        <div>Loading...</div>
                    ) : error ? (
                        <div className="text-red-500">{error}</div>
                    ) : (
                        data.map((item) => (
                            <Link to={`/Assessment/Assign/${item?.assessmentId}`} key={item.assessmentId}>
                                <div className="mt-5">
                                    <RoundProgressBarAssessment
                                        initialProgress={item.completionPercentage}
                                        deadline={`${item?.assessmentdeadline} days`}
                                        user={item.totalAssigned}
                                        duration={item.assessmentduration}
                                        Module={`Number of questions: ${item?.assessment}`}
                                        title={` ${item?.assessmentName}`}
                                        complete={`Complete rate ${item.completionPercentage}`}
                                    />
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                {/* Active Google Form Display */}
                {activeGoogleForm && (
                    <div className="mt-8 ml-10 mr-10">
                        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 border border-green-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-gradient-to-r from-green-500 to-blue-500 p-3 rounded-full shadow-md">
                                        <FaExternalLinkAlt className="text-white text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-green-800 mb-1">
                                            Active Google Form Assessment
                                        </h3>
                                        <p className="text-green-600 text-sm">
                                            Currently displayed in your LMS training app
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                                    activeGoogleForm.isActive 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {activeGoogleForm.isActive ? '✓ Active' : '○ Inactive'}
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Form Title</label>
                                        <p className="text-lg font-semibold text-gray-900 mt-1">{activeGoogleForm.title}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Description</label>
                                        <p className="text-gray-700 mt-1">{activeGoogleForm.description}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Created Date</label>
                                        <p className="text-gray-700 mt-1">{new Date(activeGoogleForm.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Status</label>
                                        <div className="flex items-center mt-1">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${
                                                activeGoogleForm.isActive ? 'bg-green-500' : 'bg-gray-400'
                                            }`}></div>
                                            <span className={`font-medium ${
                                                activeGoogleForm.isActive ? 'text-green-600' : 'text-gray-500'
                                            }`}>
                                                {activeGoogleForm.isActive ? 'Live in LMS' : 'Not displayed'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-green-200">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-600">Status:</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={activeGoogleForm.isActive}
                                                onChange={handleToggleActive}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-700">
                                                {activeGoogleForm.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <a
                                    href={activeGoogleForm.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <FaExternalLinkAlt className="text-sm" />
                                    Open Google Form
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Google Form Manager Modal */}
            {showGoogleFormManager && (
                <GoogleFormManager 
                    onClose={() => {
                        setShowGoogleFormManager(false);
                        fetchActiveGoogleForm(); // Refresh the active form data
                    }}
                />
            )}
        </div>
    );
};

export default AssessmentsData;
