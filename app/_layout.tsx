import { Stack, Slot } from 'expo-router';
import { AuthProvider, useAuth } from '../components/AuthProvider';
import { PermissionsProvider } from '../components/PermissionsManager';
import { AuthPermissionsManager } from '../components/useAuthPermissions';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { LanguageProvider, useLanguage } from '../components/LanguageContext';
import { StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';

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
      <PermissionsProvider>
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AuthPermissionsManager>
                <RootLayoutContent />
                <Toast />
              </AuthPermissionsManager>
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </PermissionsProvider>
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