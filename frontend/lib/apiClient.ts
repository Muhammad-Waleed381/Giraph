import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: This allows cookies (like HttpOnly JWT) to be sent with requests
});

// You can add interceptors for request and response if needed later
// For example, to handle token refresh or global error handling

// apiClient.interceptors.request.use(config => {
//   // const token = localStorage.getItem('token'); // If using localStorage for token
//   // if (token) {
//   //   config.headers.Authorization = `Bearer ${token}`;
//   // }
//   return config;
// });

// apiClient.interceptors.response.use(
//   response => response,
//   async error => {
//     // const originalRequest = error.config;
//     // if (error.response.status === 401 && !originalRequest._retry) {
//     //   originalRequest._retry = true;
//     //   // try refreshing token, then retry originalRequest
//     // }
//     return Promise.reject(error);
//   }
// );

export default apiClient; 