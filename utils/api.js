// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, TouchableOpacity, Text } from 'react-native';
import * as Device from 'expo-device';

// **IMPORTANT: Mettez à jour cette URL avec l'adresse IP et le port du  backend Laravel**
const API_URL = 'http://192.168.1.144:8000/api' || process.env.EXPO_PUBLIC_API_URL; // Fallback pour le développement

console.log('API_URL configuré:', API_URL); // Debug

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
      console.warn("API Interceptor: Jeton d'authentification expiré ou invalide (401).");
      await AsyncStorage.removeItem('user_token'); // Nettoie le token invalide localement
      // L'AuthProvider devrait gérer la redirection vers l'écran de connexion
    } else {
      // Loggue les autres erreurs API comme des erreurs (y compris les 500)
      console.error('Erreur API:', error.response?.status, error.response?.data || error.message);
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
    const response = await api.get('/user');
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
    const response = await api.get(`/interim/affiliated-structures?page=${page}&per_page=${perPage}`);
    return response.data; // 👈 PAS response.data.data
  } catch (error) {
    console.error("Échec de l'appel API getAffiliatedStructures:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Enregistre une nouvelle session active ou met à jour une session existante
 */
export const storeActiveSession = async (sessionData, deviceHeaders = {}) => {
  try {
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
    console.log('API Response getCandidatEntretiens:', response.data);
    return response.data.entretiens || [];
  } catch (error) {
    console.error("Échec de l'appel API getCandidatEntretiens:", error.response?.data || error.message);
    return []; // Retour tableau vide en cas d'erreur
  }
};

export const getCandidatEntretiensCalendrier = async () => {
  try {
    console.log('=== API CALL: getCandidatEntretiensCalendrier ===');
    
    // D'abord appeler la route de debug pour voir les infos utilisateur
    try {
      const debugResponse = await api.get('/debug/user-info');
      console.log('DEBUG USER INFO:', debugResponse.data);
    } catch (debugError) {
      console.error('Debug API error:', debugError.response?.data);
    }
    
    // Tester la nouvelle requête SQL corrigée
    try {
      const testSqlResponse = await api.get('/test/entretiens-sql');
      console.log('TEST SQL CORRECTED:', testSqlResponse.data);
    } catch (testError) {
      console.error('Test SQL error:', testError.response?.data);
    }
    
    const response = await api.get('/candidat/entretiens-calendrier');
    console.log('API Response status:', response.status);
    console.log('API Response data:', response.data);
    console.log('API Response entretiens:', response.data.entretiens);
    return response.data.entretiens || [];
  } catch (error) {
    console.error("=== API ERROR: getCandidatEntretiensCalendrier ===");
    console.error("Error:", error);
    console.error("Error response:", error.response?.data);
    console.error("Error status:", error.response?.status);
    // Retourner un tableau vide en cas d'erreur pour éviter de casser l'interface
    return [];
  }
};

export default api;
