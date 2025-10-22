// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, TouchableOpacity, Text } from 'react-native';
import * as Device from 'expo-device';

// **IMPORTANT: Mettez à jour cette URL avec l'adresse IP et le port du  backend Laravel**
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.47:8000/api'; //Variable d'environnement en priorité

// Variable pour éviter la suppression immédiate du token après connexion
let recentTokenSet = false;
let tokenSetTimestamp = 0;

// Fonction utilitaire pour vérifier si l'utilisateur est authentifié
export const isUserAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem('user_token');
    return !!token;
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    return false;
  }
};

// Fonction pour marquer qu'un token a été récemment défini
export const markTokenAsRecentlySet = () => {
  recentTokenSet = true;
  tokenSetTimestamp = Date.now();
  console.log('API: Token marqué comme récemment défini à', new Date(tokenSetTimestamp));
  
  // Réinitialiser après 10 secondes pour éviter les problèmes à long terme
  setTimeout(() => {
    recentTokenSet = false;
    console.log('API: Protection du token récent expirée');
  }, 10000);
};

console.log('API_URL configuré:', API_URL); //Debug

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
    // console.log('Réponse reçue de:', response.config.url, 'Statut:', response.status, 'Données:', response.data);
    return response;
  },
  async (error) => {
    // Si c'est une erreur 401 (Non authentifié) et que la requête n'a pas déjà été retentée
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true; // Marque la requête comme retentée pour éviter les boucles infinies

      // Vérifier s'il y a encore un token avant de logguer
      const currentToken = await AsyncStorage.getItem('user_token');

      if (currentToken) {
        console.warn("API Interceptor: Jeton d'authentification expiré ou invalide (401).");

        // Vérifier si un token vient d'être défini récemment (dans les 5 dernières secondes)
        const now = Date.now();
        if (recentTokenSet && (now - tokenSetTimestamp) < 5000) {
          console.log("API Interceptor: Token récent détecté, pas de suppression automatique");
          // Ne pas supprimer le token s'il vient d'être défini
        } else {
          await AsyncStorage.removeItem('user_token'); // Nettoie le token invalide localement
          console.log("API Interceptor: Token supprimé en raison d'une erreur 401");
          // L'AuthProvider devrait gérer la redirection vers l'écran de connexion
        }
      } else {
        // 401 sans token = probablement après déconnexion, pas de log
        console.log("API Interceptor: 401 sans token, probablement après déconnexion");
      }
    } else {
      // Loggue les autres erreurs API comme des erreurs (y compris les 500)
      // Mais pas les 409 qui sont des cas normaux pour les skill assessments
      if (error.response?.status !== 409) {
        console.error('Erreur API:', error.response?.status, error.response?.data || error.message);
      }
    }
    return Promise.reject(error);
  }
);


export const loginUser = async (email, password, deviceName) => {
  try {
    const response = await api.post('/login', { email, password, device_name: deviceName });
    return response.data;
  } catch (error) {
    throw error; // Laisser AuthProvider gérer l'erreur
  }
};

export const registerUser = async (name, email, password, passwordConfirmation, role, deviceName) => {
  try {
    const response = await api.post('/register', {
      name: name,
      email: email,
      password: password,
      password_confirmation: passwordConfirmation,
      role: role || 'user',
      device_name: deviceName,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchUserProfile = async () => {
  try {
    // Récupérer l'utilisateur avec toutes ses relations candidat_profile, compétences, expériences, etc.
    const response = await api.get('/user', {
      params: {
        include_profile: true, // Demande d'inclure candidat_profile
        include_competences: true, // Demande d'inclure les compétences via candidat_has_competences
        include_experiences: true, // Demande d'inclure les expériences
        include_formations: true, // Demande d'inclure les formations
        include_parsed_cv: true // Demande d'inclure le CV parsé
      }
    });
    console.log('Données utilisateur complètes récupérées:', {
      userId: response.data.user?.id,
      hasCandidatProfile: !!response.data.user?.candidat_profile,
      competencesCount: response.data.user?.candidat_profile?.competences?.length || 0,
      experiencesCount: response.data.user?.candidat_profile?.experiences?.length || 0,
      hasParsedCv: !!response.data.user?.candidat_profile?.parsed_cv
    });
    return response.data;
  } catch (error) {
    throw error; // Laisser AuthProvider gérer l'erreur (y compris le 401)
  }
};

export const logoutUser = async () => {
  try {
    const response = await api.post('/logout');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// export const loginUser = async (email, password, deviceName) => {
//   try {
//     const response = await api.post('/login', { email, password, device_name: deviceName });
//     const { token, user } = response.data;
//     await AsyncStorage.setItem('user_token', token);
//     return { user, token };
//   } catch (error) {
//     console.error("Échec de l'appel API loginUser:", error.response?.data || error.message);
//     throw error;
//   }
// };

// export const registerUser = async (name, email, password, passwordConfirmation, role) => {
//   try {
//     const response = await api.post('/register', {
//       name: name,
//       email: email,
//       password: password,
//       password_confirmation: passwordConfirmation,
//       role: role || 'user', // Définit le rôle par défaut à 'user' si non spécifié
//     });
//     console.log("Appel API registerUser réussi:", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Échec de l'appel API registerUser:", error.response?.data || error.message);
//     throw error;
//   }
// };

// export const fetchUserProfile = async () => {
//   try {
//     const response = await api.get('/user');
//     return response.data;
//   } catch (error) {
//     console.error("Échec de l'appel API fetchUserProfile:", error.response?.data || error.message);
//     throw error;
//   }
// };

// export const logoutUser = async () => {
//   try {
//     const response = await api.post('/logout');
//     console.log("Appel API logoutUser réussi:", response.data);
//     await AsyncStorage.removeItem('user_token');
//     return response.data;
//   } catch (error) {
//     console.error("Échec de l'appel API logoutUser:", error.response?.data || error.message);
//     await AsyncStorage.removeItem('user_token');
//     throw error;
//   }
// };

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

export const uploadProfilePhoto = async (imageAsset) => {
  try {
    console.log("=== DEBUG UPLOAD PROFILE PHOTO ===");
    console.log("Image Asset reçu:", imageAsset);
    console.log("API_URL utilisé:", API_URL);
    
    // Test de connectivité basique
    try {
      console.log("Test de connectivité vers:", `${API_URL.replace('/api', '')}/api/user`);
      const testResponse = await api.get('/user');
      console.log("Test de connectivité: OK");
    } catch (testError) {
      console.error("Test de connectivité: ÉCHEC", testError.message);
    }
    
    const formData = new FormData();
    
    // L'objet imageAsset d'ImagePicker a des propriétés différentes
    const fileName = imageAsset.fileName || imageAsset.name || `profile_photo_${Date.now()}.jpg`;
    const mimeType = imageAsset.mimeType || imageAsset.type || 'image/jpeg';
    
    formData.append('profile_photo', {
      uri: imageAsset.uri,
      name: fileName,
      type: mimeType,
    });

    console.log("FormData préparé avec:", { uri: imageAsset.uri, name: fileName, type: mimeType });

    const response = await api.post('/user/upload-profile-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 secondes timeout
    });
    console.log("Appel API uploadProfilePhoto réussi:", response.data);
    return response.data;
  } catch (error) {
    console.error("=== ERREUR UPLOAD PROFILE PHOTO ===");
    console.error("Type d'erreur:", error.constructor.name);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Response status:", error.response?.status);
    console.error("Response data:", error.response?.data);
    console.error("Request URL:", error.config?.url);
    console.error("Request headers:", error.config?.headers);
    throw error;
  }
};

export const deleteProfilePhoto = async () => {
  try {
    console.log("=== DELETE PROFILE PHOTO ===");
    const response = await api.delete('/user/delete-profile-photo');
    console.log("Appel API deleteProfilePhoto réussi:", response.data);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API deleteProfilePhoto:", error.response?.data || error.message);
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
    console.log('=== API CALL: getUserApplications START ===');
    const response = await api.get('/user/applications'); // Laravel: GET /api/user/applications
    console.log('=== API CALL: getUserApplications SUCCESS ===');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    console.log('Data length:', response.data?.length || 0);
    return response.data;
  } catch (error) {
    console.error('=== API CALL: getUserApplications ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error("Échec de l'appel API getUserApplications:", error.response?.data || error.message);
    throw error;
  }
};

// Route de debug pour diagnostiquer le problème candidature
export const debugCandidatureIssue = async () => {
  try {
    console.log('=== DEBUG CANDIDATURE ISSUE ===');
    const response = await api.get('/debug/applications');
    console.log('Debug response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Debug candidature error:', error.response?.data || error.message);
    throw error;
  }
};

// Version debug spécifique pour diagnostiquer les problèmes d'intérimaires
export const debugGetUserApplications = async () => {
  try {
    console.log('=== DEBUG API CALL: getUserApplications START ===');
    
    // Récupérer le token manuellement
    const token = await AsyncStorage.getItem('user_token');
    console.log('Token in storage:', token ? 'Present' : 'Missing');
    
    // Faire plusieurs tests d'endpoints
    const endpoints = [
      '/user/applications',
      '/candidature', // Alternative endpoint
      '/user/candidatures' // Autre alternative
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        const response = await api.get(endpoint);
        console.log(`SUCCESS ${endpoint}:`, response.status, response.data);
        return { endpoint, success: true, data: response.data };
      } catch (err) {
        console.log(`FAILED ${endpoint}:`, err.response?.status, err.response?.data);
      }
    }
    
    throw new Error('All endpoints failed');
  } catch (error) {
    console.error('=== DEBUG API CALL: All tests failed ===');
    console.error('Final error:', error);
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

export const checkIfUserApplied = async (offreId) => {
  try {
    const response = await api.get(`/offres/${offreId}/check-application`); // Laravel: GET /api/offres/{offre}/check-application
    return response.data;
  } catch (error) {
    console.error(`Échec de la vérification de candidature pour l'offre ${offreId}:`, error.response?.data || error.message);
    throw error;
  }
};

export const startSkillsTestForJob = async (offreId, testId) => {
  try {
    const response = await api.post(`/offres/${offreId}/start-skills-test/${testId}`); // Laravel: POST /api/offres/{offre}/start-skills-test/{test}
    return response.data;
  } catch (error) {
    console.error(`Échec du démarrage du test pour l'offre ${offreId}:`, error.response?.data || error.message);
    throw error;
  }
};

export const socialLoginCallback = async (provider, code) => {
  try {
    // L'URL ici correspond à votre route Laravel: /api/auth/{provider}/callback
    const response = await axios.get(`${API_URL}/auth/${provider}/callback?code=${code}`);
    const { token, user } = response.data;
    await AsyncStorage.setItem('user_token', token); // Stocker le jeton Sanctum
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

// Nouvelle API pour les offres basées sur la géolocalisation
export const getLocationBasedOffres = async (latitude, longitude, radius = 50) => {
  try {
    const response = await api.get('/offres/nearby', {
      params: {
        latitude,
        longitude,
        radius, // rayon en km
      }
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getLocationBasedOffres:", error.response?.data || error.message);
    throw error;
  }
};

// API pour sauvegarder la position de l'utilisateur (optionnel)
export const saveUserLocation = async (latitude, longitude, address) => {
  try {
    const response = await api.post('/user/location', {
      latitude,
      longitude, 
      address
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API saveUserLocation:", error.response?.data || error.message);
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
      responseType: 'arraybuffer',
      headers: { 'Accept': 'application/pdf' },
    });

    const contentDisposition = response.headers['content-disposition'];
    let fileName = 'cv-export.pdf'; // Valeur par défaut

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/i);
      if (match && match[1]) {
        fileName = decodeURIComponent(match[1]);
      }
    }

    const base64Content = arrayBufferToBase64(response.data);
    const localUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(localUri, base64Content, {
      encoding: FileSystem.EncodingType.Base64,
    });

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
        // Gestion défensive compatible React Native
        let errorData;
        const responseData = error.response.data;
        
        if (typeof responseData === 'string') {
          // Données déjà en string
          errorData = JSON.parse(responseData);
        } else if (typeof responseData === 'object' && responseData !== null) {
          // Objet JavaScript natif
          errorData = responseData;
        } else if (responseData instanceof ArrayBuffer) {
          // ArrayBuffer - conversion sécurisée
          try {
            const uint8Array = new Uint8Array(responseData);
            const dataStr = String.fromCharCode(...Array.from(uint8Array));
            errorData = JSON.parse(dataStr);
          } catch (bufferError) {
            console.warn('Impossible de convertir ArrayBuffer:', bufferError);
            errorData = { error: 'Format de réponse non supporté' };
          }
        } else if (responseData instanceof Uint8Array) {
          // Uint8Array - conversion directe
          try {
            const dataStr = String.fromCharCode(...Array.from(responseData));
            errorData = JSON.parse(dataStr);
          } catch (arrayError) {
            console.warn('Impossible de convertir Uint8Array:', arrayError);
            errorData = { error: 'Format de réponse non supporté' };
          }
        } else {
          // Fallback pour autres types
          errorData = { error: String(responseData) };
        }
        
        errorMessage += errorData.message || errorData.error || 'Erreur inconnue du serveur.';
      } catch (e) {
        console.warn('Erreur lors du décodage de la réponse:', e);
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

export const getIPMCardData = async () => {
  try {
    console.log('=== API CALL: getIPMCardData START ===');
    const response = await api.get('/interim/ipm-card-data'); // Laravel: GET /api/interim/ipm-card-data
    console.log('=== API CALL: getIPMCardData SUCCESS ===');
    console.log('Response status:', response.status);
    console.log('Response data keys:', response.data ? Object.keys(response.data) : 'no data');
    return response.data;
  } catch (error) {
    console.error('=== API CALL: getIPMCardData ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Error message:', error.message);
    
    if (error.response?.status === 404) {
      console.log("Données IPM non trouvées (404).");
      return null;
    }
    console.error("Échec de l'appel API getIPMCardData:", error.response?.data || error.message);
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


// export const getPdf = async (encryptedContratId) => {
//   try {
//     // MODIFIÉ : Requête GET et ID dans l'URL
//     const response = await api.get(`/interim/attestations/${encryptedContratId}/download`, { 
//       responseType: 'arraybuffer', // Indispensable pour recevoir des données binaires (le PDF)
//       headers: {
//         'Accept': 'application/pdf', // Demander un PDF
//       },
//     });

     
//     const base64Content = arrayBufferToBase64(response.data);

//     const contentDisposition = response.headers['content-disposition'];
//     let fileName = `attestation_${encryptedContratId}.pdf`;
//     if (contentDisposition) {
//       const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
//       if (fileNameMatch && fileNameMatch[1]) {
//         fileName = fileNameMatch[1];
//       }
//     }

//     const localUri = FileSystem.documentDirectory + fileName;

//     await FileSystem.writeAsStringAsync(localUri, base64Content, {
//       encoding: FileSystem.EncodingType.Base64,
//     });

//     console.log(`Attestation PDF téléchargée vers : ${localUri}`);

//     if (await Sharing.isAvailableAsync()) {
//       await Sharing.shareAsync(localUri);
//     } else {
//       Alert.alert("Partage indisponible", "La fonctionnalité de partage n'est pas disponible sur cet appareil.");
//     }

//     return { message: 'Attestation PDF téléchargée et partagée.', uri: localUri };

//   } catch (error) {
//     console.error("Erreur téléchargement PDF:", error.response?.data || error.message);
//     Alert.alert("Erreur", error.response?.data?.message || "Le téléchargement du PDF a échoué.");
//     throw error;
//   }
// };


// Fonction API Gestion Dossier RH
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

// Fonction de téléchargement partagée avec Dossier RH et IPM
// export const getPdf = async (encryptedId, type) => {
//   let url = '';
//   if (type === 'attestation') {
//     url = `/interim/attestations/${encryptedId}/download`;
//   } else if (type === 'prise_en_charge') {
//     url = `/interim/prises-en-charge/${encryptedId}/download`;
//   } else if (type === 'feuille_de_soins') {
//     url = `/interim/feuilles-de-soins/${encryptedId}/download`;
//   } else {
//     throw new Error("Type de document non supporté.");
//   }

//   try {
//     // Requête GET et ID dans l'URL
//     const response = await api.get(url, {
//       responseType: 'arraybuffer', // Indispensable pour recevoir des données binaires (le PDF)
//       headers: {
//         'Accept': 'application/pdf', // Demander un PDF
//       },
//     });

     
//     const base64Content = arrayBufferToBase64(response.data);

//     const contentDisposition = response.headers['content-disposition'];
//     let fileName = `attestation_${encryptedContratId}.pdf`;
//     if (contentDisposition) {
//       const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
//       if (fileNameMatch && fileNameMatch[1]) {
//         fileName = fileNameMatch[1];
//       }
//     }

//     const localUri = FileSystem.documentDirectory + fileName;

//     await FileSystem.writeAsStringAsync(localUri, base64Content, {
//       encoding: FileSystem.EncodingType.Base64,
//     });

//     console.log(`Attestation PDF téléchargée vers : ${localUri}`);

//     if (await Sharing.isAvailableAsync()) {
//       await Sharing.shareAsync(localUri);
//     } else {
//       Alert.alert("Partage indisponible", "La fonctionnalité de partage n'est pas disponible sur cet appareil.");
//     }

//     return { message: 'Document téléchargé et partagé.', uri: localUri };
//   } catch (error) {
//     console.error("Erreur téléchargement PDF:", error.response?.data || error.message);
//     Alert.alert("Erreur", error.response?.data?.message || "Le téléchargement du PDF a échoué.");
//     throw error;
//   }
// };


// Fonction de téléchargement partagée avec Dossier RH et IPM
export const getPdf = async (encryptedId, type) => {
  let url = '';
  let defaultFileName = '';
  
  if (type === 'attestation') {
    url = `/interim/attestations/${encryptedId}/download`;
    defaultFileName = `attestation_${encryptedId}.pdf`;
  } else if (type === 'prise_en_charge') {
    url = `/interim/prises-en-charge/${encryptedId}/download`;
    defaultFileName = `prise_en_charge_${encryptedId}.pdf`;
  } else if (type === 'feuille_de_soins') {
    url = `/interim/feuilles-de-soins/${encryptedId}/download`;
    defaultFileName = `feuille_de_soins_${encryptedId}.pdf`;
  } else {
    throw new Error("Type de document non supporté.");
  }
 
  try {
    // Requête GET et ID dans l'URL
    const response = await api.get(url, {
      responseType: 'arraybuffer', // Indispensable pour recevoir des données binaires (le PDF)
      headers: {
        'Accept': 'application/pdf', // Demander un PDF
      },
    });
           
    const base64Content = arrayBufferToBase64(response.data);
 
    const contentDisposition = response.headers['content-disposition'];
    let fileName = defaultFileName; // Utiliser le nom par défaut basé sur le type
    
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
 
    console.log(`${type} PDF téléchargé vers : ${localUri}`);
 
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri);
    } else {
      Alert.alert("Partage indisponible", "La fonctionnalité de partage n'est pas disponible sur cet appareil.");
    }
 
    return { message: 'Document téléchargé et partagé.', uri: localUri };
  } catch (error) {
    console.error(`Erreur téléchargement PDF ${type}:`, error.response?.data || error.message);
    
    // Gestion d'erreur plus spécifique selon le type
    const errorMessage = getErrorMessage(type, error);
    Alert.alert("Erreur", errorMessage);
    throw error;
  }
};

// Fonction helper pour les messages d'erreur spécifiques
const getErrorMessage = (type, error) => {
  const typeLabels = {
    'attestation': 'attestation',
    'prise_en_charge': 'prise en charge',
    'feuille_de_soins': 'feuille de soins'
  };
  
  const docType = typeLabels[type] || 'document';
  
  if (error.response?.status === 403) {
    return `Accès refusé pour télécharger la ${docType}.`;
  } else if (error.response?.status === 404) {
    return `${docType.charAt(0).toUpperCase() + docType.slice(1)} non trouvée.`;
  } else if (error.response?.data?.message) {
    return error.response.data.message;
  } else {
    return `Le téléchargement de la ${docType} a échoué.`;
  }
};

// Fonctions API pour la gestion IPM
export const getInterimLoans = async () => {
  try {
    const response = await api.get('/interim/loans'); // Laravel: GET /api/interim/loans
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getInterimLoans:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Récupère la liste des membres de la famille de l'intérimaire connecté.
 * @returns {Promise<Array>} Un tableau de membres de la famille.
 */
export const getFamilleMembers = async () => {
  try {
    const response = await api.get('/interim/famille-members');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getFamilleMembers:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Soumet une demande de prise en charge pour l'intérimaire ou un membre de sa famille.
 * @param {object} data - Les données de la demande (objet, date, famille_id, etc.).
 * @returns {Promise<object>} La demande de prise en charge créée.
 */
export const requestPriseEnCharge = async (data) => {
  try {
    const response = await api.post('/interim/request-prise-en-charge', data);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API requestPriseEnCharge:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Soumet une demande de feuille de soins pour l'intérimaire ou un membre de sa famille.
 * @param {object} data - Les données de la demande (type, date_soins, montant_total, famille_id, etc.).
 * @returns {Promise<object>} La demande de feuille de soins créée.
 */
export const requestFeuilleDeSoins = async (data) => {
  try {
    const response = await api.post('/interim/request-feuille-de-soins', data);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API requestFeuilleDeSoins:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Récupère l'historique des demandes de prise en charge de l'intérimaire.
 * @returns {Promise<Array>} Un tableau des demandes de prise en charge.
 */
export const getPrisesEnChargeHistory = async () => {
  try {
    const response = await api.get('/interim/prises-en-charge-history');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getPrisesEnChargeHistory:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Récupère l'historique des demandes de feuilles de soins de l'intérimaire.
 * @returns {Promise<Array>} Un tableau des demandes de feuilles de soins.
 */
export const getFeuillesDeSoinsHistory = async () => {
  try {
    const response = await api.get('/interim/feuilles-de-soins-history');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getFeuillesDeSoinsHistory:", error.response?.data || error.message);
    throw error;
  }
};

export const sendOtp = async (email) => {
  try {
    const response = await api.post('/otp/send', { email });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API sendOtp:", error.response?.data || error.message);
    throw error;
  }
};

export const verifyOtp = async (email, otpCode, deviceName) => {
  try {
    const response = await api.post('/otp/verify', { email, otp_code: otpCode, device_name: deviceName });
    return response.data; // Devrait contenir user et token
  } catch (error) {
    console.error("Échec de l'appel API verifyOtp:", error.response?.data || error.message);
    throw error;
  }
};

export const getIpmRecapByMonth = async () => {
  try {
    const response = await api.get('/interim/recap-ipm');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getIpmRecapByMonth:", error.response?.data || error.message);
    throw error;
  }
};

export const getAffiliatedStructures = async (page = 1, perPage = 10) => {
  try {
    // Vérifier si un token existe avant de faire l'appel
    const token = await AsyncStorage.getItem('user_token');
    if (!token) {
      console.log('getAffiliatedStructures: Pas de token disponible, appel ignoré');
      return { success: false, data: [], message: 'No token available' };
    }

    const response = await api.get(`/interim/affiliated-structures?page=${page}&per_page=${perPage}`);
    return response.data; // 👈 PAS response.data.data
  } catch (error) {
    // Ne pas logguer l'erreur si c'est un 401 et qu'on n'a plus de token
    const token = await AsyncStorage.getItem('user_token');
    if (error.response?.status === 401 && !token) {
      console.log('getAffiliatedStructures: 401 sans token, probablement après déconnexion - ignoré');
      return { success: false, data: [], message: 'Unauthenticated after logout' };
    }

    console.error("Échec de l'appel API getAffiliatedStructures:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Enregistre une nouvelle session active ou met à jour une session existante
 */
export const storeActiveSession = async (sessionData, deviceHeaders = {}) => {
  try {
    // Vérifier si un token existe avant de faire l'appel
    const token = await AsyncStorage.getItem('user_token');
    if (!token) {
      console.warn('storeActiveSession: Pas de token disponible, appel ignoré');
      return { success: false, message: 'No token available' };
    }

    console.log('=== storeActiveSession API Call ===');
    console.log('Session Data:', sessionData);
    console.log('Device Headers:', deviceHeaders);

    // Construire la configuration de la requête avec les headers personnalisés
    const requestConfig = {
      headers: {
        'Content-Type': 'application/json',
        ...deviceHeaders // Ajouter les headers de device
      }
    };

    console.log('Request Config:', requestConfig);

    const response = await api.post('/sessions', sessionData, requestConfig);

    console.log('Response storeActiveSession:', response.data);
    return response.data;
  } catch (error) {
    // Ne pas logguer l'erreur si c'est un 401 et qu'on n'a plus de token
    const token = await AsyncStorage.getItem('user_token');
    if (error.response?.status === 401 && !token) {
      console.log('storeActiveSession: 401 sans token, probablement après déconnexion - ignoré');
      return { success: false, message: 'Unauthenticated after logout' };
    }

    console.error("Échec de l'appel API storeActiveSession:", error.response?.data || error.message);
    console.error("Full error:", error);
    throw error;
  }
};

/**
 * Récupère toutes les sessions actives de l'utilisateur
 * Maintenant avec headers pour identification de l'appareil actuel
 */
export const getActiveSessions = async (deviceHeaders = {}) => {
  try {
    // Vérifier si un token existe avant de faire l'appel
    const token = await AsyncStorage.getItem('user_token');
    if (!token) {
      console.warn('getActiveSessions: Pas de token disponible, appel ignoré');
      return { success: false, sessions: [], message: 'No token available' };
    }

    console.log('=== getActiveSessions API Call ===');
    console.log('Device Headers:', deviceHeaders);

    // Construire la configuration de la requête avec les headers personnalisés
    const requestConfig = {
      headers: {
        'Content-Type': 'application/json',
        ...deviceHeaders // Ajouter les headers de device pour identification
      }
    };

    console.log('Request Config:', requestConfig);

    const response = await api.get('/sessions', requestConfig);

    console.log('Response getActiveSessions:', response.data);
    return response.data;
  } catch (error) {
    // Ne pas logguer l'erreur si c'est un 401 et qu'on n'a plus de token
    const token = await AsyncStorage.getItem('user_token');
    if (error.response?.status === 401 && !token) {
      console.log('getActiveSessions: 401 sans token, probablement après déconnexion - ignoré');
      return { success: false, sessions: [], message: 'Unauthenticated after logout' };
    }

    console.error("Échec de l'appel API getActiveSessions:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Termine une session spécifique
 */
export const terminateSession = async (sessionId) => {
  try {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API terminateSession:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Termine toutes les autres sessions (sauf la session actuelle)
 */
export const terminateAllOtherSessions = async () => {
  try {
    const response = await api.delete('/sessions');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API terminateAllOtherSessions:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Nettoie les sessions expirées
 */
export const cleanupExpiredSessions = async () => {
  try {
    const response = await api.post('/sessions/cleanup');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API cleanupExpiredSessions:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Change le mot de passe de l'utilisateur connecté
 */
export const changePassword = async (currentPassword, newPassword, newPasswordConfirmation) => {
  try {
    console.log('=== changePassword API Call ===');
    
    const response = await api.post('/user/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation
    });
    
    console.log('Response changePassword:', response.data);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API changePassword:", error.response?.data || error.message);
    
    // Gérer les erreurs de validation spécifiquement
    if (error.response?.status === 422) {
      const validationErrors = error.response.data.errors;
      let errorMessage = 'Erreur de validation:';
      
      if (validationErrors.current_password) {
        errorMessage = validationErrors.current_password[0];
      } else if (validationErrors.new_password) {
        errorMessage = validationErrors.new_password[0];
      } else if (validationErrors.new_password_confirmation) {
        errorMessage = validationErrors.new_password_confirmation[0];
      }
      
      throw new Error(errorMessage);
    }
    
    throw error;
  }
};

// Fonctions pour les entretiens
export const getCandidatEntretiens = async () => {
  try {
    console.log('=== API CALL: getCandidatEntretiens (tous les entretiens) ===');
    const response = await api.get('/candidat/entretiens');

    // Gérer le cas où l'utilisateur n'a pas de profil candidat
    if (response.data.needs_profile_creation || response.data.suggestion) {
      console.log('Info: Profil candidat non trouvé -', response.data.message);
      return {
        entretiens: [],
        needsProfileCreation: true,
        message: response.data.message,
        suggestion: response.data.suggestion
      };
    }

    console.log('API Response getCandidatEntretiens:', response.data);
    return {
      entretiens: response.data.entretiens || [],
      needsProfileCreation: false
    };
  } catch (error) {
    // Gestion silencieuse des erreurs 404 pour profil manquant
    if (error.response?.status === 404 && error.response?.data?.message?.includes('candidat non trouvé')) {
      console.log('Info: Profil candidat non trouvé - suggestion de création');
      return {
        entretiens: [],
        needsProfileCreation: true,
        message: 'Aucun profil candidat trouvé',
        suggestion: 'Créez votre profil candidat pour accéder aux entretiens'
      };
    }
    console.error("Erreur appel API getCandidatEntretiens:", error.response?.data || error.message);
    return { entretiens: [], needsProfileCreation: false };
  }
};

export const getCandidatEntretiensCalendrier = async () => {
  try {
    console.log('=== API CALL: getCandidatEntretiensCalendrier ===');

    const response = await api.get('/candidat/entretiens-calendrier');

    // Gérer le cas où l'utilisateur n'a pas de profil candidat
    if (response.data.suggestion) {
      console.log('Info: Profil candidat non trouvé pour calendrier -', response.data.message || 'Aucun profil candidat');
      return {
        entretiens: [],
        needsProfileCreation: true,
        message: response.data.message || 'Aucun profil candidat trouvé',
        suggestion: response.data.suggestion || 'Créez votre profil candidat'
      };
    }

    console.log('API Response status:', response.status);
    console.log('API Response entretiens count:', response.data.entretiens?.length || 0);
    return {
      entretiens: response.data.entretiens || [],
      needsProfileCreation: false
    };
  } catch (error) {
    // Gestion silencieuse des erreurs liées au profil candidat manquant
    if (error.response?.status === 404 && error.response?.data?.message?.includes('candidat')) {
      console.log('Info: Aucun profil candidat trouvé pour le calendrier');
      return {
        entretiens: [],
        needsProfileCreation: true,
        message: 'Aucun profil candidat trouvé',
        suggestion: 'Créez votre profil candidat pour voir vos entretiens'
      };
    }
    console.log("Info: Aucun entretien disponible -", error.response?.data?.message || 'Erreur de connexion');
    return { entretiens: [], needsProfileCreation: false };
  }
};

// Nouvelles fonctions pour le système de gestion des entretiens

/**
 * Marque un entretien comme préparé par le candidat
 */
export const markEntretienAsPrepared = async (entretienId) => {
  try {
    const response = await api.post(`/candidat/entretiens/${entretienId}/prepare`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API markEntretienAsPrepared:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Ajoute un rappel/notification pour un entretien
 */
export const setEntretienReminder = async (entretienId, reminderData) => {
  try {
    const response = await api.post(`/candidat/entretiens/${entretienId}/reminder`, reminderData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API setEntretienReminder:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Obtient les conseils personnalisés pour un entretien spécifique
 */
export const getEntretienConseilsPersonnalises = async (entretienId) => {
  try {
    const response = await api.get(`/candidat/entretiens/${entretienId}/conseils`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getEntretienConseilsPersonnalises:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Envoie une demande de report d'entretien
 */
export const demandReportEntretien = async (entretienId, raison, nouvelleDate = null) => {
  try {
    const response = await api.post(`/candidat/entretiens/${entretienId}/demande-report`, {
      raison,
      nouvelle_date_souhaitee: nouvelleDate
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API demandReportEntretien:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Envoie une demande d'attestation par email
 * @param {object} data - Les données de la demande (contractId, message, etc.)
 * @returns {Promise<object>} La réponse du serveur
 */
export const sendAttestationRequest = async (data) => {
  try {
    const response = await api.post('/interim/request-attestation', data);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API sendAttestationRequest:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Confirme la présence à un entretien
 */
export const confirmPresenceEntretien = async (entretienId) => {
  try {
    const response = await api.post(`/candidat/entretiens/${entretienId}/confirmer-presence`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API confirmPresenceEntretien:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Obtient les statistiques d'entretiens du candidat
 */
export const getCandidatEntretiensStats = async () => {
  try {
    const response = await api.get('/candidat/entretiens/statistiques');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getCandidatEntretiensStats:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Exporte le calendrier des entretiens au format iCal
 */
export const exportEntretiensCalendar = async () => {
  try {
    const response = await api.get('/candidat/entretiens/export-calendar', {
      responseType: 'blob',
      headers: { 'Accept': 'text/calendar' },
    });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API exportEntretiensCalendar:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Envoie un feedback après un entretien
 */
export const envoyerFeedbackEntretien = async (entretienId, feedbackData) => {
  try {
    const response = await api.post(`/candidat/entretiens/${entretienId}/feedback`, feedbackData);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API envoyerFeedbackEntretien:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Test de connexion pour entretien vidéo
 */
export const testerConnexionEntretien = async (entretienId) => {
  try {
    const response = await api.post(`/candidat/entretiens/${entretienId}/test-connexion`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API testerConnexionEntretien:", error.response?.data || error.message);
    throw error;
  }
};

// ============================================
// FONCTIONS API POUR LES FAVORIS
// ============================================

/**
 * Obtient tous les favoris de l'utilisateur connecté
 */
export const getFavoris = async () => {
  try {
    const response = await api.get('/favoris');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getFavoris:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Vérifie si une offre est dans les favoris
 */
export const checkFavoriStatus = async (offreId) => {
  try {
    const response = await api.get(`/favoris/${offreId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API checkFavoriStatus:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Ajoute une offre aux favoris
 */
export const addToFavoris = async (offreId) => {
  try {
    const response = await api.post('/favoris', { offre_id: offreId });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API addToFavoris:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Supprime une offre des favoris
 */
export const removeFromFavoris = async (offreId) => {
  try {
    const response = await api.delete(`/favoris/${offreId}`);
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API removeFromFavoris:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Toggle favori - ajoute si pas en favoris, supprime si déjà en favoris
 */
export const toggleFavori = async (offreId) => {
  try {
    const response = await api.post('/favoris/toggle', { offre_id: offreId });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API toggleFavori:", error.response?.data || error.message);
    throw error;
  }
};

// ============================================
// FONCTIONS POUR LE PARTAGE D'OFFRES
// ============================================

/**
 * Partage une offre d'emploi via les options natives du système
 */
export const shareJobOffer = async (offreData) => {
  try {
    const { Share } = require('react-native');
    
    // Construire le message de partage
    const shareTitle = `Offre d'emploi: ${offreData.titre || 'Opportunité d\'emploi'}`;
    const shareMessage = `
🔥 Découvrez cette opportunité d'emploi !

${offreData.titre || 'Titre non disponible'}
${offreData.entreprise || 'Entreprise non spécifiée'}
${offreData.lieu || 'Lieu non spécifié'}
${offreData.type_contrat || 'Type de contrat non spécifié'}

${offreData.description ? offreData.description.substring(0, 150) + '...' : ''}

📱 Trouvé via l'app Pro-Recrute
`.trim();

    const result = await Share.share(
      {
        title: shareTitle,
        message: shareMessage,
        url: `prorecruteapp://job/${offreData.id}`, // Deep link vers l'offre
      },
      {
        dialogTitle: 'Partager cette offre d\'emploi',
        subject: shareTitle, // Pour les emails
      }
    );

    if (result.action === Share.sharedAction) {
      console.log('Offre partagée avec succès');
      return { success: true, message: 'Offre partagée avec succès' };
    } else if (result.action === Share.dismissedAction) {
      console.log('Partage annulé');
      return { success: false, message: 'Partage annulé' };
    }
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    throw error;
  }
};

/**
 * Partage une offre via des réseaux sociaux spécifiques (URL schemes)
 */
export const shareToSocialMedia = async (platform, offreData) => {
  try {
    const { Linking } = require('react-native');
    
    const shareText = `Découvrez cette offre d'emploi: ${offreData.titre} chez ${offreData.entreprise}`;
    const encodedText = encodeURIComponent(shareText);
    
    let url = '';
    
    switch (platform.toLowerCase()) {
      case 'whatsapp':
        url = `whatsapp://send?text=${encodedText}`;
        break;
      case 'telegram':
        url = `tg://msg?text=${encodedText}`;
        break;
      case 'facebook':
        url = `fb://facewebmodal/f?href=${encodeURIComponent('https://www.facebook.com/sharer.php?u=' + encodedText)}`;
        break;
      case 'twitter':
        url = `twitter://post?message=${encodedText}`;
        break;
      case 'linkedin':
        url = `linkedin://sharing?message=${encodedText}`;
        break;
      default:
        throw new Error(`Plateforme non supportée: ${platform}`);
    }
    
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return { success: true, message: `Partage sur ${platform} ouvert` };
    } else {
      throw new Error(`${platform} n'est pas installé sur cet appareil`);
    }
  } catch (error) {
    console.error(`Erreur lors du partage sur ${platform}:`, error);
    throw error;
  }
};

// Fonction pour vérifier l'anniversaire de l'utilisateur
export const checkBirthday = async () => {
  try {
    const response = await api.get('/interim/check-birthday');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la vérification d\'anniversaire:', error);
    return { success: false, is_birthday: false };
  }
};

// ============= MISSION PREFERENCES =============

// Récupérer les préférences de mission de l'utilisateur
export const getMissionPreferences = async () => {
  try {
    console.log('=== API CALL: getMissionPreferences START ===');
    const response = await api.get('/user/mission-preferences');
    console.log('=== API CALL: getMissionPreferences SUCCESS ===');
    console.log('Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('=== API CALL: getMissionPreferences ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error("Échec de l'appel API getMissionPreferences:", error.response?.data || error.message);
    throw error;
  }
};

// Mettre à jour les préférences de mission de l'utilisateur
export const updateMissionPreferences = async (preferences) => {
  try {
    console.log('=== API CALL: updateMissionPreferences START ===');
    console.log('Preferences data:', preferences);
    const response = await api.post('/user/mission-preferences', preferences);
    console.log('=== API CALL: updateMissionPreferences SUCCESS ===');
    console.log('Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('=== API CALL: updateMissionPreferences ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error("Échec de l'appel API updateMissionPreferences:", error.response?.data || error.message);
    throw error;
  }
};

// ============= ACCOUNT MANAGEMENT =============

export const deleteUserAccount = async () => {
  try {
    console.log('=== API CALL: deleteUserAccount START ===');
    const response = await api.delete('/user/account');
    console.log('=== API CALL: deleteUserAccount SUCCESS ===');
    console.log('Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('=== API CALL: deleteUserAccount ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error("Échec de l'appel API deleteUserAccount:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteUserApplication = async (applicationId) => {
  console.log('=== API CALL: deleteUserApplication START ===');
  console.log('Application ID:', applicationId);
  
  if (!applicationId) {
    throw new Error('Application ID is required');
  }
  
  try {
    const response = await api.delete(`/user/applications/${applicationId}`);
    console.log('✅ Candidature supprimée avec succès:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la candidature:', error.response?.data || error.message);
    throw error;
  }
};

// Envoyer un avertissement d'inactivité au backend
export const sendInactivityWarning = async (inactivityDays, warningDay) => {
  try {
    console.log('=== API CALL: sendInactivityWarning START ===');
    const response = await api.post('/user/inactivity-warning', {
      inactivity_days: inactivityDays,
      warning_day: warningDay,
      timestamp: Date.now()
    });
    console.log('=== API CALL: sendInactivityWarning SUCCESS ===');
    console.log('Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('=== API CALL: sendInactivityWarning ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error("Échec de l'appel API sendInactivityWarning:", error.response?.data || error.message);
    throw error;
  }
};

// Déclencher la suppression automatique d'un compte pour inactivité
export const autoDeleteInactiveAccount = async () => {
  try {
    console.log('=== API CALL: autoDeleteInactiveAccount START ===');
    const response = await api.delete('/user/account/auto-delete');
    console.log('=== API CALL: autoDeleteInactiveAccount SUCCESS ===');
    console.log('Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('=== API CALL: autoDeleteInactiveAccount ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error("Échec de l'appel API autoDeleteInactiveAccount:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir le statut d'inactivité de l'utilisateur actuel
export const getUserInactivityStatus = async () => {
  try {
    console.log('=== API CALL: getUserInactivityStatus START ===');
    const response = await api.get('/user/inactivity-status');
    console.log('=== API CALL: getUserInactivityStatus SUCCESS ===');
    console.log('Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('=== API CALL: getUserInactivityStatus ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error("Échec de l'appel API getUserInactivityStatus:", error.response?.data || error.message);
    throw error;
  }
};

// Enregistrer l'activité de l'utilisateur
export const recordUserActivity = async () => {
  try {
    console.log('=== API CALL: recordUserActivity START ===');
    const response = await api.post('/user/activity', {
      timestamp: Date.now(),
      activity_type: 'general'
    });
    console.log('=== API CALL: recordUserActivity SUCCESS ===');
    console.log('Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('=== API CALL: recordUserActivity ERROR ===');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error("Échec de l'appel API recordUserActivity:", error.response?.data || error.message);
    throw error;
  }
};

// Fonctions pour le reset de mot de passe
export const sendPasswordResetLink = async (email) => {
  try {
    console.log('Envoi du lien de réinitialisation pour:', email);
    const response = await api.post('/password/email', { email });
    console.log('Réponse sendPasswordResetLink:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur sendPasswordResetLink:', error.response?.data || error.message);
    throw error;
  }
};

export const resetPassword = async (email, password, passwordConfirmation, token) => {
  try {
    console.log('Réinitialisation du mot de passe pour:', email);
    const response = await api.post('/password/reset', {
      email,
      password,
      password_confirmation: passwordConfirmation,
      token
    });
    console.log('Réponse resetPassword:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur resetPassword:', error.response?.data || error.message);
    throw error;
  }
};

// Fonction utilitaire pour faire des requêtes API génériques
export const apiRequest = async (endpoint, options = {}) => {
  try {
    const { method = 'GET', body, headers } = options;
    
    const config = {
      method,
      url: endpoint,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = body;
    }

    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error(`Erreur API ${endpoint}:`, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// Note: Export des nouvelles APIs commenté pour éviter les cycles d'import
// Uncomment seulement si les modules n'importent pas api.js
// export * from './messaging-api';
// export * from './video-api';
// export * from './ai-api';
// export * from './skills-api';

export default api;
