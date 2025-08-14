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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="results/[assessmentId]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="test/[testId]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}