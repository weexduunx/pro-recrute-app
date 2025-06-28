import { Stack } from 'expo-router';
import React from 'react';


export default function CandidatureStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, 
        }}
      />
      <Stack.Screen
        name="application_details"
        options={{
          headerShown: false, 
        }}
      />
    </Stack>
  );
}
