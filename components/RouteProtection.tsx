import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { router } from 'expo-router';

interface RouteProtectionProps {
  children: React.ReactNode;
  requiredRoles?: string[]; // Optional: specific roles required
  requireAuth?: boolean; // Default: true
  requireOtpVerification?: boolean; // Default: true
  requireOnboardingComplete?: boolean; // Default: true
}

export const RouteProtection: React.FC<RouteProtectionProps> = ({
  children,
  requiredRoles = [],
  requireAuth = true,
  requireOtpVerification = true,
  requireOnboardingComplete = true,
}) => {
  const { 
    user, 
    isAuthenticated, 
    loading, 
    isAppReady, 
    hasSeenOnboarding 
  } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Show loading while app is initializing
  if (!isAppReady || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
          {t('Chargement...')}
        </Text>
      </View>
    );
  }

  // Check onboarding requirement
  if (requireOnboardingComplete && !hasSeenOnboarding) {
    router.replace('/(auth)/onboarding/welcome');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    router.replace('/(auth)');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Check OTP verification requirement
  if (requireAuth && requireOtpVerification && user && user.is_otp_verified === false) {
    router.replace({
      pathname: '/(auth)/otp_verification',
      params: { email: user.email },
    });
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Check role requirements
  if (requireAuth && requiredRoles.length > 0 && user) {
    if (!requiredRoles.includes(user.role)) {
      // Redirect based on user's actual role
      switch (user.role) {
        case 'admin':
        case 'user':
          router.replace('/(app)/home');
          break;
        case 'interimaire':
          router.replace('/(app)/(interimaire)');
          break;
        default:
          router.replace('/(app)/home');
          break;
      }
      return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});