// utils/sync-manager.js
import {
  checkNetworkStatus,
  getSyncQueue,
  removeFromSyncQueue,
  addToSyncQueue,
  setLastSyncTime,
  getLastSyncTime,
  storeUserProfile,
  storeInterimProfile,
  storeNotifications,
  storeStructures,
  storeContracts,
  storeIpmData,
  storeAnalytics
} from './offline-storage';
import api from './api';
import { Alert } from 'react-native';

/**
 * Gestionnaire de synchronisation des données hors-ligne
 */

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
    this.retryDelays = [1000, 5000, 10000, 30000, 60000]; // Délais de retry progressifs
    this.maxRetries = 3;
  }

  /**
   * Ajouter un listener pour les événements de synchronisation
   */
  addSyncListener(listener) {
    this.syncListeners.push(listener);
  }

  /**
   * Supprimer un listener
   */
  removeSyncListener(listener) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  /**
   * Notifier les listeners
   */
  notifyListeners(event, data = null) {
    this.syncListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Erreur listener sync:', error);
      }
    });
  }

  /**
   * Démarrer la synchronisation complète
   */
  async startFullSync(userId) {
    if (this.isSyncing) {
      console.log('Synchronisation déjà en cours');
      return false;
    }

    const isOnline = await checkNetworkStatus();
    if (!isOnline) {
      console.log('Pas de connexion réseau, synchronisation différée');
      this.notifyListeners('sync_failed', { reason: 'no_network' });
      return false;
    }

    this.isSyncing = true;
    this.notifyListeners('sync_started');

    try {
      // 1. Synchroniser les données de l'utilisateur
      await this.syncUserData(userId);

      // 2. Traiter la queue de synchronisation
      await this.processSyncQueue();

      // 3. Télécharger les données récentes
      await this.downloadRecentData(userId);

      // 4. Marquer la synchronisation comme terminée
      await setLastSyncTime();
      
      this.notifyListeners('sync_completed');
      console.log('Synchronisation complète terminée avec succès');
      return true;

    } catch (error) {
      console.error('Erreur lors de la synchronisation complète:', error);
      this.notifyListeners('sync_failed', { error: error.message });
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchroniser les données utilisateur
   */
  async syncUserData(userId) {
    try {
      this.notifyListeners('sync_progress', { step: 'user_data', progress: 0 });

      // Profil utilisateur
      const userResponse = await api.get('/user');
      if (userResponse.data) {
        await storeUserProfile(userResponse.data);
      }
      
      this.notifyListeners('sync_progress', { step: 'user_data', progress: 50 });

      // Profil intérimaire
      try {
        const interimResponse = await api.get('/interim/profile');
        if (interimResponse.data) {
          await storeInterimProfile(interimResponse.data);
        }
      } catch (error) {
        // Le profil intérimaire peut ne pas exister
        console.log('Profil intérimaire non trouvé:', error.response?.status);
      }

      this.notifyListeners('sync_progress', { step: 'user_data', progress: 100 });
    } catch (error) {
      console.error('Erreur sync données utilisateur:', error);
      throw error;
    }
  }

  /**
   * Télécharger les données récentes
   */
  async downloadRecentData(userId) {
    try {
      this.notifyListeners('sync_progress', { step: 'download', progress: 0 });

      // Notifications récentes
      try {
        const notifResponse = await api.get('/interim/notifications', {
          params: { limit: 50 }
        });
        if (notifResponse.data?.success) {
          await storeNotifications(notifResponse.data.data.notifications || []);
        }
      } catch (error) {
        console.log('Erreur téléchargement notifications:', error.response?.status);
      }

      this.notifyListeners('sync_progress', { step: 'download', progress: 25 });

      // Structures affiliées récentes
      try {
        const structuresResponse = await api.get('/interim/structures/search', {
          params: { per_page: 100, affiliated_only: true }
        });
        if (structuresResponse.data?.success) {
          await storeStructures(structuresResponse.data.data.structures || []);
        }
      } catch (error) {
        console.log('Erreur téléchargement structures:', error.response?.status);
      }

      this.notifyListeners('sync_progress', { step: 'download', progress: 50 });

      // Contrats récents (3 derniers mois)
      try {
        const contractsResponse = await api.get('/interim/contrats/history', {
          params: { months: 3 }
        });
        if (contractsResponse.data?.success) {
          await storeContracts(contractsResponse.data.data || []);
        }
      } catch (error) {
        console.log('Erreur téléchargement contrats:', error.response?.status);
      }

      this.notifyListeners('sync_progress', { step: 'download', progress: 75 });

      // Données IPM récentes
      try {
        const ipmResponse = await api.get('/interim/recap-ipm');
        if (ipmResponse.data?.success) {
          await storeIpmData(ipmResponse.data.data || {});
        }
      } catch (error) {
        console.log('Erreur téléchargement IPM:', error.response?.status);
      }

      // Analytics récents
      try {
        const analyticsResponse = await api.get('/interim/analytics/dashboard');
        if (analyticsResponse.data?.success) {
          await storeAnalytics(analyticsResponse.data.data || {});
        }
      } catch (error) {
        console.log('Erreur téléchargement analytics:', error.response?.status);
      }

      this.notifyListeners('sync_progress', { step: 'download', progress: 100 });
    } catch (error) {
      console.error('Erreur téléchargement données récentes:', error);
      throw error;
    }
  }

  /**
   * Traiter la queue de synchronisation
   */
  async processSyncQueue() {
    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        return;
      }

      this.notifyListeners('sync_progress', { step: 'upload', progress: 0 });

      for (let i = 0; i < queue.length; i++) {
        const action = queue[i];
        
        try {
          await this.processAction(action);
          await removeFromSyncQueue(action.id);
          
          this.notifyListeners('sync_progress', { 
            step: 'upload', 
            progress: Math.round(((i + 1) / queue.length) * 100)
          });

        } catch (error) {
          console.error('Erreur traitement action:', action.type, error);
          
          // Incrémenter le compteur de retry
          action.retryCount = (action.retryCount || 0) + 1;
          
          if (action.retryCount >= this.maxRetries) {
            console.log('Action abandonnée après max retries:', action.type);
            await removeFromSyncQueue(action.id);
          } else {
            console.log(`Retry ${action.retryCount}/${this.maxRetries} pour action:`, action.type);
            // L'action reste dans la queue pour retry ultérieur
          }
        }
      }

      this.notifyListeners('sync_progress', { step: 'upload', progress: 100 });
    } catch (error) {
      console.error('Erreur traitement queue sync:', error);
      throw error;
    }
  }

  /**
   * Traiter une action spécifique
   */
  async processAction(action) {
    switch (action.type) {
      case 'update_profile':
        return await this.syncUpdateProfile(action.data);
        
      case 'mark_notification_read':
        return await this.syncMarkNotificationRead(action.data);
        
      case 'request_prise_en_charge':
        return await this.syncRequestPriseEnCharge(action.data);
        
      case 'request_feuille_soins':
        return await this.syncRequestFeuilleSoins(action.data);
        
      case 'update_push_token':
        return await this.syncUpdatePushToken(action.data);
        
      default:
        console.warn('Type d\'action inconnu:', action.type);
        throw new Error(`Type d'action non supporté: ${action.type}`);
    }
  }

  /**
   * Synchroniser mise à jour de profil
   */
  async syncUpdateProfile(data) {
    const response = await api.put('/interim/create-update-profile', data);
    if (!response.data) {
      throw new Error('Échec mise à jour profil');
    }
    
    // Mettre à jour le cache local
    await storeInterimProfile(response.data);
    return response.data;
  }

  /**
   * Synchroniser lecture de notification
   */
  async syncMarkNotificationRead(data) {
    const response = await api.put(`/interim/notifications/${data.notificationId}/read`);
    if (!response.data?.success) {
      throw new Error('Échec marquage notification');
    }
    return response.data;
  }

  /**
   * Synchroniser demande de prise en charge
   */
  async syncRequestPriseEnCharge(data) {
    const response = await api.post('/interim/request-prise-en-charge', data);
    if (!response.data) {
      throw new Error('Échec demande prise en charge');
    }
    return response.data;
  }

  /**
   * Synchroniser demande de feuille de soins
   */
  async syncRequestFeuilleSoins(data) {
    const response = await api.post('/interim/request-feuille-de-soins', data);
    if (!response.data) {
      throw new Error('Échec demande feuille de soins');
    }
    return response.data;
  }

  /**
   * Synchroniser token de push
   */
  async syncUpdatePushToken(data) {
    const response = await api.post('/user/save-push-token', data);
    if (!response.data) {
      throw new Error('Échec mise à jour push token');
    }
    return response.data;
  }

  /**
   * Synchronisation en arrière-plan (périodique)
   */
  async backgroundSync(userId) {
    if (this.isSyncing) {
      return false;
    }

    const isOnline = await checkNetworkStatus();
    if (!isOnline) {
      return false;
    }

    const lastSync = await getLastSyncTime();
    const now = Date.now();
    
    // Synchroniser si la dernière sync date de plus de 30 minutes
    if (!lastSync || (now - lastSync) > 30 * 60 * 1000) {
      console.log('Démarrage synchronisation en arrière-plan');
      return await this.startFullSync(userId);
    }

    return false;
  }

  /**
   * Synchronisation rapide (queue seulement)
   */
  async quickSync() {
    if (this.isSyncing) {
      return false;
    }

    const isOnline = await checkNetworkStatus();
    if (!isOnline) {
      return false;
    }

    const queue = await getSyncQueue();
    if (queue.length === 0) {
      return true;
    }

    this.isSyncing = true;
    this.notifyListeners('sync_started', { type: 'quick' });

    try {
      await this.processSyncQueue();
      this.notifyListeners('sync_completed', { type: 'quick' });
      return true;
    } catch (error) {
      console.error('Erreur synchronisation rapide:', error);
      this.notifyListeners('sync_failed', { error: error.message, type: 'quick' });
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Forcer la synchronisation avec confirmation
   */
  async forceSyncWithConfirmation(userId) {
    return new Promise((resolve) => {
      Alert.alert(
        'Synchronisation',
        'Voulez-vous synchroniser vos données maintenant ? Cela peut consommer des données mobiles.',
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Synchroniser',
            onPress: async () => {
              const success = await this.startFullSync(userId);
              resolve(success);
            }
          }
        ]
      );
    });
  }

  /**
   * Obtenir les statistiques de synchronisation
   */
  async getSyncStats() {
    const queue = await getSyncQueue();
    const lastSync = await getLastSyncTime();
    
    return {
      queueSize: queue.length,
      lastSyncTime: lastSync,
      lastSyncAge: lastSync ? Date.now() - lastSync : null,
      isSyncing: this.isSyncing
    };
  }
}

// Instance singleton
export const syncManager = new SyncManager();

// Fonctions utilitaires pour les actions hors-ligne
export const queueOfflineAction = async (type, data) => {
  return await addToSyncQueue({ type, data });
};

// Actions spécifiques
export const queueProfileUpdate = async (profileData) => {
  return await queueOfflineAction('update_profile', profileData);
};

export const queueNotificationRead = async (notificationId) => {
  return await queueOfflineAction('mark_notification_read', { notificationId });
};

export const queuePriseEnChargeRequest = async (requestData) => {
  return await queueOfflineAction('request_prise_en_charge', requestData);
};

export const queueFeuilleSoinsRequest = async (requestData) => {
  return await queueOfflineAction('request_feuille_soins', requestData);
};

export const queuePushTokenUpdate = async (tokenData) => {
  return await queueOfflineAction('update_push_token', tokenData);
};

export default syncManager;