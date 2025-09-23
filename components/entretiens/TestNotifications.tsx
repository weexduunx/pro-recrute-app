import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { EntretienNotificationUtils } from './EntretienNotifications';

export default function TestNotifications() {
  const handleTestNotification = async () => {
    try {
      console.log('🧪 Lancement du test de notification...');

      const testId = await EntretienNotificationUtils.testNotificationWithSampleData();

      if (testId) {
        Alert.alert(
          '✅ Test programmé',
          'Une notification de test sera envoyée dans 10 secondes avec toutes les informations (nom du poste, heure, lieu).',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '❌ Erreur',
          'Impossible de programmer la notification de test.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du test.');
    }
  };

  const handleDebugNotifications = async () => {
    try {
      await EntretienNotificationUtils.debugScheduledNotifications();
      Alert.alert(
        '🔍 Debug',
        'Consultez les logs de la console pour voir toutes les notifications programmées.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erreur debug:', error);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await EntretienNotificationUtils.clearAllEntretienNotifications();
      Alert.alert(
        '🧹 Nettoyage',
        'Toutes les notifications d\'entretiens ont été supprimées.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Test des Notifications d'Entretien</Text>

      <TouchableOpacity style={styles.button} onPress={handleTestNotification}>
        <Text style={styles.buttonText}>🚀 Tester Notification Complète</Text>
        <Text style={styles.buttonSubtext}>
          (Nom du poste, heure, lieu, entreprise)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleDebugNotifications}>
        <Text style={styles.buttonText}>🔍 Debug Notifications</Text>
        <Text style={styles.buttonSubtext}>
          Afficher toutes les notifications programmées
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearNotifications}>
        <Text style={[styles.buttonText, styles.dangerText]}>🧹 Nettoyer Notifications</Text>
        <Text style={[styles.buttonSubtext, styles.dangerText]}>
          Supprimer toutes les notifications d'entretiens
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.8,
  },
  dangerText: {
    color: 'white',
  },
});