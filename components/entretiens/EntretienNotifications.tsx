import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EntretienNotificationsProps {
  entretiens: any[];
}

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function EntretienNotifications({ entretiens }: EntretienNotificationsProps) {
  const [notificationIds, setNotificationIds] = useState<string[]>([]);

  useEffect(() => {
    setupNotifications();
    return () => {
      // Cleanup des notifications lors du démontage
      cancelAllScheduledNotifications();
    };
  }, [entretiens]);

  const setupNotifications = async () => {
    try {
      // Demander les permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Notifications désactivées',
          'Pour recevoir des rappels d\'entretiens, activez les notifications dans les paramètres.'
        );
        return;
      }

      // Annuler les anciennes notifications
      await cancelAllScheduledNotifications();

      // Programmer de nouvelles notifications pour les entretiens futurs
      const newNotificationIds: string[] = [];
      
      for (const entretien of entretiens) {
        const entretienDate = new Date(`${entretien.date_entretien}T${entretien.heure_entretien}`);
        const now = new Date();
        
        // Ne programmer que pour les entretiens futurs
        if (entretienDate > now) {
          // Notification 24h avant
          const notification24h = new Date(entretienDate);
          notification24h.setHours(notification24h.getHours() - 24);
          
          if (notification24h > now) {
            const id24h = await scheduleNotification(
              'Entretien demain',
              `Votre entretien pour "${entretien.offre?.titre}" est prévu demain à ${entretien.heure_entretien.substring(0, 5)}`,
              notification24h,
              entretien
            );
            if (id24h) newNotificationIds.push(id24h);
          }

          // Notification 2h avant
          const notification2h = new Date(entretienDate);
          notification2h.setHours(notification2h.getHours() - 2);
          
          if (notification2h > now) {
            const id2h = await scheduleNotification(
              'Entretien dans 2h',
              `Votre entretien pour "${entretien.offre?.titre}" commence dans 2 heures. Préparez-vous !`,
              notification2h,
              entretien
            );
            if (id2h) newNotificationIds.push(id2h);
          }

          // Notification 15 minutes avant
          const notification15m = new Date(entretienDate);
          notification15m.setMinutes(notification15m.getMinutes() - 15);
          
          if (notification15m > now) {
            const id15m = await scheduleNotification(
              'Entretien imminent',
              `Votre entretien commence dans 15 minutes ! ${entretien.lien ? 'Cliquez pour rejoindre.' : ''}`,
              notification15m,
              entretien,
              true // Notification urgente
            );
            if (id15m) newNotificationIds.push(id15m);
          }

          // Notification de confirmation de présence (pour les entretiens dans moins de 48h)
          const diffHours = (entretienDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (diffHours <= 48 && diffHours > 24) {
            const confirmationTime = new Date(now);
            confirmationTime.setMinutes(confirmationTime.getMinutes() + 5); // Dans 5 minutes
            
            const confirmId = await scheduleNotification(
              'Confirmez votre présence',
              `Confirmez votre présence à l'entretien de demain pour "${entretien.offre?.titre}"`,
              confirmationTime,
              entretien
            );
            if (confirmId) newNotificationIds.push(confirmId);
          }
        }
      }

      setNotificationIds(newNotificationIds);
      
      // Sauvegarder les IDs pour un nettoyage ultérieur
      await AsyncStorage.setItem('entretien_notifications', JSON.stringify(newNotificationIds));
      
    } catch (error) {
      console.error('Erreur lors de la configuration des notifications:', error);
    }
  };

  const scheduleNotification = async (
    title: string,
    body: string,
    trigger: Date,
    entretien: any,
    isUrgent: boolean = false
  ): Promise<string | null> => {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            entretienId: entretien.id,
            type: 'entretien_reminder',
            entretien: {
              id: entretien.id,
              titre: entretien.offre?.titre,
              entreprise: entretien.offre?.entreprise_nom,
              date: entretien.date_entretien,
              heure: entretien.heure_entretien,
              lien: entretien.lien,
            }
          },
          sound: isUrgent ? 'default' : true,
          priority: isUrgent ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
          vibrate: isUrgent ? [0, 250, 250, 250] : [0, 250],
        },
        trigger,
      });
      
      console.log(`Notification programmée: ${title} pour ${trigger.toLocaleString()}`);
      return identifier;
      
    } catch (error) {
      console.error('Erreur lors de la programmation de la notification:', error);
      return null;
    }
  };

  const cancelAllScheduledNotifications = async () => {
    try {
      // Récupérer les IDs sauvegardés
      const savedIds = await AsyncStorage.getItem('entretien_notifications');
      if (savedIds) {
        const ids = JSON.parse(savedIds);
        for (const id of ids) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
      }
      
      // Supprimer tous les identifiants liés aux entretiens
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of allScheduled) {
        if (notification.content.data?.type === 'entretien_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      await AsyncStorage.removeItem('entretien_notifications');
      setNotificationIds([]);
      
    } catch (error) {
      console.error('Erreur lors de l\'annulation des notifications:', error);
    }
  };

  const scheduleCustomReminder = async (entretienId: string, reminderTime: Date, message: string) => {
    try {
      const entretien = entretiens.find(e => e.id.toString() === entretienId);
      if (!entretien) return null;

      const identifier = await scheduleNotification(
        'Rappel personnalisé',
        message,
        reminderTime,
        entretien
      );

      if (identifier) {
        const updatedIds = [...notificationIds, identifier];
        setNotificationIds(updatedIds);
        await AsyncStorage.setItem('entretien_notifications', JSON.stringify(updatedIds));
      }

      return identifier;
    } catch (error) {
      console.error('Erreur lors de la programmation du rappel personnalisé:', error);
      return null;
    }
  };

  const cancelReminderForEntretien = async (entretienId: string) => {
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = allScheduled.filter(
        notification => notification.content.data?.entretienId === entretienId
      );

      for (const notification of toCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      // Mettre à jour la liste des IDs
      const remainingIds = notificationIds.filter(id => 
        !toCancel.some(notification => notification.identifier === id)
      );
      setNotificationIds(remainingIds);
      await AsyncStorage.setItem('entretien_notifications', JSON.stringify(remainingIds));

    } catch (error) {
      console.error('Erreur lors de l\'annulation des rappels:', error);
    }
  };

  // Exposer les méthodes via un contexte ou des props
  React.useImperativeHandle(React.useRef(), () => ({
    scheduleCustomReminder,
    cancelReminderForEntretien,
    setupNotifications,
  }));

  // Ce composant ne rend rien visuellement
  return null;
}

// Hook personnalisé pour gérer les notifications d'entretiens
export const useEntretienNotifications = (entretiens: any[]) => {
  const [notificationComponent, setNotificationComponent] = useState<any>(null);

  useEffect(() => {
    const component = React.createElement(EntretienNotifications, { entretiens });
    setNotificationComponent(component);
  }, [entretiens]);

  const scheduleCustomReminder = async (entretienId: string, reminderTime: Date, message: string) => {
    // Cette méthode sera implémentée via le ref du composant
    console.log('scheduleCustomReminder appelée', { entretienId, reminderTime, message });
  };

  const cancelReminderForEntretien = async (entretienId: string) => {
    // Cette méthode sera implémentée via le ref du composant
    console.log('cancelReminderForEntretien appelée', { entretienId });
  };

  return {
    NotificationComponent: notificationComponent,
    scheduleCustomReminder,
    cancelReminderForEntretien,
  };
};

// Utilitaires pour gérer les notifications manuellement
export const EntretienNotificationUtils = {
  /**
   * Vérifie si les permissions de notification sont accordées
   */
  checkPermissions: async (): Promise<boolean> => {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Demande les permissions de notification
   */
  requestPermissions: async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Affiche toutes les notifications programmées pour débogage
   */
  debugScheduledNotifications: async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Notifications programmées:', scheduled.length);
    scheduled.forEach((notif, index) => {
      console.log(`${index + 1}:`, {
        id: notif.identifier,
        title: notif.content.title,
        trigger: notif.trigger,
        data: notif.content.data
      });
    });
  },

  /**
   * Supprime toutes les notifications d'entretiens
   */
  clearAllEntretienNotifications: async () => {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of allScheduled) {
      if (notification.content.data?.type === 'entretien_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    await AsyncStorage.removeItem('entretien_notifications');
  }
};