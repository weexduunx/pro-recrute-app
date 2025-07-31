import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types pour les permissions
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PermissionState {
  notifications: PermissionStatus;
  camera: PermissionStatus;
  mediaLibrary: PermissionStatus;
  location: PermissionStatus;
}

interface PermissionsContextType {
  permissions: PermissionState;
  requestPermission: (type: keyof PermissionState) => Promise<PermissionStatus>;
  requestAllPermissions: () => Promise<void>;
  checkPermissions: () => Promise<void>;
  hasRequestedPermissions: boolean;
  setPermissionsRequested: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const STORAGE_KEY = 'permissions_requested';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

interface PermissionsProviderProps {
  children: ReactNode;
}

export const PermissionsProvider = ({ children }: PermissionsProviderProps) => {
  const [permissions, setPermissions] = useState<PermissionState>({
    notifications: 'undetermined',
    camera: 'undetermined',
    mediaLibrary: 'undetermined',
    location: 'undetermined',
  });
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);

  // Vérifier si les permissions ont déjà été demandées
  useEffect(() => {
    checkPermissionsRequestedStatus();
  }, []);

  const checkPermissionsRequestedStatus = async () => {
    try {
      const requested = await AsyncStorage.getItem(STORAGE_KEY);
      setHasRequestedPermissions(requested === 'true');
    } catch (error) {
      console.error('Erreur lors de la vérification du statut des permissions:', error);
    }
  };

  const setPermissionsRequested = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setHasRequestedPermissions(true);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du statut des permissions:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      // Vérifier les permissions notifications
      const notificationStatus = await Notifications.getPermissionsAsync();
      
      // Vérifier les permissions caméra
      const [cameraStatus] = await Camera.useCameraPermissions();
      
      // Vérifier les permissions média
      const mediaStatus = await MediaLibrary.getPermissionsAsync();
      
      // Vérifier les permissions localisation
      const locationStatus = await Location.getForegroundPermissionsAsync();

      setPermissions({
        notifications: notificationStatus.status as PermissionStatus,
        camera: cameraStatus?.status as PermissionStatus || 'undetermined',
        mediaLibrary: mediaStatus.status as PermissionStatus,
        location: locationStatus.status as PermissionStatus,
      });
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
    }
  };

  const requestNotificationPermission = async (): Promise<PermissionStatus> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status as PermissionStatus;
    } catch (error) {
      console.error('Erreur demande permission notifications:', error);
      return 'denied';
    }
  };

  const requestCameraPermission = async (): Promise<PermissionStatus> => {
    try {
      const permission = await Camera.useCameraPermissions();
      const status = permission?.[0]?.status ?? 'undetermined';
      return status as PermissionStatus;
    } catch (error) {
      console.error('Erreur demande permission caméra:', error);
      return 'denied';
    }
  };

  const requestMediaLibraryPermission = async (): Promise<PermissionStatus> => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status as PermissionStatus;
    } catch (error) {
      console.error('Erreur demande permission galerie:', error);
      return 'denied';
    }
  };

  const requestLocationPermission = async (): Promise<PermissionStatus> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status as PermissionStatus;
    } catch (error) {
      console.error('Erreur demande permission localisation:', error);
      return 'denied';
    }
  };

  const requestPermission = async (type: keyof PermissionState): Promise<PermissionStatus> => {
    let status: PermissionStatus = 'denied';

    switch (type) {
      case 'notifications':
        status = await requestNotificationPermission();
        break;
      case 'camera':
        status = await requestCameraPermission();
        break;
      case 'mediaLibrary':
        status = await requestMediaLibraryPermission();
        break;
      case 'location':
        status = await requestLocationPermission();
        break;
    }

    setPermissions(prev => ({
      ...prev,
      [type]: status
    }));

    return status;
  };

  const showPermissionAlert = (permissionName: string, reason: string) => {
    Alert.alert(
      'Permission nécessaire',
      `Cette application a besoin d'accéder à ${permissionName} pour ${reason}. Vous pouvez activer cette permission dans les paramètres de votre appareil.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Ouvrir les paramètres',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  };

  const requestAllPermissions = async () => {
    try {
      // Demander les permissions une par une avec des explications
      
      // 1. Notifications
      Alert.alert(
        'Notifications',
        'Nous aimerions vous envoyer des notifications pour vous tenir informé des nouvelles opportunités et mises à jour importantes.',
        [
          {
            text: 'Plus tard',
            style: 'cancel',
          },
          {
            text: 'Autoriser',
            onPress: async () => {
              const status = await requestPermission('notifications');
              if (status === 'denied') {
                showPermissionAlert('aux notifications', 'vous tenir informé des opportunités');
              }
            },
          },
        ]
      );

      // Petite pause entre les demandes
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Caméra
      Alert.alert(
        'Appareil photo',
        'L\'accès à l\'appareil photo est nécessaire pour prendre des photos de profil et scanner des documents.',
        [
          {
            text: 'Plus tard',
            style: 'cancel',
          },
          {
            text: 'Autoriser',
            onPress: async () => {
              const status = await requestPermission('camera');
              if (status === 'denied') {
                showPermissionAlert('à l\'appareil photo', 'prendre des photos');
              }
            },
          },
        ]
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Galerie
      Alert.alert(
        'Galerie photo',
        'L\'accès à la galerie photo permet de sélectionner des images existantes pour votre profil ou vos documents.',
        [
          {
            text: 'Plus tard',
            style: 'cancel',
          },
          {
            text: 'Autoriser',
            onPress: async () => {
              const status = await requestPermission('mediaLibrary');
              if (status === 'denied') {
                showPermissionAlert('à la galerie', 'sélectionner des photos');
              }
            },
          },
        ]
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Localisation (optionnelle)
      Alert.alert(
        'Localisation',
        'L\'accès à votre localisation nous aide à vous proposer des offres d\'emploi près de chez vous.',
        [
          {
            text: 'Plus tard',
            style: 'cancel',
          },
          {
            text: 'Autoriser',
            onPress: async () => {
              const status = await requestPermission('location');
              if (status === 'denied') {
                showPermissionAlert('à la localisation', 'proposer des offres locales');
              }
            },
          },
        ]
      );

      // Marquer les permissions comme demandées
      await setPermissionsRequested();
      
      // Vérifier le statut final de toutes les permissions
      await checkPermissions();

    } catch (error) {
      console.error('Erreur lors de la demande des permissions:', error);
      await setPermissionsRequested(); // Marquer comme demandées même en cas d'erreur
    }
  };

  const contextValue: PermissionsContextType = {
    permissions,
    requestPermission,
    requestAllPermissions,
    checkPermissions,
    hasRequestedPermissions,
    setPermissionsRequested,
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

// Hook utilitaire pour vérifier une permission spécifique
export const usePermissionCheck = (permissionType: keyof PermissionState) => {
  const { permissions, requestPermission } = usePermissions();
  
  const checkAndRequest = async (): Promise<boolean> => {
    if (permissions[permissionType] === 'granted') {
      return true;
    }
    
    const status = await requestPermission(permissionType);
    return status === 'granted';
  };

  return {
    isGranted: permissions[permissionType] === 'granted',
    isDenied: permissions[permissionType] === 'denied',
    checkAndRequest,
  };
};