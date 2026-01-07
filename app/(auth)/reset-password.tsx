import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { apiRequest } from '../../utils/api';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Récupérer le token et l'email depuis les paramètres URL
    if (params.token && typeof params.token === 'string') {
      setToken(params.token);
    }
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }

    // Si pas de token, rediriger vers forgot-password
    if (!params.token) {
      Alert.alert(
        'Lien invalide',
        'Le lien de réinitialisation est invalide. Veuillez demander un nouveau lien.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/forgot-password')
          }
        ]
      );
    }
  }, [params]);

  const validateForm = () => {
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return false;
    }
    
    if (!password) {
      setError('Veuillez saisir votre nouveau mot de passe.');
      return false;
    }
    
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return false;
    }
    
    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return false;
    }
    
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/password/reset', {
        method: 'POST',
        body: {
          token,
          email: email.trim().toLowerCase(),
          password,
          password_confirmation: passwordConfirmation,
        },
      });

      if (response.success) {
        Alert.alert(
          'Mot de passe réinitialisé',
          'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
          [
            {
              text: 'Se connecter',
              onPress: () => router.replace('/(auth)')
            }
          ]
        );
      } else {
        setError(response.message || 'Une erreur est survenue lors de la réinitialisation.');
      }
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      setError(error.message || 'Impossible de réinitialiser le mot de passe. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={handleBackToLogin} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          <Image
            source={require('../../assets/images/logogbg.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>
            Saisissez votre nouveau mot de passe
          </Text>
        </View>

        {/* Form Section */}
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
              style={[styles.input, { paddingRight: 50 }]}
              placeholder="Nouveau mot de passe (min. 8 caractères)"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              autoComplete="new-password"
              editable={!loading}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Feather 
                name={showPassword ? "eye-off" : "eye"} 
                size={18} 
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 50 }]}
              placeholder="Confirmer le nouveau mot de passe"
              placeholderTextColor="#9CA3AF"
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry={!showPasswordConfirmation}
              textContentType="newPassword"
              autoComplete="new-password"
              editable={!loading}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
              style={styles.eyeIcon}
            >
              <Feather 
                name={showPasswordConfirmation ? "eye-off" : "eye"} 
                size={18} 
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading || !email.trim() || !password || !passwordConfirmation}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Réinitialiser le mot de passe</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleBackToLogin}
            disabled={loading}
          >
            <Text style={styles.linkText}>← Retour à la connexion</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  
  // Header Section
  headerSection: {
    alignItems: "center",
    marginBottom: 30,
    paddingTop: 10,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 0,
    padding: 8,
    zIndex: 1,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "400",
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Form Section
  formSection: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -13 }],
    padding: 5,
    zIndex: 1,
  },
  primaryButton: {
    backgroundColor: "#0e8030",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
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
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
});