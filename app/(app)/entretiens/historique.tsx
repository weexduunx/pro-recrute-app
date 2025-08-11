import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { getCandidatEntretiens } from '../../../utils/api';
import { router } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader';
import { useTheme } from '../../../components/ThemeContext';

export default function EntretiensHistoriqueScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [entretiens, setEntretiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'tous' | 'accepte' | 'refuse' | 'en_attente'>('tous');

  const loadEntretiens = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const fetchedEntretiens = await getCandidatEntretiens();
        // Filtrer seulement les entretiens passés
        const entretiensPassés = fetchedEntretiens.filter((e: any) => {
          const entretienDate = new Date(`${e.date_entretien}T${e.heure_entretien}`);
          return entretienDate < new Date();
        });
        setEntretiens(entretiensPassés);
      } catch (error: any) {
        console.error("Erreur de chargement de l'historique:", error);
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
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
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

  const getDecisionIcon = (decision: number) => {
    switch (decision) {
      case 0: return 'clock'; // En attente
      case 1: return 'arrow-right'; // Passe étape suivante
      case 2: return 'times-circle'; // Refusé
      case 3: return 'check-circle'; // Accepté
      default: return 'question-circle'; // Par défaut
    }
  };

  const getFilteredEntretiens = () => {
    switch (filter) {
      case 'accepte':
        return entretiens.filter(e => e.decision === 3);
      case 'refuse':
        return entretiens.filter(e => e.decision === 2);
      case 'en_attente':
        return entretiens.filter(e => e.decision === 0);
      default:
        return entretiens;
    }
  };

  const getStatsHistorique = () => {
    const total = entretiens.length;
    const accepte = entretiens.filter(e => e.decision === 3).length;
    const refuse = entretiens.filter(e => e.decision === 2).length;
    const enAttente = entretiens.filter(e => e.decision === 0).length;
    const passe = entretiens.filter(e => e.decision === 1).length;
    
    const tauxReussite = total > 0 ? Math.round(((accepte + passe) / total) * 100) : 0;
    
    return { total, accepte, refuse, enAttente, passe, tauxReussite };
  };

  const filteredEntretiens = getFilteredEntretiens();
  const stats = getStatsHistorique();

  const renderFilterButton = (filterType: typeof filter, label: string, count: number, color: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive,
        filter === filterType && { borderColor: color }
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType && { color: color }
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderEntretienItem = (entretien: any, index: number) => {
    return (
      <TouchableOpacity
        key={entretien.id}
        style={[
          styles.entretienCard,
          index === 0 && styles.firstCard
        ]}
        onPress={() => router.push(`/(app)/entretiens/details?id=${entretien.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.entretienHeader}>
          <View style={styles.entretienDateContainer}>
            <Text style={styles.entretienDate}>
              {formatDate(entretien.date_entretien)}
            </Text>
            <Text style={styles.entretienTime}>
              {entretien.heure_entretien.substring(0, 5)}
            </Text>
          </View>
          
          <View style={[
            styles.decisionBadge,
            { backgroundColor: getDecisionColor(entretien.decision) }
          ]}>
            <FontAwesome5 
              name={getDecisionIcon(entretien.decision)} 
              size={12} 
              color="#FFFFFF" 
            />
            <Text style={styles.decisionBadgeText}>
              {entretien.decision_label}
            </Text>
          </View>
        </View>

        <View style={styles.entretienContent}>
          <Text style={styles.entretienTitle} numberOfLines={2}>
            {entretien.offre?.titre || 'Titre non disponible'}
          </Text>
          
          <Text style={styles.entretienCompany}>
            {entretien.offre?.entreprise_nom || 'Entreprise non spécifiée'}
          </Text>

          <View style={styles.entretienFooter}>
            <View style={styles.entretienType}>
              <FontAwesome5 name="clipboard-list" size={12} color="#6B7280" />
              <Text style={styles.entretienTypeText}>
                {entretien.type_entretien === 1 ? 'Final' : 'Sélection'}
              </Text>
            </View>

            {entretien.presence === 1 && (
              <View style={styles.presenceBadge}>
                <FontAwesome5 name="user-check" size={10} color="#10B981" />
                <Text style={styles.presenceText}>Présent</Text>
              </View>
            )}
          </View>

          {/* Feedback spécifique selon le résultat */}
          {entretien.decision === 3 && (
            <View style={styles.feedbackPositive}>
              <FontAwesome5 name="thumbs-up" size={14} color="#10B981" />
              <Text style={styles.feedbackText}>Félicitations ! Vous avez été retenu.</Text>
            </View>
          )}
          
          {entretien.decision === 2 && entretien.raison_rejet && (
            <View style={styles.feedbackNegative}>
              <FontAwesome5 name="info-circle" size={14} color="#EF4444" />
              <Text style={styles.feedbackText} numberOfLines={2}>
                {entretien.raison_rejet}
              </Text>
            </View>
          )}

          {entretien.decision === 1 && (
            <View style={styles.feedbackNeutral}>
              <FontAwesome5 name="arrow-right" size={14} color="#3B82F6" />
              <Text style={styles.feedbackText}>Passage à l'étape suivante.</Text>
            </View>
          )}
        </View>

        <View style={styles.chevronContainer}>
          <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Historique des Entretiens"
          user={user}
          showBackButton={true}
        />

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
              <Text style={styles.loadingText}>Chargement de l'historique...</Text>
            </View>
          ) : (
            <>
              {/* Statistiques */}
              <View style={styles.statsContainer}>
                <Text style={styles.sectionTitle}>Statistiques</Text>
                
                <View style={styles.statsMainCard}>
                  <View style={styles.statsHeader}>
                    <View style={styles.statMainItem}>
                      <Text style={styles.statMainNumber}>{stats.total}</Text>
                      <Text style={styles.statMainLabel}>Total entretiens</Text>
                    </View>
                    <View style={styles.statMainItem}>
                      <Text style={[styles.statMainNumber, { color: '#10B981' }]}>
                        {stats.tauxReussite}%
                      </Text>
                      <Text style={styles.statMainLabel}>Taux de réussite</Text>
                    </View>
                  </View>
                  
                  <View style={styles.statsGrid}>
                    <View style={[styles.statMiniCard, { borderLeftColor: '#10B981' }]}>
                      <Text style={[styles.statMiniNumber, { color: '#10B981' }]}>
                        {stats.accepte}
                      </Text>
                      <Text style={styles.statMiniLabel}>Accepté</Text>
                    </View>
                    <View style={[styles.statMiniCard, { borderLeftColor: '#3B82F6' }]}>
                      <Text style={[styles.statMiniNumber, { color: '#3B82F6' }]}>
                        {stats.passe}
                      </Text>
                      <Text style={styles.statMiniLabel}>Étape suivante</Text>
                    </View>
                    <View style={[styles.statMiniCard, { borderLeftColor: '#EF4444' }]}>
                      <Text style={[styles.statMiniNumber, { color: '#EF4444' }]}>
                        {stats.refuse}
                      </Text>
                      <Text style={styles.statMiniLabel}>Refusé</Text>
                    </View>
                    <View style={[styles.statMiniCard, { borderLeftColor: '#F59E0B' }]}>
                      <Text style={[styles.statMiniNumber, { color: '#F59E0B' }]}>
                        {stats.enAttente}
                      </Text>
                      <Text style={styles.statMiniLabel}>En attente</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Filtres */}
              <View style={styles.filtersContainer}>
                <Text style={styles.sectionTitle}>Filtrer par résultat</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                  {renderFilterButton('tous', 'Tous', entretiens.length, '#091e60')}
                  {renderFilterButton('accepte', 'Acceptés', stats.accepte, '#10B981')}
                  {renderFilterButton('refuse', 'Refusés', stats.refuse, '#EF4444')}
                  {renderFilterButton('en_attente', 'En attente', stats.enAttente, '#F59E0B')}
                </ScrollView>
              </View>

              {/* Liste des entretiens */}
              <View style={styles.entretiensSection}>
                {filteredEntretiens.length === 0 ? (
                  <View style={styles.emptyState}>
                    <FontAwesome5 name="calendar-alt" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyStateTitle}>
                      {filter === 'tous' ? 'Aucun entretien dans l\'historique' : 
                       `Aucun entretien ${
                         filter === 'accepte' ? 'accepté' :
                         filter === 'refuse' ? 'refusé' :
                         'en attente'
                       }`}
                    </Text>
                    <Text style={styles.emptyStateText}>
                      {filter === 'tous' ? 
                        "Vos entretiens passés apparaîtront ici après leur réalisation." :
                        "Aucun entretien ne correspond à ce filtre pour le moment."
                      }
                    </Text>
                  </View>
                ) : (
                  <View style={styles.entretiensContainer}>
                    <Text style={styles.sectionTitle}>
                      {filteredEntretiens.length} entretien{filteredEntretiens.length > 1 ? 's' : ''}
                      {filter !== 'tous' && ` ${
                        filter === 'accepte' ? 'accepté' :
                        filter === 'refuse' ? 'refusé' :
                        'en attente'
                      }${filteredEntretiens.length > 1 ? 's' : ''}`}
                    </Text>
                    {filteredEntretiens
                      .sort((a, b) => new Date(`${b.date_entretien}T${b.heure_entretien}`).getTime() - 
                                     new Date(`${a.date_entretien}T${a.heure_entretien}`).getTime())
                      .map((entretien, index) => renderEntretienItem(entretien, index))}
                  </View>
                )}
              </View>

              {/* Conseils d'amélioration */}
              {stats.total > 0 && stats.tauxReussite < 50 && (
                <View style={styles.conseilsSection}>
                  <View style={styles.conseilsHeader}>
                    <FontAwesome5 name="lightbulb" size={16} color="#F59E0B" />
                    <Text style={styles.conseilsTitle}>Conseils d'amélioration</Text>
                  </View>
                  
                  <Text style={styles.conseilsText}>
                    Votre taux de réussite peut être amélioré. Consultez notre guide de préparation 
                    pour maximiser vos chances lors de vos prochains entretiens.
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.conseilsButton}
                    onPress={() => router.push('/(app)/entretiens/preparation')}
                  >
                    <Text style={styles.conseilsButtonText}>
                      Voir le guide de préparation
                    </Text>
                    <FontAwesome5 name="arrow-right" size={14} color="#F59E0B" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 16,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    margin: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Statistiques
  statsContainer: {
    margin: 20,
  },
  statsMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statMainItem: {
    alignItems: 'center',
  },
  statMainNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 4,
  },
  statMainLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statMiniCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  statMiniNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statMiniLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Filtres
  filtersContainer: {
    margin: 20,
    marginTop: 0,
  },
  filtersScroll: {
    maxHeight: 50,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Entretiens
  entretiensSection: {
    margin: 20,
    marginTop: 0,
  },
  entretiensContainer: {},
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
  },
  firstCard: {
    marginTop: 12,
  },
  
  entretienHeader: {
    alignItems: 'center',
    minWidth: 80,
    marginRight: 16,
  },
  entretienDateContainer: {
    alignItems: 'center',
    marginBottom: 8,
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
  
  decisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  decisionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  
  entretienContent: {
    flex: 1,
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
    marginBottom: 8,
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
  presenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  presenceText: {
    fontSize: 10,
    color: '#10B981',
    marginLeft: 2,
    fontWeight: '600',
  },

  // Feedback
  feedbackPositive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  feedbackNegative: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  feedbackNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  feedbackText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  
  chevronContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },

  // Empty state
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
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Conseils
  conseilsSection: {
    backgroundColor: '#FFFBEB',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  conseilsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  conseilsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 8,
  },
  conseilsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 16,
  },
  conseilsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  conseilsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
});