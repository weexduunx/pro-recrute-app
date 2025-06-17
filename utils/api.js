// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// **IMPORTANT: Update this with your actual Laravel backend IP and port**
const API_URL = 'http://192.168.1.144:8000/api'; // e.g., 'http://192.168.1.5:8000/api'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the authorization token
api.interceptors.request.use(
  async (config) => {
    // Only add Authorization header if it's not the logout request itself,
    // or if it is the logout request but we ensure the token is there for it.
    // The previous logic was fine if the token was present from login.
    const token = await AsyncStorage.getItem('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Sending request to:', config.url, 'with headers:', config.headers); // Debugging
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error); // Debugging
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration or 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    console.log('Received response from:', response.config.url, 'Status:', response.status, 'Data:', response.data); // Debugging
    return response;
  },
  async (error) => {
    console.error('API Error:', error.response?.status, error.response?.data || error.message); // Debugging
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn("Authentication token expired or invalid. User logged out.");
      await AsyncStorage.removeItem('user_token'); // Clear invalid token locally if 401
      // You might trigger a global event here or use Expo Router to push to login
      // Example: router.replace('/(auth)/'); (If router is available globally or passed)
    }
    return Promise.reject(error);
  }
);

export const loginUser = async (email, password, deviceName) => {
  try {
    const response = await api.post('/login', { email, password, device_name: deviceName });
    const { token, user } = response.data;
    await AsyncStorage.setItem('user_token', token); // Store the token securely
    return { user, token };
  } catch (error) {
    console.error("loginUser API call failed:", error.response?.data || error.message);
    throw error;
  }
};

export const registerUser = async (name, email, password, passwordConfirmation) => {
  try {
    const response = await api.post('/register', {
      name: name,
      email: email,
      password: password,
      password_confirmation: passwordConfirmation,
    });
    console.log("registerUser API call successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("registerUser API call failed:", error.response?.data || error.message);
    throw error;
  }
};


export const fetchUserProfile = async () => {
  try {
    const response = await api.get('/user'); // Assumes '/api/user' endpoint
    return response.data;
  } catch (error) {
    console.error("fetchUserProfile API call failed:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * logoutUser: Sends a POST request to the Laravel logout endpoint.
 * This function now ensures the token is sent with the request FIRST,
 * then clears it locally if the server confirms successful logout.
 */
export const logoutUser = async () => {
  try {
    // 1. Send the logout request with the existing token
    const response = await api.post('/logout'); // Assumes '/api/logout' endpoint is protected by sanctum
    console.log("logoutUser API call successful:", response.data);

    // 2. ONLY if the server responds successfully, remove the token locally
    await AsyncStorage.removeItem('user_token'); // Remove token locally

    return response.data; // Return server's success message
  } catch (error) {
    console.error("logoutUser API call failed:", error.response?.data || error.message);
    // If logout fails on server side (e.g., token already invalid),
    // it's still safer to remove the local token to avoid stale state.
    await AsyncStorage.removeItem('user_token');
    throw error; // Re-throw the error for UI to handle if needed
  }
};

export default api;
