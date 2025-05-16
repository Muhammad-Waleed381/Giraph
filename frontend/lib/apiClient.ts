import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: This allows cookies (like HttpOnly JWT) to be sent with requests
});

// Add an interceptor to include authentication cookies with each request
apiClient.interceptors.request.use(config => {
  // Ensures that cookies are sent with every request
  config.withCredentials = true;
  return config;
});

// Add response interceptor to handle unauthorized errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 401) {
      // Redirect to login if unauthorized
      console.error("Unauthorized request:", error.config.url);
      // Could redirect to login here if needed
    }
    return Promise.reject(error);
  }
);

export default apiClient; 