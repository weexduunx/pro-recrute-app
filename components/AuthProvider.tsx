import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
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

  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const inAppGroup = segments[0] === '(app)';

  const fetchUser = useCallback(async () => {
    console.log("AuthProvider: Début fetchUser.");
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
      console.log("AuthProvider: fetchUser réussi, utilisateur:", fetchedUser?.email, "Rôle:", fetchedUser?.role, "OTP Vérifié:", fetchedUser?.is_otp_verified, "Contrat actif:", fetchedUser?.is_contract_active);
      return fetchedUser;
    } catch (e) {
      console.error("AuthProvider: Échec de fetchUser:", e);
      await AsyncStorage.removeItem('user_token');
      setUser(null);
      setToken(null);
      throw e;
    }
  }, []);

  const handleRedirect = useCallback((authenticated: boolean, userRole: string | undefined, isOtpVerified: boolean | undefined, isContractActive: boolean | undefined, emailForOtp?: string, deviceNameForOtp?: string) => {
    console.log(`AuthProvider: handleRedirect appelé. Auth: ${authenticated}, Role: ${userRole}, OTP Verified: ${isOtpVerified}, Contract Active: ${isContractActive}, Current Segments: ${segments.join('/')}`);

    if (authenticated) {
      if (isOtpVerified === false) {
        if (router.path !== '/(auth)/otp_verification') {
          console.log("AuthProvider: Utilisateur non vérifié OTP, redirection vers otp_verification.");
          router.replace({
            pathname: '/(auth)/otp_verification',
            params: { email: emailForOtp || user?.email, deviceName: deviceNameForOtp || Device.deviceName || 'UnknownDevice' },
          });
        }
        return;
      }

      if (inAuthGroup) {
        if (userRole === 'user') {
          console.log("AuthProvider: Redirection vers / (app) / home (candidat).");
          router.replace('/(app)/home');
        } else if (userRole === 'interimaire') {
          if (isContractActive === false) {
            console.log("AuthProvider: Contrat intérimaire inactif, redirection vers espace candidat.");
            router.replace('/(app)/(interimaire)');
          } else {
            console.log("AuthProvider: Contrat intérimaire actif, redirection vers espace intérimaire.");
            router.replace('/(app)/(interimaire)');
          }
        } else {
          console.log("AuthProvider: Rôle non reconnu, redirection vers / (app) / home.");
          router.replace('/(app)/home');
        }
      } else {
        console.log("AuthProvider: Déjà dans le groupe app et authentifié/vérifié, pas de redirection.");
      }
    } else {
      if (inAppGroup) {
        console.log("AuthProvider: Redirection vers / (auth) / (non authentifié).");
        router.replace('/(auth)');
      } else {
        console.log("AuthProvider: Déjà dans le groupe auth et non authentifié, pas de redirection.");
      }
    }
  }, [inAuthGroup, inAppGroup, segments, user?.email]);

  useEffect(() => {
    async function prepareApp() {
      console.log("AuthProvider: Début prepareApp.");
      try {
        setLoading(true);
        const storedToken = await AsyncStorage.getItem('user_token');
        console.log("AuthProvider: Token stocké:", storedToken ? "Présent" : "Absent");

        if (storedToken) {
          const userData = await fetchUser();
          if (userData) {
            setToken(storedToken);
            handleRedirect(true, userData.role, userData.is_otp_verified, userData.is_contract_active);
          } else {
            handleRedirect(false, undefined, undefined, undefined);
          }
        } else {
          handleRedirect(false, undefined, undefined, undefined);
        }
      } catch (err: any) {
        console.error('AuthProvider: Erreur dans prepareApp:', err);
        setError('Failed to load session. Please log in.');
        await AsyncStorage.removeItem('user_token');
        setUser(null);
        setToken(null);
        handleRedirect(false, undefined, undefined, undefined);
      } finally {
        setLoading(false);
        setIsAppReady(true);
        console.log("AuthProvider: setIsAppReady(true) et SplashScreen.hideAsync().");
        await SplashScreenExpo.hideAsync();
      }
    }

    prepareApp();
  }, [fetchUser, handleRedirect]);

  useEffect(() => {
    if (isAppReady) {
      if (user) {
        handleRedirect(true, user.role, user.is_otp_verified, user.is_contract_active);
      } else {
        handleRedirect(false, undefined, undefined, undefined);
      }
    }
  }, [isAppReady, user, handleRedirect]);


  const login = async (email: string, password: string, deviceName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const actualDeviceName = deviceName || Device.deviceName || 'UnknownDevice';
      const response = await loginUser(email, password, actualDeviceName);
      
      if (response.otp_required) {
        // NOUVEAU : Construire un objet user minimal pour l'état
        const minimalUser: User = { 
          id: response.user?.id || 0, // ID peut être 0 ou un ID temporaire si le backend le renvoie
          name: response.user?.name || 'Utilisateur',
          email: response.email,
          role: response.user?.role || 'candidate', // Utiliser le rôle renvoyé ou un défaut
          is_otp_verified: false,
          is_contract_active: response.user?.is_contract_active, // Si le backend le renvoie
        };
        setUser(minimalUser);
        setToken(null); // Correct : Ne pas stocker le token complet si OTP requis
        handleRedirect(true, minimalUser.role, false, minimalUser.is_contract_active, email, actualDeviceName);
      } else {
        // Si OTP n'est PAS requis, alors le token est complet, on le stocke
        // Assurez-vous que response.user est complet ici ou fetchUserProfile
        const fullUser = response.user || await fetchUserProfile(); // Fallback au cas où user ne serait pas complet
        if (fullUser && fullUser.role === 'interimaire' && fullUser.is_contract_active === undefined) {
          const interimProfile = await getInterimProfile();
          if (interimProfile) {
            fullUser.is_contract_active = interimProfile.is_contract_active;
          } else {
            fullUser.is_contract_active = false;
          }
        }
        await AsyncStorage.setItem('user_token', response.token);
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
      
      // NOUVEAU : Construire un objet user minimal pour l'état après inscription
      const minimalUser: User = { 
        id: response.user?.id || 0, // ID peut être 0 ou un ID temporaire si le backend le renvoie
        name: name, // Nom vient de l'input
        email: email, // Email vient de l'input
        role: role || 'candidate', // Rôle choisi ou par défaut
        is_otp_verified: false,
        is_contract_active: response.user?.is_contract_active, // Si le backend le renvoie
      };
      setUser(minimalUser);
      setToken(null); // Correct : Ne pas stocker le token complet après inscription, car OTP requis
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
    setLoading(true);
    setError(null);
    try {
      await logoutUser();
      await AsyncStorage.removeItem('user_token');
      setUser(null);
      setToken(null);
      handleRedirect(false, undefined, undefined, undefined);
    } catch (err: any) {
      console.error('Logout failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Logout failed. Please try again.');
      await AsyncStorage.removeItem('user_token');
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
        await AsyncStorage.setItem('user_token', response.token);
        setUser(response.user);
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
      await AsyncStorage.setItem('user_token', response.token);
      setUser(response.user);
      setToken(response.token);
      if (response.user && response.user.role === 'interimaire') {
        const interimProfile = await getInterimProfile();
        if (interimProfile) {
          response.user.is_contract_active = interimProfile.is_contract_active;
        } else {
          response.user.is_contract_active = false;
        }
      }
      handleRedirect(true, response.user.role, true, response.user.is_contract_active);
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
