import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
    useRef,
} from 'react';
import { Platform, Alert } from 'react-native';
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
import * as Notifications from 'expo-notifications';

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

  // NOUVEAU: État pour éviter les boucles de redirection
  const [hasAttemptedOnboardingRedirect, setHasAttemptedOnboardingRedirect] = useState(false);

  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const inAppGroup = segments[0] === '(app)';
  const inOnboardingGroup = segments.some(segment => segment === 'onboarding');
  const lastProcessedNotificationId = useRef<string | null>(null);

  // NOUVEAU: Reset du flag quand l'utilisateur change ou quand l'onboarding est complété
  useEffect(() => {
    if (hasSeenOnboarding || user) {
      setHasAttemptedOnboardingRedirect(false);
    }
  }, [hasSeenOnboarding, user]);

  const handleRedirect = useCallback((authenticated: boolean, userRole: string | undefined, isOtpVerified: boolean | undefined, isContractActive: boolean | undefined, emailForOtp?: string, deviceNameForOtp?: string) => {
    if (isLoggingOut) {
      return;
    }

    // Priority 1: Handle OTP verification
    if (authenticated && isOtpVerified === false) {
      if (router.canGoBack() && segments.length > 0 && segments[segments.length - 1] !== 'otp_verification') {
        router.replace({
          pathname: '/(auth)/otp_verification',
          params: { email: emailForOtp || user?.email, deviceName: deviceNameForOtp || Device.deviceName || 'UnknownDevice' },
        });
      }
      return;
    }

    // Priority 2: Handle onboarding for new users (not authenticated)
    if (!authenticated) {
      if (!hasSeenOnboarding) {
        // CORRECTION: Vérifier si on a déjà tenté la redirection vers l'onboarding
        if (!inOnboardingGroup && !hasAttemptedOnboardingRedirect) {
          console.log('AuthProvider: Première tentative de redirection vers onboarding');
          setHasAttemptedOnboardingRedirect(true);

          // Utiliser un setTimeout pour éviter les conflits de navigation
          setTimeout(() => {
            try {
              router.replace('/(auth)/onboarding/welcome');
            } catch (error) {
              console.error('AuthProvider: Erreur navigation onboarding:', error);
              // Si la navigation échoue, marquer l'onboarding comme vu pour éviter la boucle
              setHasSeenOnboarding(true);
              router.replace('/(auth)');
            }
          }, 100);
        }
        return;
      }

      // If onboarding completed, handle normal auth flow
      if (inAppGroup || segments.some(segment => segment === 'otp_verification')) {
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
            router.replace('/(app)/(interimaire)');
            break;
          default:
            router.replace('/(app)/home'); // Fallback
            break;
        }
      }
    }
  }, [inAuthGroup, inAppGroup, inOnboardingGroup, segments, user?.email, isLoggingOut, hasSeenOnboarding, hasAttemptedOnboardingRedirect]);

  // MODIFIÉ: useEffect avec dependency plus précise
  useEffect(() => {
    if (isAppReady && !loading) {
      handleRedirect(!!user, user?.role, user?.is_otp_verified, user?.is_contract_active);
    }
  }, [isAppReady, user, handleRedirect, hasSeenOnboarding, loading]);

  // Fonction completeOnboarding mise à jour
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      setHasSeenOnboarding(true);
      setHasAttemptedOnboardingRedirect(false); // NOUVEAU: Reset du flag
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  };

  // NOUVELLE FONCTION: Pour forcer le skip de l'onboarding en cas de problème
  const forceSkipOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      setHasSeenOnboarding(true);
      setHasAttemptedOnboardingRedirect(false);
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error force skipping onboarding:', error);
    }
  };

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

  // NOUVEAU: Écouteur de notificationResponse
  // Gère les actions lorsque l'utilisateur tape sur une notification
  useEffect(() => {
    // Écouteur pour les notifications reçues (quand l'app est au premier plan)
    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("AuthProvider: Notification reçue (foreground):", notification);
      // Optionnel: Afficher une alerte ou un Toast si l'app est déjà ouverte
      // Alert.alert(notification.request.content.title, notification.request.content.body);
    });

    // Écouteur pour les réponses aux notifications (quand l'utilisateur tape dessus)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const notificationData = response.notification.request.content.data;
      console.log("AuthProvider: Notification tapée. Données:", notificationData);

      // Pour éviter de traiter la même notification plusieurs fois (surtout au démarrage de l'app)
      if (lastProcessedNotificationId.current === response.notification.request.identifier) {
        console.log("AuthProvider: Notification déjà traitée, ignorer.");
        return;
      }

      // Gérer les différents types de notifications
      if (notificationData.type === 'feuille_soins_status_update') {
        const { feuille_id, encrypted_id, screen, action, new_status } = notificationData;
        
        // Assurez-vous que l'application est prête avant de naviguer
        if (!isAppReady || !user) {
          // Si l'app n'est pas prête, stocke les données pour les traiter après le démarrage
          console.log("AuthProvider: App pas prête pour navigation, stockage des données de notification.");
          AsyncStorage.setItem('pending_notification_data', JSON.stringify(notificationData));
          return;
        }

        // Naviguer vers l'écran IPM File avec les paramètres
        if (screen === 'ipm_file' && action === 'download_feuille') {
          console.log(`AuthProvider: Redirection vers IPM File pour feuille ID: ${feuille_id} (Encrypté: ${encrypted_id}).`);
          router.push({
            pathname: '/(app)/(interimaire)/ipm_file', // Le chemin absolu vers votre écran IPM File
            params: {
              feuille_id: feuille_id?.toString() || '',
              encrypted_feuille_id: encrypted_id?.toString() || null,
              action: 'download_feuille_from_notification', // Action spécifique pour la page IPM File
              new_status: new_status?.toString() || null, // Convert new_status to string or null
            },
          });
          lastProcessedNotificationId.current = response.notification.request.identifier; // Marquer comme traité
        }
      } else if (notificationData.type === 'candidature_status_update') { // NOUVEAU: Gérer les notifications de candidature
        const { candidature_id, offre_id, encrypted_id, screen, action, new_status } = notificationData;

        if (!isAppReady || !user) {
          console.log("AuthProvider: App pas prête pour navigation, stockage des données de notification de candidature.");
          AsyncStorage.setItem('pending_notification_data', JSON.stringify(notificationData));
          return;
        }

        // Naviguer vers l'écran de détails de candidature
        if (screen === 'candidature_details' && action === 'view_candidature') {
          console.log(`AuthProvider: Redirection vers Candidature Details pour candidature ID: ${candidature_id} (Encrypté: ${encrypted_id}).`);
          router.push({
            pathname: '/(app)/candidature/application_details', // Chemin absolu vers votre écran de détails de candidature
            params: {
              id: candidature_id?.toString() || '', // Convert candidature_id to string or empty string if undefined
              encrypted_id: encrypted_id?.toString() || null, // Convert encrypted_id to string or null
              action: 'view_candidature_from_notification', // Action spécifique
              new_status: new_status?.toString() || null,
            },
          });
          lastProcessedNotificationId.current = response.notification.request.identifier;
        }
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(receivedListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [isAppReady, user, router, segments]); // Ajouter user, router, segments comme dépendances

  // NOUVEAU: Gérer les notifications en attente au démarrage (si l'app était fermée)
  useEffect(() => {
    async function handlePendingNotification() {
      if (isAppReady && user) {
        const pendingDataString = await AsyncStorage.getItem('pending_notification_data');
        if (pendingDataString) {
          await AsyncStorage.removeItem('pending_notification_data'); // Supprimer immédiatement
          const notificationData = JSON.parse(pendingDataString);
          console.log("AuthProvider: Traitement notification en attente:", notificationData);
          
          if (notificationData.type === 'feuille_soins_status_update') {
            const { feuille_id, encrypted_id, screen, action, new_status } = notificationData;
            if (screen === 'ipm_file' && action === 'download_feuille') {
              router.push({
                pathname: '/(app)/(interimaire)/ipm_file',
                params: {
                  feuille_id: feuille_id,
                  encrypted_feuille_id: encrypted_id,
                  action: 'download_feuille_from_notification',
                  new_status: new_status,
                },
              });
            }
          } else if (notificationData.type === 'candidature_status_update') { // NOUVEAU: Gérer la candidature en attente
            const { candidature_id, offre_id, encrypted_id, screen, action, new_status } = notificationData;
            if (screen === 'candidature_details' && action === 'view_candidature') {
              router.push({
                pathname: '/(app)/candidature/application_details',
                params: {
                  id: candidature_id,
                  encrypted_id: encrypted_id,
                  action: 'view_candidature_from_notification',
                  new_status: new_status,
                },
              });
            }
          }
        }
      }
    }
    handlePendingNotification();
  }, [isAppReady, user, router]);

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
          // CORRECTION: Utiliser push au lieu de replace pour l'onboarding
          console.log('AuthProvider: Logout - redirection vers onboarding');
          try {
            router.push('/(auth)/onboarding/welcome');
          } catch (error) {
            console.error('AuthProvider: Erreur navigation onboarding après logout:', error);
            router.replace('/(auth)');
          }
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
          try {
            router.push('/(auth)/onboarding/welcome');
          } catch (error) {
            console.error('AuthProvider: Erreur navigation onboarding après logout (error case):', error);
            router.replace('/(auth)');
          }
        }
        setIsLoggingOut(false);
      }, Platform.OS === 'ios' ? 100 : 300);
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
    const LARAVEL_SOCIAL_REDIRECT_URL = `http://192.168.1.144:8000/api/auth/${provider}/redirect`; // Utiliser l'IP locale pour le dev

    try {
      const result = await WebBrowser.openAuthSessionAsync(
        LARAVEL_SOCIAL_REDIRECT_URL,
        REDIRECT_URI
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const tokenFromUrl = url.searchParams.get('token');
        const roleFromUrl = url.searchParams.get('role'); // Le rôle est maintenant passé par l'URL
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
  
  // const socialLogin = async (provider: string) => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const response = await socialLoginCallback(provider);
  //     if (response.user && response.user.role === 'interimaire') {
  //       const interimProfile = await getInterimProfile();
  //       if (interimProfile) {
  //         response.user.is_contract_active = interimProfile.is_contract_active;
  //       } else {
  //         response.user.is_contract_active = false;
  //       }
  //     }

  //     await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, response.token); // D'abord, stocker le token
  //     const fullUser = await fetchUser(); // Puis, recharger l'utilisateur (inclut is_contract_active si intérimaire)

  //     setUser(fullUser);
  //     setToken(response.token);
  //     handleRedirect(true, response.user.role, true, response.user.is_contract_active);
  //   } catch (err: any) {
  //     console.error('Social login failed:', err.response?.data || err.message);
  //     setError(err.response?.data?.message || 'Social login failed. Please try again.');
  //     throw err;
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
    forceSkipOnboarding, // NOUVEAU: Fonction d'urgence
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