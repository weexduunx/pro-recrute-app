import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView } from 'react-native';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CustomHeader from '../../../components/CustomHeader';

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

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAIJobRecommendations({
        minScore: filterByScore,
        limit: 20
      });
      setRecommendations(response.data.recommendations || []);
      setStats(response.data.stats || null);
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
      // Tracker l'interaction
      await trackRecommendationInteraction(job.id, 'view');
      router.push(`/job_board/job_details?id=${job.id}`);
    } catch (error) {
      console.error('Erreur lors du tracking:', error);
      // Naviguer quand même
      router.push(`/job_board/job_details?id=${job.id}`);
    }
  };

  const renderRecommendationItem = ({ item }: { item: JobRecommendation }) => {
    const publishedDate = new Date(item.publishedAt);
    const isRecent = (Date.now() - publishedDate.getTime()) < (7 * 24 * 60 * 60 * 1000);

    return (
      <TouchableOpacity
        style={{
          backgroundColor: colors.surface,
          marginHorizontal: 16,
          marginVertical: 8,
          padding: 16,
          borderRadius: 12,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderLeftWidth: 4,
          borderLeftColor: getScoreColor(item.matchScore),
        }}
        onPress={() => handleJobPress(item)}
      >
        {/* En-tête avec score */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
              {item.title}
            </Text>
            <Text style={{
              fontSize: 16,
              color: colors.textSecondary,
              marginBottom: 4,
            }}>
              {item.company}
            </Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <View style={{
              backgroundColor: getScoreColor(item.matchScore),
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginBottom: 4,
            }}>
              <Text style={{
                color: 'white',
                fontSize: 14,
                fontWeight: 'bold',
              }}>
                {item.matchScore}%
              </Text>
            </View>
            <Text style={{
              color: colors.textSecondary,
              fontSize: 12,
            }}>
              {getScoreLabel(item.matchScore)}
            </Text>
          </View>
        </View>

        {/* Informations de base */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={{ marginLeft: 6, color: colors.textSecondary, fontSize: 14, flex: 1 }}>
            {item.location}
          </Text>
          {item.isRemote && (
            <View style={{
              backgroundColor: colors.secondary + '20',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
              marginLeft: 8,
            }}>
              <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: '600' }}>
                Télétravail
              </Text>
            </View>
          )}
          {isRecent && (
            <View style={{
              backgroundColor: '#00C851',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
              marginLeft: 8,
            }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                Nouveau
              </Text>
            </View>
          )}
        </View>

        {/* Salaire si disponible */}
        {item.salary && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
            <Text style={{ marginLeft: 6, color: colors.textSecondary, fontSize: 14 }}>
              {item.salary.min.toLocaleString()} - {item.salary.max.toLocaleString()} {item.salary.currency}
            </Text>
          </View>
        )}

        {/* Raisons de correspondance */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 6,
          }}>
            Pourquoi cette offre vous correspond :
          </Text>
          {item.matchReasons.slice(0, 2).map((reason, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="checkmark-circle" size={16} color={getScoreColor(item.matchScore)} />
              <Text style={{
                marginLeft: 8,
                color: colors.textSecondary,
                fontSize: 13,
                flex: 1,
              }}>
                {reason}
              </Text>
            </View>
          ))}
        </View>

        {/* Compétences correspondantes */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 6,
          }}>
            Compétences correspondantes ({item.skillsMatch.matched.length}):
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {item.skillsMatch.matched.slice(0, 4).map((skill, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: colors.secondary + '20',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginRight: 8,
                  }}
                >
                  <Text style={{
                    color: colors.secondary,
                    fontSize: 12,
                    fontWeight: '600',
                  }}>
                    {skill}
                  </Text>
                </View>
              ))}
              {item.skillsMatch.matched.length > 4 && (
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    +{item.skillsMatch.matched.length - 4} autres
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{
            color: colors.textSecondary,
            fontSize: 12,
          }}>
            Publié {format(publishedDate, 'dd/MM', { locale: fr })}
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => handleJobPress(item)}
          >
            <Text style={{
              color: colors.textPrimary,
              fontWeight: '600',
              marginRight: 6,
            }}>
              Voir les détails
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const StatsHeader = () => {
    if (!stats) return null;

    return (
      <View style={{
        backgroundColor: colors.surface,
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 12,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 12,
        }}>
          Vos statistiques IA
        </Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
              {stats.totalRecommendations}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Recommandations
            </Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
              {stats.averageMatch.toFixed(0)}%
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Correspondance moy.
            </Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
              {stats.appliedCount}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Candidatures
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const FilterButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={{ paddingHorizontal: 16, marginVertical: 8 }}
    >
      {[
        { label: 'Toutes', value: null },
        { label: 'Excellentes (80%+)', value: 80 },
        { label: 'Bonnes (60%+)', value: 60 },
        { label: 'Moyennes (40%+)', value: 40 },
      ].map((filter, index) => (
        <TouchableOpacity
          key={index}
          style={{
            backgroundColor: filterByScore === filter.value ? colors.secondary : colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginRight: 8,
          }}
          onPress={() => setFilterByScore(filter.value)}
        >
          <Text style={{
            color: filterByScore === filter.value ? colors.textPrimary : colors.text,
            fontWeight: '600',
          }}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const EmptyState = () => (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    }}>
      <Ionicons
        name="bulb-outline"
        size={64}
        color={colors.textSecondary}
        style={{ marginBottom: 16 }}
      />
      <Text style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
      }}>
        Aucune recommandation disponible
      </Text>
      <Text style={{
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
      }}>
        Complétez votre profil pour obtenir de meilleures recommandations personnalisées
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: colors.secondary,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 25,
        }}
        onPress={() => router.push('/profile-details')}
      >
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
          Compléter mon profil
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CustomHeader 
        title="Recommandations IA" 
        showBackButton={false}
        rightComponent={
          <TouchableOpacity
            style={{ marginRight: 15 }}
            onPress={() => router.push('/ai-recommendations/preferences')}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
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
    </View>
  );
}