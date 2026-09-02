import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import baseUrl from '../../api/api';
import NotificationPopup from './NotificationPopup';

// Soft notification chime synthesizer using Web Audio API (zero external assets needed)
const playChimeSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    /* Silent fallback if audio context blocked */
  }
};

const NotificationPoller = () => {
  const lastIdRef = useRef(null);
  const navigate = useNavigate();

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

            // Play audio chime
            playChimeSound();

            // Display floating notification popup card
            toast(
              ({ closeToast }) => (
                <NotificationPopup 
                  notification={latestNotification}
                  onClose={closeToast}
                  onClick={() => {
                    closeToast();
                    if (latestNotification.link) {
                      navigate(latestNotification.link);
                    } else {
                      navigate('/admin/Notification');
                    }
                  }}
                />
              ),
              {
                position: "top-right",
                autoClose: 6000,
                hideProgressBar: true,
                closeButton: false,
                style: { background: 'transparent', boxShadow: 'none', padding: 0 }
              }
            );
          }
        }
      } catch (error) {
        // Silently ignore transient network blips like ERR_NETWORK_CHANGED or AbortError
        if (error?.name !== 'AbortError' && !error?.message?.includes?.('network') && !error?.message?.includes?.('Failed to fetch')) {
          console.warn('Notification polling error:', error);
        }
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
