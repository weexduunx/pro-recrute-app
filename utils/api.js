// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// **IMPORTANT: Mettez à jour cette URL avec l'adresse IP et le port de votre backend Laravel**
const API_URL = 'http://192.168.1.144:8000/api'; // ex: 'http://192.168.1.5:8000/api'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Envoi de la requête vers:', config.url, 'avec les en-têtes:', config.headers); // Débogage
    return config;
  },
  (error) => {
    console.error('Erreur de l\'intercepteur de requête:', error); // Débogage
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('Réponse reçue de:', response.config.url, 'Statut:', response.status, 'Données:', response.data); // Débogage
    return response;
  },
  async (error) => {
    console.error('Erreur API:', error.response?.status, error.response?.data || error.message); // Débogage
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn("Jeton d'authentification expiré ou invalide. Utilisateur déconnecté.");
      await AsyncStorage.removeItem('user_token');
    }
    return Promise.reject(error);
  }
);

export const loginUser = async (email, password, deviceName) => {
  try {
    const response = await api.post('/login', { email, password, device_name: deviceName });
    const { token, user } = response.data;
    await AsyncStorage.setItem('user_token', token);
    return { user, token };
  } catch (error) {
    console.error("Échec de l'appel API loginUser:", error.response?.data || error.message);
    throw error;
  }
};

export const registerUser = async (name, email, password, passwordConfirmation) => {
  try {
    const response = await api.post('/register', {
      name: name,
      email: email,
      password: password,
      password_confirmation: passwordConfirmation,
    });
    console.log("Appel API registerUser réussi:", response.data);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API registerUser:", error.response?.data || error.message);
    throw error;
  }
};

export const fetchUserProfile = async () => {
  try {
    const response = await api.get('/user');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API fetchUserProfile:", error.response?.data || error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const response = await api.post('/logout');
    console.log("Appel API logoutUser réussi:", response.data);
    await AsyncStorage.removeItem('user_token');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API logoutUser:", error.response?.data || error.message);
    await AsyncStorage.removeItem('user_token');
    throw error;
  }
};

export const getOffres = async () => {
  try {
    const response = await api.get('/offres');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getOffres:", error.response?.data || error.message);
    throw error;
  }
};

export const getOffreById = async (offreId) => {
  try {
    const response = await api.get(`/offres/${offreId}`);
    return response.data;
  } catch (error) {
    console.error(`Échec de l'appel API getOffreById pour l'ID ${offreId}:`, error.response?.data || error.message);
    throw error;
  }
};


export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/user/profile', profileData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API updateUserProfile:", error.response?.data || error.message);
    throw error;
  }
};

export const uploadCv = async (fileAsset) => {
  try {
    const formData = new FormData();
    formData.append('cv_file', {
      uri: fileAsset.uri,
      name: fileAsset.name,
      type: fileAsset.mimeType || 'application/octet-stream',
    });

    const response = await api.post('/user/upload-cv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log("Appel API uploadCv réussi:", response.data);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API uploadCv:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * [NOUVEAU] Récupère les informations du CV parsé de l'utilisateur connecté.
 * @returns {Promise<object|null>} L'objet CV parsé ou null si non trouvé.
 */
export const getParsedCvData = async () => {
  try {
    const response = await api.get('/user/parsed-cv'); // Laravel: GET /api/user/parsed-cv
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("Aucune donnée de CV parsée trouvée.");
      return null;
    }
    console.error("Échec de l'appel API getParsedCvData:", error.response?.data || error.message);
    throw error;
  }
};
/**
 * [NOUVEAU] Récupère les candidatures de l'utilisateur connecté.
 * @returns {Promise<Array>} Un tableau d'objets candidature.
 */
export const getUserApplications = async () => {
  try {
    const response = await api.get('/user/applications'); // Laravel: GET /api/user/applications
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getUserApplications:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * [NOUVEAU] Soumet une candidature pour une offre spécifique.
 * @param {string} offreId - L'ID de l'offre à laquelle postuler.
 * @param {object} [data] - Données additionnelles (ex: { motivation_letter: '...' }).
 * @returns {Promise<object>} La réponse de l'API avec la candidature soumise.
 */
export const applyForOffre = async (offreId, data = {}) => {
  try {
    const response = await api.post(`/offres/${offreId}/apply`, data); // Laravel: POST /api/offres/{offre}/apply
    return response.data;
  } catch (error) {
    console.error(`Échec de l'appel API applyForOffre pour l'offre ${offreId}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * [MODIFIÉ] Envoie le code d'autorisation OAuth (reçu de WebBrowser) à votre backend Laravel.
 * @param {string} provider - Le nom du fournisseur ('google', 'linkedin').
 * @param {string} code - Le code d'autorisation reçu du fournisseur OAuth.
 * @returns {Promise<object>} - L'objet utilisateur et le jeton Sanctum.
 */
export const socialLoginCallback = async (provider, code) => { // idToken remplacé par code
  try {
    // Laravel attend le 'code' dans les paramètres de requête GET pour le flux Socialite classique
    const response = await axios.get(`${API_URL}/auth/${provider}/callback?code=${code}`);
    const { token, user } = response.data;
    await AsyncStorage.setItem('user_token', token);
    return { user, token };
  } catch (error) {
    console.error(`Échec de l'échange de jeton Socialite pour ${provider}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * [NOUVEAU] Récupère les offres recommandées pour l'utilisateur connecté.
 * @returns {Promise<Array>} Un tableau d'objets offre recommandés.
 */
export const getRecommendedOffres = async () => {
  try {
    const response = await api.get('/offres/recommendations'); // Laravel: GET /api/offres/recommendations
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getRecommendedOffres:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * [NOUVEAU] Met à jour les informations du CV parsé de l'utilisateur.
 * @param {object} parsedCvData - Les données du CV parsé à mettre à jour.
 * @returns {Promise<object>} L'objet CV parsé mis à jour.
 */
export const updateParsedCvData = async (parsedCvData) => {
  try {
    const response = await api.put('/user/parsed-cv', parsedCvData); // Laravel: PUT /api/user/parsed-cv
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API updateParsedCvData:", error.response?.data || error.message);
    throw error;
  }
};

export default api;
