import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import {Platform,Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as SplashScreenExpo from 'expo-splash-screen';
import { 
  loginUser, 
  fetchUserProfile, 
  logoutUser, 
  registerUser,
  socialLoginCallback,
  getInterimProfile,
  sendOtp as apiSendOtp,
  verifyOtp as apiVerifyOtp,
} from '../utils/api';
import { router, useSegments } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

SplashScreenExpo.preventAutoHideAsync();

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;
  expo_push_token?: string;
  profile_photo_url?: string;
  is_otp_verified?: boolean;
  is_contract_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, deviceName?: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string, role?: string, deviceName?: string) => Promise<void>;
  logout: () => Promise<void>;
  socialLogin: (provider: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otpCode: string, deviceName: string) => Promise<void>;
  clearError: () => void;
  isAppReady: boolean;
  fetchUser: () => Promise<void>;
}

// IMPORTANT: Le SCHEME doit correspondre à celui que vous avez dans app.json pour votre application Expo
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'prorecruteapp' });
console.log('AuthProvider: Redirect URI généré:', REDIRECT_URI); // Débogage 
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const inAppGroup = segments[0] === '(app)';

    const fetchUser = useCallback(async () => {
    try {
      const fetchedUser = await fetchUserProfile();
      if (fetchedUser && fetchedUser.role === 'interimaire') { 
        const interimProfile = await getInterimProfile();
        if (interimProfile) {
          fetchedUser.is_contract_active = interimProfile.is_contract_active;
        } else {
          fetchedUser.is_contract_active = false;
        }
      }
      setUser(fetchedUser);
      return fetchedUser;
    } catch (e: any) { 
      if (e.response?.status === 401) {
        console.warn("AuthProvider: Jeton non valide détecté (401), utilisateur sera déconnecté.");
      } else {
        console.error("AuthProvider: Échec de fetchUser (non-401):", e);
      }
      await AsyncStorage.removeItem('user_token');
      setUser(null);
      setToken(null);
      throw e; 
    }
  }, []);

  const handleRedirect = useCallback((authenticated: boolean, userRole: string | undefined, isOtpVerified: boolean | undefined, isContractActive: boolean | undefined, emailForOtp?: string, deviceNameForOtp?: string) => {
    if (isLoggingOut) { 
      return;
    }

    if (authenticated) {
      if (isOtpVerified === false) {
        if (router.path !== '/(auth)/otp_verification') {
          router.replace({
            pathname: '/(auth)/otp_verification',
            params: { email: emailForOtp || user?.email, deviceName: deviceNameForOtp || Device.deviceName || 'UnknownDevice' },
          });
        }
        return; 
      }

      if (inAuthGroup) {
        if (userRole === 'admin' || userRole === 'user') { // 'user' est aussi un candidat
          router.replace('/(app)/home'); 
        } else if (userRole === 'interimaire') { 
          // NOUVEAU : Redirection conditionnelle pour l'intérimaire
          if (isContractActive === false) { // Si le contrat est inactif
            router.replace('/(app)/(interimaire)'); // Redirige vers l'espace candidat de l'intérimaire
          } else {
            router.replace('/(app)/(interimaire)'); // Redirige vers l'espace intérimaire
          }
        } else if (userRole === 'admin') { // Rôle Admin
          router.replace('/(app)/home'); 
        } else {
          router.replace('/(app)/home'); // Fallback pour les rôles non reconnus ou futurs rôles
        }
      } 
    } else { // Non authentifié
      if (inAppGroup || router.path === '/(auth)/otp_verification') { 
        router.replace('/(auth)'); 
      }
    }
  }, [inAuthGroup, inAppGroup, segments, user?.email, isLoggingOut]); 

  useEffect(() => {
    async function prepareApp() {
      try {
        setLoading(true);
        const storedToken = await AsyncStorage.getItem('user_token');

        if (storedToken) {
          try { 
            const userData = await fetchUser();
            if (userData) { // Si fetchUser réussit et renvoie des données utilisateur
              setToken(storedToken); // Le token est valide, donc on le garde
              handleRedirect(true, userData.role, userData.is_otp_verified, userData.is_contract_active);
            } else { // Si fetchUser renvoie null (ex: profil intérimaire non trouvé)
              handleRedirect(false, undefined, undefined, undefined);
            }
          } catch (e) { // Si fetchUser échoue (ex: 401 token invalide)
            handleRedirect(false, undefined, undefined, undefined);
          }
        } else { // Pas de token stocké
          handleRedirect(false, undefined, undefined, undefined);
        }
      } catch (err: any) {
        console.error('AuthProvider: Erreur globale dans prepareApp:', err); 
        setError('Failed to load session. Please log in.');
        await AsyncStorage.removeItem('user_token');
        setUser(null);
        setToken(null);
        handleRedirect(false, undefined, undefined, undefined);
      } finally {
        setLoading(false);
        setIsAppReady(true);
        await SplashScreenExpo.hideAsync();
      }
    }

    prepareApp();
  }, [fetchUser, handleRedirect]);

  useEffect(() => {
    if (isAppReady) {
      handleRedirect(!!user, user?.role, user?.is_otp_verified, user?.is_contract_active);
    }
  }, [isAppReady, user, handleRedirect]);


  const login = async (email: string, password: string, deviceName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const actualDeviceName = deviceName || Device.deviceName || 'UnknownDevice';
      const response = await loginUser(email, password, actualDeviceName);
      
      if (response.otp_required) {
        const minimalUser: User = { 
          id: response.user?.id || 0, 
          name: response.user?.name || 'Utilisateur', 
          email: response.email,
          role: response.user?.role || 'user', // Utilise 'user' comme fallback pour le rôle ici
          is_otp_verified: false,
          is_contract_active: response.user?.is_contract_active, 
        };
        setUser(minimalUser);
        setToken(null); // Pas de token si OTP requis
        handleRedirect(true, minimalUser.role, false, minimalUser.is_contract_active, email, actualDeviceName);
      } else {
        // NOUVEAU : Après un login réussi (pas d'OTP), recharger le profil complet de l'utilisateur
        await AsyncStorage.setItem('user_token', response.token); // D'abord, stocker le token
        const fullUser = await fetchUser(); // Puis, recharger l'utilisateur (inclut is_contract_active si intérimaire)
        
        setUser(fullUser);
        setToken(response.token);
        handleRedirect(true, fullUser.role, true, fullUser.is_contract_active);
      }
    } catch (err: any) {
      console.error('Login failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, passwordConfirmation: string, role?: string, deviceName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const actualDeviceName = deviceName || Device.deviceName || 'UnknownDevice';
      const response = await registerUser(name, email, password, passwordConfirmation, role, actualDeviceName);
      
      const minimalUser: User = { 
        id: response.user?.id || 0, 
        name: name, 
        email: email, 
        role: role || 'user', 
        is_otp_verified: false,
        is_contract_active: response.user?.is_contract_active, 
      };
      setUser(minimalUser);
      setToken(null); 
      handleRedirect(true, minimalUser.role, false, minimalUser.is_contract_active, email, actualDeviceName);
    } catch (err: any) {
      console.error('Registration failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true); 
    setLoading(true);
    setError(null);
    try {
      if (token) {
        await logoutUser(); 
      }
      
      await AsyncStorage.removeItem('user_token');
      setUser(null);
      setToken(null);

      setTimeout(() => {
        router.replace('/(auth)'); 
        setIsLoggingOut(false); 
      }, Platform.OS === 'ios' ? 100 : 300); 
    } catch (err: any) {
      console.error('Logout failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Déconnexion échouée.');
      await AsyncStorage.removeItem('user_token');
      setUser(null);
      setToken(null);
      setTimeout(() => {
        router.replace('/(auth)');
        setIsLoggingOut(false);
      }, Platform.OS === 'ios' ? 100 : 300);
    } finally {
      setLoading(false);
    }
  };


  const socialLogin = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
        const response = await socialLoginCallback(provider);
        if (response.user && response.user.role === 'interimaire') {
          const interimProfile = await getInterimProfile();
          if (interimProfile) {
            response.user.is_contract_active = interimProfile.is_contract_active;
          } else {
            response.user.is_contract_active = false;
          }
        }

        await AsyncStorage.setItem('user_token', response.token); // D'abord, stocker le token
        const fullUser = await fetchUser(); // Puis, recharger l'utilisateur (inclut is_contract_active si intérimaire)

        setUser(fullUser);
        setToken(response.token);
        handleRedirect(true, response.user.role, true, response.user.is_contract_active);
    } catch (err: any) {
        console.error('Social login failed:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Social login failed. Please try again.');
        throw err;
    } finally {
        setLoading(false);
    }
  };

  const sendOtp = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiSendOtp(email);
      Alert.alert('Succès', 'Un nouveau code OTP a été envoyé à votre email.');
    } catch (err: any) {
      console.error('Send OTP failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Échec de l\'envoi du code OTP.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email: string, otpCode: string, deviceName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiVerifyOtp(email, otpCode, deviceName);
      // NOUVEAU : Après vérification OTP réussie, recharger le profil complet de l'utilisateur
      await AsyncStorage.setItem('user_token', response.token); // D'abord, stocker le token
      const fullUser = await fetchUser(); // Puis, recharger l'utilisateur (inclut is_contract_active si intérimaire)

      setUser(fullUser);
      setToken(response.token);
      handleRedirect(true, fullUser.role, true, fullUser.is_contract_active);
    } catch (err: any) {
      console.error('Verify OTP failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Code OTP invalide ou expiré.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const clearError = () => setError(null);

  const authContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    logout,
    socialLogin,
    sendOtp,
    verifyOtp,
    clearError,
    isAppReady,
    fetchUser,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
