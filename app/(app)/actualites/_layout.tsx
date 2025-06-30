import { Stack } from 'expo-router';
import React from 'react';


export default function ActualiteStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, 
        }}
      />
      <Stack.Screen
        name="actualites_details"
        options={{
          headerShown: false, 
        }}
      />
    </Stack>
  );
}
