import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback, // Ajout de useCallback
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as SplashScreenExpo from 'expo-splash-screen';
import { 
  loginUser, 
  fetchUserProfile, 
  logoutUser, 
  registerUser, // Ajout de registerUser
  socialLoginCallback // Ajout de socialLoginCallback si utilisé
} from '../utils/api';
import { router, useSegments } from 'expo-router'; // Ajout de useSegments

// Garder le splash screen natif visible pendant le chargement des assets et la vérification de l'authentification
SplashScreenExpo.preventAutoHideAsync();

// Définir la forme de notre contexte d'authentification
interface User {
  id: number;
  name: string;
  email: string;
  role: string; // NOUVEAU : Ajout du rôle de l'utilisateur
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;
  expo_push_token?: string; // Si vous stockez le token sur le user
  profile_photo_url?: string;
  // Ajoutez d'autres champs de l'utilisateur ici
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, deviceName?: string) => Promise<void>; // deviceName optionnel car il peut être généré
  register: (name: string, email: string, password: string, passwordConfirmation: string, role?: string) => Promise<void>; // rôle optionnel
  logout: () => Promise<void>;
  socialLogin: (provider: string, code: string) => Promise<void>; // Ajout de socialLogin
  clearError: () => void;
  isAppReady: boolean;
  fetchUser: () => Promise<void>; // Exposer la fonction pour recharger le profil
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
  const inAuthGroup = segments[0] === '(auth)';
  const inAppGroup = segments[0] === '(app)';

  // Fonction pour recharger le profil utilisateur depuis l'API
  const fetchUser = useCallback(async () => {
    try {
      const fetchedUser = await fetchUserProfile();
      setUser(fetchedUser);
      return fetchedUser; // Retourne l'utilisateur pour une utilisation immédiate
    } catch (e) {
      console.error("Échec de la récupération du profil utilisateur:", e);
      await AsyncStorage.removeItem('user_token'); // Nettoie le token si invalide
      setUser(null);
      setToken(null); // Assurez-vous que le token local est aussi effacé
      throw e; // Propager l'erreur pour le gestionnaire prepareApp
    }
  }, []);

  // Effet pour effectuer la configuration initiale de l'application et la vérification de l'authentification.
  useEffect(() => {
    async function prepareApp() {
      try {
        setLoading(true);
        const storedToken = await AsyncStorage.getItem('user_token');

        if (storedToken) {
          setToken(storedToken);
          const userData = await fetchUser(); // Utilise la fonction fetchUser
          // Redirection basée sur le rôle après la récupération du profil
          if (userData) {
            handleRedirectBasedOnRole(userData.role);
          } else {
            // Si userData est null (token invalide), redirige vers l'authentification
            router.replace('/(auth)');
          }
        } else {
          router.replace('/(auth)');
        }
      } catch (err: any) {
        console.error('App preparation or initial authentication failed:', err.response?.data || err.message || err);
        setError('Failed to load session. Please log in.');
        await AsyncStorage.removeItem('user_token');
        setUser(null);
        setToken(null);
        router.replace('/(auth)');
      } finally {
        setLoading(false);
        setIsAppReady(true);
        await SplashScreenExpo.hideAsync();
      }
    }

    prepareApp();
  }, [fetchUser]); // fetchUser est une dépendance car elle est utilisée dans cet useEffect

  // Redirection basée sur le rôle de l'utilisateur
  const handleRedirectBasedOnRole = useCallback((role: string) => {
    if (role === 'user') {
      router.replace('/(app)/home'); // Redirige vers la navigation par onglets pour les candidats
    } else if (role === 'interimaire') {
      router.replace('/(app)/(interimaire)'); // Redirige vers l'espace intérimaire
    } else {
      // Rôle inconnu ou par défaut, redirige vers une page générique ou d'erreur
      router.replace('/(app)/home'); 
    }
  }, []);

  // Définir isAuthenticated à partir de l'état user
  const isAuthenticated = !!user;

  // Effet pour gérer les redirections après que l'état d'authentification change (ex: login/logout)
  useEffect(() => {
    if (isAppReady) {
      if (isAuthenticated && inAuthGroup) {
        // Si authentifié et dans le groupe d'authentification, redirige selon le rôle
        if (user?.role) {
          handleRedirectBasedOnRole(user.role);
        } else {
          // Fallback si le rôle n'est pas encore chargé
          router.replace('/(app)/home'); 
        }
      } else if (!isAuthenticated && inAppGroup) {
        // Si non authentifié et dans le groupe de l'application, redirige vers l'authentification
        router.replace('/(auth)');
      }
    }
  }, [isAppReady, isAuthenticated, inAuthGroup, inAppGroup, user?.role, handleRedirectBasedOnRole]);


  const login = async (email: string, password: string, deviceName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const actualDeviceName = deviceName || Device.deviceName || 'UnknownDevice';
      const response = await loginUser(email, password, actualDeviceName);
      await AsyncStorage.setItem('user_token', response.token);
      setUser(response.user); // L'objet user contient maintenant le rôle
      setToken(response.token);
      setIsAppReady(true); // Assurez-vous que l'app est prête pour la redirection
      handleRedirectBasedOnRole(response.user.role); // Redirige immédiatement après la connexion
    } catch (err: any) {
      console.error('Login failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      // Ne pas rediriger ici, laisser l'useEffect ou le composant de login gérer l'affichage de l'erreur
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, passwordConfirmation: string, role?: string) => {
    setLoading(true);
    setError(null);
    try {
      const actualDeviceName = Device.deviceName || 'UnknownDevice'; // Nécessaire pour Sanctum
      const response = await registerUser(name, email, password, passwordConfirmation, role);
      await AsyncStorage.setItem('user_token', response.token);
      setUser(response.user); // L'objet user contient maintenant le rôle
      setToken(response.token);
      setIsAppReady(true); // Assurez-vous que l'app est prête pour la redirection
      handleRedirectBasedOnRole(response.user.role); // Redirige immédiatement après l'enregistrement
    } catch (err: any) {
      console.error('Registration failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      throw err; // Propager l'erreur au formulaire d'inscription
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
      setIsAppReady(true); // Assurez-vous que l'app est prête pour la redirection
      router.replace('/(auth)'); // Redirige vers la page d'authentification après déconnexion
    } catch (err: any) {
      console.error('Logout failed:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Logout failed. Please try again.');
      await AsyncStorage.removeItem('user_token'); // Toujours nettoyer le token local même en cas d'erreur serveur
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = async (provider: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
        const response = await socialLoginCallback(provider, code) as { user: User; token: string };
        await AsyncStorage.setItem('user_token', response.token);
        setUser(response.user);
        setToken(response.token);
        setIsAppReady(true);
        handleRedirectBasedOnRole(response.user.role);
    } catch (err: any) {
        console.error('Social login failed:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Social login failed. Please try again.');
        throw err;
    } finally {
        setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const authContextValue = {
    user,
    token,
    isAuthenticated: !!user, // Dépend de la présence de l'objet user
    loading,
    error,
    login,
    register,
    logout,
    socialLogin,
    clearError,
    isAppReady,
    fetchUser, // Exposer la fonction fetchUser
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
