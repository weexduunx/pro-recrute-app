// utils/analytics-api.js
import api from './api';

/**
 * API pour les analytics et reporting intérimaires
 */

// Obtenir les statistiques générales du dashboard
export const getDashboardStats = async (period = 'month', year = null, showAll = true) => {
  try {
    const params = { 
      period,
      show_all: showAll // Par défaut, afficher toutes les données historiques pour le dashboard
    };
    if (year) {
      params.year = year;
    }
    
    const response = await api.get('/interim/analytics/dashboard', {
      params
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getDashboardStats:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir les tendances de travail
export const getWorkTrends = async (period = '6months') => {
  try {
    const response = await api.get('/interim/analytics/work-trends', {
      params: { period }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getWorkTrends:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir les statistiques financières
export const getFinancialStats = async (year = null) => {
  try {
    const response = await api.get('/interim/analytics/financial', {
      params: { year: year || new Date().getFullYear() }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getFinancialStats:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir les statistiques IPM (prises en charge, feuilles de soins)
export const getIpmStats = async (year = null) => {
  try {
    const response = await api.get('/interim/analytics/ipm-stats', {
      params: { year: year || new Date().getFullYear() }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getIpmStats:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir l'évolution des contrats
export const getContractEvolution = async (period = 'year') => {
  try {
    const response = await api.get('/interim/analytics/contract-evolution', {
      params: { period }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getContractEvolution:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir les statistiques par type de structure
export const getStructureStats = async () => {
  try {
    const response = await api.get('/interim/analytics/structure-stats');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getStructureStats:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir les performances mensuelles
export const getMonthlyPerformance = async (year = null) => {
  try {
    const response = await api.get('/interim/analytics/monthly-performance', {
      params: { year: year || new Date().getFullYear() }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getMonthlyPerformance:", error.response?.data || error.message);
    throw error;
  }
};

// Générer et télécharger un rapport PDF
export const generateAnalyticsReport = async (reportType, params = {}) => {
  try {
    const response = await api.post('/interim/analytics/generate-report', {
      type: reportType,
      params
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API generateAnalyticsReport:", error.response?.data || error.message);
    throw error;
  }
};

// Télécharger un rapport PDF généré
export const downloadReport = async (reportId) => {
  try {
    const response = await api.get(`/interim/analytics/reports/${reportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API downloadReport:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir l'historique des rapports générés
export const getReportsHistory = async () => {
  try {
    const response = await api.get('/interim/analytics/reports');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getReportsHistory:", error.response?.data || error.message);
    throw error;
  }
};

// Helpers pour formater les données

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF'
  }).format(amount || 0);
};

export const formatNumber = (number) => {
  return new Intl.NumberFormat('fr-FR').format(number || 0);
};

export const formatPercentage = (value, decimals = 1) => {
  return `${(value || 0).toFixed(decimals)}%`;
};

export const formatDuration = (hours) => {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  } else if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}j ${remainingHours.toFixed(0)}h`;
  }
};

export const formatDate = (dateString, format = 'short') => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const options = {
    short: { month: 'short', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }
  };
  
  return date.toLocaleDateString('fr-FR', options[format] || options.medium);
};

export const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getGrowthColor = (growth, colors) => {
  if (growth > 0) return colors.success || '#10B981';
  if (growth < 0) return colors.error || '#EF4444';
  return colors.textSecondary || '#6B7280';
};

// Constantes pour les périodes d'analyse
export const ANALYTICS_PERIODS = [
  { label: 'Semaine', value: 'week' },
  { label: 'Mois', value: 'month' },
  { label: 'Trimestre', value: 'quarter' },
  { label: 'Année', value: 'year' },
  { label: '6 derniers mois', value: '6months' },
  { label: '12 derniers mois', value: '12months' }
];

// Types de rapports disponibles
export const REPORT_TYPES = [
  {
    id: 'financial_summary',
    label: 'Résumé financier',
    description: 'Vue d\'ensemble des revenus et prestations',
    icon: 'cash'
  },
  {
    id: 'work_activity',
    label: 'Activité de travail',
    description: 'Contrats, heures travaillées, structures',
    icon: 'briefcase'
  },
  {
    id: 'ipm_coverage',
    label: 'Rapport IPM',
    description: 'Feuilles de soins, consultations et remboursements',
    icon: 'medical'
  },
  {
    id: 'annual_summary',
    label: 'Bilan annuel',
    description: 'Rapport complet de l\'année',
    icon: 'document-text'
  }
];

// Couleurs pour les graphiques
export const CHART_COLORS = [
  '#3B82F6', // Bleu
  '#10B981', // Vert
  '#F59E0B', // Orange
  '#EF4444', // Rouge
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#F97316', // Orange foncé
  '#84CC16'  // Lime
];