import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BiometricAuthState {
  isAvailable: boolean;
  isEnabled: boolean;
  hasStoredCredentials: boolean;
}

interface StoredCredentials {
  email: string;
  password: string; // En production, il faudrait chiffrer ceci
}

const BIOMETRIC_STORAGE_KEY = '@app_biometric_enabled';
const CREDENTIALS_STORAGE_KEY = '@app_stored_credentials';

export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnabled: false,
    hasStoredCredentials: false,
  });

  // Vérifier la disponibilité et les paramètres de l'authentification biométrique
  const checkBiometricStatus = async () => {
    try {
      // Vérifier si le matériel biométrique est disponible
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const isAvailable = compatible && enrolled;

      // Vérifier si l'utilisateur a activé l'authentification biométrique
      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
      const isEnabled = biometricEnabled === 'true';

      // Vérifier si des credentials sont stockés
      const storedCredentials = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
      const hasStoredCredentials = !!storedCredentials;


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
    }
  };

  // Authentifier avec biométrie et récupérer les credentials
  const authenticateWithBiometrics = async (): Promise<StoredCredentials | null> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: Platform.OS === 'ios' 
          ? 'Authentifiez-vous avec Touch ID ou Face ID'
          : 'Authentifiez-vous avec votre empreinte digitale',
        fallbackLabel: 'Utiliser le mot de passe',
        cancelLabel: 'Annuler',
      });

      if (result.success) {
        // Récupérer les credentials stockés
        const storedCredentials = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
        if (storedCredentials) {
          return JSON.parse(storedCredentials) as StoredCredentials;
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
        const credentials: StoredCredentials = { email, password };
        await AsyncStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
        
        // Mettre à jour l'état
        setState(prev => ({ ...prev, hasStoredCredentials: true }));
      }
    } catch (error) {
      console.error('Erreur lors du stockage des credentials:', error);
    }
  };

  // Supprimer les credentials stockés
  const clearStoredCredentials = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CREDENTIALS_STORAGE_KEY);
      setState(prev => ({ ...prev, hasStoredCredentials: false }));
    } catch (error) {
      console.error('Erreur lors de la suppression des credentials:', error);
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