import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { usePermissions, usePermissionCheck, PermissionState } from './PermissionsManager';

interface PermissionRequestButtonProps {
  permissionType: keyof PermissionState;
  title: string;
  description: string;
  onGranted?: () => void;
  onDenied?: () => void;
  style?: any;
  textStyle?: any;
}

export const PermissionRequestButton: React.FC<PermissionRequestButtonProps> = ({
  permissionType,
  title,
  description,
  onGranted,
  onDenied,
  style,
  textStyle
}) => {
  const { isGranted, checkAndRequest } = usePermissionCheck(permissionType);

  const handlePress = async () => {
    if (isGranted) {
      onGranted?.();
      return;
    }

    const granted = await checkAndRequest();
    if (granted) {
      onGranted?.();
    } else {
      onDenied?.();
      Alert.alert(
        'Permission refusée',
        `${description} Vous pouvez l'activer dans les paramètres de votre appareil.`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handlePress}
    >
      <Text style={[styles.buttonText, textStyle]}>
        {isGranted ? title : `Autoriser ${title.toLowerCase()}`}
      </Text>
    </TouchableOpacity>
  );
};

// Composant pour l'écran de paramètres des permissions
export const PermissionsSettingsScreen: React.FC = () => {
  const { permissions, requestPermission, requestAllPermissions } = usePermissions();

  const getPermissionStatusText = (status: string) => {
    switch (status) {
      case 'granted':
        return '✅ Autorisée';
      case 'denied':
        return '❌ Refusée';
      default:
        return '⏳ Non demandée';
    }
  };

  const getPermissionColor = (status: string) => {
    switch (status) {
      case 'granted':
        return '#4CAF50';
      case 'denied':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  return (
    <div style={styles.container}>
      <Text style={styles.title}>Permissions de l'application</Text>
      
      <div style={styles.permissionsList}>
        <div style={styles.permissionItem}>
          <Text style={styles.permissionName}>📱 Notifications</Text>
          <Text style={[styles.permissionStatus, { color: getPermissionColor(permissions.notifications) }]}>
            {getPermissionStatusText(permissions.notifications)}
          </Text>
          <TouchableOpacity 
            style={styles.requestButton}
            onPress={() => requestPermission('notifications')}
          >
            <Text style={styles.requestButtonText}>Demander</Text>
          </TouchableOpacity>
        </div>

        <div style={styles.permissionItem}>
          <Text style={styles.permissionName}>📷 Appareil photo</Text>
          <Text style={[styles.permissionStatus, { color: getPermissionColor(permissions.camera) }]}>
            {getPermissionStatusText(permissions.camera)}
          </Text>
          <TouchableOpacity 
            style={styles.requestButton}
            onPress={() => requestPermission('camera')}
          >
            <Text style={styles.requestButtonText}>Demander</Text>
          </TouchableOpacity>
        </div>

        <div style={styles.permissionItem}>
          <Text style={styles.permissionName}>🖼️ Galerie photo</Text>
          <Text style={[styles.permissionStatus, { color: getPermissionColor(permissions.mediaLibrary) }]}>
            {getPermissionStatusText(permissions.mediaLibrary)}
          </Text>
          <TouchableOpacity 
            style={styles.requestButton}
            onPress={() => requestPermission('mediaLibrary')}
          >
            <Text style={styles.requestButtonText}>Demander</Text>
          </TouchableOpacity>
        </div>

        <div style={styles.permissionItem}>
          <Text style={styles.permissionName}>📍 Localisation</Text>
          <Text style={[styles.permissionStatus, { color: getPermissionColor(permissions.location) }]}>
            {getPermissionStatusText(permissions.location)}
          </Text>
          <TouchableOpacity 
            style={styles.requestButton}
            onPress={() => requestPermission('location')}
          >
            <Text style={styles.requestButtonText}>Demander</Text>
          </TouchableOpacity>
        </div>
      </div>

      <TouchableOpacity 
        style={styles.requestAllButton}
        onPress={requestAllPermissions}
      >
        <Text style={styles.requestAllButtonText}>Demander toutes les permissions</Text>
      </TouchableOpacity>
    </div>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionsList: {
    marginBottom: 30,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  requestButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  requestButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  requestAllButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestAllButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});