import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../components/AuthProvider'; // Adjust path if needed

/**
 * Initial Entry Point (Root Index Screen):
 * This screen is responsible for checking the user's authentication status
 * and redirecting them appropriately.
 * - If loading, shows a loading indicator.
 * - If authenticated, redirects to the authenticated app's main screen (Job Board).
 * - If not authenticated, redirects to the public home/login screen.
 */
export default function AppEntryPoint() {
  const { isAuthenticated, loading } = useAuth(); // Get auth state from context

  useEffect(() => {
    if (!loading) { // Only attempt redirection once loading is complete
      if (isAuthenticated) {
        // If authenticated, go to the authenticated part of the app (e.g., the Job Board tab)
        router.replace('/(app)/job_board');
      } else {
        // If not authenticated, go to the public home/login screen
        router.replace('/login'); // This will lead to app/(auth)/index.tsx (Login)
      }
    }
  }, [isAuthenticated, loading]); // Re-run effect when these dependencies change

  // While checking auth status, show a loading screen
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4B5563" />
      <Text style={styles.loadingText}>Loading app...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // Tailwind gray-100
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
  },
});
