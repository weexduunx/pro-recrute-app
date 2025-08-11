import React from 'react';
import { Stack } from 'expo-router';

export default function EntretiensLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="liste" />
      <Stack.Screen name="calendrier" />
      <Stack.Screen name="details" />
      <Stack.Screen name="preparation" />
      <Stack.Screen name="historique" />
    </Stack>
  );
}