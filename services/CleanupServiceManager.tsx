// services/CleanupServiceManager.tsx
import React, { useEffect, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AutoCleanupService from '../utils/auto-cleanup-service';
import InactivityService from '../utils/inactivity-service';
import { useAuth } from '../components/AuthProvider';

interface CleanupServiceManagerProps {
  children: React.ReactNode;
}

/**
 * Gestionnaire de services de nettoyage et d'inactivité
 * Ce composant s'occupe de :
 * - Initialiser les services de monitoring d'inactivité
 * - Démarrer le service de nettoyage automatique (côté admin)
 * - Gérer les états de l'application pour optimiser les performances
 */
export default function CleanupServiceManager({ children }: CleanupServiceManagerProps) {
  const { user, isAuthenticated } = useAuth();
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // État des services
  const [services, setServices] = useState({
    inactivityService: false,
    autoCleanupService: false,
    cleanupIntervalId: null as NodeJS.Timeout | null,
  });

  /**
   * Initialiser le service de monitoring d'inactivité pour l'utilisateur connecté
   */
  const initializeInactivityService = async () => {
    try {
      if (!isAuthenticated || !user) {
        console.log('Utilisateur non connecté - service d\'inactivité ignoré');
        return;
      }

      console.log('=== INITIALISATION SERVICE INACTIVITÉ ===');
      await InactivityService.initialize();
      
      // Démarrer les vérifications périodiques
      InactivityService.startPeriodicChecks();
      
      setServices(prev => ({ ...prev, inactivityService: true }));
      console.log('Service d\'inactivité initialisé pour:', user.email);
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service d\'inactivité:', error);
    }
  };

  /**
   * Initialiser le service de nettoyage automatique (admin uniquement)
   */
  const initializeAutoCleanupService = async () => {
    try {
      // Vérifier si l'utilisateur a les droits admin
      if (!user || user.role !== 'admin') {
        console.log('Utilisateur non admin - service de nettoyage automatique ignoré');
        return;
      }

      console.log('=== INITIALISATION SERVICE NETTOYAGE AUTOMATIQUE ===');
      
      // Test de connectivité avant démarrage
      const testResult = await AutoCleanupService.testCleanupService();
      
      if (!testResult.success) {
        console.warn('Test du service de nettoyage échoué - service non démarré');
        return;
      }

      // Démarrer le service de nettoyage automatique
      const intervalId = AutoCleanupService.startAutoCleanupService();
      
      setServices(prev => ({ 
        ...prev, 
        autoCleanupService: true,
        cleanupIntervalId: intervalId
      }));
      
      console.log('Service de nettoyage automatique initialisé');
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service de nettoyage:', error);
    }
  };

  /**
   * Nettoyer les services lors de la déconnexion ou fermeture
   */
  const cleanupServices = () => {
    console.log('=== NETTOYAGE DES SERVICES ===');
    
    // Arrêter le service de nettoyage automatique
    if (services.cleanupIntervalId) {
      AutoCleanupService.stopAutoCleanupService(services.cleanupIntervalId);
    }
    
    // Réinitialiser l'état des services
    setServices({
      inactivityService: false,
      autoCleanupService: false,
      cleanupIntervalId: null,
    });
    
    setServicesInitialized(false);
    console.log('Services nettoyés');
  };

  /**
   * Gérer les changements d'état de l'application
   */
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('Changement d\'état app:', appState, '->', nextAppState);
    
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // L'app revient en premier plan
      console.log('Application active - enregistrement d\'activité');
      
      if (services.inactivityService && isAuthenticated) {
        try {
          await InactivityService.updateLastActivity();
        } catch (error) {
          console.error('Erreur lors de l\'enregistrement d\'activité:', error);
        }
      }
    }
    
    setAppState(nextAppState);
  };

  /**
   * Initialiser tous les services
   */
  const initializeAllServices = async () => {
    if (servicesInitialized) return;

    console.log('=== INITIALISATION DE TOUS LES SERVICES ===');
    
    try {
      // Initialiser le service d'inactivité pour tous les utilisateurs connectés
      await initializeInactivityService();
      
      // Initialiser le service de nettoyage automatique pour les admins
      await initializeAutoCleanupService();
      
      setServicesInitialized(true);
      console.log('Tous les services initialisés');
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des services:', error);
    }
  };

  // Effet pour initialiser les services au montage du composant
  useEffect(() => {
    if (isAuthenticated && user && !servicesInitialized) {
      initializeAllServices();
    } else if (!isAuthenticated && servicesInitialized) {
      cleanupServices();
    }
  }, [isAuthenticated, user, servicesInitialized]);

  // Effet pour gérer les changements d'état de l'application
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [appState, services, isAuthenticated]);

  // Effet de nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      cleanupServices();
    };
  }, []);

  // Debug des services en développement
  useEffect(() => {
    if (__DEV__ && servicesInitialized) {
      console.log('=== ÉTAT DES SERVICES ===');
      console.log('Inactivité:', services.inactivityService);
      console.log('Nettoyage auto:', services.autoCleanupService);
      console.log('Utilisateur:', user?.email, user?.role);
    }
  }, [services, user]);

  return <>{children}</>;
}

// Hook pour accéder aux statistiques des services de nettoyage
export function useCleanupStats() {
  const [stats, setStats] = useState(AutoCleanupService.getCleanupStats());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(AutoCleanupService.getCleanupStats());
    }, 30000); // Mettre à jour toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, []);
  
  return stats;
}

// Hook pour déclencher manuellement le nettoyage (admin uniquement)
export function useManualCleanup() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  
  const runManualCleanup = async () => {
    if (!user || user.role !== 'admin') {
      Alert.alert('Accès refusé', 'Vous devez être administrateur pour effectuer cette action.');
      return;
    }
    
    try {
      setIsRunning(true);
      
      Alert.alert(
        'Confirmation',
        'Êtes-vous sûr de vouloir démarrer le processus de nettoyage automatique ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Démarrer',
            onPress: async () => {
              const result = await AutoCleanupService.runAutoCleanup();
              
              Alert.alert(
                result.success ? 'Nettoyage terminé' : 'Erreur',
                result.success 
                  ? `${result.deleted} comptes supprimés sur ${result.processed} traités`
                  : `Erreur: ${result.error}`
              );
            }
          }
        ]
      );
      
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors du nettoyage.');
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };
  
  return { runManualCleanup, isRunning };
}