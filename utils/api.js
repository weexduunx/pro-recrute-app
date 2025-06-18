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

// Intercepteur de requête: Attache automatiquement le jeton d'authentification
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

// Intercepteur de réponse: Gère l'expiration du jeton ou les requêtes 401 Non autorisé
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

/**
 * [NOUVEAU] Récupère les candidatures de l'utilisateur connecté.
 * @returns {Promise<Array>} Un tableau d'objets candidature.
 */
export const getUserApplications = async () => {
  try {
    // API Route à implémenter dans Laravel (ex: GET /api/user/applications)
    const response = await api.get('/user/applications');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getUserApplications:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * [NOUVEAU] Met à jour le profil de l'utilisateur connecté.
 * @param {object} profileData - Les données du profil à mettre à jour (ex: {name: 'Nouveau Nom'}).
 * @returns {Promise<object>} L'objet utilisateur mis à jour.
 */
export const updateUserProfile = async (profileData) => {
  try {
    // API Route à implémenter dans Laravel (ex: PUT /api/user/profile)
    const response = await api.put('/user/profile', profileData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API updateUserProfile:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * [NOUVEAU] Télécharge un fichier (CV) pour l'utilisateur connecté.
 * @param {string} userId - L'ID de l'utilisateur.
 * @param {object} fileAsset - L'objet fichier retourné par expo-document-picker.
 * @returns {Promise<object>} La réponse de l'API.
 */
export const uploadCv = async (userId, fileAsset) => {
  try {
    const formData = new FormData();
    // Le 'uri' de fileAsset est le chemin local du fichier
    // Le 'name' est le nom du fichier
    // Le 'mimeType' est le type du fichier (ex: application/pdf)
    formData.append('cv_file', {
      uri: fileAsset.uri,
      name: fileAsset.name,
      type: fileAsset.mimeType || 'application/octet-stream', // Fallback type
    });

    // API Route à implémenter dans Laravel (ex: POST /api/user/upload-cv)
    const response = await api.post('/user/upload-cv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Indispensable pour l'upload de fichier
      },
    });
    console.log("Appel API uploadCv réussi:", response.data);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API uploadCv:", error.response?.data || error.message);
    throw error;
  }
};

export default api;
