// utils/geolocation-api.js
import api from './api';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * API pour la géolocalisation et structures de soins
 */

// Rechercher des structures
export const searchStructures = async (params = {}) => {
  try {
    const response = await api.get('/interim/structures/search', { params });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API searchStructures:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir les détails d'une structure
export const getStructureDetails = async (id, params = {}) => {
  try {
    const response = await api.get(`/interim/structures/${id}/details`, { params });
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getStructureDetails:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir les spécialités disponibles
export const getSpecialties = async () => {
  try {
    const response = await api.get('/interim/structures/specialties');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getSpecialties:", error.response?.data || error.message);
    throw error;
  }
};

// Obtenir les types de structures
export const getStructureTypes = async () => {
  try {
    const response = await api.get('/interim/structures/types');
    return response.data;
  } catch (error) {
    console.error("Échec de l'appel API getStructureTypes:", error.response?.data || error.message);
    throw error;
  }
};

// Helper pour obtenir la position actuelle
export const getCurrentLocation = async () => {
  try {
    // Vérifier les permissions
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission de géolocalisation refusée');
    }

    // Obtenir la position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 15000,
      maximumAge: 300000 // Cache de 5 minutes
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy
    };
  } catch (error) {
    console.error('Erreur géolocalisation:', error);
    throw error;
  }
};

// Helper pour obtenir l'adresse à partir des coordonnées
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude, longitude });
    
    if (result.length > 0) {
      const address = result[0];
      const formattedAddress = [
        address.name,
        address.street,
        address.city,
        address.region,
        address.country
      ].filter(Boolean).join(', ');
      
      return {
        formattedAddress,
        city: address.city,
        region: address.region,
        country: address.country,
        postalCode: address.postalCode
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erreur reverse geocoding:', error);
    return null;
  }
};

// Helper pour calculer la distance entre deux points
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance en km
};

// Helper pour formater la distance
export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)} km`;
  } else {
    return `${Math.round(distance)} km`;
  }
};

// Helper pour ouvrir les directions dans Maps
export const openDirections = (fromLat, fromLon, toLat, toLon, label = 'Destination') => {
  const url = Platform.select({
    ios: `maps://app?daddr=${toLat},${toLon}&saddr=${fromLat},${fromLon}`,
    android: `google.navigation:q=${toLat},${toLon}&mode=d`,
    default: `https://maps.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`
  });

  return url;
};

// Helper pour ouvrir une structure dans Maps
export const openStructureInMaps = (structure, userLocation = null) => {
  let url;
  
  if (structure.latitude && structure.longitude) {
    if (userLocation) {
      // Avec itinéraire depuis la position utilisateur
      url = Platform.select({
        ios: `maps://app?daddr=${structure.latitude},${structure.longitude}&saddr=${userLocation.latitude},${userLocation.longitude}`,
        android: `google.navigation:q=${structure.latitude},${structure.longitude}&mode=d`,
        default: `https://maps.google.com/maps/dir/${userLocation.latitude},${userLocation.longitude}/${structure.latitude},${structure.longitude}`
      });
    } else {
      // Juste la destination
      url = Platform.select({
        ios: `maps://app?q=${structure.latitude},${structure.longitude}`,
        android: `geo:${structure.latitude},${structure.longitude}?q=${structure.latitude},${structure.longitude}(${encodeURIComponent(structure.name)})`,
        default: `https://maps.google.com/maps?q=${structure.latitude},${structure.longitude}`
      });
    }
  } else {
    // Fallback sur l'adresse
    const query = encodeURIComponent(`${structure.name}, ${structure.adresse}`);
    url = Platform.select({
      ios: `maps://app?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://maps.google.com/maps?q=${query}`
    });
  }

  return url;
};

// Types prédéfinis de structures pour l'interface
export const STRUCTURE_TYPES = [
  { label: 'Tous types', value: null },
  { label: 'Hôpital ou Clinique', value: 1 },
  { label: 'Opticien', value: 3 },
  { label: 'Pharmacie', value: 2 },
  { label: 'Laboratoire', value: 'laboratoire' },
  { label: 'Cabinet médical', value: 'cabinet' },
  { label: 'Centre spécialisé', value: 'centre_specialise' }
];

// Spécialités médicales courantes
export const COMMON_SPECIALTIES = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Gynécologie',
  'Pédiatrie',
  'Ophtalmologie',
  'ORL',
  'Orthopédie',
  'Radiologie',
  'Dentaire',
  'Kinésithérapie',
  'Psychiatrie',
  'Neurologie',
  'Urologie'
];

// Rayons de recherche prédéfinis
export const SEARCH_RADIUS_OPTIONS = [
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 }
];