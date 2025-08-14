import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthProvider';
import {
  checkNetworkStatus,
  getCacheSize,
  getLastSyncTime,
  getSyncQueue
} from '../utils/offline-storage';
import { syncManager } from '../utils/sync-manager';

export default function OfflineIndicator() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  // États
  const [isOnline, setIsOnline] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    queueSize: 0,
    lastSyncTime: null,
    cacheSize: { mb: '0.00' }
  });

  // Écouter les changements de réseau
  useEffect(() => {
    const checkConnectivity = async () => {
      const connected = await checkNetworkStatus();
      setIsOnline(connected);
    };

    // Vérification initiale
    checkConnectivity();

    // Écouter les événements réseau
    const networkListener = Network.addNetworkStateListener((state) => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsOnline(connected);
    });

    return () => {
      networkListener?.remove();
    };
  }, []);

  // Écouter les événements de synchronisation
  useEffect(() => {
    const handleSyncEvent = (event, data) => {
      switch (event) {
        case 'sync_started':
          setSyncStatus(prev => ({ ...prev, isSyncing: true }));
          break;
        case 'sync_completed':
        case 'sync_failed':
          setSyncStatus(prev => ({ ...prev, isSyncing: false }));
          loadSyncStats();
          break;
      }
    };

    syncManager.addSyncListener(handleSyncEvent);
    loadSyncStats();

    return () => {
      syncManager.removeSyncListener(handleSyncEvent);
    };
  }, []);

  // Charger les statistiques de synchronisation
  const loadSyncStats = async () => {
    try {
      const [stats, cacheSize, lastSync, queue] = await Promise.all([
        syncManager.getSyncStats(),
        getCacheSize(),
        getLastSyncTime(),
        getSyncQueue()
      ]);

      setSyncStatus({
        isSyncing: stats.isSyncing,
        queueSize: queue.length,
        lastSyncTime: lastSync,
        cacheSize
      });
    } catch (error) {
      console.error('Erreur chargement stats sync:', error);
    }
  };

  // Forcer la synchronisation
  const handleForceSync = async () => {
    if (!user || syncStatus.isSyncing) return;

    try {
      await syncManager.startFullSync(user.id);
    } catch (error) {
      console.error('Erreur force sync:', error);
    }
  };

  // Formater le temps de dernière sync
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Jamais';
    
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `Il y a ${days}j`;
    if (hours > 0) return `Il y a ${hours}h`;
    if (minutes > 0) return `Il y a ${minutes}min`;
    return 'À l\'instant';
  };

  // Obtenir la couleur de statut
  const getStatusColor = () => {
    if (!isOnline) return colors.error;
    if (syncStatus.isSyncing) return colors.warning || '#F59E0B';
    if (syncStatus.queueSize > 0) return colors.secondary;
    return colors.success || '#10B981';
  };

  // Obtenir l'icône de statut
  const getStatusIcon = () => {
    if (!isOnline) return 'wifi-outline';
    if (syncStatus.isSyncing) return 'sync';
    if (syncStatus.queueSize > 0) return 'cloud-upload-outline';
    return 'checkmark-circle';
  };

  // Obtenir le texte de statut
  const getStatusText = () => {
    if (!isOnline) return 'Hors ligne';
    if (syncStatus.isSyncing) return 'Synchronisation...';
    if (syncStatus.queueSize > 0) return `${syncStatus.queueSize} en attente`;
    return 'Synchronisé';
  };

  const renderDetailsModal = () => (
    <Modal
      visible={showDetails}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetails(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>
              État de synchronisation
            </Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Statut réseau */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Ionicons
                  name={isOnline ? 'wifi' : 'wifi-outline'}
                  size={20}
                  color={isOnline ? colors.success || '#10B981' : colors.error}
                />
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  Connexion
                </Text>
                <Text style={[styles.detailValue, { 
                  color: isOnline ? colors.success || '#10B981' : colors.error 
                }]}>
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </Text>
              </View>
            </View>

            {/* Statut de synchronisation */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Ionicons
                  name={getStatusIcon()}
                  size={20}
                  color={getStatusColor()}
                />
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  Synchronisation
                </Text>
                <Text style={[styles.detailValue, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  Dernière sync
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                  {formatLastSync(syncStatus.lastSyncTime)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  En attente
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                  {syncStatus.queueSize} actions
                </Text>
              </View>
            </View>

            {/* Cache */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Ionicons name="archive-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  Cache local
                </Text>
                <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                  {syncStatus.cacheSize.mb} MB
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { 
                    backgroundColor: colors.secondary,
                    opacity: (!isOnline || syncStatus.isSyncing) ? 0.5 : 1
                  }
                ]}
                onPress={handleForceSync}
                disabled={!isOnline || syncStatus.isSyncing}
              >
                {syncStatus.isSyncing ? (
                  <ActivityIndicator size="small" color={colors.textTertiary} />
                ) : (
                  <Ionicons name="sync" size={20} color={colors.textTertiary} />
                )}
                <Text style={[styles.actionButtonText, { color: colors.textTertiary }]}>
                  {syncStatus.isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Ne pas afficher si tout va bien
  if (isOnline && !syncStatus.isSyncing && syncStatus.queueSize === 0) {
    return null;
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.indicator, { backgroundColor: getStatusColor() + '20' }]}
        onPress={() => setShowDetails(true)}
      >
        <Ionicons
          name={getStatusIcon()}
          size={16}
          color={getStatusColor()}
        />
        <Text style={[styles.indicatorText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {syncStatus.isSyncing && (
          <ActivityIndicator size="small" color={getStatusColor()} />
        )}
      </TouchableOpacity>

      {renderDetailsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 8,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  
  // Sections de détails
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Actions
  actionsSection: {
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});