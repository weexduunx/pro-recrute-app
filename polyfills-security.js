// polyfills-security.js - Polyfills pour les modules de sécurité
// À inclure avant l'import de l'application principale

// Polyfill pour expo-secure-store si non disponible
if (!global.ExpoSecureStore) {
  global.ExpoSecureStore = {
    setItemAsync: async (key, value, options = {}) => {
      console.warn('SecureStore non disponible, fallback vers AsyncStorage');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.setItem(key, value);
    },
    getItemAsync: async (key, options = {}) => {
      console.warn('SecureStore non disponible, fallback vers AsyncStorage');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    },
    deleteItemAsync: async (key) => {
      console.warn('SecureStore non disponible, fallback vers AsyncStorage');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.removeItem(key);
    }
  };
}

// Polyfill pour expo-crypto si non disponible
if (!global.ExpoCrypto) {
  global.ExpoCrypto = {
    CryptoDigestAlgorithm: {
      SHA256: 'SHA256',
      SHA1: 'SHA1',
      MD5: 'MD5'
    },
    digestStringAsync: async (algorithm, data) => {
      console.warn('Crypto non disponible, utilisation d\'un hash simple');
      // Hash simple pour fallback
      return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }
  };
}

// Polyfill pour expo-device si non disponible
if (!global.ExpoDevice) {
  global.ExpoDevice = {
    brand: 'unknown',
    deviceName: 'unknown-device',
    modelName: 'unknown-model',
    osName: require('react-native').Platform.OS,
    osVersion: 'unknown',
    isDevice: true
  };
}

// Polyfill pour expo-local-authentication si non disponible
if (!global.ExpoLocalAuthentication) {
  global.ExpoLocalAuthentication = {
    hasHardwareAsync: async () => false,
    isEnrolledAsync: async () => false,
    authenticateAsync: async (options) => ({ success: false, error: 'Not available' }),
    supportedAuthenticationTypesAsync: async () => [],
    AuthenticationType: {
      FINGERPRINT: 1,
      FACIAL_RECOGNITION: 2,
      IRIS: 3
    }
  };
}

console.log('✅ Polyfills de sécurité chargés avec succès');