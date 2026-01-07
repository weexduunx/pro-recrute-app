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
        // Récupérer les informations de l'entretien avec gestion des différentes structures de données
        const dateEntretien = entretien.date_entretien || entretien.date;
        const heureEntretien = entretien.heure_entretien || entretien.heure;

        // Détails de l'offre avec gestion des différentes structures
        const titreOffre = entretien.titre_offre ||
                          entretien.offre?.titre ||
                          entretien.offre?.poste?.titre_poste ||
                          entretien.offre?.titre_poste ||
                          entretien.offre_details?.titre ||
                          entretien.titre_poste ||
                          entretien.poste?.titre_poste ||
                          entretien.job_title ||
                          entretien.position ||
                          'Poste non spécifié';

        // Debug pour voir la structure des données
        console.log('🔍 DEBUG ENTRETIEN STRUCTURE:', {
          entretien_id: entretien.id || entretien.entretien_id,
          titre_trouve: titreOffre,
          structure_complete: JSON.stringify(entretien, null, 2)
        });

        const entrepriseNom = entretien.entreprise_nom ||
                             entretien.offre?.entreprise_nom ||
                             entretien.offre?.demande?.entreprise?.libelleE ||
                             entretien.offre_details?.entreprise ||
                             'Entreprise non spécifiée';

        const lieuEntretien = entretien.lieux_entretien ||
                             entretien.offre?.lieux ||
                             entretien.offre_details?.lieux ||
                             'Lieu non spécifié';

        const entretienDate = new Date(`${dateEntretien}T${heureEntretien}`);
        const now = new Date();

        // Formatage de l'heure pour affichage (HH:MM)
        const heureFormatee = heureEntretien ? heureEntretien.substring(0, 5) : 'Heure non spécifiée';

        console.log(`📅 Notification setup pour entretien: ${titreOffre} le ${dateEntretien} à ${heureFormatee} chez ${entrepriseNom} - Lieu: ${lieuEntretien}`);

        // Log détaillé pour le debug du titre
        if (titreOffre === 'Poste non spécifié') {
          console.warn('⚠️ TITRE POSTE NON TROUVÉ - Chemins testés:', {
            'entretien.titre_offre': entretien.titre_offre,
            'entretien.offre?.titre': entretien.offre?.titre,
            'entretien.offre?.poste?.titre_poste': entretien.offre?.poste?.titre_poste,
            'entretien.offre?.titre_poste': entretien.offre?.titre_poste,
            'entretien.titre_poste': entretien.titre_poste,
            'entretien.poste?.titre_poste': entretien.poste?.titre_poste,
            'entretien.job_title': entretien.job_title,
            'entretien.position': entretien.position
          });
        }

        // Ne programmer que pour les entretiens futurs
        if (entretienDate > now) {
          // Notification 24h avant
          const notification24h = new Date(entretienDate);
          notification24h.setHours(notification24h.getHours() - 24);

          if (notification24h > now) {
            const id24h = await scheduleNotification(
              '📅 Entretien demain',
              `Votre entretien pour le poste "${titreOffre}" chez ${entrepriseNom} est prévu demain à ${heureFormatee}. 📍 ${lieuEntretien}`,
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
              '⏰ Entretien dans 2h',
              `Votre entretien pour le poste "${titreOffre}" commence dans 2 heures à ${heureFormatee}. Préparez-vous ! 📍 ${lieuEntretien}`,
              notification2h,
              entretien
            );
            if (id2h) newNotificationIds.push(id2h);
          }

          // Notification le jour J (matin à 8h00)
          const notificationJourJ = new Date(entretienDate);
          notificationJourJ.setHours(8, 0, 0, 0); // 8h00 du matin

          if (notificationJourJ > now && notificationJourJ < entretienDate) {
            const idJourJ = await scheduleNotification(
              '📅 Entretien aujourd\'hui !',
              `Rappel : Votre entretien pour le poste "${titreOffre}" chez ${entrepriseNom} est aujourd'hui à ${heureFormatee}. Bonne chance ! 📍 ${lieuEntretien}`,
              notificationJourJ,
              entretien
            );
            if (idJourJ) newNotificationIds.push(idJourJ);
          }

          // Notification 15 minutes avant
          const notification15m = new Date(entretienDate);
          notification15m.setMinutes(notification15m.getMinutes() - 15);

          if (notification15m > now) {
            const id15m = await scheduleNotification(
              '🚨 Entretien dans 15 min !',
              `Votre entretien pour le poste "${titreOffre}" commence dans 15 minutes ! ${entretien.lien ? 'Cliquez pour rejoindre.' : `📍 Rendez-vous: ${lieuEntretien}`}`,
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
              '✅ Confirmez votre présence',
              `Confirmez votre présence à l'entretien de demain pour le poste "${titreOffre}" chez ${entrepriseNom}`,
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
      // Récupérer les données normalisées de l'entretien
      const dateEntretien = entretien.date_entretien || entretien.date;
      const heureEntretien = entretien.heure_entretien || entretien.heure;

      const titreOffre = entretien.titre_offre ||
                        entretien.offre?.titre ||
                        entretien.offre?.poste?.titre_poste ||
                        entretien.offre_details?.titre ||
                        'Poste non spécifié';

      const entrepriseNom = entretien.entreprise_nom ||
                           entretien.offre?.entreprise_nom ||
                           entretien.offre?.demande?.entreprise?.libelleE ||
                           entretien.offre_details?.entreprise ||
                           'Entreprise non spécifiée';

      const lieuEntretien = entretien.lieux_entretien ||
                           entretien.offre?.lieux ||
                           entretien.offre_details?.lieux ||
                           'Lieu non spécifié';

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            entretienId: entretien.entretien_id || entretien.id,
            type: 'entretien_reminder',
            entretien: {
              id: entretien.entretien_id || entretien.id,
              titre: titreOffre,
              entreprise: entrepriseNom,
              date: dateEntretien,
              heure: heureEntretien,
              lieu: lieuEntretien,
              lien: entretien.lien,
              type_entretien: entretien.type_entretien,
              type_entretien_label: entretien.type_entretien_label
            }
          },
          sound: isUrgent ? 'default' : true,
          priority: isUrgent ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
          vibrate: isUrgent ? [0, 250, 250, 250] : [0, 250],
        },
        trigger,
      });

      console.log(`✅ Notification programmée: ${title} pour ${trigger.toLocaleString()}`);
      console.log(`📋 Détails: ${titreOffre} chez ${entrepriseNom} - ${dateEntretien} ${heureEntretien} - ${lieuEntretien}`);
      return identifier;

    } catch (error) {
      console.error('❌ Erreur lors de la programmation de la notification:', error);
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
  },

  /**
   * Teste les notifications avec des données simulées
   */
  testNotificationWithSampleData: async () => {
    try {
      const testEntretien = {
        id: 'test-123',
        entretien_id: 'test-123',
        date_entretien: new Date().toISOString().split('T')[0], // Aujourd'hui
        heure_entretien: '10:30:00',
        titre_offre: 'Développeur React Native',
        entreprise_nom: 'TechCorp Inc.',
        lieux_entretien: '123 Rue de la Tech, Casablanca',
        type_entretien: 1,
        type_entretien_label: 'Entretien Final',
        lien: 'https://meet.google.com/abc-def-ghi'
      };

      const testTime = new Date();
      testTime.setSeconds(testTime.getSeconds() + 10); // Dans 10 secondes

      const testNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test - Notification d\'entretien',
          body: `Test: Entretien pour "${testEntretien.titre_offre}" chez ${testEntretien.entreprise_nom} à ${testEntretien.heure_entretien.substring(0,5)}. Lieu: ${testEntretien.lieux_entretien}`,
          data: {
            entretienId: testEntretien.id,
            type: 'entretien_reminder_test',
            entretien: testEntretien
          },
          sound: 'default',
        },
        trigger: testTime,
      });

      console.log('🧪 Notification de test programmée pour dans 10 secondes:', testNotificationId);
      return testNotificationId;
    } catch (error) {
      console.error('❌ Erreur lors du test de notification:', error);
      return null;
    }
  }
};