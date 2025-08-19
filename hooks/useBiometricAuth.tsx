import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStoreBiometricCredentials, secureGetBiometricCredentials } from '../utils/security';
import * as Crypto from 'expo-crypto';

interface BiometricAuthState {
  isAvailable: boolean;
  isEnabled: boolean;
  hasStoredCredentials: boolean;
}

interface StoredCredentials {
  email: string;
  password: string; // Mot de passe original (stocké de manière sécurisée via SecureStore)
  passwordHash?: string; // Hash sécurisé du mot de passe (pour compatibilité)
  timestamp: number;
  deviceId: string;
}

const BIOMETRIC_STORAGE_KEY = '@app_biometric_enabled';
const CREDENTIALS_STORAGE_KEY = '@app_stored_credentials';

export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnabled: false,
    hasStoredCredentials: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  // Vérifier la disponibilité et les paramètres de l'authentification biométrique
  const checkBiometricStatus = async () => {
    if (isChecking) return state; // Éviter les appels multiples simultanés
    setIsChecking(true);
    
    try {
      // Vérifier si le matériel biométrique est disponible
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const isAvailable = compatible && enrolled;

      // Vérifier si l'utilisateur a activé l'authentification biométrique
      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
      const isEnabled = biometricEnabled === 'true';

      // Vérifier si des credentials sont stockés (sécurisé + legacy)
      let hasStoredCredentials = false;
      try {
        const secureCredentials = await secureGetBiometricCredentials();
        const legacyCredentials = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
        hasStoredCredentials = !!(secureCredentials || legacyCredentials);
      } catch (error) {
        console.warn('Erreur vérification credentials stockés:', error);
        // Fallback - vérifier seulement AsyncStorage
        const legacyCredentials = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
        hasStoredCredentials = !!legacyCredentials;
      }


      setState({
        isAvailable,
        isEnabled: isEnabled && isAvailable,
        hasStoredCredentials,
      });

      return {
        isAvailable,
        isEnabled: isEnabled && isAvailable,
        hasStoredCredentials,
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du statut biométrique:', error);
      return {
        isAvailable: false,
        isEnabled: false,
        hasStoredCredentials: false,
      };
    } finally {
      setIsChecking(false);
    }
  };

  // Authentifier avec biométrie et récupérer les credentials
  const authenticateWithBiometrics = async (): Promise<StoredCredentials | null> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: Platform.OS === 'ios' 
          ? '🔐 Authentifiez-vous avec Touch ID ou Face ID'
          : '🔐 Authentifiez-vous avec votre empreinte digitale',
        fallbackLabel: 'Utiliser le mot de passe',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Récupérer les credentials depuis le stockage sécurisé
        try {
          const secureCredentials = await secureGetBiometricCredentials();
          if (secureCredentials) {
            return secureCredentials;
          }
        } catch (error) {
          console.warn('Erreur récupération credentials sécurisés:', error);
        }
        
        // Fallback - migration depuis l'ancien stockage
        const legacyCredentials = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
        if (legacyCredentials) {
          const parsed = JSON.parse(legacyCredentials);
          // Migrer vers le stockage sécurisé si possible
          if (parsed.password) {
            await storeCredentials(parsed.email, parsed.password);
          }
          return parsed;
        }
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de l\'authentification biométrique:', error);
      return null;
    }
  };

  // Stocker les credentials de façon sécurisée (après connexion réussie)
  const storeCredentials = async (email: string, password: string): Promise<void> => {
    try {
      // Vérifier d'abord si l'authentification biométrique est activée
      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
      if (biometricEnabled === 'true') {
        // Stocker le mot de passe original (SecureStore le chiffre automatiquement)
        // et créer un hash pour la compatibilité
        const passwordHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          password + email.toLowerCase() // Salt avec l'email
        );
        
        // Essayer le stockage sécurisé d'abord avec le mot de passe original
        const secureStoreSuccess = await secureStoreBiometricCredentials(email, password);
        
        if (!secureStoreSuccess) {
          // Fallback vers AsyncStorage si SecureStore n'est pas disponible
          console.warn('SecureStore indisponible, utilisation du fallback AsyncStorage');
          const credentials = {
            email,
            password, // Stocker le mot de passe original même en fallback (AsyncStorage)
            passwordHash,
            timestamp: Date.now(),
            deviceId: 'fallback-device'
          };
          await AsyncStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
        } else {
          // Supprimer l'ancien stockage non sécurisé si le stockage sécurisé a réussi
          await AsyncStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        }
        
        // Mettre à jour l'état
        setState(prev => ({ ...prev, hasStoredCredentials: true }));
      }
    } catch (error) {
      console.error('Erreur lors du stockage sécurisé des credentials:', error);
    }
  };

  // Supprimer les credentials stockés de manière sécurisée
  const clearStoredCredentials = async (): Promise<void> => {
    try {
      // Supprimer du stockage sécurisé
      const { secureDeleteToken } = await import('../utils/security');
      await secureDeleteToken();
      
      // Supprimer les anciens credentials non sécurisés
      await AsyncStorage.removeItem(CREDENTIALS_STORAGE_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_STORAGE_KEY);
      
      setState(prev => ({ ...prev, hasStoredCredentials: false, isEnabled: false }));
    } catch (error) {
      console.error('Erreur lors de la suppression sécurisée des credentials:', error);
    }
  };

  // Vérifier le type d'authentification biométrique disponible
  const getBiometricType = async (): Promise<string> => {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      // Prioriser selon la plateforme et les types disponibles
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return Platform.OS === 'ios' ? 'Touch ID' : 'Empreinte digitale';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return Platform.OS === 'ios' ? 'Face ID' : 'Reconnaissance faciale';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Reconnaissance iris';
      }
      
      // Fallback selon la plateforme
      return Platform.OS === 'ios' ? 'Touch ID' : 'Empreinte digitale';
    } catch (error) {
      console.error('Erreur lors de la détermination du type biométrique:', error);
      return Platform.OS === 'ios' ? 'Touch ID' : 'Empreinte digitale';
    }
  };

  // Initialiser au montage du hook
  useEffect(() => {
    checkBiometricStatus();
  }, []);

  return {
    ...state,
    checkBiometricStatus,
    authenticateWithBiometrics,
    storeCredentials,
    clearStoredCredentials,
    getBiometricType,
  };
};