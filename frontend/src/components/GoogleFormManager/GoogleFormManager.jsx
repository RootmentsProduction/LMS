import React, { useState, useEffect } from 'react';
import { FaEdit, FaEye, FaTrash, FaPlus, FaExternalLinkAlt } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import baseUrl from '../../api/api';

const GoogleFormManager = ({ onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        url: '',
        description: ''
    });
    const [activeLink, setActiveLink] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const token = localStorage.getItem('token');

    // Fetch active Google Form link
    useEffect(() => {
        fetchActiveLink();
    }, []);

    const fetchActiveLink = async () => {
        try {
            console.log('Fetching active link from:', `${baseUrl.baseUrl}api/google-form/active`);
            const response = await fetch(`${baseUrl.baseUrl}api/google-form/active`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('Active link response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Active link response:', result);
                if (result.success && result.data) {
                    setActiveLink(result.data);
                    setFormData({
                        title: result.data.title || '',
                        url: result.data.url || '',
                        description: result.data.description || ''
                    });
                }
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch active link:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error fetching active link:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateUrl = (url) => {
        const googleFormsRegex = /^https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9-_]+\/.*$/;
        return googleFormsRegex.test(url);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validate URL
        if (!validateUrl(formData.url)) {
            setError('Please enter a valid Google Forms URL');
            setLoading(false);
            return;
        }

        try {
            console.log('Making request to:', `${baseUrl.baseUrl}api/google-form`);
            console.log('Request data:', formData);
            console.log('Token:', token ? 'Token exists' : 'No token');
            
            const response = await fetch(`${baseUrl.baseUrl}api/google-form`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response not OK:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            if (result.success) {
                setSuccess(result.message);
                setActiveLink(result.data);
                setIsEditing(false);
                // Clear form
                setFormData({
                    title: '',
                    url: '',
                    description: ''
                });
            } else {
                setError(result.message || 'Failed to save Google Form link');
            }
        } catch (error) {
            console.error('Error saving Google Form link:', error);
            setError('Failed to save Google Form link');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async () => {
        if (!activeLink) return;

        setLoading(true);
        try {
            if (activeLink.isActive) {
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
                        setActiveLink(prev => ({
                            ...prev,
                            isActive: false
                        }));
                        setSuccess('Google Form deactivated successfully');
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
                        title: activeLink.title,
                        url: activeLink.url,
                        description: activeLink.description
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        setActiveLink(prev => ({
                            ...prev,
                            isActive: true
                        }));
                        setSuccess('Google Form activated successfully');
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling form status:', error);
            setError('Failed to update form status');
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async () => {
        if (!window.confirm('Are you sure you want to delete this Google Form link? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${baseUrl.baseUrl}api/google-form/deactivate`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(result.message);
                setActiveLink(null);
                setIsEditing(false);
                setFormData({
                    title: '',
                    url: '',
                    description: ''
                });
            } else {
                setError(result.message || 'Failed to delete Google Form link');
            }
        } catch (error) {
            console.error('Error deleting Google Form link:', error);
            setError('Failed to delete Google Form link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="bg-white bg-opacity-20 p-3 rounded-full backdrop-blur-sm">
                                <FaEdit className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">
                                    Google Form Management
                                </h3>
                                <p className="text-green-100 text-sm">
                                    Manage assessment forms for your LMS
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                        >
                            <IoClose className="text-2xl" />
                        </button>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">

                {/* Current Active Link Display */}
                {activeLink && !isEditing && (
                    <div className="mb-8">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-lg">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-green-500 p-2 rounded-full">
                                        <FaEye className="text-white text-lg" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-green-800">
                                            Active Google Form
                                        </h4>
                                        <p className="text-green-600 text-sm">
                                            Currently displayed in LMS
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    Active
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Title</label>
                                        <p className="text-lg font-semibold text-gray-900 mt-1">{activeLink.title}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Description</label>
                                        <p className="text-gray-700 mt-1">{activeLink.description}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Created</label>
                                        <p className="text-gray-700 mt-1">{new Date(activeLink.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Google Form URL</label>
                                        <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                                            <a 
                                                href={activeLink.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm break-all"
                                            >
                                                {activeLink.url.length > 60 ? activeLink.url.substring(0, 60) + '...' : activeLink.url}
                                                <FaExternalLinkAlt className="ml-2 text-xs" />
                                            </a>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-600">Form Status</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={activeLink.isActive}
                                                    onChange={handleToggleActive}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                                <span className="ml-3 text-sm font-medium text-gray-700">
                                                    {activeLink.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </label>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
                                            >
                                                <FaEdit className="text-xs" />
                                                Edit Form
                                            </button>
                                            <button
                                                onClick={handleDeactivate}
                                                disabled={loading}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <FaTrash className="text-xs" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form */}
                {(isEditing || !activeLink) && (
                    <div className="bg-gray-50 rounded-2xl p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-blue-500 p-2 rounded-full">
                                <FaPlus className="text-white text-lg" />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-gray-900">
                                    {activeLink ? 'Edit Google Form' : 'Add New Google Form'}
                                </h4>
                                <p className="text-gray-600 text-sm">
                                    {activeLink ? 'Update the existing form details' : 'Create a new assessment form for your LMS'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Form Title
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Employee Assessment Form"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Google Forms URL *
                                    </label>
                                    <input
                                        type="url"
                                        name="url"
                                        value={formData.url}
                                        onChange={handleInputChange}
                                        placeholder="https://docs.google.com/forms/d/..."
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                                        Enter the complete Google Forms URL
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Brief description of what this form is for..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm resize-none"
                                />
                            </div>

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-red-100 p-2 rounded-full">
                                            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-red-700 font-medium">{error}</p>
                                    </div>
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-green-700 font-medium">{success}</p>
                                    </div>
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setError('');
                                        setSuccess('');
                                        if (activeLink) {
                                            setFormData({
                                                title: activeLink.title || '',
                                                url: activeLink.url || '',
                                                description: activeLink.description || ''
                                            });
                                        } else {
                                            setFormData({
                                                title: '',
                                                url: '',
                                                description: ''
                                            });
                                        }
                                    }}
                                    className="px-6 py-3 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <FaPlus className="text-sm" />
                                    )}
                                    {activeLink ? 'Update Form' : 'Create Form'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

export default GoogleFormManager;
