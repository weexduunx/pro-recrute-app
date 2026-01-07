import { Platform } from 'react-native';

/**
 * Cross-platform shadow utility
 * Automatically converts React Native shadow props to web-compatible boxShadow
 */

export interface ShadowStyle {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number; // Android only
}

export interface WebShadowStyle {
  boxShadow?: string;
  // Keep original props for React Native
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

/**
 * Converts React Native shadow props to cross-platform shadow
 * @param shadow - React Native shadow properties
 * @returns Cross-platform compatible shadow style
 */
export const createShadow = (shadow: ShadowStyle): WebShadowStyle => {
  const {
    shadowColor = '#000',
    shadowOffset = { width: 0, height: 2 },
    shadowOpacity = 0.1,
    shadowRadius = 4,
    elevation
  } = shadow;

  if (Platform.OS === 'web') {
    // Convert to CSS boxShadow for web
    const { width, height } = shadowOffset;
    const color = shadowColor;
    const opacity = shadowOpacity;
    const blur = shadowRadius;
    
    // Calculate alpha from opacity
    const rgba = hexToRgba(color, opacity);
    const boxShadow = `${width}px ${height}px ${blur}px ${rgba}`;
    
    return {
      boxShadow,
      // Remove React Native specific props for web
    };
  } else {
    // Return original React Native props for mobile
    return {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
      ...(elevation && Platform.OS === 'android' && { elevation })
    };
  }
};

/**
 * Convert hex color to rgba with opacity
 */
function hexToRgba(hex: string, opacity: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Pre-defined common shadows for consistent design
 */
export const shadows = {
  small: createShadow({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  }),
  
  medium: createShadow({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  }),
  
  large: createShadow({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  }),
  
  card: createShadow({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  }),
  
  button: createShadow({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  }),
}