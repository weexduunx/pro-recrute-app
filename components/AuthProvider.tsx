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
  photo_profil?: string;
  is_otp_verified?: boolean;
  is_contract_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasSeenOnboarding: boolean;
  login: (email: string, password: string, deviceName?: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string, role?: string, deviceName?: string) => Promise<void>;
  logout: () => Promise<void>;
  socialLogin: (provider: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otpCode: string, deviceName: string) => Promise<void>;
  clearError: () => void;
  isAppReady: boolean;
  fetchUser: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

// IMPORTANT: Le SCHEME doit correspondre à celui que vous avez dans app.json pour votre application Expo
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'prorecruteapp' });
console.log('AuthProvider: Redirect URI généré:', REDIRECT_URI); // Débogage 
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Constants for AsyncStorage keys
const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  ONBOARDING_COMPLETED: 'onboarding_completed'
} as const;

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
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const inAppGroup = segments[0] === '(app)';
  const inOnboardingGroup = segments.includes('onboarding');

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
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      setUser(null);
      setToken(null);
      throw e; 
    }
  }, []);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  };

  const handleRedirect = useCallback((authenticated: boolean, userRole: string | undefined, isOtpVerified: boolean | undefined, isContractActive: boolean | undefined, emailForOtp?: string, deviceNameForOtp?: string) => {
    if (isLoggingOut) { 
      return;
    }

    // Priority 1: Handle OTP verification
    if (authenticated && isOtpVerified === false) {
      // Éviter les redirections multiples vers OTP
      const currentPath = router.pathname || '';
      if (!currentPath.includes('otp_verification')) {
        router.replace({
          pathname: '/(auth)/otp_verification',
          params: { email: emailForOtp || user?.email, deviceName: deviceNameForOtp || Device.deviceName || 'UnknownDevice' },
        });
      }
      return; 
    }

    // Priority 2: Handle onboarding for new users (not authenticated)
    if (!authenticated) {
      if (!hasSeenOnboarding && !inOnboardingGroup) {
        router.replace('/(auth)/onboarding/welcome');
        return;
      }
      
      // If onboarding completed or user is already in onboarding, handle normal auth flow
      if (inAppGroup || router.pathname === '/(auth)/otp_verification') { 
        router.replace('/(auth)'); 
      }
      return;
    }

    // Priority 3: Handle authenticated users - redirect to appropriate app sections
    if (authenticated && isOtpVerified !== false) {
      if (inAuthGroup || inOnboardingGroup) {
        // Redirect based on user role
        switch (userRole) {
          case 'admin':
            router.replace('/(app)/home'); 
            break;
          case 'user': // Candidat
            router.replace('/(app)/home'); 
            break;
          case 'interimaire':
            // Conditional redirect based on contract status
            if (isContractActive === false) {
              router.replace('/(app)/(interimaire)'); // Inactive contract - candidate space
            } else {
              router.replace('/(app)/(interimaire)'); // Active contract - interim space
            }
            break;
          default:
            router.replace('/(app)/home'); // Fallback
            break;
        }
      }
    }
  }, [inAuthGroup, inAppGroup, inOnboardingGroup, user?.email, isLoggingOut, hasSeenOnboarding]); 

  useEffect(() => {
    async function prepareApp() {
      try {
        setLoading(true);
        
        // Check onboarding status first
        const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
        setHasSeenOnboarding(onboardingCompleted === 'true');
        
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);

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
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
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
    if (isAppReady && !isLoggingOut) {
      handleRedirect(!!user, user?.role, user?.is_otp_verified, user?.is_contract_active);
    }
  }, [isAppReady, user, handleRedirect, hasSeenOnboarding, isLoggingOut]);

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
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, response.token); // D'abord, stocker le token
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
      
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      setUser(null);
      setToken(null);

      setTimeout(() => {
        // After logout, check if user has seen onboarding
        if (hasSeenOnboarding) {
          router.replace('/(auth)'); // Go directly to auth
        } else {
          router.replace('/(auth)/onboarding/welcome'); // Show onboarding
        }
        setIsLoggingOut(false); 
      }, Platform.OS === 'ios' ? 100 : 300); 
    } catch (err: any) {
      console.error('Logout failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Déconnexion échouée.');
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      setUser(null);
      setToken(null);
      setTimeout(() => {
        if (hasSeenOnboarding) {
          router.replace('/(auth)');
        } else {
          router.replace('/(auth)/onboarding/welcome');
        }
        setIsLoggingOut(false);
      }, Platform.OS === 'ios' ? 100 : 300);
    } finally {
      setLoading(false);
    }
  };

  /**
    * [NOUVEAU] Gère le processus de connexion sociale via OAuth.
    * Gère le processus de connexion sociale via OAuth.
    * @param {string} provider - Le nom du fournisseur ('google', 'linkedin').
    */
  const socialLogin = async (provider: string) => {
    setLoading(true);
    setError(null);

    // L'URL de redirection vers votre API Laravel pour initier le flux OAuth
    // Assurez-vous que l'URL de votre API Laravel est correcte
    const LARAVEL_SOCIAL_REDIRECT_URL = `http://192.168.1.144:8000/api/auth/${provider}/redirect`; // Utiliser l'IP locale pour le dev

    try {
      const result = await WebBrowser.openAuthSessionAsync(
        LARAVEL_SOCIAL_REDIRECT_URL,
        REDIRECT_URI
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const tokenFromUrl = url.searchParams.get('token');
        const roleFromUrl = url.searchParams.get('role');
        const errorFromUrl = url.searchParams.get('error');

        if (errorFromUrl) {
          setError(decodeURIComponent(errorFromUrl));
          console.error(`AuthProvider: Erreur OAuth depuis l'API: ${decodeURIComponent(errorFromUrl)}`);
        } else if (tokenFromUrl) {
          const userFromApi = await fetchUserProfile(); // Récupérer l'utilisateur complet via le token

          // Récupérer le profil intérimaire si nécessaire
          if (userFromApi && userFromApi.role === 'interimaire') {
            const interimProfile = await (await import('../utils/api')).getInterimProfile();
            if (interimProfile) {
              userFromApi.is_contract_active = interimProfile.is_contract_active;
            } else {
              userFromApi.is_contract_active = false;
            }
          }

          await AsyncStorage.setItem('user_token', tokenFromUrl);
          setUser(userFromApi);
          setToken(tokenFromUrl);
          handleRedirect(true, userFromApi?.role, userFromApi?.is_otp_verified, userFromApi?.is_contract_active);

        } else {
          setError('Token manquant dans la réponse OAuth.');
          console.error('AuthProvider: Token manquant après Social Login.');
        }
      } else if (result.type === 'cancel') {
        setError('Connexion annulée par l\'utilisateur.');
      } else {
        setError('Échec de la connexion OAuth.');
      }
    } catch (err: any) {
      console.error(`Échec de la connexion sociale via ${provider}:`, err.response?.data || err.message);
      setError(err.response?.data?.message || `Échec de la connexion via ${provider}. Veuillez réessayer.`);
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
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, response.token); // D'abord, stocker le token
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
    hasSeenOnboarding,
    login,
    register,
    logout,
    socialLogin,
    sendOtp,
    verifyOtp,
    clearError,
    isAppReady,
    fetchUser,
    completeOnboarding,
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