import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, RefreshControl, Modal, Alert, Linking } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { getCandidatEntretiens } from '../../utils/api';
import { router } from 'expo-router';
import CustomHeader from '../../components/CustomHeader';
import { useTheme } from '../../components/ThemeContext';

export default function EntretiensScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [entretiens, setEntretiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntretien, setSelectedEntretien] = useState<any>(null);
  const [showEntretienModal, setShowEntretienModal] = useState(false);

  const loadEntretiens = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        console.log('=== LOADING ALL ENTRETIENS ===');
        const fetchedEntretiens = await getCandidatEntretiens();
        console.log('All entretiens loaded:', fetchedEntretiens);
        setEntretiens(fetchedEntretiens);
      } catch (error: any) {
        console.error("Erreur de chargement des entretiens:", error);
        setEntretiens([]);
      } finally {
        setLoading(false);
      }
    } else {
      setEntretiens([]);
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEntretiens();
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadEntretiens]);

  useEffect(() => {
    loadEntretiens();
  }, [loadEntretiens]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd&apos;hui";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Demain";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isEntretienExpired = (dateString: string, heureString: string) => {
    const entretienDate = new Date(`${dateString}T${heureString}`);
    const now = new Date();
    return entretienDate < now;
  };

  const getDecisionColor = (decision: number) => {
    switch (decision) {
      case 0: return '#F59E0B'; // En attente - orange
      case 1: return '#3B82F6'; // Passe étape suivante - bleu
      case 2: return '#EF4444'; // Refusé - rouge
      case 3: return '#10B981'; // Accepté - vert
      default: return '#6B7280'; // Par défaut - gris
    }
  };

  const handleEntretienPress = (entretien: any) => {
    setSelectedEntretien(entretien);
    setShowEntretienModal(true);
  };

  const closeEntretienModal = () => {
    setShowEntretienModal(false);
    setSelectedEntretien(null);
  };

  const handleLinkPress = async (url: string) => {
    if (url) {
      try {
        await Linking.openURL(url);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible d&apos;ouvrir le lien');
      }
    }
  };

  const groupEntretiensByStatus = () => {
    const futurs = entretiens.filter(e => !isEntretienExpired(e.date_entretien, e.heure_entretien));
    const passes = entretiens.filter(e => isEntretienExpired(e.date_entretien, e.heure_entretien));
    
    return { futurs, passes };
  };

  const { futurs, passes } = groupEntretiensByStatus();

  const renderEntretienItem = (entretien: any, isExpired: boolean = false) => (
    <TouchableOpacity
      key={entretien.id}
      style={[
        styles.entretienCard,
        isExpired && styles.entretienCardExpired
      ]}
      onPress={() => handleEntretienPress(entretien)}
      activeOpacity={0.7}
    >
      <View style={styles.entretienHeader}>
        <View style={styles.entretienDateContainer}>
          <Text style={[
            styles.entretienDate,
            isExpired && styles.expiredText
          ]}>
            {formatDate(entretien.date_entretien)}
          </Text>
          <Text style={[
            styles.entretienTime,
            isExpired && styles.expiredText
          ]}>
            {entretien.heure_entretien.substring(0, 5)}
          </Text>
        </View>
        
        {isExpired && (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredBadgeText}>Expiré</Text>
          </View>
        )}
      </View>

      <View style={styles.entretienContent}>
        <Text style={[
          styles.entretienTitle,
          isExpired && styles.expiredText
        ]} numberOfLines={2}>
          {entretien.offre?.titre || 'Titre non disponible'}
        </Text>
        
        <Text style={[
          styles.entretienCompany,
          isExpired && styles.expiredText
        ]}>
          {entretien.offre?.entreprise_nom || 'Entreprise non spécifiée'}
        </Text>

        <View style={styles.entretienFooter}>
          <View style={styles.entretienType}>
            <FontAwesome5 name="clipboard-list" size={12} color={isExpired ? '#9CA3AF' : '#6B7280'} />
            <Text style={[
              styles.entretienTypeText,
              isExpired && styles.expiredText
            ]}>
              {entretien.type_entretien === 1 ? 'Final' : 'Sélection'}
            </Text>
          </View>

          <View style={[
            styles.decisionBadge,
            { backgroundColor: isExpired ? '#E5E7EB' : getDecisionColor(entretien.decision) }
          ]}>
            <Text style={[
              styles.decisionBadgeText,
              isExpired && { color: '#6B7280' }
            ]}>
              {entretien.decision_label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chevronContainer}>
        <FontAwesome5 
          name="chevron-right" 
          size={16} 
          color={isExpired ? '#D1D5DB' : '#9CA3AF'} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Mes Entretiens"
          user={user}
        />

        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0f8e35']}
              tintColor="#0f8e35"
            />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0f8e35" />
              <Text style={styles.loadingText}>Chargement de vos entretiens...</Text>
            </View>
          ) : entretiens.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="calendar-alt" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>Aucun entretien</Text>
              <Text style={styles.emptyStateText}>
                Vos entretiens programmés apparaîtront ici une fois qu&apos;ils seront planifiés par les recruteurs.
              </Text>
            </View>
          ) : (
            <>
              {/* Entretiens à venir */}
              {futurs.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <FontAwesome5 name="calendar-plus" size={18} color="#0f8e35" />
                    <Text style={styles.sectionTitle}>Entretiens à venir ({futurs.length})</Text>
                  </View>
                  {futurs.map(entretien => renderEntretienItem(entretien, false))}
                </View>
              )}

              {/* Entretiens passés */}
              {passes.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <FontAwesome5 name="calendar-check" size={18} color="#6B7280" />
                    <Text style={styles.sectionTitle}>Entretiens passés ({passes.length})</Text>
                  </View>
                  {passes.map(entretien => renderEntretienItem(entretien, true))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Modal des détails (réutilisé du dashboard) */}
        <Modal
          visible={showEntretienModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeEntretienModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedEntretien && (
                  <>
                    {/* Header du modal */}
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Détails de l&apos;entretien</Text>
                      <TouchableOpacity onPress={closeEntretienModal} style={styles.closeButton}>
                        <FontAwesome5 name="times" size={24} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    {/* Date et heure */}
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="calendar" size={16} color="#091e60" />
                        <Text style={styles.modalSectionTitle}>Date et heure</Text>
                      </View>
                      <Text style={styles.modalText}>
                        {formatDateLong(selectedEntretien.date_entretien)} à {selectedEntretien.heure_entretien.substring(0, 5)}
                      </Text>
                      {isEntretienExpired(selectedEntretien.date_entretien, selectedEntretien.heure_entretien) && (
                        <Text style={styles.expiredIndicator}>⚠️ Cet entretien est expiré</Text>
                      )}
                    </View>

                    {/* Type d'entretien */}
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="clipboard-list" size={16} color="#091e60" />
                        <Text style={styles.modalSectionTitle}>Type d&apos;entretien</Text>
                      </View>
                      <Text style={styles.modalText}>
                        {selectedEntretien.type_entretien === 1 ? 'Entretien Final' : 'Entretien de sélection'}
                      </Text>
                    </View>
                    {/* Lien */}
                    {selectedEntretien.lien && (
                      <View style={styles.modalSection}>
                        <View style={styles.modalSectionHeader}>
                          <FontAwesome5 name="link" size={16} color="#091e60" />
                          <Text style={styles.modalSectionTitle}>Lien de connexion</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleLinkPress(selectedEntretien.lien)}>
                          <Text style={styles.linkText}>{selectedEntretien.lien}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {/* Offre d'emploi */}
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="briefcase" size={16} color="#091e60" />
                        <Text style={styles.modalSectionTitle}>Offre d&apos;emploi</Text>
                      </View>
                      <Text style={styles.modalTextBold}>{selectedEntretien.offre?.titre}</Text>
                      <Text style={styles.modalText}>{selectedEntretien.offre?.entreprise_nom}</Text>
                      <Text style={styles.modalTextSecondary}>{selectedEntretien.offre?.lieux}</Text>
                    </View>

                    {/* Statuts - Affiché seulement si le candidat était présent */}
                    {selectedEntretien.presence === 1 && (
                      <View style={styles.modalSection}>
                        <View style={styles.modalSectionHeader}>
                          <FontAwesome5 name="info-circle" size={16} color="#091e60" />
                          <Text style={styles.modalSectionTitle}>Statut</Text>
                        </View>
                        <View style={styles.statusRow}>
                          <Text style={styles.statusLabel}>Présence:</Text>
                          <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                            <Text style={styles.statusBadgeText}>{selectedEntretien.presence_label}</Text>
                          </View>
                        </View>
                        <View style={styles.statusRow}>
                          <Text style={styles.statusLabel}>Décision:</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getDecisionColor(selectedEntretien.decision) }]}>
                            <Text style={styles.statusBadgeText}>{selectedEntretien.decision_label}</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Observations - Affiché seulement si le candidat était présent et qu'il y a des observations */}
                    {selectedEntretien.presence === 1 && selectedEntretien.observations && (
                      <View style={styles.modalSection}>
                        <View style={styles.modalSectionHeader}>
                          <FontAwesome5 name="sticky-note" size={16} color="#091e60" />
                          <Text style={styles.modalSectionTitle}>Observations</Text>
                        </View>
                        <Text style={styles.modalText}>{selectedEntretien.observations}</Text>
                      </View>
                    )}

                    {/* Commentaire - Affiché seulement si le candidat était présent et qu'il y a un commentaire */}
                    {selectedEntretien.presence === 1 && selectedEntretien.commentaire && (
                      <View style={styles.modalSection}>
                        <View style={styles.modalSectionHeader}>
                          <FontAwesome5 name="comment" size={16} color="#091e60" />
                          <Text style={styles.modalSectionTitle}>Commentaire</Text>
                        </View>
                        <Text style={styles.modalText}>{selectedEntretien.commentaire}</Text>
                      </View>
                    )}

                    {/* Raison du rejet - Affiché seulement si le candidat était présent et qu'il y a une raison */}
                    {selectedEntretien.presence === 1 && selectedEntretien.raison_rejet && (
                      <View style={styles.modalSection}>
                        <View style={styles.modalSectionHeader}>
                          <FontAwesome5 name="exclamation-triangle" size={16} color="#EF4444" />
                          <Text style={styles.modalSectionTitle}>Raison du rejet</Text>
                        </View>
                        <Text style={[styles.modalText, { color: '#EF4444' }]}>{selectedEntretien.raison_rejet}</Text>
                      </View>
                    )}


                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Section Headers
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#091e60',
    marginLeft: 8,
  },

  // Entretien Cards
  entretienCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#0f8e35',
  },
  entretienCardExpired: {
    opacity: 0.7,
    borderLeftColor: '#9CA3AF',
  },
  
  entretienHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entretienDateContainer: {
    alignItems: 'flex-start',
    minWidth: 80,
  },
  entretienDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 2,
  },
  entretienTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#091e60',
  },
  
  expiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
  },
  
  entretienContent: {
    flex: 1,
    marginLeft: 12,
  },
  entretienTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 6,
  },
  entretienCompany: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  
  entretienFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entretienType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entretienTypeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  
  decisionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  decisionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  chevronContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  
  // Expired Text Style
  expiredText: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },

  // Loading and Empty States
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal Styles (copied from dashboard)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
  },
  closeButton: {
    padding: 8,
  },
  modalSection: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginLeft: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  modalTextBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 4,
  },
  modalTextSecondary: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  expiredIndicator: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 4,
  },
});