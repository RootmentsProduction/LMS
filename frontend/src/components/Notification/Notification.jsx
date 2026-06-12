import { FaRegBell } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchNotifications } from "../../features/dashboard/dashboardFetch";

const Notification = () => {
    const [responseData, setResponseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setIsError(false);
            try {
                const data = await fetchNotifications();
                if (!mounted) return;
                setResponseData(data);
            } catch {
                if (!mounted) return;
                setIsError(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const notifications = responseData?.notifications || [];
    const error = isError ? 'Failed to fetch notifications' : null;

    if (loading) return <div role="status" className="flex items-center justify-center h-[250px] w-[600px] shadow-xl bg-slate-100 rounded-lg animate-pulse d">

        <span className="sr-only">Loading...</span>
    </div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <>
            <div className="bg-white w-[600px] shadow-lg border rounded-lg p-6 mr-[90px] mt-[50px]">
                <Link to={'/admin/Notification'}>
                    <h2 className="text-lg font-semibold mb-4">Notifications</h2>
                    <ul>
                        {notifications.map((notification) => (
                            <li
                                key={notification._id}
                                className="flex justify-between items-start border-b last:border-none pb-3 mb-3 last:pb-0 last:mb-0"
                            >
                                <div className="flex items-center">
                                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                                        <FaRegBell className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{notification.title.length < 20 ? notification.title : notification.title.slice(0, 20)}</p>
                                        {notification.body.length ? <p className="text-sm text-gray-600">{notification.body.length < 40 ? notification.body : notification.body.slice(0, 40) + "..."}</p>
                                            : <p className="text-sm text-gray-600"></p>
                                        }
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 self-start">
                                    {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}
                                </p>
                            </li>
                        ))}
                    </ul>

                </Link>

            </div>


        </>
    );
};

export default Notification;
