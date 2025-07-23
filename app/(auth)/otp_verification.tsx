import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeContext';
import { useLanguage } from '../../components/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

export default function OtpVerificationScreen() {
  const { email, deviceName } = useLocalSearchParams();
  const { verifyOtp, sendOtp, loading, error, clearError } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(60); // Compteur pour le renvoi d'OTP
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    // Nettoyer l'erreur quand le composant est monté/démonté ou que l'email change
    clearError();
  }, [email, clearError]);

  const handleVerify = async () => {
    if (!email || !otpCode || !deviceName) {
      Alert.alert(t('Erreur'), t('Veuillez saisir le code OTP et assurez-vous que l\'email est valide.'));
      return;
    }
    try {
      await verifyOtp(email as string, otpCode, deviceName as string);
      // La redirection est gérée par AuthProvider après succès
    } catch (err) {
      // L'erreur est déjà définie dans le contexte AuthProvider
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      Alert.alert(t('Erreur'), t('Email manquant pour le renvoi d\'OTP.'));
      return;
    }
    setResendTimer(60);
    setCanResend(false);
    try {
      await sendOtp(email as string);
    } catch (err) {
      // L'erreur est déjà définie dans le contexte AuthProvider
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.headerSection}>
            <Ionicons name="shield-checkmark-outline" size={80} color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('Vérification OTP')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('Un code de vérification a été envoyé à')} <Text style={styles.emailText}>{email}</Text>
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('Veuillez saisir le code à 6 chiffres pour continuer.')}
            </Text>
          </View>

          <View style={styles.formSection}>
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="------"
                placeholderTextColor={colors.textSecondary}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled, { backgroundColor: colors.secondary }]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>{t('Vérifier')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                  <Text style={[styles.resendText, { color: colors.primary }]}>{t('Renvoyer le code')}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.resendTimerText, { color: colors.textSecondary }]}>
                  {t('Renvoyer dans')} {resendTimer}s
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/(auth)')}
              disabled={loading}
            >
              <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
                {t('Retour à la connexion')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  emailText: {
    fontWeight: 'bold',
    color: '#091e60', // Couleur forte pour l'email
  },
  formSection: {
    width: '100%',
    maxWidth: 400,
  },
  errorContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8, // Espacement pour les chiffres de l'OTP
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600',
  },
  resendTimerText: {
    fontSize: 15,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 30,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
