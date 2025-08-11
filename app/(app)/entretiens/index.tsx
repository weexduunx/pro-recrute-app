import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { getCandidatEntretiensCalendrier } from '../../../utils/api';
import { router } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader';
import { useTheme } from '../../../components/ThemeContext';

export default function EntretiensMainScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [entretiens, setEntretiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntretiens = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const fetchedEntretiens = await getCandidatEntretiensCalendrier();
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

  const getProchainEntretien = () => {
    const now = new Date();
    const futurs = entretiens.filter(e => {
      const entretienDate = new Date(`${e.date_entretien}T${e.heure_entretien}`);
      return entretienDate > now;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date_entretien}T${a.heure_entretien}`);
      const dateB = new Date(`${b.date_entretien}T${b.heure_entretien}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    return futurs.length > 0 ? futurs[0] : null;
  };

  const getStatsEntretiens = () => {
    const now = new Date();
    const total = entretiens.length;
    const futurs = entretiens.filter(e => {
      const entretienDate = new Date(`${e.date_entretien}T${e.heure_entretien}`);
      return entretienDate > now;
    }).length;
    const termines = entretiens.filter(e => e.decision && e.decision !== 0).length;
    const enAttente = entretiens.filter(e => e.decision === 0).length;
    
    return { total, futurs, termines, enAttente };
  };

  const formatDateCourt = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Demain";
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short'
      });
    }
  };

  const prochainEntretien = getProchainEntretien();
  const stats = getStatsEntretiens();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Gestion des Entretiens"
          user={user}
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
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : (
            <>
              {/* Prochain entretien */}
              {prochainEntretien && (
                <View style={styles.prochainEntretienCard}>
                  <View style={styles.prochainEntretienHeader}>
                    <FontAwesome5 name="clock" size={18} color="#0f8e35" />
                    <Text style={styles.prochainEntretienTitle}>Prochain entretien</Text>
                  </View>
                  <Text style={styles.prochainEntretienPoste} numberOfLines={2}>
                    {prochainEntretien.offre?.titre || 'Titre non disponible'}
                  </Text>
                  <Text style={styles.prochainEntretienEntreprise}>
                    {prochainEntretien.offre?.entreprise_nom || 'Entreprise'}
                  </Text>
                  <View style={styles.prochainEntretienDateContainer}>
                    <Text style={styles.prochainEntretienDate}>
                      {formatDateCourt(prochainEntretien.date_entretien || prochainEntretien.date)}
                    </Text>
                    <Text style={styles.prochainEntretienHeure}>
                      {(prochainEntretien.heure_entretien || prochainEntretien.heure).substring(0, 5)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.prochainEntretienButton}
                    onPress={() => router.push(`/(app)/entretiens/details?id=${prochainEntretien.id}`)}
                  >
                    <Text style={styles.prochainEntretienButtonText}>Voir les détails</Text>
                    <FontAwesome5 name="arrow-right" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Statistiques */}
              <View style={styles.statsContainer}>
                <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <FontAwesome5 name="calendar" size={20} color="#091e60" />
                    <Text style={styles.statNumber}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statCard}>
                    <FontAwesome5 name="calendar-plus" size={20} color="#0f8e35" />
                    <Text style={styles.statNumber}>{stats.futurs}</Text>
                    <Text style={styles.statLabel}>À venir</Text>
                  </View>
                  <View style={styles.statCard}>
                    <FontAwesome5 name="clock" size={20} color="#F59E0B" />
                    <Text style={styles.statNumber}>{stats.enAttente}</Text>
                    <Text style={styles.statLabel}>En attente</Text>
                  </View>
                  <View style={styles.statCard}>
                    <FontAwesome5 name="check-circle" size={20} color="#10B981" />
                    <Text style={styles.statNumber}>{stats.termines}</Text>
                    <Text style={styles.statLabel}>Terminés</Text>
                  </View>
                </View>
              </View>

              {/* Actions rapides */}
              <View style={styles.actionsContainer}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.actionsGrid}>
                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/(app)/entretiens/liste')}
                  >
                    <View style={styles.actionIconContainer}>
                      <FontAwesome5 name="list" size={24} color="#091e60" />
                    </View>
                    <Text style={styles.actionTitle}>Tous mes entretiens</Text>
                    <Text style={styles.actionSubtitle}>Voir la liste complète</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/(app)/entretiens/calendrier')}
                  >
                    <View style={styles.actionIconContainer}>
                      <FontAwesome5 name="calendar-alt" size={24} color="#0f8e35" />
                    </View>
                    <Text style={styles.actionTitle}>Calendrier</Text>
                    <Text style={styles.actionSubtitle}>Vue calendrier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/(app)/entretiens/preparation')}
                  >
                    <View style={styles.actionIconContainer}>
                      <FontAwesome5 name="book-open" size={24} color="#8B5CF6" />
                    </View>
                    <Text style={styles.actionTitle}>Préparation</Text>
                    <Text style={styles.actionSubtitle}>Conseils & guides</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => router.push('/(app)/entretiens/historique')}
                  >
                    <View style={styles.actionIconContainer}>
                      <FontAwesome5 name="history" size={24} color="#6B7280" />
                    </View>
                    <Text style={styles.actionTitle}>Historique</Text>
                    <Text style={styles.actionSubtitle}>Entretiens passés</Text>
                  </TouchableOpacity>

                </View>
              </View>

              {/* Conseils du jour */}
              <View style={styles.conseillsContainer}>
                <View style={styles.conseillsHeader}>
                  <FontAwesome5 name="lightbulb" size={16} color="#F59E0B" />
                  <Text style={styles.conseillsTitle}>Conseil du jour</Text>
                </View>
                <Text style={styles.conseillsText}>
                  Préparez toujours une liste de questions à poser au recruteur. Cela montre votre intérêt pour le poste et l'entreprise.
                </Text>
                <TouchableOpacity onPress={() => router.push('/(app)/entretiens/preparation')}>
                  <Text style={styles.conseillsLink}>Voir plus de conseils →</Text>
                </TouchableOpacity>
              </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 16,
  },

  // Prochain entretien
  prochainEntretienCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#0f8e35',
  },
  prochainEntretienHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  prochainEntretienTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f8e35',
    marginLeft: 8,
  },
  prochainEntretienPoste: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 4,
  },
  prochainEntretienEntreprise: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  prochainEntretienDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  prochainEntretienDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#091e60',
    marginRight: 8,
  },
  prochainEntretienHeure: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f8e35',
  },
  prochainEntretienButton: {
    backgroundColor: '#0f8e35',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prochainEntretienButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },

  // Statistiques
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#091e60',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Actions
  actionsContainer: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Conseils
  conseillsContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  conseillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conseillsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 8,
  },
  conseillsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 8,
  },
  conseillsLink: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
});