// utils/certificate-pinning.js - SSL Certificate Pinning for Zero-Trust
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * CERTIFICATE PINNING IMPLEMENTATION
 * Protection contre les attaques Man-in-the-Middle
 */

// Configuration des certificats autorisés
const CERTIFICATE_CONFIG = {
  // Production certificates (SHA256 fingerprints)
  PRODUCTION_PINS: [
    // Remplacer par les vrais SHA256 de vos certificats
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Certificat principal
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Certificat de backup
    'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=', // Certificat CA
  ],
  
  // Development certificates (pour les tests)
  DEVELOPMENT_PINS: [
    'sha256/DEVDEVDEVDEVDEVDEVDEVDEVDEVDEVDEVDEVDEVDEV=', // Certificat dev
  ],
  
  // Domaines autorisés avec leurs pins
  DOMAIN_PINS: {
    'api.pro-recrute.com': {
      pins: ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='],
      includeSubdomains: true,
      enforceHttps: true,
    },
    'backup-api.pro-recrute.com': {
      pins: ['sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='],
      includeSubdomains: false,
      enforceHttps: true,
    },
    'cdn.pro-recrute.com': {
      pins: ['sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC='],
      includeSubdomains: true,
      enforceHttps: true,
    }
  },
  
  // Configuration de sécurité
  SECURITY_CONFIG: {
    allowDevelopmentCerts: __DEV__,
    reportViolations: true,
    enforceInDevelopment: false,
    maxRetries: 3,
    violationCooldown: 300000, // 5 minutes
  }
};

/**
 * Valider le certificat d'un domaine
 */
export const validateCertificate = async (hostname, certificateChain) => {
  try {
    console.log(`🔒 Validation certificat pour: ${hostname}`);
    
    const domainConfig = CERTIFICATE_CONFIG.DOMAIN_PINS[hostname];
    
    if (!domainConfig) {
      console.warn(`⚠️ Aucun pin configuré pour ${hostname}`);
      
      // En développement, permettre les certificats non-pinned
      if (CERTIFICATE_CONFIG.SECURITY_CONFIG.allowDevelopmentCerts) {
        return { isValid: true, reason: 'Development mode - certificate pinning bypassed' };
      }
      
      return { 
        isValid: false, 
        reason: `Domaine non autorisé: ${hostname}`,
        severity: 'HIGH'
      };
    }
    
    // Vérifier HTTPS forcé
    if (domainConfig.enforceHttps) {
      if (!hostname.startsWith('https://') && !hostname.includes('443')) {
        return {
          isValid: false,
          reason: 'HTTPS requis pour ce domaine',
          severity: 'HIGH'
        };
      }
    }
    
    // Valider les pins de certificats
    const isValidPin = await validateCertificatePin(certificateChain, domainConfig.pins);
    
    if (!isValidPin.isValid) {
      await reportCertificateViolation(hostname, isValidPin.reason);
      return {
        isValid: false,
        reason: `Pin de certificat invalide: ${isValidPin.reason}`,
        severity: 'CRITICAL'
      };
    }
    
    console.log(`✅ Certificat valide pour ${hostname}`);
    return { isValid: true, reason: 'Certificate validation successful' };
    
  } catch (error) {
    console.error(`❌ Erreur validation certificat pour ${hostname}:`, error);
    
    await reportCertificateViolation(hostname, error.message);
    
    return {
      isValid: false,
      reason: `Erreur validation: ${error.message}`,
      severity: 'HIGH'
    };
  }
};

/**
 * Valider un pin de certificat spécifique
 */
const validateCertificatePin = async (certificateChain, expectedPins) => {
  try {
    if (!certificateChain || !Array.isArray(certificateChain)) {
      return { isValid: false, reason: 'Chaîne de certificats invalide' };
    }
    
    for (const certificate of certificateChain) {
      // Extraire la clé publique du certificat
      const publicKey = extractPublicKey(certificate);
      
      if (publicKey) {
        // Calculer le SHA256 de la clé publique
        const publicKeyHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          publicKey
        );
        
        const formattedPin = `sha256/${btoa(publicKeyHash)}`;
        
        // Vérifier si ce pin correspond à un pin attendu
        if (expectedPins.includes(formattedPin)) {
          return { isValid: true, reason: 'Pin correspondant trouvé' };
        }
      }
    }
    
    return { 
      isValid: false, 
      reason: 'Aucun pin correspondant trouvé dans la chaîne de certificats' 
    };
    
  } catch (error) {
    console.error('Erreur validation pin certificat:', error);
    return { isValid: false, reason: `Erreur validation pin: ${error.message}` };
  }
};

/**
 * Extraire la clé publique d'un certificat
 * (Implémentation simplifiée - en production, utiliser une lib crypto complète)
 */
const extractPublicKey = (certificate) => {
  try {
    // Dans un vrai projet, parser le certificat X.509 pour extraire la clé publique
    // Ici c'est une implémentation simplifiée
    
    if (typeof certificate === 'string') {
      // Supposer que c'est un certificat PEM
      const pemMatch = certificate.match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/);
      if (pemMatch) {
        return pemMatch[1].replace(/\s/g, '');
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erreur extraction clé publique:', error);
    return null;
  }
};

/**
 * Rapporter une violation de certificat
 */
const reportCertificateViolation = async (hostname, reason) => {
  try {
    if (!CERTIFICATE_CONFIG.SECURITY_CONFIG.reportViolations) {
      return;
    }
    
    const violation = {
      type: 'certificate_pinning_violation',
      hostname,
      reason,
      timestamp: Date.now(),
      platform: Platform.OS,
      appVersion: '1.0.0', // À récupérer depuis l'app config
      severity: 'CRITICAL'
    };
    
    console.error('🚨 VIOLATION CERTIFICAT:', violation);
    
    // Envoyer au système de détection d'intrusion
    const { detectAndRespondToIntrusion } = await import('./security');
    await detectAndRespondToIntrusion(violation);
    
    // Envoyer au serveur de monitoring (si connecté)
    try {
      await fetch('/api/security/certificate-violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(violation)
      });
    } catch (networkError) {
      // Stocker localement pour envoi ultérieur
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const violations = await AsyncStorage.getItem('certificate_violations') || '[]';
      const violationsList = JSON.parse(violations);
      violationsList.push(violation);
      
      await AsyncStorage.setItem(
        'certificate_violations', 
        JSON.stringify(violationsList.slice(-50)) // Garder seulement les 50 dernières
      );
    }
    
  } catch (error) {
    console.error('Erreur rapport violation certificat:', error);
  }
};

/**
 * Valider l'URL avant une requête
 */
export const validateUrlSecurity = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Vérifier si le domaine est autorisé
    const allowedDomains = Object.keys(CERTIFICATE_CONFIG.DOMAIN_PINS);
    const isAllowedDomain = allowedDomains.some(domain => {
      const config = CERTIFICATE_CONFIG.DOMAIN_PINS[domain];
      if (config.includeSubdomains) {
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }
      return hostname === domain;
    });
    
    if (!isAllowedDomain) {
      return {
        isValid: false,
        reason: `Domaine non autorisé: ${hostname}`,
        severity: 'HIGH'
      };
    }
    
    // Vérifier HTTPS
    if (urlObj.protocol !== 'https:') {
      const domainConfig = CERTIFICATE_CONFIG.DOMAIN_PINS[hostname];
      if (domainConfig && domainConfig.enforceHttps) {
        return {
          isValid: false,
          reason: 'HTTPS requis pour ce domaine',
          severity: 'HIGH'
        };
      }
    }
    
    return { isValid: true, reason: 'URL validation successful' };
    
  } catch (error) {
    return {
      isValid: false,
      reason: `URL invalide: ${error.message}`,
      severity: 'MEDIUM'
    };
  }
};

/**
 * Configuration d'Axios avec certificate pinning
 */
export const createSecureAxiosConfig = () => {
  return {
    // Custom adapter pour valider les certificats
    adapter: async (config) => {
      const urlValidation = validateUrlSecurity(config.url);
      
      if (!urlValidation.isValid) {
        throw new Error(`Security validation failed: ${urlValidation.reason}`);
      }
      
      // Dans un vrai projet, intercepter les certificats ici
      // Pour React Native, cela nécessiterait un module natif
      
      return config;
    },
    
    // Headers de sécurité
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  };
};

/**
 * Obtenir les violations de certificat stockées
 */
export const getCertificateViolations = async () => {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const violations = await AsyncStorage.getItem('certificate_violations');
    return violations ? JSON.parse(violations) : [];
  } catch (error) {
    console.error('Erreur récupération violations certificat:', error);
    return [];
  }
};

/**
 * Nettoyer les violations anciennes
 */
export const cleanupOldViolations = async () => {
  try {
    const violations = await getCertificateViolations();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentViolations = violations.filter(v => v.timestamp > oneDayAgo);
    
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('certificate_violations', JSON.stringify(recentViolations));
    
    return recentViolations.length;
  } catch (error) {
    console.error('Erreur nettoyage violations:', error);
    return 0;
  }
};

export default {
  validateCertificate,
  validateUrlSecurity,
  createSecureAxiosConfig,
  getCertificateViolations,
  cleanupOldViolations
};