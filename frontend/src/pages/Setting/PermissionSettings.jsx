import React, { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import { toast } from "react-toastify";

const PermissionSettings = () => {
  const token = localStorage.getItem("token");

  // Default structure to prevent undefined errors
  const [permissions, setPermissions] = useState({
    admin: { training: [false, false, false], assessment: [false, false, false] },
    clusterManager: { training: [false, false, false], assessment: [false, false, false] },
    storeManager: { training: [false, false, false], assessment: [false, false, false] },
  });

  const togglePermission = (role, category, index) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [category]: prev[role][category].map((val, idx) => (idx === index ? !val : val)),
      },
    }));
  };

  useEffect(() => {
    const FetchAllData = async () => {
      try {
        const fetchData = await fetch(
          `${baseUrl.baseUrl}api/admin/get/permission/controller`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }
        );

        if (!fetchData.ok) {
          throw new Error("Failed to fetch permissions");
        }

        const result = await fetchData.json();

        if (!result.data || !Array.isArray(result.data)) {
          throw new Error("Invalid permission data received");
        }

        const superAdminDoc = result.data.find(d => d.role === "super_admin" || d.role === "admin");
        const clusterAdminDoc = result.data.find(d => d.role === "cluster_admin");
        const storeAdminDoc = result.data.find(d => d.role === "store_admin");

        setPermissions({
          admin: {
            training: [
              superAdminDoc?.permissions?.canCreateTraining || false,
              superAdminDoc?.permissions?.canReassignTraining || false,
              superAdminDoc?.permissions?.canDeleteTraining || false,
            ],
            assessment: [
              superAdminDoc?.permissions?.canCreateAssessment || false,
              superAdminDoc?.permissions?.canReassignAssessment || false,
              superAdminDoc?.permissions?.canDeleteAssessment || false,
            ],
          },
          clusterManager: {
            training: [
              clusterAdminDoc?.permissions?.canCreateTraining || false,
              clusterAdminDoc?.permissions?.canReassignTraining || false,
              clusterAdminDoc?.permissions?.canDeleteTraining || false,
            ],
            assessment: [
              clusterAdminDoc?.permissions?.canCreateAssessment || false,
              clusterAdminDoc?.permissions?.canReassignAssessment || false,
              clusterAdminDoc?.permissions?.canDeleteAssessment || false,
            ],
          },
          storeManager: {
            training: [
              storeAdminDoc?.permissions?.canCreateTraining || false,
              storeAdminDoc?.permissions?.canReassignTraining || false,
              storeAdminDoc?.permissions?.canDeleteTraining || false,
            ],
            assessment: [
              storeAdminDoc?.permissions?.canCreateAssessment || false,
              storeAdminDoc?.permissions?.canReassignAssessment || false,
              storeAdminDoc?.permissions?.canDeleteAssessment || false,
            ],
          },
        });
      } catch (error) {
        toast.error("Failed to load permissions");
      }
    };

    if (token) FetchAllData();
  }, [token]);

  const handleSaveChanges = async () => {
    const formattedPermissions = Object.keys(permissions).reduce((acc, role) => {
      acc[role] = {
        training: permissions[role].training,
        assessment: permissions[role].assessment,
      };
      return acc;
    }, {});
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/admin/permission/controller`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(formattedPermissions),
      });

      if (!response.ok) {
        throw new Error("Failed to save permissions");
      }

      toast.success("Permissions successfully updated!");
    } catch (error) {
      toast.error("Failed to save permissions");
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-160px)] w-full text-black">
      <h1 className="text-2xl font-extrabold mb-6">Permission Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Role-Based Permissions</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-none border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Action</th>
                <th className="border border-gray-300 p-2">Admin</th>
                <th className="border border-gray-300 p-2">Cluster Manager</th>
                <th className="border border-gray-300 p-2">Store Manager</th>
              </tr>
            </thead>
            <tbody>
              {[
                { category: "training", actions: ["Create Training", "Assign Training", "Delete Training"] },
                { category: "assessment", actions: ["Create Assessment", "Assign Assessment", "Delete Assessment"] },
              ].map(({ category, actions }) => (
                <React.Fragment key={category}>
                  {actions.map((action, idx) => (
                    <tr key={action}>
                      <td className="border border-gray-300 p-2">{action}</td>
                      {["admin", "clusterManager", "storeManager"].map((role) => (
                        <td key={role} className="border border-gray-300 text-center p-2">
                          <input
                            type="checkbox"
                            checked={permissions[role]?.[category]?.[idx] || false}
                            onChange={() => togglePermission(role, category, idx)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          onClick={handleSaveChanges}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default PermissionSettings;
