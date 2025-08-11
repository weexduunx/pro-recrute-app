import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, RefreshControl, Modal, Alert, Linking } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { getCandidatEntretiens } from '../../../utils/api';
import { router } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader';
import { useTheme } from '../../../components/ThemeContext';

export default function EntretiensListeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [entretiens, setEntretiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntretien, setSelectedEntretien] = useState<any>(null);
  const [showEntretienModal, setShowEntretienModal] = useState(false);
  const [filter, setFilter] = useState<'tous' | 'futurs' | 'passes' | 'en_attente'>('tous');

  const loadEntretiens = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const fetchedEntretiens = await getCandidatEntretiens();
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
      return "Aujourd'hui";
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

  const getFilteredEntretiens = () => {
    const now = new Date();
    
    switch (filter) {
      case 'futurs':
        return entretiens.filter(e => !isEntretienExpired(e.date_entretien, e.heure_entretien));
      case 'passes':
        return entretiens.filter(e => isEntretienExpired(e.date_entretien, e.heure_entretien));
      case 'en_attente':
        return entretiens.filter(e => e.decision === 0);
      default:
        return entretiens;
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
        Alert.alert('Erreur', "Impossible d'ouvrir le lien");
      }
    }
  };

  const filteredEntretiens = getFilteredEntretiens();

  const renderFilterButton = (filterType: typeof filter, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType && styles.filterButtonTextActive
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderEntretienItem = (entretien: any, index: number) => {
    const isExpired = isEntretienExpired(entretien.date_entretien, entretien.heure_entretien);
    
    return (
      <TouchableOpacity
        key={entretien.id}
        style={[
          styles.entretienCard,
          isExpired && styles.entretienCardExpired,
          index === 0 && styles.firstCard
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
              <Text style={styles.expiredBadgeText}>Passé</Text>
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

          {/* Actions rapides */}
          <View style={styles.actionsQuickContainer}>
            {entretien.lien && !isExpired && (
              <TouchableOpacity
                style={styles.actionQuickButton}
                onPress={() => handleLinkPress(entretien.lien)}
              >
                <FontAwesome5 name="video" size={14} color="#0f8e35" />
                <Text style={styles.actionQuickText}>Rejoindre</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionQuickButton}
              onPress={() => router.push('/(app)/entretiens/preparation')}
            >
              <FontAwesome5 name="book-open" size={14} color="#8B5CF6" />
              <Text style={styles.actionQuickText}>Préparer</Text>
            </TouchableOpacity>
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
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Mes Entretiens"
          user={user}
          showBackButton={true}
        />

        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {renderFilterButton('tous', 'Tous', entretiens.length)}
            {renderFilterButton('futurs', 'À venir', entretiens.filter(e => !isEntretienExpired(e.date_entretien, e.heure_entretien)).length)}
            {renderFilterButton('passes', 'Passés', entretiens.filter(e => isEntretienExpired(e.date_entretien, e.heure_entretien)).length)}
            {renderFilterButton('en_attente', 'En attente', entretiens.filter(e => e.decision === 0).length)}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
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
          ) : filteredEntretiens.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="calendar-alt" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>
                {filter === 'tous' ? 'Aucun entretien' : 
                 filter === 'futurs' ? 'Aucun entretien à venir' :
                 filter === 'passes' ? 'Aucun entretien passé' :
                 'Aucun entretien en attente'}
              </Text>
              <Text style={styles.emptyStateText}>
                {filter === 'tous' ? 
                  "Vos entretiens programmés apparaîtront ici une fois qu'ils seront planifiés par les recruteurs." :
                  "Aucun entretien ne correspond à ce filtre pour le moment."
                }
              </Text>
            </View>
          ) : (
            <View style={styles.entretiensContainer}>
              {filteredEntretiens.map((entretien, index) => renderEntretienItem(entretien, index))}
            </View>
          )}
        </ScrollView>

        {/* Modal des détails */}
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
                      <Text style={styles.modalTitle}>Détails de l'entretien</Text>
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
                        <Text style={styles.expiredIndicator}>⚠️ Cet entretien est terminé</Text>
                      )}
                    </View>

                    {/* Type d'entretien */}
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="clipboard-list" size={16} color="#091e60" />
                        <Text style={styles.modalSectionTitle}>Type d'entretien</Text>
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
                        <Text style={styles.modalSectionTitle}>Offre d'emploi</Text>
                      </View>
                      <Text style={styles.modalTextBold}>{selectedEntretien.offre?.titre}</Text>
                      <Text style={styles.modalText}>{selectedEntretien.offre?.entreprise_nom}</Text>
                      <Text style={styles.modalTextSecondary}>{selectedEntretien.offre?.lieux}</Text>
                    </View>

                    {/* Statuts */}
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

                    {/* Observations */}
                    {selectedEntretien.presence === 1 && selectedEntretien.observations && (
                      <View style={styles.modalSection}>
                        <View style={styles.modalSectionHeader}>
                          <FontAwesome5 name="sticky-note" size={16} color="#091e60" />
                          <Text style={styles.modalSectionTitle}>Observations</Text>
                        </View>
                        <Text style={styles.modalText}>{selectedEntretien.observations}</Text>
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
    paddingBottom: 40,
  },
  entretiensContainer: {
    paddingHorizontal: 20,
  },

  // Filtres
  filtersContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filtersScroll: {
    paddingHorizontal: 20,
  },
  filterButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#091e60',
    borderColor: '#091e60',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Cartes d'entretiens
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
  firstCard: {
    marginTop: 20,
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
    marginBottom: 12,
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

  // Actions rapides
  actionsQuickContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionQuickText: {
    fontSize: 11,
    color: '#4B5563',
    marginLeft: 4,
    fontWeight: '500',
  },
  
  chevronContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  
  // Expired Text Style
  expiredText: {
    color: '#9CA3AF',
  },

  // Loading and Empty States
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    margin: 20,
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
    margin: 20,
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

  // Modal Styles
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