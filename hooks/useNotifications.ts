import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { getUnreadNotificationCount } from '../utils/interim-notifications-api';
import { getUnreadCandidatNotificationCount } from '../utils/candidat-notifications-api';
import { useAuth } from '../components/AuthProvider';

export interface NotificationHook {
  unreadCount: number;
  loading: boolean;
  refreshUnreadCount: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export const useNotifications = (): NotificationHook => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user || (user.role !== 'interimaire' && user.role !== 'user')) {
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      let totalCount = 0;

      if (user.role === 'interimaire') {
        // Pour les intérimaires, fusionner les deux types de notifications
        const [interimResponse, candidatResponse] = await Promise.allSettled([
          getUnreadNotificationCount(),
          getUnreadCandidatNotificationCount()
        ]);

        // Compter les notifications intérimaires
        if (interimResponse.status === 'fulfilled' && interimResponse.value?.success) {
          totalCount += interimResponse.value.unread_count;
        }

        // Compter les notifications candidat
        if (candidatResponse.status === 'fulfilled' && candidatResponse.value?.success) {
          totalCount += candidatResponse.value.unread_count;
        }
      } else if (user.role === 'user') {
        // Pour les candidats purs, seulement les notifications candidat
        const response = await getUnreadCandidatNotificationCount();
        if (response?.success) {
          totalCount = response.unread_count;
        }
      }

      setUnreadCount(totalCount);

      // Si le compteur a augmenté, on peut détecter une nouvelle notification
      if (totalCount > lastCount && lastCount > 0) {
        console.log('🔔 Nouvelle(s) notification(s) détectée(s)!', { ancien: lastCount, nouveau: totalCount });
      }
      setLastCount(totalCount);
    } catch (error) {
      console.error('Erreur lors du chargement du compteur:', error);
      // Remettre le compteur à 0 en cas d'erreur
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Force refresh pour les actions qui peuvent déclencher des notifications
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refresh du compteur de notifications');
    await refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Charger le compteur au montage
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Polling adaptatif basé sur l'état de l'app
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const setupPolling = () => {
      const appState = AppState.currentState;
      let pollingInterval;

      if (appState === 'active') {
        pollingInterval = 5 * 1000; // 5 secondes quand l'app est active
      } else if (appState === 'background') {
        pollingInterval = 30 * 1000; // 30 secondes en arrière-plan
      } else {
        return; // Pas de polling si l'app est inactive
      }

      interval = setInterval(() => {
        refreshUnreadCount();
      }, pollingInterval);
    };

    const handleAppStateChange = (nextAppState: string) => {
      if (interval) {
        clearInterval(interval);
      }
      setupPolling();
    };

    // Setup initial polling
    setupPolling();

    // Listen to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      subscription?.remove();
    };
  }, [refreshUnreadCount]);


  return {
    unreadCount,
    loading,
    refreshUnreadCount,
    forceRefresh
  };
};