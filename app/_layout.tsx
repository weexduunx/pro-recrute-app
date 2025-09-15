// Polyfills pour React Native - Doit être en première ligne
import '../polyfills';

import { Stack, Slot } from 'expo-router';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import { PermissionsProvider } from '../components/PermissionsManager';
import { AuthPermissionsManager } from '../components/useAuthPermissions';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { LanguageProvider, useLanguage } from '../components/LanguageContext';
import { StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
import CleanupServiceManager from '../services/CleanupServiceManager';
import * as Linking from 'expo-linking';

/**
 * Composant Layout Racine :
 * Ce composant est la racine de  l'application. Il fournit le AuthProvider
 * à toute l'arborescence et gère l'état d'authentification pour déterminer
 * s'il faut afficher la navigation publique (Stack for auth) ou la navigation
 * principale (Drawer for app).
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <PermissionsProvider>
          <AuthProvider>
            <ThemeProvider>
              <AuthPermissionsManager>
                <CleanupServiceManager>
                  <RootLayoutContent />
                </CleanupServiceManager>
                <Toast />
              </AuthPermissionsManager>
            </ThemeProvider>
          </AuthProvider>
        </PermissionsProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

/**
 * Contenu du Layout Racine :
 * Détermine la navigation selon que l'utilisateur est authentifié ou non,
 * en utilisant le ThemeContext.
 */
function RootLayoutContent() {
  const { isAuthenticated, isAppReady } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const { t } = useLanguage();

  // Gestionnaire pour les liens entrants (deep linking)
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      
      // Les callbacks LinkedIn sont maintenant gérés directement par WebBrowser.openAuthSessionAsync
      // Pas besoin de traitement supplémentaire ici
      if (url.includes('linkedin-callback')) {
        console.log('LinkedIn callback detected - handled by WebBrowser');
      }
    };

    // Écouter les liens entrants
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Vérifier s'il y a un lien au démarrage de l'app
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription?.remove();
  }, []);

  StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
  StatusBar.setBackgroundColor(colors.background);

  // Attendre que l'app soit prête avant d'afficher quoi que ce soit
  if (!isAppReady) {
    return null; // ou un écran de chargement si nécessaire
  }

  // Si l'utilisateur n'est pas authentifié, affiche la navigation publique (auth)
  if (!isAuthenticated) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
    </Stack>
  );
}