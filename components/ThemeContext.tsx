import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native'; // Hook pour détecter le thème système

// Définition des couleurs pour les modes clair et sombre
const lightColors = {
  primary: '#091e60', // Bleu foncé
  secondary: '#0f8e35', // Vert
  background: '#F8FAFC', // Fond clair général
  backgroundVert: '#0f8e35', // Fond vert général
  cardBackground: '#FFFFFF', // Fond des cartes/sections
  textPrimary: '#091e60', // Texte foncé principal
  textSecondary: '#6B7280', // Texte gris secondaire
  textAccent: '#3B82F6', // Texte bleu accent
  border: '#E5E7EB', // Bordures claires
  error: '#EF4444', // Rouge erreur
  success: '#10B981', // Vert succès
  warning: '#F59E0B', // Jaune avertissement
  // Couleurs spécifiques pour les éléments de paramètres
  settingIconBg: '#F3F4F6',
  settingItemBorder: '#F1F5F9',
  switchTrackFalse: '#E5E7EB',
  switchThumb: '#F9FAFB',
  // Couleurs pour les statuts
  statusPending: '#F59E0B',
  statusApproved: '#10B981',
  statusRejected: '#EF4444',
  statusDefault: '#6B7280',
  // Couleurs pour les actualités
  newsImageOverlay: 'rgba(0,0,0,0.6)',
  newsCategoryBg: '#EBF8FF',
  newsCategoryText: '#3B82F6',
};

const darkColors = {
  primary: '#4285F4', // Bleu Google pour le mode sombre
  secondary: '#4CAF50', // Vert plus lumineux
  background: '#121212', // Fond très sombre
  cardBackground: '#1F1F1F', // Fond des cartes plus clair que le background
  textPrimary: '#E0E0E0', // Texte clair principal
  textSecondary: '#A0A0A0', // Texte gris clair secondaire
  textAccent: '#64B5F6', // Texte bleu accent
  border: '#333333', // Bordures sombres
  error: '#FF5252', // Rouge erreur
  success: '#69F0AE', // Vert succès
  warning: '#FFC107', // Jaune avertissement
  danger: '#FF5722',
  // Couleurs spécifiques pour les éléments de paramètres
  settingIconBg: '#2C2C2C',
  settingItemBorder: '#2C2C2C',
  switchTrackFalse: '#444444',
  switchThumb: '#BBBBBB',
  // Couleurs pour les statuts
  statusPending: '#FFD54F', // Jaune plus clair
  statusApproved: '#81C784', // Vert plus clair
  statusRejected: '#FF8A80', // Rouge plus clair
  statusDefault: '#9E9E9E', // Gris plus clair
  // Couleurs pour les actualités
  newsImageOverlay: 'rgba(0,0,0,0.7)',
  newsCategoryBg: '#2C2C2C',
  newsCategoryText: '#64B5F6',


};

// Interface pour le contexte du thème
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: typeof lightColors; // Le type des couleurs sera celui de lightColors
}

// Création du contexte avec des valeurs par défaut
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Clé pour AsyncStorage
const ASYNC_STORAGE_KEY = '@app_theme_mode';

// Fournisseur de thème
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme(); // 'light' ou 'dark' ou null
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const colors = isDarkMode ? darkColors : lightColors;

  // Charger la préférence de l'utilisateur depuis AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === 'dark');
        } else if (systemColorScheme) {
          // Si aucune préférence stockée, utiliser le thème système
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (e) {
        console.error("Failed to load theme from AsyncStorage", e);
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  // Sauvegarder la préférence de l'utilisateur dans AsyncStorage
  const toggleDarkMode = useCallback(async () => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      AsyncStorage.setItem(ASYNC_STORAGE_KEY, newMode ? 'dark' : 'light')
        .catch(e => console.error("Failed to save theme to AsyncStorage", e));
      return newMode;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personnalisé pour utiliser le thème
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
