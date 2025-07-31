import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../components/ThemeContext'; // Importez useTheme
import { StatusBar } from 'react-native'; // Importez StatusBar

/**
 * Authentication Group Layout:
 * Defines the navigation stack specifically for the
 * unauthenticated routes (e.g., login, register).
 * Uses the primary color for header background if headers are shown.
 */
export default function AuthLayout() {
   const { isDarkMode, colors } = useTheme();
   // Gérer le style de la barre de statut pour le groupe d'authentification
  StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
  StatusBar.setBackgroundColor(colors.background);
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#091e60', // Primary Dark Blue
        },
        headerTintColor: '#FFFFFF', // White text for header title
        headerShown: false, // Keeping headers hidden as per previous setup, but style is ready if enabled
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: 'Sign In' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen name="otp_verification" /> 

    </Stack>
  );
}
