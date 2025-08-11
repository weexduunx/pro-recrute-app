import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';

export default function MessagesLayout() {
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
          title: 'Messages',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: 'Conversation',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="new-message"
        options={{
          title: 'Nouveau message',
          headerShown: true,
        }}
      />
    </Stack>
  );
}