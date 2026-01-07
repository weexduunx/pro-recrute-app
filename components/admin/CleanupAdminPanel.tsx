// components/admin/CleanupAdminPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../LanguageContext';
import { useCleanupStats, useManualCleanup } from '../../services/CleanupServiceManager';
import AutoCleanupService from '../../utils/auto-cleanup-service';

interface CleanupAdminPanelProps {
  onClose?: () => void;
}

export default function CleanupAdminPanel({ onClose }: CleanupAdminPanelProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const cleanupStats = useCleanupStats();
  const { runManualCleanup, isRunning } = useManualCleanup();

  const [refreshing, setRefreshing] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('Jamais');
    try {
      return new Date(dateString).toLocaleString('fr-FR');
    } catch {
      return t('Date invalide');
    }
  };

  // Tester la connectivité du service
  const testService = async () => {
    setLoading(true);
    try {
      const result = await AutoCleanupService.testCleanupService();
      setTestResults(result);
      
      Alert.alert(
        result.success ? t('Test réussi') : t('Test échoué'),
        result.success 
          ? t('Le service de nettoyage fonctionne correctement.')
          : t(`Erreur: ${result.error}`)
      );
    } catch (error: any) {
      Alert.alert(t('Erreur'), t('Impossible de tester le service.'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir les données
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await testService();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Obtenir la couleur du statut
  const getStatusColor = () => {
    if (testResults?.success) return colors.success || '#10B981';
    if (testResults?.success === false) return colors.error;
    return colors.textSecondary;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('Panneau d\'Administration - Nettoyage')}
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        {/* Statistiques */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('Statistiques de Nettoyage')}
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.secondary }]}>
                {cleanupStats.totalProcessed || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('Comptes traités')}
              </Text>
            </View>
            
            <View style={[styles.statItem, { borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.error }]}>
                {cleanupStats.totalDeleted || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('Comptes supprimés')}
              </Text>
            </View>
            
            <View style={[styles.statItem, { borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.warning || '#F59E0B' }]}>
                {cleanupStats.errors || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('Erreurs')}
              </Text>
            </View>
          </View>

          <View style={styles.lastRunInfo}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.lastRunText, { color: colors.textSecondary }]}>
              {t('Dernière exécution')}: {formatDate(cleanupStats.lastRun)}
            </Text>
          </View>
        </View>

        {/* Configuration */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('Configuration')}
          </Text>
          
          <View style={styles.configItem}>
            <Text style={[styles.configLabel, { color: colors.textPrimary }]}>
              {t('Seuil d\'inactivité')}
            </Text>
            <Text style={[styles.configValue, { color: colors.textSecondary }]}>
              {AutoCleanupService.INACTIVITY_THRESHOLD_DAYS} {t('jours')}
            </Text>
          </View>

          <View style={styles.configItem}>
            <Text style={[styles.configLabel, { color: colors.textPrimary }]}>
              {t('Rôles ciblés')}
            </Text>
            <Text style={[styles.configValue, { color: colors.textSecondary }]}>
              {AutoCleanupService.TARGET_ROLES.join(', ')}
            </Text>
          </View>

          <View style={styles.configItem}>
            <Text style={[styles.configLabel, { color: colors.textPrimary }]}>
              {t('Taille des lots')}
            </Text>
            <Text style={[styles.configValue, { color: colors.textSecondary }]}>
              {AutoCleanupService.BATCH_SIZE} {t('comptes')}
            </Text>
          </View>
        </View>

        {/* Statut du service */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('Statut du Service')}
          </Text>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor() }
            ]} />
            <Text style={[styles.statusText, { color: colors.textPrimary }]}>
              {testResults?.success === true ? t('Service opérationnel') :
               testResults?.success === false ? t('Service hors ligne') :
               t('Statut inconnu')}
            </Text>
          </View>

          {testResults && !testResults.success && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {t('Erreur')}: {testResults.error}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('Actions')}
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={testService}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
            )}
            <Text style={styles.actionButtonText}>
              {loading ? t('Test en cours...') : t('Tester le Service')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.dangerButton,
              { backgroundColor: colors.error }
            ]}
            onPress={runManualCleanup}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
            )}
            <Text style={styles.actionButtonText}>
              {isRunning ? t('Nettoyage en cours...') : t('Lancer le Nettoyage Manuel')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avertissement */}
        <View style={[styles.warningSection, { borderColor: colors.warning || '#F59E0B' }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={20} color={colors.warning || '#F59E0B'} />
            <Text style={[styles.warningTitle, { color: colors.warning || '#F59E0B' }]}>
              {t('Avertissement')}
            </Text>
          </View>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            {t('Le nettoyage automatique supprime définitivement les comptes candidats inactifs depuis plus de 90 jours. Cette action est irréversible.')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  lastRunInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lastRunText: {
    fontSize: 14,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  configValue: {
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  dangerButton: {
    // Styles spécifiques au bouton dangereux
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  warningSection: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFFBEB',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    lineHeight: 16,
  },
});