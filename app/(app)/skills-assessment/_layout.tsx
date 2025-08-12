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
        name="assessment/[id]"
        options={{
          headerShown: false, 
        }}
      />
      <Stack.Screen
        name="results/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: false, 
        }}
      />
    </Stack>
  );
}