import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as SplashScreenExpo from 'expo-splash-screen'; // Import expo-splash-screen
import { loginUser, fetchUserProfile, logoutUser } from '../utils/api';
import { router } from 'expo-router';

// Keep the native splash screen visible while app assets are loaded and authentication checked
SplashScreenExpo.preventAutoHideAsync();

// Define the shape of our authentication context
interface AuthContextType {
  user: any; // Could be a more specific User type from your Laravel API
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAppReady: boolean; // Renamed from isSplashReady for clearer intent: is the *app* ready to show UI?
}

// Create the Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define props for the AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component:
 * Manages the global authentication state of the application.
 * Handles initial app loading, authentication status, and controls splash screen visibility.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // True initially for auth check
  const [error, setError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false); // Controls when the main app UI can be shown

  /**
   * useEffect to perform initial app setup and authentication check.
   * This runs once on component mount.
   */
  useEffect(() => {
    async function prepareApp() {
      try {
        setLoading(true); // Indicate that we're busy
        const storedToken = await AsyncStorage.getItem('user_token');

        if (storedToken) {
          setToken(storedToken);
          const userData = await fetchUserProfile(); // Validate token with backend
          setUser(userData);
          // If token is valid and user data fetched, navigate to authenticated section
          router.replace('/(app)/job_board');
        } else {
          // If no token or invalid token, navigate to public auth section
          router.replace('/(auth)/');
        }
      } catch (err: any) {
        console.error('App preparation or initial authentication failed:', err.response?.data || err.message || err);
        setError('Failed to load session. Please log in.');
        await AsyncStorage.removeItem('user_token'); // Clear any problematic token
        setUser(null);
        setToken(null);
        router.replace('/(auth)/'); // Always redirect to login on failure
      } finally {
        setLoading(false); // Auth check is complete
        setIsAppReady(true); // The app's initial state is determined
        await SplashScreenExpo.hideAsync(); // Hide the native splash screen
      }
    }

    prepareApp();
  }, []); // Empty dependency array means this runs once on mount

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const deviceName = Device.deviceName || 'ExpoGoMobile';
      const { user: loggedInUser, token: receivedToken } = await loginUser(
        email,
        password,
        deviceName
      );
      await AsyncStorage.setItem('user_token', receivedToken);
      setUser(loggedInUser);
      setToken(receivedToken);
      router.replace('/(app)/job_board'); // Navigate to authenticated section
    } catch (err: any) {
      console.error('Login failed:', err.response?.data || err.message);
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);

    try {
      await logoutUser(); // Call API to revoke token
      await AsyncStorage.removeItem('user_token'); // Clear local token
      setUser(null);
      setToken(null);
      router.replace('/(auth)/'); // Redirect to public auth section after logout
    } catch (err: any) {
      console.error('Logout failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Logout failed. Please try again.');
      await AsyncStorage.removeItem('user_token'); // Always clear local token on server logout failure
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const authContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    loading, // Indicates if an auth operation (login/logout) is in progress
    error,
    login,
    logout,
    clearError,
    isAppReady, // Expose app readiness state
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
