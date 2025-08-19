import { useState, useEffect, useCallback } from 'react';
import { getUnreadNotificationCount } from '../utils/interim-notifications-api';
import { getUnreadCandidatNotificationCount } from '../utils/candidat-notifications-api';
import { useAuth } from '../components/AuthProvider';

export interface NotificationHook {
  unreadCount: number;
  loading: boolean;
  refreshUnreadCount: () => Promise<void>;
}

export const useNotifications = (): NotificationHook => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!user || (user.role !== 'interimaire' && user.role !== 'user')) {
      return;
    }

    try {
      setLoading(true);
      let response;
      
      if (user.role === 'interimaire') {
        response = await getUnreadNotificationCount();
      } else if (user.role === 'user') {
        response = await getUnreadCandidatNotificationCount();
      }
      
      if (response?.success) {
        setUnreadCount(response.unread_count);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du compteur:', error);
      // Ne pas afficher d'erreur à l'utilisateur pour ne pas le déranger
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charger le compteur au montage
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Actualiser plus fréquemment (toutes les 30 secondes)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30 * 1000); // 30 secondes

    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  // Actualiser quand l'app revient au premier plan
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        refreshUnreadCount();
      }
    };

    const { AppState } = require('react-native');
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [refreshUnreadCount]);

  return {
    unreadCount,
    loading,
    refreshUnreadCount
  };
};