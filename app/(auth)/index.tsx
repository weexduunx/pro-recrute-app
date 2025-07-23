import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Device from 'expo-device'; // Importer Device

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, socialLogin, error: authError, clearError } = useAuth();

  useEffect(() => {
    // Nettoyer l'erreur du contexte AuthProvider lors du montage du composant
    clearError();
    // Utiliser l'erreur du contexte pour l'affichage si elle existe
    if (authError) {
      setError(authError);
    }
  }, [authError, clearError]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Veuillez saisir votre email et mot de passe.');
      setLoading(false);
      return;
    }

    try {
      const deviceName = Device.deviceName || 'UnknownDevice';
      // La fonction login dans AuthProvider gère maintenant la redirection OTP
      await login(email, password, deviceName); 
    } catch (err: any) {
      // L'erreur est déjà gérée par AuthProvider et stockée dans le contexte
      // Elle sera récupérée par le useEffect ci-dessus
      // Ici, on peut juste s'assurer que le loading est false
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      await socialLogin(provider);
    } catch (err: any) {
      setError(authError || err.message || `Échec de la connexion via ${provider}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <View style={styles.headerSection}>
          <Image
            source={require('../../assets/images/logo.png')} // Assurez-vous que le chemin est correct
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Bienvenue !</Text>
          <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>
        </View>

        {/* Section Formulaire */}
        <View style={styles.formSection}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Alert.alert("Mot de passe oublié", "Fonctionnalité à implémenter.")}
            disabled={loading}
          >
            <Text style={styles.linkText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Boutons de connexion sociale */}
          <View style={styles.socialButtonsContainer}>
            <Text style={styles.socialText}>Ou se connecter avec</Text>
            <View style={styles.socialButtonRow}>
              <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('google')} disabled={loading}>
                <FontAwesome5 name="google" size={24} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('linkedin')} disabled={loading}>
                <FontAwesome5 name="linkedin" size={24} color="#0A66C2" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
            disabled={loading}
          >
            <Text style={styles.registerText}>
              Vous n'avez pas de compte ? <Text style={styles.registerLink}>S'inscrire</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  
  // Section Header
  headerSection: {
    alignItems: "center",
    marginBottom: 48,
    paddingTop: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "400",
  },

  // Section Formulaire
  formSection: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  primaryButton: {
    backgroundColor: "#0e8030",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 15,
    color: "#6B7280",
  },
  socialButtonsContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  socialText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 15,
  },
  socialButtonRow: {
    flexDirection: 'row',
    gap: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerText: {
    fontSize: 15,
    color: '#6B7280',
  },
  registerLink: {
    color: '#1F2937',
    fontWeight: '600',
  },
});
