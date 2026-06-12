import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import baseUrl from '../../api/api';

const NotificationPoller = () => {
  const lastIdRef = useRef(null);

  useEffect(() => {
    let intervalId;
    let isActive = true;

    const checkNotifications = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`${baseUrl.baseUrl}api/admin/home/notification`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const notifications = data.notifications || [];

        if (notifications.length > 0) {
          const latestNotification = notifications[0];
          const latestId = latestNotification._id;

          // If lastIdRef is not set, initialize it with the latest notification ID so we don't show old toasts on page load
          if (!lastIdRef.current) {
            // Check if there is a saved ID in sessionStorage to persist across page refreshes
            const savedId = sessionStorage.getItem('lastNotificationId');
            if (savedId) {
              lastIdRef.current = savedId;
            } else {
              lastIdRef.current = latestId;
              sessionStorage.setItem('lastNotificationId', latestId);
              return;
            }
          }

          // If the latest notification is different, it means we have received a new one!
          if (latestId !== lastIdRef.current) {
            lastIdRef.current = latestId;
            sessionStorage.setItem('lastNotificationId', latestId);

            // Display a toast popup
            toast.info(`🔔 Notification: ${latestNotification.title}`, {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          }
        }
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    };

    // Run initial check after a short delay
    const initialTimeout = setTimeout(() => {
      if (isActive) {
        checkNotifications();
      }
    }, 1500);

    // Poll every 10 seconds
    intervalId = setInterval(() => {
      if (isActive) {
        checkNotifications();
      }
    }, 10000);

    return () => {
      isActive = false;
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, []);

  return null;
};

export default NotificationPoller;
