import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';

export default function SkillsAssessmentLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Évaluations de compétences',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="assessment/[id]"
        options={{
          title: 'Évaluation en cours',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="results/[id]"
        options={{
          title: 'Résultats',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Nouvelle évaluation',
          headerShown: true,
        }}
      />
    </Stack>
  );
}