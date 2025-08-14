// utils/offline-storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { Alert } from 'react-native';

/**
 * Système de stockage hors-ligne pour l'application intérimaire
 */

// Clés de stockage
const STORAGE_KEYS = {
  USER_PROFILE: 'offline_user_profile',
  INTERIM_PROFILE: 'offline_interim_profile',
  NOTIFICATIONS: 'offline_notifications',
  STRUCTURES: 'offline_structures',
  CONTRACTS: 'offline_contracts',
  IPM_DATA: 'offline_ipm_data',
  ANALYTICS: 'offline_analytics',
  SYNC_QUEUE: 'offline_sync_queue',
  LAST_SYNC: 'offline_last_sync',
  NETWORK_STATUS: 'offline_network_status'
};

// Configuration du cache
const CACHE_CONFIG = {
  // Durée de validité des données (en millisecondes)
  VALIDITY_PERIODS: {
    USER_PROFILE: 24 * 60 * 60 * 1000, // 24 heures
    INTERIM_PROFILE: 24 * 60 * 60 * 1000, // 24 heures
    NOTIFICATIONS: 60 * 60 * 1000, // 1 heure
    STRUCTURES: 7 * 24 * 60 * 60 * 1000, // 7 jours
    CONTRACTS: 24 * 60 * 60 * 1000, // 24 heures
    IPM_DATA: 12 * 60 * 60 * 1000, // 12 heures
    ANALYTICS: 6 * 60 * 60 * 1000 // 6 heures
  },
  // Taille maximale des caches (nombre d'éléments)
  MAX_CACHE_SIZE: {
    NOTIFICATIONS: 100,
    STRUCTURES: 500,
    CONTRACTS: 50,
    SYNC_QUEUE: 100
  }
};

/**
 * Vérifier l'état de la connexion réseau
 */
export const checkNetworkStatus = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    
    const isConnected = networkState.isConnected && networkState.isInternetReachable;
    
    // Stocker l'état réseau
    await AsyncStorage.setItem(STORAGE_KEYS.NETWORK_STATUS, JSON.stringify({
      isConnected,
      type: networkState.type,
      checkedAt: Date.now()
    }));
    
    return isConnected;
  } catch (error) {
    console.error('Erreur vérification réseau:', error);
    return false;
  }
};

/**
 * Obtenir l'état réseau depuis le cache
 */
export const getCachedNetworkStatus = async () => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.NETWORK_STATUS);
    if (cached) {
      const status = JSON.parse(cached);
      // Vérifier si le cache n'est pas trop ancien (< 30 secondes)
      if (Date.now() - status.checkedAt < 30000) {
        return status.isConnected;
      }
    }
    
    // Si pas de cache ou cache obsolète, vérifier en temps réel
    return await checkNetworkStatus();
  } catch (error) {
    console.error('Erreur récupération status réseau:', error);
    return false;
  }
};

/**
 * Stocker des données avec métadonnées
 */
export const storeOfflineData = async (key, data, options = {}) => {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      version: options.version || 1,
      metadata: options.metadata || {}
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheEntry));
    console.log(`Données stockées hors-ligne: ${key}`);
    return true;
  } catch (error) {
    console.error('Erreur stockage hors-ligne:', error);
    return false;
  }
};

/**
 * Récupérer des données avec vérification de validité
 */
export const getOfflineData = async (key, validityPeriod = null) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;
    
    const cacheEntry = JSON.parse(cached);
    
    // Vérifier la validité si une période est spécifiée
    if (validityPeriod) {
      const age = Date.now() - cacheEntry.timestamp;
      if (age > validityPeriod) {
        console.log(`Cache expiré pour ${key} (${Math.round(age / 60000)} minutes)`);
        await AsyncStorage.removeItem(key);
        return null;
      }
    }
    
    return cacheEntry.data;
  } catch (error) {
    console.error('Erreur récupération hors-ligne:', error);
    return null;
  }
};

/**
 * Stocker le profil utilisateur
 */
export const storeUserProfile = async (userProfile) => {
  return await storeOfflineData(STORAGE_KEYS.USER_PROFILE, userProfile);
};

/**
 * Récupérer le profil utilisateur
 */
export const getUserProfile = async () => {
  return await getOfflineData(STORAGE_KEYS.USER_PROFILE, CACHE_CONFIG.VALIDITY_PERIODS.USER_PROFILE);
};

/**
 * Stocker le profil intérimaire
 */
export const storeInterimProfile = async (interimProfile) => {
  return await storeOfflineData(STORAGE_KEYS.INTERIM_PROFILE, interimProfile);
};

/**
 * Récupérer le profil intérimaire
 */
export const getInterimProfile = async () => {
  return await getOfflineData(STORAGE_KEYS.INTERIM_PROFILE, CACHE_CONFIG.VALIDITY_PERIODS.INTERIM_PROFILE);
};

/**
 * Stocker les notifications
 */
export const storeNotifications = async (notifications) => {
  // Limiter le nombre de notifications stockées
  const limitedNotifications = notifications.slice(0, CACHE_CONFIG.MAX_CACHE_SIZE.NOTIFICATIONS);
  return await storeOfflineData(STORAGE_KEYS.NOTIFICATIONS, limitedNotifications);
};

/**
 * Récupérer les notifications
 */
export const getNotifications = async () => {
  return await getOfflineData(STORAGE_KEYS.NOTIFICATIONS, CACHE_CONFIG.VALIDITY_PERIODS.NOTIFICATIONS);
};

/**
 * Stocker les structures de soins
 */
export const storeStructures = async (structures) => {
  const limitedStructures = structures.slice(0, CACHE_CONFIG.MAX_CACHE_SIZE.STRUCTURES);
  return await storeOfflineData(STORAGE_KEYS.STRUCTURES, limitedStructures);
};

/**
 * Récupérer les structures de soins
 */
export const getStructures = async () => {
  return await getOfflineData(STORAGE_KEYS.STRUCTURES, CACHE_CONFIG.VALIDITY_PERIODS.STRUCTURES);
};

/**
 * Stocker les contrats
 */
export const storeContracts = async (contracts) => {
  const limitedContracts = contracts.slice(0, CACHE_CONFIG.MAX_CACHE_SIZE.CONTRACTS);
  return await storeOfflineData(STORAGE_KEYS.CONTRACTS, limitedContracts);
};

/**
 * Récupérer les contrats
 */
export const getContracts = async () => {
  return await getOfflineData(STORAGE_KEYS.CONTRACTS, CACHE_CONFIG.VALIDITY_PERIODS.CONTRACTS);
};

/**
 * Stocker les données IPM
 */
export const storeIpmData = async (ipmData) => {
  return await storeOfflineData(STORAGE_KEYS.IPM_DATA, ipmData);
};

/**
 * Récupérer les données IPM
 */
export const getIpmData = async () => {
  return await getOfflineData(STORAGE_KEYS.IPM_DATA, CACHE_CONFIG.VALIDITY_PERIODS.IPM_DATA);
};

/**
 * Stocker les analytics
 */
export const storeAnalytics = async (analytics) => {
  return await storeOfflineData(STORAGE_KEYS.ANALYTICS, analytics);
};

/**
 * Récupérer les analytics
 */
export const getAnalytics = async () => {
  return await getOfflineData(STORAGE_KEYS.ANALYTICS, CACHE_CONFIG.VALIDITY_PERIODS.ANALYTICS);
};

/**
 * Ajouter une action à la queue de synchronisation
 */
export const addToSyncQueue = async (action) => {
  try {
    const existingQueue = await getOfflineData(STORAGE_KEYS.SYNC_QUEUE) || [];
    
    const newAction = {
      id: Date.now() + Math.random(),
      ...action,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    const updatedQueue = [...existingQueue, newAction];
    
    // Limiter la taille de la queue
    const limitedQueue = updatedQueue.slice(-CACHE_CONFIG.MAX_CACHE_SIZE.SYNC_QUEUE);
    
    await storeOfflineData(STORAGE_KEYS.SYNC_QUEUE, limitedQueue);
    
    console.log('Action ajoutée à la queue de sync:', action.type);
    return true;
  } catch (error) {
    console.error('Erreur ajout queue sync:', error);
    return false;
  }
};

/**
 * Récupérer la queue de synchronisation
 */
export const getSyncQueue = async () => {
  return await getOfflineData(STORAGE_KEYS.SYNC_QUEUE) || [];
};

/**
 * Supprimer une action de la queue
 */
export const removeFromSyncQueue = async (actionId) => {
  try {
    const queue = await getSyncQueue();
    const updatedQueue = queue.filter(action => action.id !== actionId);
    await storeOfflineData(STORAGE_KEYS.SYNC_QUEUE, updatedQueue);
    return true;
  } catch (error) {
    console.error('Erreur suppression queue sync:', error);
    return false;
  }
};

/**
 * Marquer la dernière synchronisation
 */
export const setLastSyncTime = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    return true;
  } catch (error) {
    console.error('Erreur marquage dernière sync:', error);
    return false;
  }
};

/**
 * Obtenir le temps de la dernière synchronisation
 */
export const getLastSyncTime = async () => {
  try {
    const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return lastSync ? parseInt(lastSync) : null;
  } catch (error) {
    console.error('Erreur récupération dernière sync:', error);
    return null;
  }
};

/**
 * Vider tout le cache hors-ligne
 */
export const clearOfflineCache = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
    console.log('Cache hors-ligne vidé');
    return true;
  } catch (error) {
    console.error('Erreur vidage cache:', error);
    return false;
  }
};

/**
 * Obtenir la taille du cache
 */
export const getCacheSize = async () => {
  try {
    let totalSize = 0;
    const keys = Object.values(STORAGE_KEYS);
    
    for (const key of keys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        totalSize += data.length;
      }
    }
    
    return {
      bytes: totalSize,
      mb: (totalSize / (1024 * 1024)).toFixed(2)
    };
  } catch (error) {
    console.error('Erreur calcul taille cache:', error);
    return { bytes: 0, mb: '0.00' };
  }
};

/**
 * Nettoyer le cache expiré
 */
export const cleanExpiredCache = async () => {
  try {
    let cleanedCount = 0;
    
    // Vérifier chaque type de cache avec sa période de validité
    for (const [type, period] of Object.entries(CACHE_CONFIG.VALIDITY_PERIODS)) {
      const key = STORAGE_KEYS[type];
      if (key) {
        const data = await getOfflineData(key, period);
        if (!data) {
          cleanedCount++;
        }
      }
    }
    
    console.log(`${cleanedCount} entrées de cache expirées nettoyées`);
    return cleanedCount;
  } catch (error) {
    console.error('Erreur nettoyage cache expiré:', error);
    return 0;
  }
};

/**
 * Afficher un message d'état hors-ligne
 */
export const showOfflineMessage = (message = 'Mode hors-ligne activé') => {
  Alert.alert(
    '📱 Mode hors-ligne',
    message + '\n\nVos données seront synchronisées dès que la connexion sera rétablie.',
    [{ text: 'OK' }]
  );
};

/**
 * Vérifier si des données sont disponibles hors-ligne
 */
export const hasOfflineData = async () => {
  try {
    const userProfile = await getUserProfile();
    const interimProfile = await getInterimProfile();
    
    return !!(userProfile && interimProfile);
  } catch (error) {
    console.error('Erreur vérification données hors-ligne:', error);
    return false;
  }
};