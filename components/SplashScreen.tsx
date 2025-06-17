// SplashScreen.tsx
import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Text } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#0f8e35" style={styles.loader} />
      <Text style={styles.loadingText}>Chargement de Pro Recrute...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001F3F', // Assure-toi que cette couleur matche ton thème
  },
  logo: {
    width: '80%',
    height: 150,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
});
