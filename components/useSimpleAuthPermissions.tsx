import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthProvider';
import { useSimplePermissions } from './SimplePermissionsManager';

/**
 * Hook simplifié qui demande seulement les notifications après l'authentification
 */
export const useSimpleAuthPermissions = () => {
  const { isAuthenticated, user, isAppReady } = useAuth();
  const { hasRequestedNotifications, requestNotificationPermission } = useSimplePermissions();
  
  const hasTriggeredPermissions = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      hasTriggeredPermissions.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (
      isAuthenticated && 
      user && 
      user.is_otp_verified !== false && 
      isAppReady && 
      !hasRequestedNotifications && 
      !hasTriggeredPermissions.current
    ) {
      hasTriggeredPermissions.current = true;
      
      const timer = setTimeout(() => {
        Alert.alert(
          'Notifications',
          'Souhaitez-vous recevoir des notifications pour les nouvelles opportunités d\'emploi ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Autoriser', 
              onPress: () => requestNotificationPermission()
            },
          ]
        );
      }, 3000); // 3 secondes après connexion

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isAppReady, hasRequestedNotifications, requestNotificationPermission]);
};

// Composant wrapper simplifié
export const SimpleAuthPermissionsManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSimpleAuthPermissions();
  return <>{children}</>;
};