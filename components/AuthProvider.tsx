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
  socialLoginCallback
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
}

// IMPORTANT: Le SCHEME doit correspondre à celui que vous avez dans app.json pour votre application Expo
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'prorecruteapp' }); // makeRedirectUri for Expo Go
console.log('AuthProvider: Redirect URI généré:', REDIRECT_URI);

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, deviceName?: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  socialLogin: (provider: string) => Promise<void>;
  clearError: () => void;
  isAppReady: boolean;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  const segments = useSegments();
  // Vérifie si nous sommes dans le groupe d'authentification (ex: /(auth)/)
  const inAuthGroup = segments[0] === '(auth)';
  // Vérifie si nous sommes dans le groupe de l'application (ex: /(app)/)
  const inAppGroup = segments[0] === '(app)';

  // Fonction pour recharger le profil utilisateur depuis l'API
  const fetchUser = useCallback(async () => {
    try {
      const fetchedUser = await fetchUserProfile();
      setUser(fetchedUser);
      return fetchedUser;
    } catch (e) {
      console.error("Échec de la récupération du profil utilisateur:", e);
      await AsyncStorage.removeItem('user_token');
      setUser(null);
      setToken(null);
      throw e;
    }
  }, []);

  // Logique de redirection centralisée
  const handleRedirect = useCallback((authenticated: boolean, userRole: string | undefined) => {
    if (authenticated) {
      if (inAuthGroup) { // Si l'utilisateur est authentifié et dans le groupe auth
        if (userRole === 'user') {
          router.replace('/(app)/home');
        } else if (userRole === 'interimaire') {
          router.replace('/(app)/(interimaire)');
        } else {
          // Fallback pour les rôles non reconnus ou futurs rôles
          router.replace('/(app)/home');
        }
      }
    } else {
      if (inAppGroup) { // Si l'utilisateur n'est pas authentifié et dans le groupe app
        router.replace('/(auth)');
      }
    }
  }, [inAuthGroup, inAppGroup]);

  // Effet pour effectuer la configuration initiale de l'application et la vérification de l'authentification.
  useEffect(() => {
    async function prepareApp() {
      try {
        setLoading(true);
        const storedToken = await AsyncStorage.getItem('user_token');

        if (storedToken) {
          setToken(storedToken);
          const userData = await fetchUser();
          // Redirection initiale après la récupération du profil
          if (userData) {
            handleRedirect(true, userData.role);
          } else {
            // Si userData est null (token invalide), redirige vers l'authentification
            handleRedirect(false, undefined);
          }
        } else {
          handleRedirect(false, undefined);
        }
      } catch (err: any) {
        console.error('App preparation or initial authentication failed:', err.response?.data || err.message || err);
        setError('Failed to load session. Please log in.');
        await AsyncStorage.removeItem('user_token');
        setUser(null);
        setToken(null);
        handleRedirect(false, undefined); // Assure la redirection vers auth en cas d'erreur
      } finally {
        setLoading(false);
        setIsAppReady(true);
        await SplashScreenExpo.hideAsync();
      }
    }

    prepareApp();
  }, [fetchUser, handleRedirect]); // handleRedirect est une dépendance ici

  // Fonction de connexion
  const login = async (email: string, password: string, deviceName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const actualDeviceName = deviceName || Device.deviceName || 'UnknownDevice';
      const response = await loginUser(email, password, actualDeviceName);
      await AsyncStorage.setItem('user_token', response.token);
      setUser(response.user);
      setToken(response.token);
      // Redirige immédiatement après la connexion réussie
      handleRedirect(true, response.user.role);
    } catch (err: any) {
      console.error('Login failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fonction d'enregistrement
  const register = async (name: string, email: string, password: string, passwordConfirmation: string, role?: string) => {
    setLoading(true);
    setError(null);
    try {
      const actualDeviceName = Device.deviceName || 'UnknownDevice';
      const response = await registerUser(name, email, password, passwordConfirmation, role);
      await AsyncStorage.setItem('user_token', response.token);
      setUser(response.user);
      setToken(response.token);
      // Redirige immédiatement après l'enregistrement réussi
      handleRedirect(true, response.user.role);
    } catch (err: any) {
      console.error('Registration failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await logoutUser(); // <- si backend, sinon supprime cette ligne

      await AsyncStorage.removeItem('user_token');
      setUser(null);
      setToken(null);

      // 👇 Protection contre appel `router.replace()` après un unmount
      setTimeout(() => {
        router.replace('/(auth)');
      }, 100); // petit délai pour laisser React faire son clean-up
    } catch (err: any) {
      console.error('Logout failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Déconnexion échouée.');
      await AsyncStorage.removeItem('user_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };


  /**
   * [NOUVEAU] Gère le processus de connexion sociale via OAuth.
   * @param {string} provider - Le nom du fournisseur ('google', 'linkedin').
   */
  const socialLogin = async (provider: string) => {
    setLoading(true);
    setError(null);

    // L'URL de redirection vers votre API Laravel pour initier le flux OAuth
    // Assurez-vous que l'URL de votre API Laravel est correcte
    const LARAVEL_SOCIAL_REDIRECT_URL = `http://192.168.1.144:8000/api/auth/${provider}/redirect`;

    try {
      // Ouvre le navigateur pour le flux OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        LARAVEL_SOCIAL_REDIRECT_URL,
        REDIRECT_URI // C'est l'URI de redirection configuré dans Google Cloud Console et app.json
      );

      // Vérifier si le flux a été annulé ou a échoué
      if (result.type === 'success' && result.url) {
        // Analyser l'URL de retour pour extraire le code d'autorisation
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          console.log(`AuthProvider: Code d'autorisation reçu pour ${provider}:`, code);
          // Échanger le code d'autorisation avec votre backend Laravel
          const { user: loggedInUser, token: receivedToken } = await socialLoginCallback(provider, code);
          
          await AsyncStorage.setItem('user_token', receivedToken);
          setUser(loggedInUser);
          setToken(receivedToken);
          router.replace('/(app)/home'); // Naviguer vers l'espace authentifié
        } else {
          setError('Code d\'autorisation manquant dans la réponse OAuth.');
          console.error('AuthProvider: Code d\'autorisation manquant.');
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
