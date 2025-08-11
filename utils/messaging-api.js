// utils/messaging-api.js
import api from './api';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket = null;

// Configuration Socket.IO
export const initializeSocketConnection = (userId) => {
  if (socket) {
    socket.disconnect();
  }

  // Utiliser la même base URL que l'API
  const API_URL = 'http://192.168.1.144:8000' || process.env.EXPO_PUBLIC_API_URL?.replace('/api', '');
  
  socket = io(API_URL, {
    transports: ['websocket'],
    query: {
      userId: userId
    },
    auth: {
      userId: userId
    }
  });

  socket.on('connect', () => {
    console.log('Socket.IO connecté:', socket.id);
    socket.emit('user_online', userId);
  });

  socket.on('disconnect', () => {
    console.log('Socket.IO déconnecté');
  });

  socket.on('connect_error', (error) => {
    console.error('Erreur de connexion Socket.IO:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// API pour les conversations
export const getConversations = async () => {
  try {
    const response = await api.get('/conversations');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getConversations:", error.response?.data || error.message);
    throw error;
  }
};

// API pour les messages d'une conversation
export const getMessages = async (conversationId, page = 1, limit = 50) => {
  try {
    const response = await api.get(`/conversations/${conversationId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getMessages:", error.response?.data || error.message);
    throw error;
  }
};

// API pour envoyer un message
export const sendMessage = async (conversationId, content, attachments = []) => {
  try {
    const response = await api.post(`/conversations/${conversationId}/messages`, {
      content,
      attachments
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API sendMessage:", error.response?.data || error.message);
    throw error;
  }
};

// API pour marquer les messages comme lus
export const markMessagesAsRead = async (conversationId) => {
  try {
    const response = await api.post(`/conversations/${conversationId}/mark-read`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API markMessagesAsRead:", error.response?.data || error.message);
    throw error;
  }
};

// API pour rechercher des utilisateurs
export const searchUsers = async (query) => {
  try {
    const response = await api.get('/users/search', {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API searchUsers:", error.response?.data || error.message);
    throw error;
  }
};

// API pour créer une nouvelle conversation
export const createConversation = async (participantIds, title = null) => {
  try {
    const response = await api.post('/conversations', {
      participant_ids: participantIds,
      title
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API createConversation:", error.response?.data || error.message);
    throw error;
  }
};

// API pour les statistiques de messages
export const getMessageStats = async () => {
  try {
    const response = await api.get('/conversations/stats');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getMessageStats:", error.response?.data || error.message);
    throw error;
  }
};

// API pour supprimer une conversation
export const deleteConversation = async (conversationId) => {
  try {
    const response = await api.delete(`/conversations/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API deleteConversation:", error.response?.data || error.message);
    throw error;
  }
};

// API pour archiver une conversation
export const archiveConversation = async (conversationId) => {
  try {
    const response = await api.post(`/conversations/${conversationId}/archive`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API archiveConversation:", error.response?.data || error.message);
    throw error;
  }
};

// API pour signaler un message
export const reportMessage = async (messageId, reason) => {
  try {
    const response = await api.post(`/messages/${messageId}/report`, {
      reason
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API reportMessage:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir le statut en ligne des utilisateurs
export const getUsersOnlineStatus = async (userIds) => {
  try {
    const response = await api.post('/users/online-status', {
      user_ids: userIds
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getUsersOnlineStatus:", error.response?.data || error.message);
    throw error;
  }
};

// API pour uploader des fichiers de conversation
export const uploadMessageAttachment = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });

    const response = await api.post('/conversations/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API uploadMessageAttachment:", error.response?.data || error.message);
    throw error;
  }
};