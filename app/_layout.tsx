import { Stack } from 'expo-router';
import { AuthProvider } from '../components/AuthProvider'; 

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
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}

