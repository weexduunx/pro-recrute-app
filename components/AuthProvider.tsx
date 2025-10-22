import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import {Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useLanguage } from './LanguageContext';
import {
  loginUser as apiLoginUser,
  fetchUserProfile as apiFetchUserProfile,
  logoutUser as apiLogoutUser,
  registerUser as apiRegisterUser,
  socialLoginCallback,
  getInterimProfile,
  sendOtp as apiSendOtp,
  verifyOtp as apiVerifyOtp,
  apiRequest,
} from '../utils/api';
import { router, useSegments } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { googleAuth } from '../services/googleAuth';
import { linkedinAuth } from '../services/linkedinAuth';
import { PasswordSetupModal } from './PasswordSetupModal';

// Import conditionnel pour Device
let Device;
try {
  Device = require('expo-device');
} catch (error) {
  console.warn('expo-device not available:', (error as Error).message);
  Device = { deviceName: 'UnknownDevice' };
}

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
  candidat_profile?: {
    competences?: Array<{
      id: number;
      libelle_competence: string;
      pivot?: { niveau_competence?: number };
    }>;
    experiences?: Array<{
      titre: string;
      entreprise: string;
      lieux?: string;
      date_debut: string;
      date_fin: string;
      missions?: string;
    }>;
    formations?: Array<{
      nomDiplome: string;
      universite: string;
      dateDebut?: string;
      dateFin?: string;
      description?: string;
    }>;
    parsed_cv?: {
      full_name?: string;
      email?: string;
      phone?: string;
      summary?: string;
    };
    [key: string]: any;
  };
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
  showPasswordSetupModal: boolean;
  hidePasswordSetupModal: () => void;
  showPasswordSetupModalForProvider: (provider: 'google' | 'linkedin', token: string) => void;
  pendingPasswordSetup: {
    provider: 'google' | 'linkedin' | null;
    token: string;
  } | null;
  fetchUser: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  // Méthodes internes exposées pour LinkedIn callback
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  handleRedirect: (authenticated: boolean, userRole: string | undefined, isOtpVerified: boolean | undefined, isContractActive: boolean | undefined, emailForOtp?: string, deviceNameForOtp?: string) => void;
}

// IMPORTANT: Utiliser le scheme configuré dans app.json avec le bon path
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'prorecruteapp',
  path: 'auth'
});
console.log('AuthProvider: Redirect URI généré:', REDIRECT_URI); // Débogage 
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Constants for AsyncStorage keys
const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  PASSWORD_SETUP_COMPLETED: 'password_setup_completed_users'
} as const;

interface AuthProviderProps {
  children: ReactNode;
}

// Fonctions utilitaires pour gérer les utilisateurs qui ont configuré leur mot de passe
export const hasPasswordBeenSetup = async (userEmail: string): Promise<boolean> => {
  try {
    const setupUsers = await AsyncStorage.getItem(STORAGE_KEYS.PASSWORD_SETUP_COMPLETED);
    if (!setupUsers) return false;
    const users = JSON.parse(setupUsers);
    return users.includes(userEmail);
  } catch (error) {
    console.error('Erreur lors de la vérification du setup mot de passe:', error);
    return false;
  }
};

export const markPasswordAsSetup = async (userEmail: string): Promise<void> => {
  try {
    const setupUsers = await AsyncStorage.getItem(STORAGE_KEYS.PASSWORD_SETUP_COMPLETED);
    let users = setupUsers ? JSON.parse(setupUsers) : [];
    if (!users.includes(userEmail)) {
      users.push(userEmail);
      await AsyncStorage.setItem(STORAGE_KEYS.PASSWORD_SETUP_COMPLETED, JSON.stringify(users));
    }
  } catch (error) {
    console.error('Erreur lors du marquage du setup mot de passe:', error);
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false);
  const [pendingPasswordSetup, setPendingPasswordSetup] = useState<{
    provider: 'google' | 'linkedin' | null;
    token: string;
  } | null>(null);

  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const inAppGroup = segments[0] === '(app)';
  const inOnboardingGroup = segments.includes('onboarding');

  const fetchUser = useCallback(async () => {
    try {
      const fetchedUser = await apiFetchUserProfile();
      if (fetchedUser && fetchedUser.role === 'interimaire') {
        try {
          const interimProfile = await getInterimProfile();
          if (interimProfile) {
            fetchedUser.is_contract_active = interimProfile.is_contract_active;
          } else {
            fetchedUser.is_contract_active = false;
          }
        } catch (interimError: any) {
          console.warn("AuthProvider: Erreur récupération profil intérimaire:", interimError.message);
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

  const refreshUserProfile = useCallback(async () => {
    try {
      console.log('Rechargement du profil utilisateur avec toutes les relations...');
      const fetchedUser = await apiFetchUserProfile();
      if (fetchedUser && fetchedUser.role === 'interimaire') {
        try {
          const interimProfile = await getInterimProfile();
          if (interimProfile) {
            fetchedUser.is_contract_active = interimProfile.is_contract_active;
          } else {
            fetchedUser.is_contract_active = false;
          }
        } catch (interimError: any) {
          console.warn("AuthProvider: Erreur récupération profil intérimaire lors du refresh:", interimError.message);
          fetchedUser.is_contract_active = false;
        }
      }
      console.log('Profil utilisateur rechargé:', {
        userId: fetchedUser?.id,
        hasCandidatProfile: !!fetchedUser?.candidat_profile,
        competencesCount: fetchedUser?.candidat_profile?.competences?.length || 0,
        experiencesCount: fetchedUser?.candidat_profile?.experiences?.length || 0,
        hasParsedCv: !!fetchedUser?.candidat_profile?.parsed_cv?.summary
      });
      setUser(fetchedUser);
      return fetchedUser;
    } catch (e: any) {
      console.error("AuthProvider: Échec de refreshUserProfile:", e);
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
    if (isLoggingOut || !isAppReady) {
      return;
    }

    // Priority 1: Handle OTP verification
    if (authenticated && isOtpVerified === false) {
      // Éviter les redirections multiples vers OTP
      const currentPath = router.pathname || '';
      if (!currentPath.includes('otp_verification')) {
        router.replace({
          pathname: '/(auth)/otp_verification',
          params: { email: emailForOtp || user?.email, deviceName: deviceNameForOtp || (Platform.OS === 'web' ? 'WebBrowser' : 'UnknownDevice') },
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
  }, [inAuthGroup, inAppGroup, inOnboardingGroup, user?.email, isLoggingOut, hasSeenOnboarding, isAppReady]); 

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAppReady, user, hasSeenOnboarding, isLoggingOut]);

  const login = async (email: string, password: string, deviceName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const actualDeviceName = deviceName || (Platform.OS === 'web' ? 'WebBrowser' : 'UnknownDevice');
      const response = await apiLoginUser(email, password, actualDeviceName);
      
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
      const actualDeviceName = deviceName || (Platform.OS === 'web' ? 'WebBrowser' : 'UnknownDevice');
      const response = await apiRegisterUser(name, email, password, passwordConfirmation, role, actualDeviceName);
      
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
        await apiLogoutUser(); 
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
    * Nouvelle méthode de connexion sociale utilisant l'API Google officielle
    * @param {string} provider - Le nom du fournisseur ('google', 'linkedin').
    */
  const socialLogin = async (provider: string) => {
    setLoading(true);
    setError(null);

    try {
      if (provider === 'google') {
        console.log('🚀 Démarrage de la connexion Google...');
        
        // Utiliser le service Google Auth
        const googleResult = await googleAuth.signIn();
        
        console.log('✅ Connexion Google réussie, envoi au backend...');
        
        // Envoyer les informations au backend
        const response = await apiRequest('/auth/google/token', {
          method: 'POST',
          body: {
            idToken: googleResult.idToken,
            accessToken: googleResult.accessToken,
            user: googleResult.user
          }
        });

        if (response.success) {
          const { user: userFromApi, token: tokenFromApi } = response;
          
          // D'abord sauvegarder le token et mettre à jour le contexte
          await AsyncStorage.setItem('user_token', tokenFromApi);
          setToken(tokenFromApi);
          
          // Puis récupérer le profil intérimaire si nécessaire (maintenant avec le token)
          if (userFromApi && userFromApi.role === 'interimaire') {
            try {
              const interimProfile = await getInterimProfile();
              if (interimProfile) {
                userFromApi.is_contract_active = interimProfile.is_contract_active;
              } else {
                userFromApi.is_contract_active = false;
              }
            } catch (interimError: any) {
              console.warn("AuthProvider: Erreur récupération profil intérimaire lors du social login:", interimError.message);
              userFromApi.is_contract_active = false;
            }
          }

          setUser(userFromApi);

          // Vérifier si l'utilisateur doit configurer son mot de passe
          // Mais seulement s'il ne l'a pas déjà fait
          const hasAlreadySetupPassword = await hasPasswordBeenSetup(userFromApi.email);
          if (response.requires_password_setup && response.token && !hasAlreadySetupPassword) {
            showPasswordSetupModalForProvider('google', response.token);
          }

          console.log('✅ Authentification Google complète');
          handleRedirect(true, userFromApi?.role, userFromApi?.is_otp_verified, userFromApi?.is_contract_active);
        } else {
          setError(response.message || 'Erreur lors de l\'authentification Google');
        }
      } else if (provider === 'linkedin') {
        console.log('🔗 Démarrage de la connexion LinkedIn...');
        
        try {
          // Utiliser le service LinkedIn Auth pour ouvrir le navigateur
          const linkedinResult = await linkedinAuth.signIn();
          
          console.log('✅ Navigateur LinkedIn fermé, le traitement se poursuivra dans linkedin-callback.tsx');
          
          // Le traitement complet sera fait par la page linkedin-callback.tsx
          // qui gérera l'échange du code et l'authentification
          
        } catch (error: any) {
          // console.error('Erreur LinkedIn Auth:', error);
          throw error;
        }
      } else {
        setError(`Fournisseur ${provider} non supporté`);
      }
    } catch (err: any) {
      // console.error(`Échec de la connexion sociale via ${provider}:`, err);
      setError(err.message || `Échec de la connexion via ${provider}. Veuillez réessayer.`);
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiSendOtp(email);
      Alert.alert(t('Succès'), t('Un nouveau code OTP a été envoyé à votre email.'));
    } catch (err: any) {
      console.error('Send OTP failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || t('Échec de l\'envoi du code OTP.'));
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

  const hidePasswordSetupModal = () => {
    setShowPasswordSetupModal(false);
    setPendingPasswordSetup(null);
  };

  const showPasswordSetupModalForProvider = (provider: 'google' | 'linkedin', token: string) => {
    setPendingPasswordSetup({ provider, token });
    setShowPasswordSetupModal(true);
  };

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
    showPasswordSetupModal,
    hidePasswordSetupModal,
    showPasswordSetupModalForProvider,
    pendingPasswordSetup,
    fetchUser,
    refreshUserProfile,
    completeOnboarding,
    // Méthodes internes exposées pour LinkedIn callback
    setUser,
    setToken,
    setError,
    setLoading,
    handleRedirect,
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