import { Stack } from 'expo-router';

/**
 * Authentication Group Layout:
 * Defines the navigation stack specifically for the
 * unauthenticated routes (e.g., login, register).
 * Uses the primary color for header background if headers are shown.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#091e60', // Primary Dark Blue
        },
        headerTintColor: '#FFFFFF', // White text for header title
        headerShown: false, // Keeping headers hidden as per previous setup, but style is ready if enabled
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Sign In' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
    </Stack>
  );
}
