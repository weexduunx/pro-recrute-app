// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, TouchableOpacity, Text } from 'react-native';

// **IMPORTANT: Mettez à jour cette URL avec l'adresse IP et le port du  backend Laravel**
// const API_URL = proce;

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
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

export const registerUser = async (name, email, password, passwordConfirmation, role) => {
  try {
    const response = await api.post('/register', {
      name: name,
      email: email,
      password: password,
      password_confirmation: passwordConfirmation,
      role: role || 'user', // Définit le rôle par défaut à 'user' si non spécifié
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

export const getUserApplications = async () => {
  try {
    const response = await api.get('/user/applications'); // Laravel: GET /api/user/applications
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getUserApplications:", error.response?.data || error.message);
    throw error;
  }
};

export const applyForOffre = async (offreId, data = {}) => {
  try {
    const response = await api.post(`/offres/${offreId}/apply`, data); // Laravel: POST /api/offres/{offre}/apply
    return response.data;
  } catch (error) {
    console.error(`Échec de l'appel API applyForOffre pour l'offre ${offreId}:`, error.response?.data || error.message);
    throw error;
  }
};

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

export const getRecommendedOffres = async () => {
  try {
    const response = await api.get('/offres/recommendations'); // Laravel: GET /api/offres/recommendations
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getRecommendedOffres:", error.response?.data || error.message);
    throw error;
  }
};

export const updateParsedCvData = async (parsedCvData) => {
  try {
    const response = await api.put('/user/parsed-cv', parsedCvData); // Laravel: PUT /api/user/parsed-cv
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API updateParsedCvData:", error.response?.data || error.message);
    throw error;
  }
};

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary); // btoa est disponible dans les environnements React Native/Expo
};

export const exportCvPdf = async () => {
  try {
    const response = await api.get('/user/export-cv-pdf', {
      responseType: 'arraybuffer', // Indispensable pour recevoir des données binaires (le PDF)
      headers: {
        'Accept': 'application/pdf', // Demander un PDF
      },
    });

    // Convertir l'ArrayBuffer reçu en chaîne Base64
    const base64Content = arrayBufferToBase64(response.data);

    // Récupérer le nom de fichier suggéré depuis les headers ou utiliser un nom par défaut
    const contentDisposition = response.headers['content-disposition'];
    let fileName = 'cv.pdf';
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1];
      }
    }

    // Chemin du sauvegarde en local
    // Utilisation de FileSystem.documentDirectory pour stocker le fichier dans l'application
    const localUri = FileSystem.documentDirectory + fileName;

    // Écrire le contenu Base64 dans un fichier local
    await FileSystem.writeAsStringAsync(localUri, base64Content, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`CV PDF téléchargé vers : ${localUri}`);

    // Proposer d'ouvrir ou de partager le fichier
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri);
    } else {
      Alert.alert("Partage indisponible", "La fonctionnalité de partage n'est pas disponible sur cet appareil.");
    }

    return { message: 'CV PDF téléchargé et partagé.', uri: localUri };

  } catch (error) { // Déclarer error sans typage car JS natif
    console.error("Échec de l'appel API exportCvPdf:", error.response?.data || error.message);
    let errorMessage = "Échec de l'exportation du CV. ";
    if (error.response?.data) {
      // Tente de décoder la réponse d'erreur si elle est au format JSON
      try {
        const errorData = JSON.parse(new TextDecoder().decode(error.response.data));
        errorMessage += errorData.message || errorData.error || 'Erreur inconnue du serveur.';
      } catch (e) {
        errorMessage += 'Erreur de décodage de la réponse du serveur.';
      }
    } else {
      errorMessage += error.message || 'Vérifiez la connexion ou le serveur.';
    }
    Alert.alert("Erreur d'exportation", errorMessage); // Affiche l'erreur à l'utilisateur
    throw new Error(errorMessage); // Rejette avec un message clair
  }
};

export const savePushToken = async (token) => {
  try {
    const response = await api.post('/user/save-push-token', { push_token: token });
    console.log('Push token sauvegardé avec succès:', response.data);
    return response.data;
  } catch (error) {
    console.error('Échec de la sauvegarde du push token:', error.response?.data || error.message);
    throw error;
  }
};

export const getCandidatProfile = async () => {
  try {
    const response = await api.get('/candidat'); // Laravel: GET /api/candidat
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("Profil candidat non trouvé.");
      return null;
    }
    console.error("Échec de l'appel API getCandidatProfile:", error.response?.data || error.message);
    throw error;
  }
};

export const createOrUpdateCandidatProfile = async (candidatData) => {
  try {
    const response = await api.post('/candidat/create-update', candidatData); // Laravel: POST /api/candidat/create-update
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API createOrUpdateCandidatProfile:", error.response?.data || error.message);
    throw error;
  }
};

export const sendTestPushNotification = async () => {
  try {
    // Laravel: POST /api/user/send-test-push-notification
    const response = await api.post('/user/send-test-push-notification', {
      title: "Test de Notification",
      body: "Ceci est une notification de test envoyée depuis votre application!",
    });
    console.log('Notification de test envoyée avec succès:', response.data);
    return response.data;
  } catch (error) {
    console.error('Échec de l\'envoi de la notification de test:', error.response?.data || error.message);
    throw error;
  }
};

export const getActualites = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.type) {
      params.append('type', filters.type);
    }
    if (filters.category) {
      params.append('category', filters.category);
    }

    const queryString = params.toString();
    const url = `/actualites${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url); // Laravel: GET /api/actualites?type=...&category=...
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getActualites:", error.response?.data || error.message);
    throw error;
  }
};

export const getActualiteById = async (actualiteId) => {
  try {
    const response = await api.get(`/actualites/${actualiteId}`); // Laravel: GET /api/actualites/{id}
    return response.data;
  } catch (error) {
    console.error(`Échec de l'appel API getActualiteById pour l'ID ${actualiteId}:`, error.response?.data || error.message);
    throw error;
  }
};

export const getInterimProfile = async () => {
  try {
    const response = await api.get('/interim/profile'); // Laravel: GET /api/interim/profile
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("Profil intérimaire non trouvé (404).");
      return null;
    }
    console.error("Échec de l'appel API getInterimProfile:", error.response?.data || error.message);
    throw error;
  }
};

export const createOrUpdateInterimProfile = async (profileData) => {
  try {
    const response = await api.post('/interim/create-update-profile', profileData); // Laravel: POST /api/interim/create-update-profile
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API createOrUpdateInterimProfile:", error.response?.data || error.message);
    throw error;
  }
};

export const getInterimAttestations = async () => {
  try {
    const response = await api.get('/interim/attestations'); // Laravel: GET /api/interim/certificates
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getInterimCertificates:", error.response?.data || error.message);
    throw error;
  }
};

export const getDetailsUserGbg = async () => {
  try {
    const response = await api.get('/interim/details'); // Laravel: GET /api/interim/details
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getDetailsUserGbg:", error.response?.data || error.message);
    throw error;
  }
};

export const getInterimLoans = async () => {
  try {
    const response = await api.get('/interim/loans'); // Laravel: GET /api/interim/loans
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getInterimLoans:", error.response?.data || error.message);
    throw error;
  }
};

export const getPdf = async (encryptedContratId) => {
  try {
    // MODIFIÉ : Requête GET et ID dans l'URL
    const response = await api.get(`/interim/attestations/${encryptedContratId}/download`, { 
      responseType: 'arraybuffer', // Indispensable pour recevoir des données binaires (le PDF)
      headers: {
        'Accept': 'application/pdf', // Demander un PDF
      },
    });

     
    const base64Content = arrayBufferToBase64(response.data);

    const contentDisposition = response.headers['content-disposition'];
    let fileName = `attestation_${encryptedContratId}.pdf`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1];
      }
    }

    const localUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(localUri, base64Content, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`Attestation PDF téléchargée vers : ${localUri}`);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri);
    } else {
      Alert.alert("Partage indisponible", "La fonctionnalité de partage n'est pas disponible sur cet appareil.");
    }

    return { message: 'Attestation PDF téléchargée et partagée.', uri: localUri };

  } catch (error) {
    console.error("Erreur téléchargement PDF:", error.response?.data || error.message);
    Alert.alert("Erreur", error.response?.data?.message || "Le téléchargement du PDF a échoué.");
    throw error;
  }
};

export const fetchEncryptedTypes = async () => {
  try {
    const response = await api.get('/interim/encrypted-types');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des types chiffrés', error);
    throw error;
  }
};

export const getCertificatPdf = async (encryptedType, options = { share: true }) => {
  try {
    const response = await api.get(`/interim/printCertificat/${encryptedType}`, { 
      responseType: 'arraybuffer', 
      headers: {
        'Accept': 'application/pdf',
      },
    });

     
    const base64Content = arrayBufferToBase64(response.data);

    const contentDisposition = response.headers['content-disposition'];
    let fileName = `certificat_${encryptedType}.pdf`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1];
      }
    }

    const localUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(localUri, base64Content, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`Certificat PDF téléchargé avec succès vers : ${localUri}`);

 if (options.share && await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri);
  } else if (!options.share) {
    return { message: 'Certificat PDF téléchargé et partagée.', uri: localUri }; // Tu peux afficher dans un PDF Viewer natif ou fichier local
  }
    // return { message: 'Certificat PDF téléchargé et partagée.', uri: localUri };

  } catch (error) {
    console.error("Erreur téléchargement PDF:", error.response?.data || error.message);
    Alert.alert("Erreur", error.response?.data?.message || "Le téléchargement du PDF a échoué.");
    throw error;
  }
};

export const getContractHistory = async () => {
  try {
    const response = await api.get('/interim/contrats/history');
    return response.data;
  } catch (error) {
    console.error("Erreur lors du chargement des contrats :", error.response?.data || error.message);
    throw error;
  }
};

export const getCertificatInfo = async () => {
  try {
    const response = await api.get('/interim/certificats');
    return response.data;
  } catch (error) {
    console.error("Erreur API certificat:", error.response?.data || error.message);
    throw error;
  }
};

export default api;
