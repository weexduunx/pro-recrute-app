import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import {
  generateAnalyticsReport,
  downloadReport,
  getReportsHistory,
  formatDate,
  REPORT_TYPES
} from '../../../utils/analytics-api';
import CustomHeader from '../../../components/CustomHeader';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  // États principaux
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(null);
  
  // Données
  const [reportsHistory, setReportsHistory] = useState([]);
  
  // Modal de génération
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reportParams, setReportParams] = useState({
    year: new Date().getFullYear(),
    month: null,
    include_charts: true,
    include_details: true
  });

  useEffect(() => {
    loadReportsHistory();
  }, []);

  const loadReportsHistory = async () => {
    try {
      setLoading(true);
      console.log('Chargement historique rapports...');
      const response = await getReportsHistory();
      
      console.log('Réponse getReportsHistory:', response);
      
      if (response.success) {
        const reports = response.data.reports || [];
        console.log('Rapports trouvés:', reports.length, reports);
        setReportsHistory(reports);
      } else {
        console.log('Erreur dans la réponse:', response);
        Alert.alert('Information', 'Aucun rapport disponible pour le moment.');
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique des rapports. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReportsHistory();
    setRefreshing(false);
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedReportType) return;

    try {
      setGeneratingReport(true);
      console.log('Génération rapport type:', selectedReportType.id, 'params:', reportParams);
      
      const response = await generateAnalyticsReport(selectedReportType.id, reportParams);
      console.log('Réponse génération rapport:', response);
      
      if (response.success) {
        Alert.alert(
          '✅ Rapport généré',
          'Votre rapport a été généré avec succès et est maintenant disponible dans l\'historique.',
          [
            { text: 'Parfait !', onPress: () => {
              setShowGenerateModal(false);
              setSelectedReportType(null);
              console.log('Rechargement historique après génération...');
              loadReportsHistory();
            }}
          ]
        );
      } else {
        console.log('Erreur dans la génération:', response);
        Alert.alert('⚠️ Erreur', response.message || 'Impossible de générer le rapport. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      Alert.alert('⚠️ Erreur', 'Impossible de générer le rapport. Vérifiez votre connexion et réessayez.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      setDownloadingReport(report.id);
      
      console.log('Début téléchargement rapport:', report.id);
      
      // Télécharger le blob depuis l'API
      const blob = await downloadReport(report.id);
      
      console.log('Blob reçu:', blob?.size, 'bytes, type:', blob?.type);
      
      // Vérifier que le blob est valide
      if (!blob || blob.size === 0) {
        throw new Error('Fichier vide ou corrompu reçu du serveur');
      }
      
      // Déterminer l'extension selon le type de contenu
      let extension = '.pdf';
      let mimeType = 'application/pdf';
      
      if (blob.type.includes('text/plain')) {
        extension = '.txt';
        mimeType = 'text/plain';
      }
      
      // Créer un fichier temporaire
      const filename = `${report.title.replace(/[^a-zA-Z0-9\s]/g, '_')}${extension}`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      console.log('Création fichier:', filename, 'Type MIME:', mimeType);
      
      // Convertir le blob en base64 et l'écrire
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result;
          if (!result || typeof result !== 'string') {
            throw new Error('Erreur lors de la lecture du fichier');
          }
          
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          
          if (!base64) {
            throw new Error('Impossible de convertir le fichier en base64');
          }
          
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          console.log('Fichier écrit à:', fileUri);
          
          // Vérifier que le fichier a bien été créé
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          console.log('Info fichier créé:', fileInfo);
          
          if (!fileInfo.exists || fileInfo.size === 0) {
            throw new Error('Le fichier n\'a pas pu être sauvegardé correctement');
          }
          
          // Partager le fichier
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: mimeType,
              dialogTitle: 'Ouvrir le rapport'
            });
            Alert.alert('✅ Succès', 'Rapport téléchargé et ouvert avec succès !');
          } else {
            Alert.alert('✅ Succès', `Rapport sauvegardé dans ${fileUri}`);
          }
        } catch (innerError) {
          console.error('Erreur traitement fichier:', innerError);
          throw innerError;
        }
      };
      
      reader.onerror = (error) => {
        console.error('Erreur FileReader:', error);
        throw new Error('Erreur lors de la lecture du blob');
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Erreur téléchargement détaillée:', error);
      let errorMessage = 'Impossible de télécharger le rapport.';
      
      if (error.message.includes('Network Error')) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Rapport introuvable sur le serveur.';
      } else if (error.message.includes('vide') || error.message.includes('corrompu')) {
        errorMessage = 'Le fichier reçu est vide ou corrompu. Vérifiez la génération côté serveur.';
      } else if (error.message.includes('base64') || error.message.includes('lecture')) {
        errorMessage = 'Problème de format du fichier. Essayez de regénérer le rapport.';
      }
      
      Alert.alert('⚠️ Erreur de téléchargement', errorMessage + '\n\nDétails: ' + error.message);
    } finally {
      setDownloadingReport(null);
    }
  };

  const renderReportTypeCard = (reportType) => (
    <TouchableOpacity
      key={reportType.id}
      style={[
        styles.reportTypeCard,
        {
          backgroundColor: colors.background,
          borderColor: selectedReportType?.id === reportType.id ? colors.secondary : colors.border
        }
      ]}
      onPress={() => setSelectedReportType(reportType)}
    >
      <View style={styles.reportTypeHeader}>
        <View style={[styles.reportTypeIcon, { backgroundColor: colors.secondary + '20' }]}>
          <Ionicons name={reportType.icon} size={24} color={colors.secondary} />
        </View>
        {selectedReportType?.id === reportType.id && (
          <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
        )}
      </View>
      
      <Text style={[styles.reportTypeTitle, { color: colors.primary }]}>
        {reportType.label}
      </Text>
      
      <Text style={[styles.reportTypeDescription, { color: colors.textSecondary }]}>
        {reportType.description}
      </Text>
    </TouchableOpacity>
  );

  const renderGenerateModal = () => (
    <Modal
      visible={showGenerateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowGenerateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>
              Générer un rapport
            </Text>
            <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Sélection du type de rapport */}
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              Type de rapport
            </Text>
            <View style={styles.reportTypesGrid}>
              {REPORT_TYPES.map((reportType) => renderReportTypeCard(reportType))}
            </View>

            {/* Paramètres du rapport */}
            {selectedReportType && (
              <View style={styles.parametersSection}>
                <Text style={[styles.sectionLabel, { color: colors.primary }]}>
                  Paramètres
                </Text>

                <View style={styles.parameterRow}>
                  <Text style={[styles.parameterLabel, { color: colors.text }]}>
                    Année
                  </Text>
                  <TextInput
                    style={[
                      styles.parameterInput,
                      { 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text 
                      }
                    ]}
                    value={reportParams.year.toString()}
                    onChangeText={(text) => 
                      setReportParams(prev => ({ ...prev, year: parseInt(text) || new Date().getFullYear() }))
                    }
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>

                <View style={styles.parameterRow}>
                  <Text style={[styles.parameterLabel, { color: colors.text }]}>
                    Mois (optionnel)
                  </Text>
                  <TextInput
                    style={[
                      styles.parameterInput,
                      { 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text 
                      }
                    ]}
                    value={reportParams.month?.toString() || ''}
                    onChangeText={(text) => 
                      setReportParams(prev => ({ ...prev, month: text ? parseInt(text) : null }))
                    }
                    keyboardType="numeric"
                    placeholder="Tous les mois"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={2}
                  />
                </View>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setReportParams(prev => ({ ...prev, include_charts: !prev.include_charts }))}
                >
                  <Ionicons
                    name={reportParams.include_charts ? "checkbox" : "checkbox-outline"}
                    size={20}
                    color={reportParams.include_charts ? colors.secondary : colors.textSecondary}
                  />
                  <Text style={[styles.checkboxText, { color: colors.text }]}>
                    Inclure les graphiques
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setReportParams(prev => ({ ...prev, include_details: !prev.include_details }))}
                >
                  <Ionicons
                    name={reportParams.include_details ? "checkbox" : "checkbox-outline"}
                    size={20}
                    color={reportParams.include_details ? colors.secondary : colors.textSecondary}
                  />
                  <Text style={[styles.checkboxText, { color: colors.text }]}>
                    Inclure les détails
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => setShowGenerateModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: selectedReportType ? colors.secondary : colors.border,
                  opacity: generatingReport ? 0.7 : 1
                }
              ]}
              onPress={handleGenerateReport}
              disabled={!selectedReportType || generatingReport}
            >
              {generatingReport ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Text style={[styles.modalButtonText, { color: colors.textTertiary }]}>
                  Générer
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHistoryItem = (report) => {
    const isDownloading = downloadingReport === report.id;
    const statusColor = {
      'pending': colors.warning || '#F59E0B',
      'processing': colors.secondary,
      'completed': colors.success || '#10B981',
      'failed': colors.error
    }[report.status] || colors.textSecondary;

    return (
      <View
        key={report.id}
        style={[styles.historyItem, { backgroundColor: colors.background }]}
      >
        <View style={styles.historyHeader}>
          <View style={styles.historyInfo}>
            <Text style={[styles.historyTitle, { color: colors.primary }]}>
              {report.title}
            </Text>
            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
              Généré le {formatDate(report.created_at, 'medium')}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {report.status === 'pending' && 'En attente'}
              {report.status === 'processing' && 'En cours'}
              {report.status === 'completed' && 'Terminé'}
              {report.status === 'failed' && 'Échec'}
            </Text>
          </View>
        </View>

        {report.description && (
          <Text style={[styles.historyDescription, { color: colors.textSecondary }]}>
            {report.description}
          </Text>
        )}

        {report.status === 'completed' && (
          <View style={styles.historyActions}>
            <TouchableOpacity
              style={[
                styles.downloadButton,
                { 
                  backgroundColor: colors.secondary,
                  opacity: isDownloading ? 0.7 : 1
                }
              ]}
              onPress={() => handleDownloadReport(report)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Ionicons name="download" size={16} color={colors.textTertiary} />
              )}
              <Text style={[styles.downloadButtonText, { color: colors.textTertiary }]}>
                {isDownloading ? 'Téléchargement...' : 'Télécharger'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader title="Rapports" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des rapports...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title="Rapports" showBackButton={true} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.primary }]}>
              Rapports d'activité
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Générez et téléchargez vos rapports personnalisés
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.secondary }]}
            onPress={() => setShowGenerateModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.textTertiary} />
            <Text style={[styles.generateButtonText, { color: colors.textTertiary }]}>
              Nouveau
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.secondary]}
            />
          }
        >
          {reportsHistory.length > 0 ? (
            <View style={styles.historyList}>
              {reportsHistory.map(renderHistoryItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={colors.textSecondary}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Aucun rapport disponible
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Créez votre premier rapport en appuyant sur "Nouveau" ci-dessus
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.secondary }]}
                onPress={() => setShowGenerateModal(true)}
              >
                <Ionicons name="add" size={20} color={colors.textTertiary} />
                <Text style={[styles.emptyButtonText, { color: colors.textTertiary }]}>
                  Créer un rapport
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {renderGenerateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  // Content
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 200,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexShrink: 0,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },

  // History list
  historyList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  historyItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
    marginRight: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  historyDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  historyActions: {
    alignItems: 'flex-end',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  downloadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
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
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reportTypesGrid: {
    gap: 12,
    marginBottom: 24,
  },
  reportTypeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginVertical: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  reportTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportTypeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  parametersSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  parameterLabel: {
    fontSize: 14,
    flex: 1,
  },
  parameterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    width: 100,
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxText: {
    fontSize: 14,
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});