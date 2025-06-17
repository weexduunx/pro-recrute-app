import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image, // Import Image component
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../components/AuthProvider'; // Import the useAuth hook

/**
 * Login Screen Component:
 * Provides a UI for users to log in.
 * Uses the `login` function from the authentication context.
 * Now includes your application logo at the top.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuth(); // Get login function, loading, error from context

  // Clear error message when email/password changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password]);

  /**
   * handleLoginPress:
   * Calls the `login` function from AuthContext with current email and password.
   */
  const handleLoginPress = async () => {
    // Basic validation
    if (!email || !password) {
      clearError(); // Clear existing errors
      // You might add a visual feedback here, e.g., a toast message
      return;
    }
    await login(email, password); // Call the login function from context
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Add Logo Here */}
        <Image
          source={require('../../assets/images/logo.png')} // Path to your logo. Correct path from app/(auth)/
          style={styles.logo}
          resizeMode="contain" // Ensures the whole logo is visible within its bounds
        />

        <Text style={styles.loginTitle}>Pro Recrute - GBG</Text>
        <Text style={styles.subtitle}>Accéder à votre espace</Text>

        {/* Display error message if present */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
          editable={!loading} // Disable input while loading
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          editable={!loading} // Disable input while loading
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLoginPress}
          disabled={loading} // Disable button while loading
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/(auth)/register')} // Corrected path to register screen
        >
          <Text style={styles.registerButtonText}>
            Vous n'avez pas de compte ? S'inscrire
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Tailwind gray-100
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  // New style for the logo
  logo: {
    width: '60%', // Adjust width as needed
    height: 120,  // Adjust height as needed, maintains aspect ratio with resizeMode="contain"
    marginBottom: 30, // Space below the logo
    tintColor: '#091e60', // Optional: if your logo is monochromatic, apply primary color
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#091e60',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#4B5563',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loginButton: {
    backgroundColor: '#0f8e35', // Secondary Green color
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#93C5FD', // Lighter blue when disabled
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  registerButton: {
    marginTop: 20,
  },
  registerButtonText: {
    color: '#091e60', // Primary Dark Blue color for register link
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
