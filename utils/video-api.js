// utils/video-api.js
import api from './api';
import { Alert } from 'react-native';

// API pour obtenir les entretiens vidéo
export const getVideoInterviews = async () => {
  try {
    const response = await api.get('/video-interviews');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getVideoInterviews:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les détails d'un entretien vidéo
export const getVideoInterviewDetails = async (interviewId) => {
  try {
    const response = await api.get(`/video-interviews/${interviewId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getVideoInterviewDetails:", error.response?.data || error.message);
    throw error;
  }
};

// API pour créer une nouvelle salle d'entretien
export const createInterviewRoom = async (interviewData) => {
  try {
    const response = await api.post('/video-interviews/create-room', interviewData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API createInterviewRoom:", error.response?.data || error.message);
    throw error;
  }
};

// API pour rejoindre une salle d'entretien
export const joinInterviewRoom = async (roomId) => {
  try {
    const response = await api.post(`/video-interviews/join/${roomId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API joinInterviewRoom:", error.response?.data || error.message);
    throw error;
  }
};

// API pour quitter une salle d'entretien
export const leaveInterviewRoom = async (roomId) => {
  try {
    const response = await api.post(`/video-interviews/leave/${roomId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API leaveInterviewRoom:", error.response?.data || error.message);
    throw error;
  }
};

// API pour tester la connexion vidéo
export const testVideoConnection = async () => {
  try {
    const startTime = Date.now();
    const response = await api.get('/video-interviews/test-connection');
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    return {
      ...response.data,
      latency,
      quality: latency < 100 ? 'good' : latency < 300 ? 'average' : 'poor'
    };
  } catch (error) {
    console.error("Échec de l'appel API testVideoConnection:", error.response?.data || error.message);
    return {
      quality: 'poor',
      latency: 9999,
      error: error.message
    };
  }
};

// API pour programmer un entretien vidéo
export const scheduleVideoInterview = async (interviewData) => {
  try {
    const response = await api.post('/video-interviews/schedule', interviewData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API scheduleVideoInterview:", error.response?.data || error.message);
    throw error;
  }
};

// API pour annuler un entretien vidéo
export const cancelVideoInterview = async (interviewId, reason) => {
  try {
    const response = await api.post(`/video-interviews/${interviewId}/cancel`, {
      reason
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API cancelVideoInterview:", error.response?.data || error.message);
    throw error;
  }
};

// API pour reporter un entretien vidéo
export const rescheduleVideoInterview = async (interviewId, newDateTime, reason) => {
  try {
    const response = await api.post(`/video-interviews/${interviewId}/reschedule`, {
      scheduled_at: newDateTime,
      reason
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API rescheduleVideoInterview:", error.response?.data || error.message);
    throw error;
  }
};

// API pour démarrer l'enregistrement
export const startRecording = async (roomId) => {
  try {
    const response = await api.post(`/video-interviews/rooms/${roomId}/start-recording`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API startRecording:", error.response?.data || error.message);
    throw error;
  }
};

// API pour arrêter l'enregistrement
export const stopRecording = async (roomId) => {
  try {
    const response = await api.post(`/video-interviews/rooms/${roomId}/stop-recording`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API stopRecording:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les enregistrements
export const getRecordings = async (interviewId) => {
  try {
    const response = await api.get(`/video-interviews/${interviewId}/recordings`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getRecordings:", error.response?.data || error.message);
    throw error;
  }
};

// API pour envoyer un feedback sur l'entretien vidéo
export const submitInterviewFeedback = async (interviewId, feedback) => {
  try {
    const response = await api.post(`/video-interviews/${interviewId}/feedback`, feedback);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API submitInterviewFeedback:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les statistiques des entretiens vidéo
export const getVideoInterviewStats = async () => {
  try {
    const response = await api.get('/video-interviews/stats');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getVideoInterviewStats:", error.response?.data || error.message);
    throw error;
  }
};

// API pour notifier les participants
export const notifyParticipants = async (interviewId, message) => {
  try {
    const response = await api.post(`/video-interviews/${interviewId}/notify`, {
      message
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API notifyParticipants:", error.response?.data || error.message);
    throw error;
  }
};

// API pour les paramètres de qualité vidéo
export const updateVideoQualitySettings = async (roomId, settings) => {
  try {
    const response = await api.post(`/video-interviews/rooms/${roomId}/quality-settings`, settings);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API updateVideoQualitySettings:", error.response?.data || error.message);
    throw error;
  }
};

// Fonction utilitaire pour vérifier les permissions de caméra et microphone
export const checkMediaPermissions = async () => {
  try {
    // Cette fonction sera implémentée côté client avec expo-av
    return {
      camera: true,
      microphone: true
    };
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    return {
      camera: false,
      microphone: false
    };
  }
};