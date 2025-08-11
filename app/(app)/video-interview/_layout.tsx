import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';

export default function VideoInterviewLayout() {
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
          title: 'Entretiens vidéo',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="room/[id]"
        options={{
          title: 'Entretien en cours',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="schedule"
        options={{
          title: 'Programmer un entretien',
          headerShown: true,
        }}
      />
    </Stack>
  );
}