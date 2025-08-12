import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';

export default function AIRecommendationsLayout() {
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
          title: 'Recommandations IA',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          title: 'Préférences IA',
          headerShown: true,
        }}
      />
    </Stack>
  );
}