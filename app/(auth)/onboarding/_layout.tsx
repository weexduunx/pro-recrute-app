import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../../components/ThemeContext'; // Assurez-vous du chemin relatif correct

/**
 * Layout pour le groupe d'onboarding (app/(auth)/onboarding/) :
 * Définit la pile de navigation pour les écrans d'introduction.
 */
export default function OnboardingLayout() {
  const { colors } = useTheme(); // Pour utiliser les couleurs du thème si nécessaire

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Cache l'en-tête par défaut pour les écrans d'onboarding
        contentStyle: { backgroundColor: colors.background }, // Applique la couleur de fond du thème
      }}
      // NOUVEAU: Définir 'welcome' comme écran initial de cette pile d'onboarding
      initialRouteName="welcome" 
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="candidate_space" />
      <Stack.Screen name="interim_space" />
      {/* Ajoutez d'autres écrans d'onboarding ici si vous en avez */}
    </Stack>
  );
}
