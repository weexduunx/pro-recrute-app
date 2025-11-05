import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView, StatusBar, SafeAreaView, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import {
  getAIJobRecommendations,
  updateJobPreferences,
  getMatchScore,
  trackRecommendationInteraction
} from '../../../utils/ai-api';
import { getCandidatProfile } from '../../../utils/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CustomHeader from '../../../components/CustomHeader';

const { width } = Dimensions.get('window');

interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  type: string;
  publishedAt: string;
  matchScore: number;
  matchReasons: string[];
  skillsMatch: {
    matched: string[];
    missing: string[];
    additional: string[];
  };
  isRemote: boolean;
  experienceLevel: string;
}

interface RecommendationStats {
  totalRecommendations: number;
  averageMatch: number;
  appliedCount: number;
  viewedCount: number;
}

export default function AIRecommendationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterByScore, setFilterByScore] = useState<number | null>(null);
  const [candidatProfile, setCandidatProfile] = useState<any>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Récupérer le profil candidat complet comme dans profile-details.tsx
      console.log('Récupération du profil candidat via getCandidatProfile...');
      const candidatData = await getCandidatProfile();
      setCandidatProfile(candidatData);
      
      // Récupérer les IDs des compétences depuis le profil candidat
      const userCompetenceIds = candidatData?.competences?.map((comp: { id: string }) => comp.id) || [];
      
      console.log('Profil candidat récupéré:', {
        userId: user?.id,
        candidatId: candidatData?.id,
        competencesCount: userCompetenceIds.length,
        competenceIds: userCompetenceIds,
        competenceNames: candidatData?.competences?.map((c: any) => c.libelle_competence) || [],
        hasExperiences: candidatData?.experiences?.length > 0,
        hasParsedCv: !!candidatData?.parsed_cv?.summary,
        parsedCvSummary: candidatData?.parsed_cv?.summary ? 'Présent' : 'Manquant'
      });
      
      console.log('🔍 Envoi de la requête getAIJobRecommendations avec filtres:', {
        minScore: filterByScore,
        limit: 20,
        competence_ids: userCompetenceIds,
        source: 'candidat_competences'
      });

      const response = await getAIJobRecommendations({
        minScore: filterByScore,
        limit: 20,
        // Envoyer explicitement les IDs des compétences depuis candidat_has_competences
        competence_ids: userCompetenceIds,
        // S'assurer que le backend utilise les compétences relationnelles
        source: 'candidat_competences' // Indique au backend d'utiliser la relation candidat_has_competences
      });

      console.log('✅ Réponse getAIJobRecommendations reçue:', {
        total_recommendations: response.data.recommendations?.length || 0,
        meta: response.data.meta,
        first_recommendation_score: response.data.recommendations?.[0]?.match_percentage
      });

      // Transform Laravel API response to match the interface
      const transformedRecommendations = (response.data.recommendations || []).map((rec: any) => ({
        id: rec.offre?.id?.toString() || Math.random().toString(),
        title: rec.offre?.titre || 'Titre non disponible',
        company: rec.offre?.entreprise || 'Entreprise non spécifiée',
        location: rec.offre?.lieu_travail || 'Lieu non spécifié',
        description: rec.offre?.description || '',
        requirements: [],
        salary: rec.offre?.salaire_propose ? {
          min: parseInt(rec.offre.salaire_propose.split(' - ')[0]) || 0,
          max: parseInt(rec.offre.salaire_propose.split(' - ')[1]) || 0,
          currency: 'CFA'
        } : undefined,
        type: rec.offre?.type_contrat || 'CDI',
        publishedAt: rec.offre?.created_at || new Date().toISOString(),
        matchScore: rec.match_percentage || 0,
        matchReasons: Array.isArray(rec.reasons) ? rec.reasons : [],
        skillsMatch: {
          matched: rec.reasons ? rec.reasons
            .filter((reason: string) => reason.includes('Compétences correspondantes'))
            .map((reason: string) => reason.replace('Compétences correspondantes : ', ''))
            .join(', ')
            .split(', ')
            .filter(Boolean) : [],
          missing: [],
          additional: []
        },
        isRemote: false,
        experienceLevel: 'Débutant'
      }));

      // Le filtrage est déjà fait côté backend, pas besoin de le refaire côté client
      console.log(`📊 Recommendations transformées: ${transformedRecommendations.length} éléments`);
      if (filterByScore !== null) {
        console.log(`🔍 Filtrage déjà appliqué côté backend avec minScore: ${filterByScore}`);
      }

      setRecommendations(transformedRecommendations);

      // Transform stats if available
      const transformedStats = response.data.meta ? {
        totalRecommendations: transformedRecommendations.length,
        averageMatch: transformedRecommendations.length > 0
          ? transformedRecommendations.reduce((sum, rec) => sum + rec.matchScore, 0) / transformedRecommendations.length
          : 0,
        appliedCount: 0,
        viewedCount: 0
      } : null;

      setStats(transformedStats);
    } catch (error) {
      console.error('Erreur lors du chargement des recommandations:', error);
      Alert.alert('Erreur', 'Impossible de charger les recommandations IA');
    } finally {
      setLoading(false);
    }
  }, [filterByScore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  }, [fetchRecommendations]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00C851'; // Vert
    if (score >= 60) return '#FB8500'; // Orange  
    return '#FF4444'; // Rouge
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    return 'Faible';
  };

  const handleJobPress = async (job: JobRecommendation) => {
    try {
      // Tracker l'interaction (ne pas bloquer si ça échoue)
      trackRecommendationInteraction(job.id, 'view').catch(err =>
        console.log('Tracking failed but continuing:', err.message)
      );

      // Naviguer vers les détails de l'offre
      router.push(`/(app)/job_board/job_details?id=${job.id}`);
    } catch (error) {
      console.error('Erreur lors de la navigation:', error);
      // Navigation alternative si la route principale échoue
      router.push(`/(app)/job_board/job_details?id=${job.id}`);
    }
  };

  const renderRecommendationItem = ({ item }: { item: JobRecommendation }) => {
    const publishedDate = new Date(item.publishedAt);
    const isRecent = (Date.now() - publishedDate.getTime()) < (7 * 24 * 60 * 60 * 1000);
    const scoreColor = getScoreColor(item.matchScore);

    return (
      <TouchableOpacity
        style={[styles.jobCard, {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        }]}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.7}
      >
        {/* Header avec titre et score */}
        <View style={styles.cardHeader}>
          <View style={styles.jobInfo}>
            <Text style={[styles.jobTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.companyName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.company}
            </Text>
          </View>

          <View style={[styles.scoreContainer, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreText}>{item.matchScore}%</Text>
          </View>
        </View>

        {/* Informations secondaires */}
        <View style={styles.metaInfo}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          <View style={styles.tagsContainer}>
            {isRecent && (
              <View style={[styles.tag, styles.newTag]}>
                <Text style={styles.newTagText}>Nouveau</Text>
              </View>
            )}
            {item.isRemote && (
              <View style={[styles.tag, { backgroundColor: colors.secondary + '20' }]}>
                <Text style={[styles.tagText, { color: colors.secondary }]}>
                  Remote
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Salaire si disponible */}
        {item.salary && (
          <View style={styles.salaryContainer}>
            <Ionicons name="card-outline" size={14} color={colors.primary} />
            <Text style={[styles.salaryText, { color: colors.primary }]}>
              {item.salary.min.toLocaleString()} - {item.salary.max.toLocaleString()} {item.salary.currency}
            </Text>
          </View>
        )}

        {/* Compétences correspondantes - Simplifiées */}
        {(item.skillsMatch?.matched || []).length > 0 && (
          <View style={styles.skillsContainer}>
            <Text style={[styles.skillsLabel, { color: colors.textSecondary }]}>
              {(item.skillsMatch?.matched || []).length} compétences
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.skillsList}>
                {(item.skillsMatch?.matched || []).slice(0, 3).map((skill, index) => (
                  <View
                    key={`skill-${item.id}-${index}`}
                    style={[styles.skillTag, { backgroundColor: scoreColor + '15' }]}
                  >
                    <Text style={[styles.skillTagText, { color: scoreColor }]}>
                      {skill}
                    </Text>
                  </View>
                ))}
                {(item.skillsMatch?.matched || []).length > 3 && (
                  <Text style={[styles.moreSkills, { color: colors.textSecondary }]}>
                    +{(item.skillsMatch?.matched || []).length - 3}
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Footer avec date et action */}
        <View style={styles.cardFooter}>
          <Text style={[styles.publishDate, { color: colors.textSecondary }]}>
            {format(publishedDate, 'dd MMM', { locale: fr })}
          </Text>

          <View style={[styles.actionButton, { backgroundColor: scoreColor + '15' }]}>
            <Text style={[styles.actionButtonText, { color: scoreColor }]}>
              Voir
            </Text>
            <Ionicons name="arrow-forward" size={14} color={scoreColor} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const StatsHeader = () => {
    if (!stats) return null;

    return (
      <View style={[styles.statsContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.totalRecommendations}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Offres
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: getScoreColor(stats.averageMatch) }]}>
              {stats.averageMatch.toFixed(0)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Match moyen
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.secondary }]}>
              {stats.appliedCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Candidatures
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const FilterButtons = () => {
    const filters = [
      { label: 'Toutes', value: null, icon: 'list-outline' },
      { label: '80%+', value: 80, icon: 'star' },
      { label: '60%+', value: 60, icon: 'thumbs-up-outline' },
      { label: '40%+', value: 40, icon: 'checkmark-outline' },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter, index) => {
          const isActive = filterByScore === filter.value;
          return (
            <TouchableOpacity
              key={`filter-${index}`}
              style={[
                styles.filterButton,
                {
                  backgroundColor: isActive ? colors.primary : colors.cardBackground,
                  borderColor: isActive ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setFilterByScore(filter.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={isActive ? '#FFFFFF' : colors.textSecondary}
              />
              <Text style={[
                styles.filterButtonText,
                { color: isActive ? '#FFFFFF' : colors.textSecondary }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
        <Ionicons
          name="bulb-outline"
          size={48}
          color={colors.primary}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {filterByScore !== null
          ? `Aucune offre ${filterByScore}%+`
          : 'Aucune recommandation'
        }
      </Text>

      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        {filterByScore !== null
          ? 'Essayez un filtre moins strict'
          : candidatProfile?.competences?.length > 0
            ? 'Revenez plus tard pour de nouvelles opportunités'
            : 'Complétez votre profil pour des recommandations personnalisées'
        }
      </Text>

      <View style={styles.emptyActions}>
        {filterByScore !== null && (
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setFilterByScore(null)}
          >
            <Text style={styles.emptyButtonText}>Voir toutes les offres</Text>
          </TouchableOpacity>
        )}

        {candidatProfile?.competences?.length === 0 && (
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/profile-details')}
          >
            <Text style={styles.emptyButtonText}>Compléter mon profil</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <CustomHeader
          title="Recommandations IA"
          showBackButton={false}
          rightComponent={
            <TouchableOpacity
              style={{ marginRight: 15 }}
              onPress={() => router.push('/ai-recommendations/preferences')}
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          }
        />
        
        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.id}
          renderItem={renderRecommendationItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={() => (
            <>
              <StatsHeader />
              <FilterButtons />
            </>
          )}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  // Job Card Styles
  jobCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  jobInfo: {
    flex: 1,
    paddingRight: 12,
  },

  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 24,
  },

  companyName: {
    fontSize: 14,
    fontWeight: '500',
  },

  scoreContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },

  scoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  locationText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },

  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
  },

  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  newTag: {
    backgroundColor: '#00C851',
  },

  newTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  salaryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },

  skillsContainer: {
    marginBottom: 12,
  },

  skillsLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },

  skillsList: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  skillTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },

  skillTagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  moreSkills: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  publishDate: {
    fontSize: 12,
    fontWeight: '500',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },

  // Stats Header Styles
  statsContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Filter Buttons Styles
  filtersContainer: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },

  filtersContent: {
    gap: 8,
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },

  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty State Styles
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  emptyActions: {
    gap: 12,
    width: '100%',
    maxWidth: 250,
  },

  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});