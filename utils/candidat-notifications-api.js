import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API pour la gestion des notifications candidats
 */

// Obtenir les notifications d'un candidat
export const getCandidatNotifications = async (page = 1, limit = 20) => {
  try {
    const response = await api.get(`/candidat/notifications?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications candidat:', error);
    throw error;
  }
};

// Obtenir le nombre de notifications non lues
export const getUnreadCandidatNotificationCount = async () => {
  try {
    // Vérifier si un token existe avant de faire l'appel
    const token = await AsyncStorage.getItem('user_token');
    if (!token) {
      console.log('getUnreadCandidatNotificationCount: Pas de token disponible, retour par défaut');
      return { success: false, unread_count: 0 };
    }

    const response = await api.get('/candidat/notifications/unread-count');
    return response.data;
  } catch (error) {
    // Vérifier si c'est un 401 sans token (après déconnexion)
    const token = await AsyncStorage.getItem('user_token');
    if (error.response?.status === 401 && !token) {
      console.log('getUnreadCandidatNotificationCount: 401 sans token, probablement après déconnexion - ignoré');
      return { success: false, unread_count: 0 };
    }

    // Réduire les logs d'erreur pour éviter le spam
    if (error.response?.status !== 404 && error.response?.status !== 500) {
      console.warn("API getUnreadCandidatNotificationCount:", error.response?.status || 'Network error');
    }
    // Retourner un objet par défaut au lieu de throw pour éviter de casser l'app
    return { success: false, unread_count: 0 };
  }
};

// Marquer une notification comme lue
export const markCandidatNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/candidat/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors du marquage de la notification candidat comme lue:', error);
    throw error;
  }
};

// Marquer toutes les notifications comme lues
export const markAllCandidatNotificationsAsRead = async () => {
  try {
    const response = await api.put('/candidat/notifications/mark-all-read');
    return response.data;
  } catch (error) {
    console.error('Erreur lors du marquage de toutes les notifications candidat comme lues:', error);
    throw error;
  }
};

// Supprimer une notification
export const deleteCandidatNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/candidat/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification candidat:', error);
    throw error;
  }
};

// Obtenir une notification spécifique
export const getCandidatNotification = async (notificationId) => {
  try {
    const response = await api.get(`/candidat/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de la notification candidat:', error);
    throw error;
  }
};