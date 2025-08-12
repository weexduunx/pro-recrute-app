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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}