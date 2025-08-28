import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Utilitaire pour gérer le stockage avec prise en charge web améliorée
 */
export class StorageUtils {
  static async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.warn(`Erreur lecture storage (${key}):`, error);
      
      // Fallback pour web si AsyncStorage échoue
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          return localStorage.getItem(key);
        } catch (localStorageError) {
          console.warn('Fallback localStorage échoué:', localStorageError);
          return null;
        }
      }
      return null;
    }
  }

  static async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Erreur écriture storage (${key}):`, error);
      
      // Fallback pour web si AsyncStorage échoue
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(key, value);
        } catch (localStorageError) {
          console.warn('Fallback localStorage échoué:', localStorageError);
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  static async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Erreur suppression storage (${key}):`, error);
      
      // Fallback pour web si AsyncStorage échoue
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(key);
        } catch (localStorageError) {
          console.warn('Fallback localStorage échoué:', localStorageError);
        }
      }
    }
  }
}