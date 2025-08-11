import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import { 
  getSkillsAssessments, 
  getAssessmentCategories,
  startAssessment 
} from '../../../utils/skills-api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CustomHeader from '../../../components/CustomHeader';

interface SkillsAssessment {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  questionCount: number;
  completionRate: number;
  averageScore: number;
  status: 'not_started' | 'in_progress' | 'completed';
  lastAttempt?: {
    score: number;
    completedAt: string;
    percentile: number;
  };
  skills: string[];
  icon: string;
  isRecommended: boolean;
  requiredFor?: string[];
}

interface AssessmentStats {
  totalCompleted: number;
  averageScore: number;
  skillsValidated: number;
  totalTimeSpent: number;
}

export default function SkillsAssessmentScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<SkillsAssessment[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentsResponse, categoriesResponse] = await Promise.all([
        getSkillsAssessments({ category: selectedCategory }),
        getAssessmentCategories()
      ]);
      
      setAssessments(assessmentsResponse.data.assessments || []);
      setStats(assessmentsResponse.data.stats || null);
      setCategories(categoriesResponse.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des évaluations:', error);
      Alert.alert('Erreur', 'Impossible de charger les évaluations de compétences');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAssessments();
    setRefreshing(false);
  }, [fetchAssessments]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '#00C851';
      case 'intermediate':
        return '#FB8500';
      case 'advanced':
        return '#FF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Débutant';
      case 'intermediate':
        return 'Intermédiaire';
      case 'advanced':
        return 'Avancé';
      default:
        return difficulty;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#00C851';
      case 'in_progress':
        return '#FB8500';
      case 'not_started':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'not_started':
        return 'Non commencé';
      default:
        return status;
    }
  };

  const handleStartAssessment = async (assessment: SkillsAssessment) => {
    try {
      if (assessment.status === 'completed') {
        Alert.alert(
          'Évaluation terminée',
          'Voulez-vous refaire cette évaluation ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Refaire', 
              onPress: async () => {
                const response = await startAssessment(assessment.id);
                router.push(`/skills-assessment/assessment/${response.data.sessionId}`);
              }
            },
          ]
        );
        return;
      }

      const response = await startAssessment(assessment.id);
      router.push(`/skills-assessment/assessment/${response.data.sessionId}`);
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'évaluation:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'évaluation');
    }
  };

  const renderAssessmentItem = ({ item }: { item: SkillsAssessment }) => {
    const isCompleted = item.status === 'completed';
    
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
          borderLeftWidth: item.isRecommended ? 4 : 0,
          borderLeftColor: item.isRecommended ? colors.secondary : 'transparent',
        }}
        onPress={() => handleStartAssessment(item)}
      >
        {/* En-tête */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
            </View>
            
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: colors.text,
                  flex: 1,
                }}>
                  {item.title}
                </Text>
                {item.isRecommended && (
                  <View style={{
                    backgroundColor: colors.secondary,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    marginLeft: 8,
                  }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: 'bold' }}>
                      RECOMMANDÉ
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: 8,
              }}>
                {item.description}
              </Text>
            </View>
          </View>

          <View style={{
            backgroundColor: getStatusColor(item.status) + '20',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{
              color: getStatusColor(item.status),
              fontSize: 12,
              fontWeight: '600',
            }}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Informations de base */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={{ marginLeft: 4, color: colors.textSecondary, fontSize: 14 }}>
              {item.duration} min
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
            <Ionicons name="help-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={{ marginLeft: 4, color: colors.textSecondary, fontSize: 14 }}>
              {item.questionCount} questions
            </Text>
          </View>

          <View style={{
            backgroundColor: getDifficultyColor(item.difficulty) + '20',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
          }}>
            <Text style={{
              color: getDifficultyColor(item.difficulty),
              fontSize: 12,
              fontWeight: '600',
            }}>
              {getDifficultyLabel(item.difficulty)}
            </Text>
          </View>
        </View>

        {/* Score si terminé */}
        {isCompleted && item.lastAttempt && (
          <View style={{
            backgroundColor: colors.primary + '10',
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: colors.text,
              }}>
                Score: {item.lastAttempt.score}%
              </Text>
              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
              }}>
                Terminé le {format(new Date(item.lastAttempt.completedAt), 'dd/MM/yyyy', { locale: fr })}
              </Text>
            </View>
            <Text style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 4,
            }}>
              Vous êtes dans le top {100 - item.lastAttempt.percentile}% des candidats
            </Text>
          </View>
        )}

        {/* Compétences évaluées */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 6,
          }}>
            Compétences évaluées:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {item.skills.slice(0, 4).map((skill, index) => (
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
              {item.skills.length > 4 && (
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    +{item.skills.length - 4} autres
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Requis pour */}
        {item.requiredFor && item.requiredFor.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{
              fontSize: 12,
              color: colors.textSecondary,
            }}>
              Requis pour: {item.requiredFor.join(', ')}
            </Text>
          </View>
        )}

        {/* Action */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.secondary,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 25,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => handleStartAssessment(item)}
        >
          <Ionicons 
            name={isCompleted ? "refresh" : item.status === 'in_progress' ? "play" : "play"} 
            size={16} 
            color={colors.textPrimary} 
          />
          <Text style={{
            color: colors.textPrimary,
            fontWeight: '600',
            marginLeft: 8,
          }}>
            {isCompleted ? 'Refaire l\'évaluation' : 
             item.status === 'in_progress' ? 'Continuer' : 'Commencer l\'évaluation'}
          </Text>
        </TouchableOpacity>
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
          Vos statistiques
        </Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
              {stats.totalCompleted}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Évaluations terminées
            </Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
              {stats.averageScore.toFixed(0)}%
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Score moyen
            </Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
              {stats.skillsValidated}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Compétences validées
            </Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
              {Math.round(stats.totalTimeSpent / 60)}h
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Temps passé
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const CategoryFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={{ paddingHorizontal: 16, marginVertical: 8 }}
    >
      <TouchableOpacity
        style={{
          backgroundColor: selectedCategory === null ? colors.secondary : colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 8,
        }}
        onPress={() => setSelectedCategory(null)}
      >
        <Text style={{
          color: selectedCategory === null ? colors.textPrimary : colors.text,
          fontWeight: '600',
        }}>
          Toutes
        </Text>
      </TouchableOpacity>
      
      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={{
            backgroundColor: selectedCategory === category ? colors.secondary : colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginRight: 8,
          }}
          onPress={() => setSelectedCategory(category)}
        >
          <Text style={{
            color: selectedCategory === category ? colors.textPrimary : colors.text,
            fontWeight: '600',
          }}>
            {category}
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
        name="school-outline"
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
        Aucune évaluation disponible
      </Text>
      <Text style={{
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
      }}>
        Les évaluations de compétences vous aideront à améliorer votre profil professionnel
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CustomHeader title="Évaluations de compétences" showBackButton={false} />
      
      <FlatList
        data={assessments}
        keyExtractor={(item) => item.id}
        renderItem={renderAssessmentItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={() => (
          <>
            <StatsHeader />
            <CategoryFilters />
          </>
        )}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}