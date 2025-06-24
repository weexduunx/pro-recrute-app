import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as SplashScreenExpo from "expo-splash-screen";
import {
  loginUser,
  fetchUserProfile,
  logoutUser,
  socialLoginCallback,
} from "../utils/api";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser"; // Importer WebBrowser pour les deux
import * as AuthSession from "expo-auth-session"; // Importer AuthSession pour les deux

// [RETIRÉ] import { GoogleSignin } from '@react-native-google-signin/google-signin';

SplashScreenExpo.preventAutoHideAsync();
console.log("AuthProvider: SplashScreen.preventAutoHideAsync() called");

// [RETIRÉ] GoogleSignin.configure(...);

// Pour les deux fournisseurs (Google et LinkedIn) avec le flux Socialite classique.
// C'est l'URI que vous devez configurer dans les développeurs Google/LinkedIn
// et elle DOIT CORRESPONDRE à l'URI Laravel dans votre .env
const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "prorecruteapp", // Votre scheme de app.json
  useProxy: true, // IMPORTANT: Pour Google, utilisez le proxy Expo pour être accepté par Google Cloud Console
});
console.log("AuthProvider: Google Redirect URI généré:", GOOGLE_REDIRECT_URI);

const LINKEDIN_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "prorecruteapp", // Votre scheme de app.json
  useProxy: false, // LinkedIn n'a généralement pas besoin du proxy Expo pour les callbacks
});
console.log(
  "AuthProvider: LinkedIn Redirect URI généré:",
  LINKEDIN_REDIRECT_URI
);

interface AuthContextType {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAppReady: boolean;
  socialLogin: (provider: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      console.log("AuthProvider: prepareApp() started");
      try {
        setLoading(true);
        const storedToken = await AsyncStorage.getItem("user_token");
        if (storedToken) {
          setToken(storedToken);
          const userData = await fetchUserProfile();
          setUser(userData);
          router.replace("/(app)/home");
        } else {
          router.replace("/(auth)");
        }
      } catch (err: any) {
        console.error(
          "AuthProvider: !!! CRITICAL ERROR in prepareApp() !!!",
          err.response?.data || err.message || err
        );
        setError("Échec du chargement de la session. Veuillez vous connecter.");
        await AsyncStorage.removeItem("user_token");
        setUser(null);
        setToken(null);
        router.replace("/(auth)");
      } finally {
        setLoading(false);
        setIsAppReady(true);
        await SplashScreenExpo.hideAsync();
      }
    }

    prepareApp();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const deviceName = Device.deviceName || "ExpoGoMobile";
      const { user: loggedInUser, token: receivedToken } = await loginUser(
        email,
        password,
        deviceName
      );
      await AsyncStorage.setItem("user_token", receivedToken);
      setUser(loggedInUser);
      setToken(receivedToken);
      router.replace("/(app)/home");
    } catch (err: any) {
      console.error(
        "Échec de la connexion:",
        err.response?.data || err.message
      );
      setError(
        err.response?.data?.message ||
          "Échec de la connexion. Veuillez vérifier vos identifiants."
      );
    } finally {
      setLoading(false);
    }
  };

/**
 * Gère le processus de connexion sociale via OAuth.
 * @param {string} provider - Le nom du fournisseur ('google', 'linkedin').
 */
const socialLogin = async (provider: string) => {
  setLoading(true);
  setError(null);

  const redirectUri =
    provider === "google" ? GOOGLE_REDIRECT_URI : LINKEDIN_REDIRECT_URI;
  const laravelRedirectUrl = `http://192.168.1.144:8000/api/auth/${provider}/redirect`;

  try {
    const result = await WebBrowser.openAuthSessionAsync(
      laravelRedirectUrl,
      redirectUri
    );

    if (result.type === "success" && result.url) {
      const url = new URL(result.url);
      const token = url.searchParams.get("token");
      const message = url.searchParams.get("message");

      if (token) {
        await AsyncStorage.setItem("user_token", token);
        const userData = await fetchUserProfile(); // Appelle ton backend /api/user avec le token
        setUser(userData);
        setToken(token);
        router.replace("/(app)/home");
      } else {
        setError("Connexion sociale échouée : " + (message || "Token manquant"));
        console.error("AuthProvider: socialLogin() → token manquant dans URL :", result.url);
      }
    } else if (result.type === "cancel") {
      setError("Connexion annulée par l'utilisateur.");
    } else {
      setError("Échec de la connexion OAuth.");
    }
  } catch (err: any) {
    console.error(`Échec de la connexion via ${provider}:`, err.response?.data || err.message);
    setError(`Erreur inattendue lors de la connexion via ${provider}.`);
  } finally {
    setLoading(false);
  }
};


  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await logoutUser();
      await AsyncStorage.removeItem("user_token");
      setUser(null);
      setToken(null);
      router.replace("/(auth)");
    } catch (err: any) {
      console.error(
        "Échec de la déconnexion:",
        err.response?.data || err.message
      );
      setError(
        err.response?.data?.message ||
          "Échec de la déconnexion. Veuillez réessayer."
      );
      await AsyncStorage.removeItem("user_token");
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
    logout,
    clearError,
    isAppReady,
    socialLogin,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
