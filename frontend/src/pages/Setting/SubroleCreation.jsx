import { useState } from 'react';
import baseUrl from '../../api/api';

const SubroleCreation = () => {
  const [formData, setFormData] = useState({
    subrole: '',
    roleCode: '',
    level: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/admin/subroles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Add JSON header
        },
        body: JSON.stringify(formData), // Send JSON-encoded data
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }
  
      const data = await response.json(); // Parse JSON response
      // Optionally, handle success (e.g., show a success message)
      alert('Subrole created successfully!');
    } catch (error) {
      // Optionally, handle errors (e.g., show an error message)
      alert('Failed to create subrole. Please try again.');
    }
  };
  
  return (
    <div className="flex justify-center text-black items-center min-h-[calc(100vh-160px)] bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-extrabold mb-4 text-center">Create Subrole</h2>
        <form onSubmit={handleSubmit}>
          {/* Subrole Field */}
          <div className="mb-4">
            <label htmlFor="subrole" className="block text-gray-700 font-medium mb-2">
              Subrole
            </label>
            <input
              type="text"
              id="subrole"
              name="subrole"
              value={formData.subrole}
              onChange={handleChange}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#016E5B]"
              placeholder="Enter subrole"
              required
            />
          </div>

          {/* Role Code Field */}
          <div className="mb-4">
            <label htmlFor="roleCode" className="block text-gray-700 font-medium mb-2">
              Role Code
            </label>
            <input
              type="text"
              id="roleCode"
              name="roleCode"
              value={formData.roleCode}
              onChange={handleChange}
              className="w-full border bg-white border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#016E5B]"
              placeholder="Enter role code"
              required
            />
          </div>

          {/* Level Dropdown */}
          <div className="mb-4">
            <label htmlFor="level" className="block text-gray-700 font-medium mb-2">
              Level
            </label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
              className="w-full border bg-white border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#016E5B]"
              required
            >
              <option value="">Select level</option>
              <option value="Level 1">Level 1</option>
              <option value="Level 2">Level 2</option>
              <option value="Level 3">Level 3</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#016E5B] text-white font-medium py-2 px-4 rounded-lg hover:bg-[#256d62] focus:outline-none focus:ring-2 focus:ring-[#1a544b]"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubroleCreation;
