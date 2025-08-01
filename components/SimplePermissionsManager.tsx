import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface SimplePermissionsContextType {
  notificationPermission: PermissionStatus;
  hasRequestedNotifications: boolean;
  requestNotificationPermission: () => Promise<PermissionStatus>;
  checkNotificationPermission: () => Promise<void>;
}

const SimplePermissionsContext = createContext<SimplePermissionsContextType | undefined>(undefined);

const STORAGE_KEY = 'notifications_requested';

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

interface SimplePermissionsProviderProps {
  children: ReactNode;
}

export const SimplePermissionsProvider = ({ children }: SimplePermissionsProviderProps) => {
  const [notificationPermission, setNotificationPermission] = useState<PermissionStatus>('undetermined');
  const [hasRequestedNotifications, setHasRequestedNotifications] = useState(false);

  useEffect(() => {
    checkRequestedStatus();
    checkNotificationPermission();
  }, []);

  const checkRequestedStatus = async () => {
    try {
      const requested = await AsyncStorage.getItem(STORAGE_KEY);
      setHasRequestedNotifications(requested === 'true');
    } catch (error) {
      console.error('Erreur lors de la vérification du statut des notifications:', error);
    }
  };

  const checkNotificationPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status as PermissionStatus);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions notifications:', error);
    }
  };

  const requestNotificationPermission = async (): Promise<PermissionStatus> => {
    try {
      // Marquer comme demandé dès le début
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setHasRequestedNotifications(true);

      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status as PermissionStatus);
      
      if (status === 'denied') {
        Alert.alert(
          'Permission notifications',
          'Vous pouvez activer les notifications dans les paramètres de votre appareil pour recevoir des alertes importantes.',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Ouvrir paramètres', onPress: () => Linking.openSettings() },
          ]
        );
      }
      
      return status as PermissionStatus;
    } catch (error) {
      console.error('Erreur demande permission notifications:', error);
      return 'denied';
    }
  };

  const contextValue: SimplePermissionsContextType = {
    notificationPermission,
    hasRequestedNotifications,
    requestNotificationPermission,
    checkNotificationPermission,
  };

  return (
    <SimplePermissionsContext.Provider value={contextValue}>
      {children}
    </SimplePermissionsContext.Provider>
  );
};

export const useSimplePermissions = () => {
  const context = useContext(SimplePermissionsContext);
  if (!context) {
    throw new Error('useSimplePermissions must be used within a SimplePermissionsProvider');
  }
  return context;
};

// Hook simple pour les notifications après authentification
export const useNotificationPermissions = () => {
  const { hasRequestedNotifications, requestNotificationPermission } = useSimplePermissions();
  
  const requestIfNeeded = async () => {
    if (!hasRequestedNotifications) {
      return await requestNotificationPermission();
    }
    return 'granted'; // ou le statut actuel
  };

  return { requestIfNeeded, hasRequestedNotifications };
};