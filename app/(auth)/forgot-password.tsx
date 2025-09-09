import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { apiRequest } from '../../utils/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/password/email', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
        },
      });

      if (response.success) {
        setEmailSent(true);
      } else {
        setError(response.message || 'Une erreur est survenue lors de l\'envoi du lien.');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du lien de réinitialisation:', error);
      setError(error.message || 'Impossible d\'envoyer le lien. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const handleResendLink = () => {
    setEmailSent(false);
    setError(null);
    handleSendResetLink();
  };

  if (emailSent) {
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
            <Text style={styles.title}>Email envoyé !</Text>
            <Text style={styles.subtitle}>
              Nous avons envoyé un lien de réinitialisation à {email}
            </Text>
          </View>

          {/* Success Content */}
          <View style={styles.formSection}>
            <View style={styles.successContainer}>
              <Feather name="mail" size={48} color="#10B981" />
              <Text style={styles.successTitle}>Vérifiez votre boîte email</Text>
              <Text style={styles.successText}>
                Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe. 
                Si vous ne voyez pas l'email, vérifiez votre dossier spam.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleResendLink}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Renvoyer l'email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleBackToLogin}
            >
              <Text style={styles.linkText}>← Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Mot de passe oublié ?</Text>
          <Text style={styles.subtitle}>
            Saisissez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe
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

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSendResetLink}
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Envoyer le lien</Text>
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

  // Success State
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
});