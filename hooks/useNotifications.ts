import { useState, useEffect, useCallback } from 'react';
import { getUnreadNotificationCount } from '../utils/interim-notifications-api';
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
    if (!user || user.role !== 'interimaire') {
      return;
    }

    try {
      setLoading(true);
      const response = await getUnreadNotificationCount();
      
      if (response.success) {
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

  // Actualiser périodiquement (toutes les 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return {
    unreadCount,
    loading,
    refreshUnreadCount
  };
};