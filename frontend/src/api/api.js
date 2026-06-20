const baseUrl = {
  // Automatically switch between local development and production Render URL!
  baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:7000/"
    : "https://lms.brynexapparels.in/",
};

/**
 * Generic API call function with error handling and CORS fallback
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} - API response data
 */
export const apiCall = async (endpoint, options = {}) => {
  const url = `${baseUrl.baseUrl}${endpoint}`;

  // Default options
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  // Merge options
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    finalOptions.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, finalOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      try {
        const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
        const response = await fetch(corsProxyUrl, finalOptions);

        if (!response.ok) {
          throw new Error(`CORS proxy failed: ${response.status}`);
        }

        return await response.json();
      } catch (corsError) {
        throw corsError;
      }
    }

    throw error;
  }
};

const notifyDashboardRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dashboard:refresh"));
  }
};

/**
 * Mark video as complete
 * @param {Object} params - Parameters for marking video complete
 * @param {string} params.userId - User ID
 * @param {string} params.trainingId - Training ID
 * @param {string} params.moduleId - Module ID
 * @param {string} params.videoId - Video ID
 * @param {number} params.watchTime - Watch time in seconds (optional)
 * @param {number} params.totalDuration - Total duration in seconds (optional)
 * @returns {Promise<any>} - API response
 */
export const markVideoAsComplete = async ({ userId, trainingId, moduleId, videoId, watchTime, totalDuration }) => {
  const params = new URLSearchParams({
    userId,
    trainingId,
    moduleId,
    videoId,
  });

  if (watchTime) params.append('watchTime', watchTime.toString());
  if (totalDuration) params.append('totalDuration', totalDuration.toString());

  const response = await apiCall(`api/user/update/trainingprocess?${params.toString()}`, {
    method: 'PATCH',
  });

  notifyDashboardRefresh();
  return response;
};

/**
 * Update video progress
 * @param {Object} params - Parameters for updating video progress
 * @returns {Promise<any>} - API response
 */
export const updateVideoProgress = async (params) => {
  const response = await apiCall('api/video_progress', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  notifyDashboardRefresh();
  return response;
};

export default baseUrl;