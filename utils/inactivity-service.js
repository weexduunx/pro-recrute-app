// utils/inactivity-service.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import api from './api';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class InactivityService {
  static LAST_ACTIVITY_KEY = 'last_activity_timestamp';
  static INACTIVITY_WARNINGS_KEY = 'inactivity_warnings';
  static INACTIVITY_THRESHOLD = 90 * 24 * 60 * 60 * 1000; // 90 jours en millisecondes
  static WARNING_INTERVALS = [
    { days: 75, message: 'Votre compte sera supprimé dans 15 jours d\'inactivité.' },
    { days: 80, message: 'Votre compte sera supprimé dans 10 jours d\'inactivité.' },
    { days: 85, message: 'Votre compte sera supprimé dans 5 jours d\'inactivité.' },
    { days: 89, message: 'Votre compte sera supprimé demain en cas d\'inactivité.' }
  ];
  static periodicCheckInterval = null;

  // Mettre à jour la dernière activité de l'utilisateur
  static async updateLastActivity() {
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(this.LAST_ACTIVITY_KEY, timestamp.toString());
      console.log('Dernière activité mise à jour:', new Date(timestamp));
      
      // Réinitialiser les avertissements envoyés
      await AsyncStorage.removeItem(this.INACTIVITY_WARNINGS_KEY);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la dernière activité:', error);
    }
  }

  // Obtenir la dernière activité de l'utilisateur
  static async getLastActivity() {
    try {
      const timestampStr = await AsyncStorage.getItem(this.LAST_ACTIVITY_KEY);
      if (timestampStr) {
        return parseInt(timestampStr, 10);
      }
      // Si aucune activité n'est enregistrée, utiliser la date actuelle
      await this.updateLastActivity();
      return Date.now();
    } catch (error) {
      console.error('Erreur lors de la récupération de la dernière activité:', error);
      return Date.now();
    }
  }

  // Calculer les jours d'inactivité
  static async getInactivityDays() {
    try {
      const lastActivity = await this.getLastActivity();
      const now = Date.now();
      const diffInMilliseconds = now - lastActivity;
      const diffInDays = Math.floor(diffInMilliseconds / (24 * 60 * 60 * 1000));
      return diffInDays;
    } catch (error) {
      console.error('Erreur lors du calcul des jours d\'inactivité:', error);
      return 0;
    }
  }

  // Vérifier si le compte doit être supprimé
  static async shouldDeleteAccount() {
    const inactivityDays = await this.getInactivityDays();
    return inactivityDays >= 90;
  }

  // Obtenir les avertissements déjà envoyés
  static async getSentWarnings() {
    try {
      const warningsStr = await AsyncStorage.getItem(this.INACTIVITY_WARNINGS_KEY);
      return warningsStr ? JSON.parse(warningsStr) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des avertissements:', error);
      return [];
    }
  }

  // Marquer un avertissement comme envoyé
  static async markWarningSent(warningDay) {
    try {
      const sentWarnings = await this.getSentWarnings();
      if (!sentWarnings.includes(warningDay)) {
        sentWarnings.push(warningDay);
        await AsyncStorage.setItem(this.INACTIVITY_WARNINGS_KEY, JSON.stringify(sentWarnings));
      }
    } catch (error) {
      console.error('Erreur lors du marquage de l\'avertissement:', error);
    }
  }

  // Vérifier et envoyer les alertes d'inactivité
  static async checkInactivityAndSendAlerts() {
    try {
      const inactivityDays = await this.getInactivityDays();
      const sentWarnings = await this.getSentWarnings();

      console.log(`Jours d'inactivité: ${inactivityDays}`);
      console.log(`Avertissements déjà envoyés:`, sentWarnings);

      // Vérifier chaque intervalle d'avertissement
      for (const warning of this.WARNING_INTERVALS) {
        if (inactivityDays >= warning.days && !sentWarnings.includes(warning.days)) {
          // Envoyer une notification locale
          await this.sendInactivityNotification(warning.message);
          
          // Envoyer également au backend si disponible
          try {
            await this.sendInactivityWarningToBackend(inactivityDays, warning.days);
          } catch (error) {
            console.warn('Impossible d\'envoyer l\'avertissement au backend:', error);
          }

          // Marquer cet avertissement comme envoyé
          await this.markWarningSent(warning.days);
        }
      }

      // Si le compte doit être supprimé
      if (await this.shouldDeleteAccount()) {
        await this.handleAccountDeletion();
      }

      return {
        inactivityDays,
        shouldDelete: await this.shouldDeleteAccount(),
        warnings: sentWarnings
      };
    } catch (error) {
      console.error('Erreur lors de la vérification d\'inactivité:', error);
      return null;
    }
  }

  // Envoyer une notification locale
  static async sendInactivityNotification(message) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Alerte d\'inactivité',
          body: message,
          sound: 'default',
        },
        trigger: null, // Notification immédiate
      });
      console.log('Notification d\'inactivité envoyée:', message);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
  }

  // Envoyer l'avertissement au backend
  static async sendInactivityWarningToBackend(inactivityDays, warningDay) {
    try {
      const response = await api.post('/user/inactivity-warning', {
        inactivity_days: inactivityDays,
        warning_day: warningDay,
        timestamp: Date.now()
      });
      console.log('Avertissement envoyé au backend:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'avertissement au backend:', error);
      throw error;
    }
  }

  // Gérer la suppression automatique du compte
  static async handleAccountDeletion() {
    try {
      // Envoyer une requête au backend pour supprimer le compte
      const response = await api.delete('/user/account/auto-delete');
      console.log('Compte supprimé automatiquement:', response.data);
      
      // Nettoyer le stockage local
      await AsyncStorage.multiRemove([
        'user_token', 
        this.LAST_ACTIVITY_KEY, 
        this.INACTIVITY_WARNINGS_KEY
      ]);
      
      // Envoyer une notification finale
      await this.sendInactivityNotification(
        'Votre compte a été automatiquement supprimé après 90 jours d\'inactivité.'
      );

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression automatique du compte:', error);
      return false;
    }
  }

  // Initialiser le service (à appeler au démarrage de l'app)
  static async initialize() {
    try {
      // Enregistrer l'activité initiale
      await this.updateLastActivity();
      
      // Vérifier immédiatement les alertes
      await this.checkInactivityAndSendAlerts();
      
      console.log('Service d\'inactivité initialisé');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service d\'inactivité:', error);
    }
  }

  // Planifier des vérifications périodiques
  static startPeriodicChecks() {
    // Arrêter l'ancien interval s'il existe
    this.stopPeriodicChecks();

    // Vérifier toutes les 24 heures
    this.periodicCheckInterval = setInterval(async () => {
      await this.checkInactivityAndSendAlerts();
    }, 24 * 60 * 60 * 1000);

    console.log('Vérifications périodiques d\'inactivité démarrées');
  }

  static stopPeriodicChecks() {
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
      console.log('Vérifications périodiques d\'inactivité arrêtées');
    }
  }
}

export default InactivityService;