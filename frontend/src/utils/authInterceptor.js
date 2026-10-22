import { logout } from '../features/auth/authSlice.js';
import { toast } from 'react-toastify';

let isHandlingAuthError = false;

/**
 * Attaches a global window.fetch interceptor that listens for 401 Unauthorized responses.
 * When a response indicates that the password was changed (or the token is invalid),
 * it cleanly clears authentication state, displays a notification, and redirects to /login.
 * 
 * @param {Function} dispatch - Redux store dispatch
 */
export const setupAuthInterceptor = (dispatch) => {
  if (typeof window === 'undefined' || window._authInterceptorRegistered) return;
  window._authInterceptorRegistered = true;

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    if (response.status === 401) {
      try {
        // Clone response to avoid consuming the original stream
        const cloned = response.clone();
        const data = await cloned.json().catch(() => null);

        // Check for password changed or invalid/expired session
        const isPasswordChanged =
          data?.code === 'PASSWORD_CHANGED' ||
          (typeof data?.message === 'string' && data.message.toLowerCase().includes('password was recently changed'));

        const currentPath = window.location.pathname;
        const isLoginPage = currentPath === '/login' || currentPath === '/login/';

        // Only trigger session termination if not already on the login page
        if (!isLoginPage && !isHandlingAuthError && (isPasswordChanged || data?.message === 'Invalid token')) {
          isHandlingAuthError = true;

          if (isPasswordChanged) {
            toast.warn('Your password was changed. Please log in again with your new credentials.', {
              toastId: 'pwd_changed_toast',
              autoClose: 3500,
            });
          }

          localStorage.removeItem('token');
          if (dispatch) {
            dispatch(logout());
          }

          setTimeout(() => {
            window.location.href = '/login';
            isHandlingAuthError = false;
          }, 800);
        }
      } catch (e) {
        // Silent catch for clone/json parsing issues
      }
    }

    return response;
  };
};
