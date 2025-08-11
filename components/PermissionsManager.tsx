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
    shouldPlaySound: true,
    shouldSetBadge: true,
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
      
      // Vérifier les permissions caméra - nous devrons utiliser le hook dans le composant parent
      const cameraStatus = { status: 'undetermined' };
      
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
      // Note: Cette fonction doit être implémentée avec le hook useCameraPermissions
      // dans le composant qui l'utilise
      console.log('Permission caméra - utiliser le hook useCameraPermissions dans le composant');
      return 'undetermined';
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
      // Marquer les permissions comme demandées dès le début pour éviter les boucles
      await setPermissionsRequested();
      
      // Demander les permissions de manière séquentielle pour éviter les superpositions
      const requestSequentially = async () => {
        // 1. Notifications - Permission critique pour l'app
        await new Promise<void>((resolve) => {
          Alert.alert(
            '🔔 Notifications',
            'Autorisez les notifications pour recevoir :\n• Alertes d\'entretien \n• Nouvelles opportunités d\'emploi\n• Mises à jour importantes',
            [
              {
                text: 'Plus tard',
                style: 'cancel',
                onPress: () => resolve(),
              },
              {
                text: 'Autoriser',
                onPress: async () => {
                  const status = await requestPermission('notifications');
                  if (status === 'denied') {
                    showPermissionAlert('aux notifications', 'recevoir les alertes d\'entretien et opportunités');
                  }
                  resolve();
                },
              },
            ]
          );
        });

        // Petite pause entre les demandes
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. Galerie/Médias - Pour les photos de profil et documents
        await new Promise<void>((resolve) => {
          Alert.alert(
            'Accès aux médias',
            'Autorisez l\'accès à votre galerie pour :\n• Télécharger votre photo de profil\n• Sauvegarder vos documents\n• Partager vos CV et certificats',
            [
              {
                text: 'Plus tard',
                style: 'cancel',
                onPress: () => resolve(),
              },
              {
                text: 'Autoriser',
                onPress: async () => {
                  const status = await requestPermission('mediaLibrary');
                  if (status === 'denied') {
                    showPermissionAlert('à la galerie', 'gérer vos photos et documents');
                  }
                  resolve();
                },
              },
            ]
          );
        });

        // Petite pause entre les demandes
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Localisation - Pour les offres d'emploi locales
        await new Promise<void>((resolve) => {
          Alert.alert(
            'Localisation',
            'Autorisez l\'accès à votre position pour :\n• Trouver des emplois près de chez vous\n• Calculer les distances\n• Offres adaptées à votre région',
            [
              {
                text: 'Plus tard',
                style: 'cancel',
                onPress: () => resolve(),
              },
              {
                text: 'Autoriser',
                onPress: async () => {
                  const status = await requestPermission('location');
                  if (status === 'denied') {
                    showPermissionAlert('à la localisation', 'trouver des emplois près de vous');
                  }
                  resolve();
                },
              },
            ]
          );
        });
      };

      await requestSequentially();
      
      // Vérifier le statut final de toutes les permissions
      await checkPermissions();

      // Informer l'utilisateur que la configuration est terminée
      Alert.alert(
        'Configuration terminée',
        'Vous pouvez modifier ces autorisations à tout moment dans les paramètres de l\'application.',
        [{ text: 'Compris', style: 'default' }]
      );

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