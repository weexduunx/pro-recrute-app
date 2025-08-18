import api from './api';

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
    const response = await api.get('/candidat/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération du compteur de notifications candidat:', error);
    throw error;
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