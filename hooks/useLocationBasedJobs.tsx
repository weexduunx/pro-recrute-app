import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocationBasedOffres, saveUserLocation } from '../utils/api';

interface LocationBasedJobsState {
  offers: any[];
  loading: boolean;
  error: string | null;
  location: {
    latitude: number | null;
    longitude: number | null;
    address: string | null;
  };
  permissionStatus: 'granted' | 'denied' | 'undetermined';
}

const LOCATION_STORAGE_KEY = '@user_location_preferences';
const LOCATION_CACHE_KEY = '@cached_location_offers';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useLocationBasedJobs = () => {
  const [state, setState] = useState<LocationBasedJobsState>({
    offers: [],
    loading: false,
    error: null,
    location: {
      latitude: null,
      longitude: null,
      address: null,
    },
    permissionStatus: 'undetermined',
  });

  // Vérifier les préférences de localisation stockées
  const checkLocationPreferences = async () => {
    try {
      const prefs = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (prefs) {
        const parsedPrefs = JSON.parse(prefs);
        return parsedPrefs.enabled === true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification des préférences de localisation:', error);
      return false;
    }
  };

  // Sauvegarder les préférences de localisation
  const saveLocationPreferences = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
        enabled,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences de localisation:', error);
    }
  };

  // Récupérer la position actuelle de l'utilisateur
  const getCurrentLocation = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Vérifier les permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      setState(prev => ({ ...prev, permissionStatus: status as any }));

      if (status !== 'granted') {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Permission de localisation refusée',
        }));
        return false;
      }

      // Récupérer la position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocoding pour obtenir l'adresse
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      let address = null;
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        address = `${addr.city || addr.subregion || 'Ville inconnue'}, ${addr.country || 'Pays inconnu'}`;
      }

      setState(prev => ({
        ...prev,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address,
        },
      }));

      // Sauvegarder la localisation côté serveur (optionnel)
      try {
        await saveUserLocation(location.coords.latitude, location.coords.longitude, address);
      } catch (error) {
        console.log('Impossible de sauvegarder la localisation côté serveur:', error);
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la récupération de la localisation:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Impossible de récupérer votre position',
      }));
      return false;
    }
  };

  // Récupérer les offres basées sur la localisation
  const fetchLocationBasedOffers = async (radius: number = 50) => {
    const { latitude, longitude } = state.location;

    if (!latitude || !longitude) {
      setState(prev => ({
        ...prev,
        error: 'Position non disponible',
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Vérifier le cache
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Si le cache est encore valide (moins de 30 minutes)
        if (now - timestamp < CACHE_DURATION) {
          setState(prev => ({
            ...prev,
            offers: data,
            loading: false,
          }));
          return;
        }
      }

      // Récupérer les nouvelles offres
      const response = await getLocationBasedOffres(latitude, longitude, radius);
      const offers = response.offres || response.data || [];

      setState(prev => ({
        ...prev,
        offers,
        loading: false,
      }));

      // Mettre en cache
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
        data: offers,
        timestamp: Date.now(),
        location: { latitude, longitude },
      }));

    } catch (error) {
      console.error('Erreur lors de la récupération des offres géolocalisées:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Impossible de récupérer les offres près de vous',
      }));
    }
  };

  // Activer les suggestions basées sur la localisation
  const enableLocationBasedSuggestions = async (radius: number = 50) => {
    const locationSuccess = await getCurrentLocation();
    if (locationSuccess) {
      await saveLocationPreferences(true);
      await fetchLocationBasedOffers(radius);
    }
  };

  // Désactiver les suggestions basées sur la localisation
  const disableLocationBasedSuggestions = async () => {
    await saveLocationPreferences(false);
    setState(prev => ({
      ...prev,
      offers: [],
      location: {
        latitude: null,
        longitude: null,
        address: null,
      },
    }));
    
    // Supprimer le cache
    await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
  };

  // Rafraîchir les offres
  const refreshOffers = async (radius: number = 50) => {
    if (state.location.latitude && state.location.longitude) {
      // Supprimer le cache pour forcer le rafraîchissement
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
      await fetchLocationBasedOffers(radius);
    }
  };

  // Initialiser au montage du hook
  useEffect(() => {
    const initializeLocationBasedJobs = async () => {
      const preferencesEnabled = await checkLocationPreferences();
      if (preferencesEnabled) {
        const locationSuccess = await getCurrentLocation();
        if (locationSuccess) {
          await fetchLocationBasedOffers();
        }
      }
    };

    initializeLocationBasedJobs();
  }, []);

  return {
    ...state,
    enableLocationBasedSuggestions,
    disableLocationBasedSuggestions,
    refreshOffers,
    getCurrentLocation,
    checkLocationPreferences,
  };
};