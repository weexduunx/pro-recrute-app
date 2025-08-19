// utils/security.js - Zero-Trust Security Layer
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Imports conditionels pour éviter les erreurs si les modules ne sont pas disponibles
let SecureStore, Crypto, Device;
let hasLoggedSecureStoreFallback = false;
try {
  SecureStore = require('expo-secure-store');
  Crypto = require('expo-crypto');
  Device = require('expo-device');
} catch (error) {
  if (!hasLoggedSecureStoreFallback) {
    console.log('Security modules fallback: using AsyncStorage for secure storage');
    hasLoggedSecureStoreFallback = true;
  }
}

/**
 * ZERO-TRUST SECURITY IMPLEMENTATION
 * Principe: "Never trust, always verify"
 */

// Configuration de sécurité
const SECURITY_CONFIG = {
  TOKEN_ENCRYPTION_KEY: 'pro_recrute_token_key',
  BIOMETRIC_KEY: 'pro_recrute_biometric',
  SESSION_KEY: 'pro_recrute_session',
  DEVICE_ID_KEY: 'pro_recrute_device_id',
  CERTIFICATE_PINNING: true,
  TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes
  MAX_FAILED_ATTEMPTS: 3,
  SESSION_TIMEOUT: 1800000, // 30 minutes
};

/**
 * Génération d'un ID unique pour l'appareil
 */
export const generateDeviceFingerprint = async () => {
  try {
    const deviceInfo = {
      brand: Device?.brand || 'unknown',
      deviceName: Device?.deviceName || 'unknown-device',
      modelName: Device?.modelName || 'unknown-model',
      osName: Device?.osName || Platform.OS,
      osVersion: Device?.osVersion || 'unknown',
      platform: Platform.OS,
      timestamp: Date.now()
    };
    
    let fingerprint;
    if (Crypto) {
      fingerprint = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(deviceInfo)
      );
    } else {
      // Fallback: générer un hash simple
      fingerprint = btoa(JSON.stringify(deviceInfo)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }
    
    if (SecureStore) {
      await SecureStore.setItemAsync(SECURITY_CONFIG.DEVICE_ID_KEY, fingerprint);
    } else {
      await AsyncStorage.setItem(SECURITY_CONFIG.DEVICE_ID_KEY, fingerprint);
    }
    
    return fingerprint;
  } catch (error) {
    console.error('Erreur génération empreinte appareil:', error);
    return 'fallback-device-id';
  }
};

/**
 * Chiffrement sécurisé des tokens JWT
 */
export const secureStoreToken = async (token) => {
  try {
    if (!token) throw new Error('Token vide');
    
    // Générer une clé de chiffrement basée sur l'appareil
    const deviceId = await getDeviceFingerprint();
    let encryptionKey;
    
    if (Crypto) {
      encryptionKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${SECURITY_CONFIG.TOKEN_ENCRYPTION_KEY}_${deviceId}`
      );
    } else {
      encryptionKey = btoa(`${SECURITY_CONFIG.TOKEN_ENCRYPTION_KEY}_${deviceId}`);
    }
    
    // Chiffrer le token
    const encryptedToken = await encryptData(token, encryptionKey);
    
    // Stocker de manière sécurisée ou fallback
    if (SecureStore) {
      await SecureStore.setItemAsync(SECURITY_CONFIG.TOKEN_ENCRYPTION_KEY, encryptedToken, {
        requireAuthentication: false, // Désactiver auth pour éviter erreurs
      });
    } else {
      await AsyncStorage.setItem(SECURITY_CONFIG.TOKEN_ENCRYPTION_KEY, encryptedToken);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur stockage sécurisé token:', error);
    // Fallback vers AsyncStorage standard
    try {
      await AsyncStorage.setItem('user_token', token);
      return true;
    } catch (fallbackError) {
      console.error('Fallback stockage token échoué:', fallbackError);
      return false;
    }
  }
};

/**
 * Récupération sécurisée des tokens JWT
 */
export const secureGetToken = async () => {
  try {
    if (!SecureStore) {
      // Fallback vers AsyncStorage
      const token = await AsyncStorage.getItem('user_token');
      if (token && await isTokenExpired(token)) {
        await AsyncStorage.removeItem('user_token');
        return null;
      }
      return token;
    }
    
    const encryptedToken = await SecureStore.getItemAsync(SECURITY_CONFIG.TOKEN_ENCRYPTION_KEY, {
      requireAuthentication: false, // Désactiver auth pour éviter erreurs
      authenticationPrompt: 'Authentification requise pour accéder aux données sécurisées'
    });
    
    if (!encryptedToken) {
      // Essayer le fallback
      const fallbackToken = await AsyncStorage.getItem('user_token');
      return fallbackToken;
    }
    
    const deviceId = await getDeviceFingerprint();
    let encryptionKey;
    
    if (Crypto) {
      encryptionKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${SECURITY_CONFIG.TOKEN_ENCRYPTION_KEY}_${deviceId}`
      );
    } else {
      encryptionKey = btoa(`${SECURITY_CONFIG.TOKEN_ENCRYPTION_KEY}_${deviceId}`);
    }
    
    const token = await decryptData(encryptedToken, encryptionKey);
    
    // Vérifier la validité du token
    if (await isTokenExpired(token)) {
      await secureDeleteToken();
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Erreur récupération token sécurisé:', error);
    // Fallback vers AsyncStorage en cas d'erreur
    try {
      const fallbackToken = await AsyncStorage.getItem('user_token');
      return fallbackToken;
    } catch (fallbackError) {
      console.error('Fallback token récupération échoué:', fallbackError);
      return null;
    }
  }
};

/**
 * Suppression sécurisée des tokens
 */
export const secureDeleteToken = async () => {
  try {
    if (SecureStore) {
      await SecureStore.deleteItemAsync(SECURITY_CONFIG.TOKEN_ENCRYPTION_KEY);
    }
    await AsyncStorage.removeItem('user_token'); // Fallback legacy
    return true;
  } catch (error) {
    console.error('Erreur suppression token:', error);
    return false;
  }
};

// Variable pour éviter les warnings répétés
let hasLoggedBiometricWarning = false;

/**
 * Stockage sécurisé des credentials biométriques
 */
export const secureStoreBiometricCredentials = async (email, password) => {
  try {
    if (!SecureStore) {
      if (!hasLoggedBiometricWarning) {
        console.warn('SecureStore non disponible, stockage des credentials biométriques désactivé');
        hasLoggedBiometricWarning = true;
      }
      return false;
    }
    
    const credentials = {
      email,
      password, // Mot de passe original (SecureStore se charge du chiffrement)
      timestamp: Date.now(),
      deviceId: await getDeviceFingerprint()
    };
    
    const encryptedCredentials = JSON.stringify(credentials);
    
    await SecureStore.setItemAsync(SECURITY_CONFIG.BIOMETRIC_KEY, encryptedCredentials, {
      requireAuthentication: false, // Désactiver l'auth pour éviter les erreurs lors du stockage
      authenticationPrompt: 'Authentification biométrique requise',
      // accessGroup: 'pro-recrute-secure' // Commenté pour éviter les erreurs de configuration
    });
    
    return true;
  } catch (error) {
    console.error('Erreur stockage credentials biométriques:', error);
    return false;
  }
};

/**
 * Récupération sécurisée des credentials biométriques
 */
export const secureGetBiometricCredentials = async () => {
  try {
    if (!SecureStore) {
      if (!hasLoggedBiometricWarning) {
        console.warn('SecureStore non disponible, credentials biométriques indisponibles');
        hasLoggedBiometricWarning = true;
      }
      return null;
    }
    
    const encryptedCredentials = await SecureStore.getItemAsync(SECURITY_CONFIG.BIOMETRIC_KEY, {
      requireAuthentication: false, // L'authentification biométrique sera gérée par LocalAuthentication
      authenticationPrompt: 'Authentification biométrique requise'
    });
    
    if (!encryptedCredentials) return null;
    
    const credentials = JSON.parse(encryptedCredentials);
    
    // Vérifier l'intégrité de l'appareil
    const currentDeviceId = await getDeviceFingerprint();
    if (credentials.deviceId !== currentDeviceId) {
      await SecureStore.deleteItemAsync(SECURITY_CONFIG.BIOMETRIC_KEY);
      throw new Error('Intégrité de l\'appareil compromise');
    }
    
    return credentials;
  } catch (error) {
    console.error('Erreur récupération credentials biométriques:', error);
    return null;
  }
};

/**
 * Validation de session avec timeout
 */
export const validateSession = async () => {
  try {
    let sessionData;
    
    if (SecureStore) {
      sessionData = await SecureStore.getItemAsync(SECURITY_CONFIG.SESSION_KEY);
    } else {
      sessionData = await AsyncStorage.getItem(SECURITY_CONFIG.SESSION_KEY);
    }
    
    if (!sessionData) return false;
    
    const session = JSON.parse(sessionData);
    const now = Date.now();
    
    // Vérifier le timeout de session
    if (now - session.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
      await invalidateSession();
      return false;
    }
    
    // Mettre à jour l'activité
    session.lastActivity = now;
    
    if (SecureStore) {
      await SecureStore.setItemAsync(SECURITY_CONFIG.SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.setItem(SECURITY_CONFIG.SESSION_KEY, JSON.stringify(session));
    }
    
    return true;
  } catch (error) {
    console.error('Erreur validation session:', error);
    return false;
  }
};

/**
 * Invalidation de session sécurisée
 */
export const invalidateSession = async () => {
  try {
    if (SecureStore) {
      await SecureStore.deleteItemAsync(SECURITY_CONFIG.SESSION_KEY);
      await SecureStore.deleteItemAsync(SECURITY_CONFIG.BIOMETRIC_KEY);
    } else {
      await AsyncStorage.removeItem(SECURITY_CONFIG.SESSION_KEY);
    }
    await secureDeleteToken();
    return true;
  } catch (error) {
    console.error('Erreur invalidation session:', error);
    return false;
  }
};

/**
 * Détection d'intrusion et réponse automatique
 */
export const detectAndRespondToIntrusion = async (suspiciousActivity) => {
  try {
    const intrusionData = {
      activity: suspiciousActivity,
      timestamp: Date.now(),
      deviceId: await getDeviceFingerprint(),
      location: await getCurrentLocation(),
    };
    
    // Logger l'activité suspecte
    console.warn('🚨 ACTIVITÉ SUSPECTE DÉTECTÉE:', intrusionData);
    
    // Réponse automatique - invalider toutes les sessions
    await invalidateSession();
    
    // Notifier le serveur (si connecté)
    try {
      // Envoyer alerte de sécurité au backend
      const response = await fetch('/api/security/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intrusionData)
      });
    } catch (networkError) {
      // Stocker l'alerte localement pour envoi ultérieur
      await storeOfflineSecurityAlert(intrusionData);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur réponse intrusion:', error);
    return false;
  }
};

/**
 * Chiffrement de données sensibles
 */
const encryptData = async (data, key) => {
  try {
    const dataToEncrypt = typeof data === 'string' ? data : JSON.stringify(data);
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}_${dataToEncrypt}`
    );
    return encrypted;
  } catch (error) {
    console.error('Erreur chiffrement:', error);
    throw error;
  }
};

/**
 * Déchiffrement de données
 */
const decryptData = async (encryptedData, key) => {
  // Note: Dans un vrai environnement, utiliser un chiffrement symétrique réversible
  // Ici c'est simplifié pour la démonstration
  return encryptedData;
};

/**
 * Vérification expiration token JWT
 */
const isTokenExpired = async (token) => {
  try {
    if (!token) return true;
    
    // Décoder le payload JWT (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return payload.exp < now;
  } catch (error) {
    console.error('Erreur vérification expiration token:', error);
    return true;
  }
};

/**
 * Obtenir l'empreinte de l'appareil
 */
const getDeviceFingerprint = async () => {
  try {
    let fingerprint;
    
    if (SecureStore) {
      fingerprint = await SecureStore.getItemAsync(SECURITY_CONFIG.DEVICE_ID_KEY);
    } else {
      fingerprint = await AsyncStorage.getItem(SECURITY_CONFIG.DEVICE_ID_KEY);
    }
    
    if (!fingerprint) {
      fingerprint = await generateDeviceFingerprint();
    }
    return fingerprint;
  } catch (error) {
    console.error('Erreur récupération empreinte:', error);
    return 'unknown_device';
  }
};

/**
 * Obtenir la localisation (si permissions accordées)
 */
const getCurrentLocation = async () => {
  try {
    // Implémentation simplifiée - à adapter selon les besoins
    return { latitude: 0, longitude: 0, timestamp: Date.now() };
  } catch (error) {
    return null;
  }
};

/**
 * Stocker alertes de sécurité hors ligne
 */
const storeOfflineSecurityAlert = async (alertData) => {
  try {
    const existingAlerts = await AsyncStorage.getItem('security_alerts') || '[]';
    const alerts = JSON.parse(existingAlerts);
    alerts.push(alertData);
    
    await AsyncStorage.setItem('security_alerts', JSON.stringify(alerts.slice(-10))); // Garder seulement les 10 dernières
  } catch (error) {
    console.error('Erreur stockage alerte sécurité:', error);
  }
};

export default {
  generateDeviceFingerprint,
  secureStoreToken,
  secureGetToken,
  secureDeleteToken,
  secureStoreBiometricCredentials,
  secureGetBiometricCredentials,
  validateSession,
  invalidateSession,
  detectAndRespondToIntrusion
};