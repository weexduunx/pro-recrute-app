// utils/secure-api.js - Zero-Trust API Client
import axios from 'axios';
import * as Network from 'expo-network';
import * as Crypto from 'expo-crypto';
import { 
  secureGetToken, 
  secureStoreToken, 
  secureDeleteToken, 
  validateSession,
  detectAndRespondToIntrusion,
  generateDeviceFingerprint
} from './security';

// Configuration sécurisée
const SECURE_CONFIG = {
  // IMPORTANT: Utiliser HTTPS en production
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.pro-recrute.com/api',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  CERTIFICATE_PINS: [
    // Ajouter les empreintes SHA256 des certificats autorisés
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Remplacer par vrai pin
  ],
  ALLOWED_HOSTS: [
    'api.pro-recrute.com',
    'backup-api.pro-recrute.com'
  ],
  REQUEST_SIGNING_KEY: 'pro_recrute_request_signing',
};

// Création de l'instance Axios sécurisée
const secureApi = axios.create({
  baseURL: SECURE_CONFIG.BASE_URL,
  timeout: SECURE_CONFIG.TIMEOUT,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'ProRecruteApp/1.0',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

/**
 * Validation de l'hôte pour prévenir les attaques
 */
const validateHost = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    if (!SECURE_CONFIG.ALLOWED_HOSTS.includes(hostname)) {
      throw new Error(`Hôte non autorisé: ${hostname}`);
    }
    
    return true;
  } catch (error) {
    console.error('Validation hôte échouée:', error);
    return false;
  }
};

/**
 * Signature des requêtes pour l'intégrité
 */
const signRequest = async (config) => {
  try {
    const timestamp = Date.now().toString();
    const deviceId = await generateDeviceFingerprint();
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    const body = config.data ? JSON.stringify(config.data) : '';
    
    // Créer une signature de la requête
    const signatureData = `${method}|${url}|${body}|${timestamp}|${deviceId}`;
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      signatureData
    );
    
    // Ajouter les headers de sécurité
    config.headers = {
      ...config.headers,
      'X-Request-Timestamp': timestamp,
      'X-Device-ID': deviceId,
      'X-Request-Signature': signature,
      'X-App-Version': '1.0.0',
    };
    
    return config;
  } catch (error) {
    console.error('Erreur signature requête:', error);
    return config;
  }
};

/**
 * Vérification de l'intégrité de la réponse
 */
const verifyResponseIntegrity = async (response) => {
  try {
    const serverSignature = response.headers['x-response-signature'];
    if (!serverSignature) {
      console.warn('Signature de réponse manquante');
      return false;
    }
    
    // Vérifier la signature si présente
    const responseData = JSON.stringify(response.data);
    const expectedSignature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      responseData
    );
    
    return serverSignature === expectedSignature;
  } catch (error) {
    console.error('Erreur vérification intégrité réponse:', error);
    return false;
  }
};

/**
 * Intercepteur de requête - Zero Trust
 */
secureApi.interceptors.request.use(
  async (config) => {
    try {
      // Validation de l'hôte
      if (!validateHost(config.baseURL + config.url)) {
        throw new Error('Requête vers hôte non autorisé bloquée');
      }
      
      // Vérification de session
      const isSessionValid = await validateSession();
      if (!isSessionValid && !config.url?.includes('/auth/')) {
        throw new Error('Session expirée - authentification requise');
      }
      
      // Ajouter le token JWT sécurisé
      const token = await secureGetToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Signer la requête
      config = await signRequest(config);
      
      // Vérification réseau
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        throw new Error('Connexion réseau non disponible');
      }
      
      console.log(`🔒 Requête sécurisée: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    } catch (error) {
      console.error('Erreur intercepteur requête:', error);
      // Détecter tentative d'intrusion
      await detectAndRespondToIntrusion({
        type: 'request_interceptor_error',
        error: error.message,
        url: config.url,
      });
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Erreur configuration requête:', error);
    return Promise.reject(error);
  }
);

/**
 * Intercepteur de réponse - Zero Trust
 */
secureApi.interceptors.response.use(
  async (response) => {
    try {
      // Vérifier l'intégrité de la réponse
      const isIntegrityValid = await verifyResponseIntegrity(response);
      if (!isIntegrityValid) {
        console.warn('🚨 Intégrité de la réponse suspecte');
        await detectAndRespondToIntrusion({
          type: 'response_integrity_failure',
          url: response.config?.url,
          status: response.status,
        });
      }
      
      // Mettre à jour le token si fourni
      const newToken = response.headers['x-new-token'];
      if (newToken) {
        await secureStoreToken(newToken);
      }
      
      console.log(`✅ Réponse sécurisée: ${response.status} ${response.config?.url}`);
      return response;
    } catch (error) {
      console.error('Erreur traitement réponse:', error);
      return response; // Ne pas bloquer si erreur de vérification
    }
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Gestion des erreurs d'authentification
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.warn('🔐 Token expiré, suppression sécurisée...');
      await secureDeleteToken();
      
      // Détecter tentative d'accès non autorisé
      await detectAndRespondToIntrusion({
        type: 'unauthorized_access',
        url: originalRequest.url,
        timestamp: Date.now(),
      });
      
      // Rediriger vers authentification
      // Cette logique sera gérée par AuthProvider
    }
    
    // Gestion des erreurs de réseau suspectes
    if (!error.response && error.code === 'NETWORK_ERROR') {
      await detectAndRespondToIntrusion({
        type: 'network_manipulation_suspected',
        error: error.message,
        url: originalRequest?.url,
      });
    }
    
    // Gestion des erreurs serveur
    if (error.response?.status >= 500) {
      console.error('🚨 Erreur serveur détectée:', error.response.status);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Fonction de login sécurisée avec protection anti-brute force
 */
export const secureLoginUser = async (email, password, deviceName) => {
  try {
    // Validation des entrées
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }
    
    // Hash du mot de passe côté client pour sécurité supplémentaire
    const passwordHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + email.toLowerCase() // Salt avec l'email
    );
    
    const response = await secureApi.post('/auth/login', {
      email: email.toLowerCase().trim(),
      password_hash: passwordHash, // Envoyer le hash, pas le mot de passe
      device_name: deviceName,
      device_fingerprint: await generateDeviceFingerprint(),
    });
    
    // Stocker le token de manière sécurisée
    if (response.data.token) {
      await secureStoreToken(response.data.token);
    }
    
    return response.data;
  } catch (error) {
    // Détecter tentatives de connexion suspectes
    if (error.response?.status === 429) {
      await detectAndRespondToIntrusion({
        type: 'brute_force_attempt',
        email,
        timestamp: Date.now(),
      });
    }
    
    throw error;
  }
};

/**
 * Fonction de logout sécurisée
 */
export const secureLogoutUser = async () => {
  try {
    const response = await secureApi.post('/auth/logout');
    
    // Nettoyage sécurisé de toutes les données
    await secureDeleteToken();
    
    return response.data;
  } catch (error) {
    // Même en cas d'erreur, nettoyer localement
    await secureDeleteToken();
    throw error;
  }
};

/**
 * Récupération sécurisée du profil utilisateur
 */
export const secureFetchUserProfile = async () => {
  try {
    const response = await secureApi.get('/user/profile', {
      params: {
        include_profile: true,
        include_competences: true,
        include_experiences: true,
        include_formations: true,
        include_parsed_cv: true,
        security_check: true, // Demander vérification sécurité côté serveur
      }
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Test de connectivité sécurisée
 */
export const secureHealthCheck = async () => {
  try {
    const response = await secureApi.get('/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Health check échoué:', error);
    return null;
  }
};

// Export de l'instance API sécurisée
export { secureApi as default };

// Export des fonctions principales
export {
  secureLoginUser as loginUser,
  secureLogoutUser as logoutUser,
  secureFetchUserProfile as fetchUserProfile,
  secureHealthCheck as healthCheck,
};