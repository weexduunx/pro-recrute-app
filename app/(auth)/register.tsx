import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { registerUser } from '../../utils/api';
import { useAuth } from '../../components/AuthProvider';

/**
 * Registration Screen:
 * Provides a UI for user registration.
 * Sends registration data to the Laravel API and handles state.
 * Now includes your logo.
 */
export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { login } = useAuth(); // We'll log the user in automatically after successful registration

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Basic client-side validation
    if (!name || !email || !password || !passwordConfirmation) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // Call the registerUser API function
      const response = await registerUser(name, email, password, passwordConfirmation);
      setSuccess('Registration successful! Logging you in...');
      // Automatically logs in the user after successful registration
      await login(email, password);
    } catch (err: any) {
      console.error("Registration error:", err.response ? err.response.data : err.message);
      if (err.response && err.response.data && err.response.data.errors) {
        const firstError = Object.values(err.response.data.errors)[0] as string[];
        setError(firstError[0] || 'Registration failed. Please try again.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Add Logo */}
        <Image
          source={require('../../assets/images/logo.png')} // Path to your logo
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>Join JobBoard today!</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {success && <Text style={styles.successText}>{success}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#9CA3AF"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  // Logo specific styles for login/register
  logo: {
    width: '60%', // Adjust based on how large you want it
    height: 100, // Adjust based on your logo's aspect ratio
    marginBottom: 30,
    tintColor: '#091e60', // Optional: apply primary color to logo if it's monochromatic
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#091e60', // Primary Dark Blue
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
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
  successText: {
    color: '#0f8e35',
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
  registerButton: {
    backgroundColor: '#0f8e35', // Secondary Green
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
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderColor: '#091e60', // Primary Dark Blue border
    borderWidth: 1,
  },
  backButtonText: {
    color: '#091e60', // Primary Dark Blue
    fontSize: 16,
    fontWeight: '600',
  },
});
