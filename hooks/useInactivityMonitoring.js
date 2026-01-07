// hooks/useInactivityMonitoring.js
import { useState, useEffect } from 'react';
import InactivityService from '../utils/inactivity-service';
import { useAuth } from '../components/AuthProvider';

export function useInactivityMonitoring() {
  const { user, logout } = useAuth();
  const [inactivityStatus, setInactivityStatus] = useState({
    inactivityDays: 0,
    shouldDelete: false,
    warnings: [],
    loading: true,
  });

  useEffect(() => {
    let intervalId;

    const initializeAndStartMonitoring = async () => {
      if (!user) {
        setInactivityStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Initialiser le service
        await InactivityService.initialize();
        
        // Obtenir le statut initial
        const status = await InactivityService.checkInactivityAndSendAlerts();
        
        if (status) {
          setInactivityStatus({
            ...status,
            loading: false,
          });

          // Si le compte doit être supprimé, déconnecter l'utilisateur
          if (status.shouldDelete) {
            setTimeout(() => {
              logout();
            }, 2000); // Attendre 2 secondes pour afficher le message
          }
        } else {
          setInactivityStatus(prev => ({ ...prev, loading: false }));
        }

        // Démarrer les vérifications périodiques (toutes les heures)
        intervalId = setInterval(async () => {
          const status = await InactivityService.checkInactivityAndSendAlerts();
          if (status) {
            setInactivityStatus(prev => ({
              ...prev,
              ...status,
            }));

            // Si le compte doit être supprimé, déconnecter l'utilisateur
            if (status.shouldDelete) {
              clearInterval(intervalId);
              setTimeout(() => {
                logout();
              }, 2000);
            }
          }
        }, 60 * 60 * 1000); // Vérifier toutes les heures

      } catch (error) {
        console.error('Erreur lors de l\'initialisation du monitoring d\'inactivité:', error);
        setInactivityStatus(prev => ({ ...prev, loading: false }));
      }
    };

    initializeAndStartMonitoring();

    // Nettoyer l'intervalle au démontage
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user, logout]);

  // Fonction pour marquer une activité utilisateur
  const recordActivity = async () => {
    try {
      await InactivityService.updateLastActivity();
      // Rafraîchir le statut après avoir enregistré l'activité
      const status = await InactivityService.checkInactivityAndSendAlerts();
      if (status) {
        setInactivityStatus(prev => ({
          ...prev,
          ...status,
        }));
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    }
  };

  // Fonction pour obtenir le nombre de jours restants avant suppression
  const getDaysUntilDeletion = () => {
    return Math.max(0, 90 - inactivityStatus.inactivityDays);
  };

  // Fonction pour vérifier si l'utilisateur a des avertissements actifs
  const hasActiveWarnings = () => {
    return inactivityStatus.inactivityDays >= 75 && !inactivityStatus.shouldDelete;
  };

  return {
    ...inactivityStatus,
    recordActivity,
    getDaysUntilDeletion,
    hasActiveWarnings,
  };
}

export default useInactivityMonitoring;