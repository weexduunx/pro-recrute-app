import { Stack } from 'expo-router'; // Using Stack for a single root navigator
import { AuthProvider } from '../components/AuthProvider'; // Your authentication context provider

/**
 * Root Layout Component:
 * Configured to start the application directly within the '(auth)' group,
 * displaying the public home/login screen.
 * The AuthProvider will handle redirects for authenticated users.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false, // Keep headers hidden at this top level
        }}
      >
        {/*
          Set the initialRouteName to '(auth)'.
          This means the app will first attempt to render app/(auth)/_layout.tsx,
          which in turn renders app/(auth)/index.tsx by default.
        */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/*
          The '(app)' group for authenticated users.
          When a user logs in, AuthProvider will router.replace to '/(app)/job_board'.
        */}
        <Stack.Screen name="(app)" options={{ headerShown: false }} />

        {/*
          The 'index' screen is no longer needed as the direct initial entry.
          You can remove app/index.tsx file entirely if its only purpose was the initial redirect.
          If you keep it for other reasons, it won't be the first screen anymore.
        */}
        {/* <Stack.Screen name="index" options={{ headerShown: false }} /> */}
      </Stack>
    </AuthProvider>
  );
}
