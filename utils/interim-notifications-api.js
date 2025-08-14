// utils/interim-notifications-api.js
import api from './api';

/**
 * API pour les notifications intérimaires
 */

// Récupérer les notifications
export const getNotifications = async (params = {}) => {
  try {
    const response = await api.get('/interim/notifications', { params });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getNotifications:", error.response?.data || error.message);
    throw error;
  }
};

// Marquer une notification comme lue
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/interim/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API markNotificationAsRead:", error.response?.data || error.message);
    throw error;
  }
};

// Marquer toutes les notifications comme lues
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.put('/interim/notifications/mark-all-read');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API markAllNotificationsAsRead:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir le nombre de notifications non lues
export const getUnreadNotificationCount = async () => {
  try {
    const response = await api.get('/interim/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getUnreadNotificationCount:", error.response?.data || error.message);
    throw error;
  }
};

// Créer une actualité IPM (pour les admins)
export const createIpmNews = async (newsData) => {
  try {
    const response = await api.post('/interim/ipm-news', newsData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API createIpmNews:", error.response?.data || error.message);
    throw error;
  }
};

// Helper pour formater les notifications
export const formatNotificationDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    return diffInMinutes < 1 ? 'À l\'instant' : `Il y a ${diffInMinutes} min`;
  } else if (diffInHours < 24) {
    return `Il y a ${Math.floor(diffInHours)} h`;
  } else if (diffInHours < 48) {
    return 'Hier';
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `Il y a ${diffInDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      });
    }
  }
};

// Helper pour obtenir l'icône selon le type
export const getNotificationIcon = (type) => {
  const icons = {
    'echeance_reminder': 'calendar',
    'feuille_soins_validated': 'checkmark-circle',
    'feuille_soins_rejected': 'close-circle',
    'ipm_news': 'newspaper',
    'medical_reminder': 'medical',
    'contract_expiry': 'warning',
    'document_renewal': 'document',
    'system_maintenance': 'settings'
  };
  
  return icons[type] || 'notifications';
};

// Helper pour obtenir la couleur selon le type/priorité
export const getNotificationColor = (type, priority) => {
  if (priority === 'urgent') {
    return '#FF4444';
  }
  
  if (priority === 'high') {
    return '#FB8500';
  }

  const colors = {
    'feuille_soins_validated': '#00C851',
    'feuille_soins_rejected': '#FF4444',
    'ipm_news': '#2196F3',
    'medical_reminder': '#9C27B0',
    'echeance_reminder': '#FF9500'
  };

  return colors[type] || '#666666';
};