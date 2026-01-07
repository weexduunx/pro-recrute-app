// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Configuration compatible avec React Native et Expo
let config;
try {
  // Essayer d'utiliser @react-native/metro-config si disponible
  const { getDefaultConfig: getRNConfig } = require('@react-native/metro-config');
  config = getRNConfig(__dirname);

  // Fusionner avec la config Expo
  const expoConfig = getDefaultConfig(__dirname);
  config = {
    ...config,
    ...expoConfig,
    resolver: {
      ...config.resolver,
      ...expoConfig.resolver,
    },
    transformer: {
      ...config.transformer,
      ...expoConfig.transformer,
    },
  };
} catch (error) {
  // Fallback vers la config Expo standard
  config = getDefaultConfig(__dirname);
}

// Configuration pour les polyfills React Native et résolution des modules
config.resolver = {
  ...config.resolver,
  alias: {
    ...config.resolver?.alias,
  },
  // Bloquer les modules web-streams problématiques
  blockList: [
    /web-streams-polyfill\/ponyfill\/es6/,
  ],
  // Plateformes prioritaires pour éviter les conflits web
  platforms: ['native', 'android', 'ios', 'web'],
};

// Assurer que les polyfills sont chargés en premier
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    keep_fnames: true, // Garder les noms de fonction pour le debugging
  },
};

module.exports = config;
