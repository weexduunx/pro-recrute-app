// utils/skills-api.js
import api from './api';

// API pour obtenir les évaluations de compétences
export const getSkillsAssessments = async (filters = {}) => {
  try {
    const response = await api.get('/skills/assessments', {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getSkillsAssessments:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les catégories d'évaluations
export const getAssessmentCategories = async () => {
  try {
    const response = await api.get('/skills/assessment-categories');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getAssessmentCategories:", error.response?.data || error.message);
    throw error;
  }
};

// API pour démarrer une évaluation
export const startAssessment = async (assessmentId) => {
  try {
    const response = await api.post(`/skills/assessments/${assessmentId}/start`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API startAssessment:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les détails d'une session d'évaluation
export const getAssessmentSession = async (sessionId) => {
  try {
    const response = await api.get(`/skills/assessment-sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getAssessmentSession:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir la question suivante dans une évaluation
export const getNextQuestion = async (sessionId) => {
  try {
    const response = await api.get(`/skills/assessment-sessions/${sessionId}/next-question`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getNextQuestion:", error.response?.data || error.message);
    throw error;
  }
};

// API pour soumettre une réponse
export const submitAnswer = async (sessionId, questionId, answer) => {
  try {
    const response = await api.post(`/skills/assessment-sessions/${sessionId}/answer`, {
      question_id: questionId,
      answer: answer
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API submitAnswer:", error.response?.data || error.message);
    throw error;
  }
};

// API pour terminer une évaluation
export const finishAssessment = async (sessionId) => {
  try {
    const response = await api.post(`/skills/assessment-sessions/${sessionId}/finish`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API finishAssessment:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les résultats d'une évaluation
export const getAssessmentResults = async (sessionId) => {
  try {
    const response = await api.get(`/skills/assessment-sessions/${sessionId}/results`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getAssessmentResults:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir l'historique des évaluations
export const getAssessmentHistory = async () => {
  try {
    const response = await api.get('/skills/assessment-history');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getAssessmentHistory:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les statistiques de compétences de l'utilisateur
export const getSkillsStats = async () => {
  try {
    const response = await api.get('/skills/stats');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getSkillsStats:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les badges/certifications obtenus
export const getSkillsBadges = async () => {
  try {
    const response = await api.get('/skills/badges');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getSkillsBadges:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir le classement/leaderboard
export const getSkillsLeaderboard = async (category = null) => {
  try {
    const response = await api.get('/skills/leaderboard', {
      params: { category }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getSkillsLeaderboard:", error.response?.data || error.message);
    throw error;
  }
};

// API pour partager un résultat sur les réseaux sociaux
export const shareAssessmentResult = async (sessionId, platform) => {
  try {
    const response = await api.post(`/skills/assessment-sessions/${sessionId}/share`, {
      platform
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API shareAssessmentResult:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des recommandations d'amélioration basées sur les résultats
export const getImprovementRecommendations = async (sessionId) => {
  try {
    const response = await api.get(`/skills/assessment-sessions/${sessionId}/recommendations`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getImprovementRecommendations:", error.response?.data || error.message);
    throw error;
  }
};

// API pour créer une évaluation personnalisée
export const createCustomAssessment = async (assessmentData) => {
  try {
    const response = await api.post('/skills/custom-assessment', assessmentData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API createCustomAssessment:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les questions d'une évaluation (pour les employeurs)
export const getAssessmentQuestions = async (assessmentId) => {
  try {
    const response = await api.get(`/skills/assessments/${assessmentId}/questions`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getAssessmentQuestions:", error.response?.data || error.message);
    throw error;
  }
};

// API pour inviter d'autres utilisateurs à une évaluation
export const inviteToAssessment = async (assessmentId, emails) => {
  try {
    const response = await api.post(`/skills/assessments/${assessmentId}/invite`, {
      emails
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API inviteToAssessment:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les métriques de performance
export const getPerformanceMetrics = async (timeframe = '30d') => {
  try {
    const response = await api.get('/skills/performance-metrics', {
      params: { timeframe }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getPerformanceMetrics:", error.response?.data || error.message);
    throw error;
  }
};

// API pour sauvegarder le progrès d'une évaluation
export const saveAssessmentProgress = async (sessionId, progress) => {
  try {
    const response = await api.post(`/skills/assessment-sessions/${sessionId}/save-progress`, progress);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API saveAssessmentProgress:", error.response?.data || error.message);
    throw error;
  }
};

// API pour reprendre une évaluation en cours
export const resumeAssessment = async (sessionId) => {
  try {
    const response = await api.post(`/skills/assessment-sessions/${sessionId}/resume`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API resumeAssessment:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des questions d'entraînement
export const getPracticeQuestions = async (category, difficulty = 'all') => {
  try {
    const response = await api.get('/skills/practice-questions', {
      params: { category, difficulty }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getPracticeQuestions:", error.response?.data || error.message);
    throw error;
  }
};

// API pour envoyer des commentaires sur une évaluation
export const submitAssessmentFeedback = async (sessionId, feedback) => {
  try {
    const response = await api.post(`/skills/assessment-sessions/${sessionId}/feedback`, feedback);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API submitAssessmentFeedback:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les tendances de compétences sur le marché sénégalais
export const getSkillsTrends = async () => {
  try {
    const response = await api.get('/skills/market-trends');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getSkillsTrends:", error.response?.data || error.message);
    throw error;
  }
};