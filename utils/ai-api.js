// utils/ai-api.js
import api from './api';

// API pour obtenir les recommandations d'emplois basées sur l'IA
export const getAIJobRecommendations = async (filters = {}) => {
  try {
    const response = await api.get('/ai/job-recommendations', {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getAIJobRecommendations:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir le score de correspondance d'une offre
export const getMatchScore = async (jobId) => {
  try {
    const response = await api.get(`/ai/match-score/${jobId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getMatchScore:", error.response?.data || error.message);
    throw error;
  }
};

// API pour analyser le profil utilisateur avec l'IA
export const analyzeUserProfile = async () => {
  try {
    const response = await api.get('/ai/profile-analysis');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API analyzeUserProfile:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des suggestions d'amélioration du profil
export const getProfileImprovementSuggestions = async () => {
  try {
    const response = await api.get('/ai/profile-suggestions');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getProfileImprovementSuggestions:", error.response?.data || error.message);
    throw error;
  }
};

// API pour mettre à jour les préférences de l'utilisateur pour l'IA
export const updateJobPreferences = async (preferences) => {
  try {
    const response = await api.post('/ai/job-preferences', preferences);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API updateJobPreferences:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir les préférences actuelles
export const getJobPreferences = async () => {
  try {
    const response = await api.get('/ai/job-preferences');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getJobPreferences:", error.response?.data || error.message);
    throw error;
  }
};

// API pour tracker les interactions avec les recommandations
export const trackRecommendationInteraction = async (jobId, action, additionalData = {}) => {
  try {
    const response = await api.post('/ai/track-interaction', {
      job_id: jobId,
      action, // 'view', 'apply', 'dismiss', 'save'
      ...additionalData
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API trackRecommendationInteraction:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des recommandations de compétences à développer
export const getSkillRecommendations = async () => {
  try {
    const response = await api.get('/ai/skill-recommendations');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getSkillRecommendations:", error.response?.data || error.message);
    throw error;
  }
};

// API pour analyser les tendances du marché du travail au Sénégal
export const getMarketTrends = async (sector = null) => {
  try {
    const response = await api.get('/ai/market-trends', {
      params: { sector }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getMarketTrends:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des prédictions de salaire
export const getSalaryPrediction = async (jobTitle, location, experienceYears) => {
  try {
    const response = await api.get('/ai/salary-prediction', {
      params: {
        job_title: jobTitle,
        location,
        experience_years: experienceYears
      }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getSalaryPrediction:", error.response?.data || error.message);
    throw error;
  }
};

// API pour générer un CV optimisé avec l'IA
export const generateOptimizedCV = async (targetJobId = null) => {
  try {
    const response = await api.post('/ai/generate-cv', {
      target_job_id: targetJobId
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API generateOptimizedCV:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des conseils personnalisés pour un entretien
export const getInterviewTips = async (jobId) => {
  try {
    const response = await api.get(`/ai/interview-tips/${jobId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getInterviewTips:", error.response?.data || error.message);
    throw error;
  }
};

// API pour analyser la compatibilité avec une entreprise
export const getCompanyCompatibility = async (companyId) => {
  try {
    const response = await api.get(`/ai/company-compatibility/${companyId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getCompanyCompatibility:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des recommandations de formation
export const getTrainingRecommendations = async () => {
  try {
    const response = await api.get('/ai/training-recommendations');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getTrainingRecommendations:", error.response?.data || error.message);
    throw error;
  }
};

// API pour analyser les gaps de compétences
export const analyzeSkillGaps = async (targetJobId) => {
  try {
    const response = await api.post('/ai/analyze-skill-gaps', {
      target_job_id: targetJobId
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API analyzeSkillGaps:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des prédictions de succès pour une candidature
export const getApplicationSuccessPrediction = async (jobId) => {
  try {
    const response = await api.get(`/ai/application-success-prediction/${jobId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getApplicationSuccessPrediction:", error.response?.data || error.message);
    throw error;
  }
};

// API pour obtenir des statistiques personnalisées basées sur l'IA
export const getAIInsights = async () => {
  try {
    const response = await api.get('/ai/insights');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getAIInsights:", error.response?.data || error.message);
    throw error;
  }
};

// API pour envoyer du feedback sur les recommandations IA
export const submitAIFeedback = async (feedbackData) => {
  try {
    const response = await api.post('/ai/feedback', feedbackData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API submitAIFeedback:", error.response?.data || error.message);
    throw error;
  }
};