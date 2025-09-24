const baseUrl = {
    // Production URL (Render deployment)
    baseUrl: "https://lms-1-lavs.onrender.com/",
    
    // Development URL (for local development)
    //  baseUrl: "http://localhost:7000/",
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
    console.log(`Making API call to: ${url}`, finalOptions);
    
    const response = await fetch(url, finalOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`API call successful:`, data);
    return data;
    
  } catch (error) {
    console.error('API call failed:', error);
    
    // Try CORS proxy as fallback for development
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('Trying CORS proxy...');
        const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
        const response = await fetch(corsProxyUrl, finalOptions);
        
        if (!response.ok) {
          throw new Error(`CORS proxy failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('CORS proxy successful:', data);
        return data;
        
      } catch (corsError) {
        console.error('CORS proxy also failed:', corsError);
        throw corsError;
      }
    }
    
    throw error;
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

  return await apiCall(`api/user/update/trainingprocess?${params.toString()}`, {
    method: 'PATCH',
  });
};

/**
 * Update video progress
 * @param {Object} params - Parameters for updating video progress
 * @returns {Promise<any>} - API response
 */
export const updateVideoProgress = async (params) => {
  return await apiCall('api/video_progress', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export default baseUrl;
