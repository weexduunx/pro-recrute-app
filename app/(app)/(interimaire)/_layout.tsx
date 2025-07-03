import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';

/**
 * Layout pour le groupe Intérimaire (app/(app)/(interim)/) :
 * Définit la navigation Stack à l'intérieur de l'espace intérimaire.
 */
export default function InterimLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }, 
      }}
    >
      {/* Écran d'accueil de l'espace intérimaire */}
      <Stack.Screen
        name="index" // Correspond à app/(app)/(interim)/index.tsx
        options={{
          title: t('Tableau de bord Intérimaire'),
        }}
      />
    </Stack>
  );
}
