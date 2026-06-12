
import { useEffect, useState } from "react";
import SideNav from "../../components/SideNav/SideNav";
import baseUrl from "../../api/api";

const NotificationData = () => {



    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(baseUrl.baseUrl + "api/admin/home/AllNotification", {
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    setNotifications(data.notifications);
                } else {
                    throw new Error(data.message || "Failed to fetch notifications");
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">{error}</div>;



    return (
        <div className=" mx-0 mb-[90px]" >
            <SideNav />
            <div className="md:ml-[120px]">
                <div className="flex justify-center items-center min-h-screen">
                    <div className="bg-white w-full  shadow-lg rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4 text-black">Notifications</h2>
                        <ul className="space-y-4">
                            {notifications.map((notification, index) => (
                                <li
                                    key={index}
                                    className={`p-4 border rounded-md0 bg-white
                                       `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 mb-1">
                                                {notification.title}
                                            </p>
                                            <p className="text-sm text-gray-600">{notification.body}</p>
                                        </div>
                                        <p className="text-sm text-gray-400">
                                            {new Date(notification.createdAt).toLocaleString("en-US", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationData;

