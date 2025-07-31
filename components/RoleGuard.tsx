import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { router } from 'expo-router';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackRoute?: string;
}

/**
 * RoleGuard Component:
 * Protects specific routes based on user roles.
 * Use this within screens that need role-specific access control.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallbackRoute = '/(app)/home',
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    // If user doesn't exist (shouldn't happen at this point), redirect
    if (!user) {
      router.replace('/(auth)');
      return;
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(user.role)) {
      // Redirect to appropriate route based on user's role
      switch (user.role) {
        case 'admin':
        case 'user':
          router.replace('/(app)/home');
          break;
        case 'interimaire':
          router.replace('/(app)/(interimaire)');
          break;
        default:
          router.replace(fallbackRoute as any);
          break;
      }
    }
  }, [user, allowedRoles, fallbackRoute]);

  // If user doesn't exist, show loading state
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.textPrimary }]}>
          {t('Redirection en cours...')}
        </Text>
      </View>
    );
  }

  // If user's role is not allowed, show loading state while redirecting
  if (!allowedRoles.includes(user.role)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.textPrimary }]}>
          {t('Redirection en cours...')}
        </Text>
      </View>
    );
  }

  // User has required role, render children
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});