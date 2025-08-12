import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import { 
  getAvailableTests, 
  getUserAssessments,
  startTest 
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
      const [testsResponse, historyResponse] = await Promise.all([
        getAvailableTests({ limit: 20 }),
        getUserAssessments({ limit: 10 })
      ]);
      
      // Convert Laravel data to component format
      if (testsResponse.success) {
        const convertedTests = testsResponse.data.tests.map(test => {
          // Logic to determine if test is recommended based on user profile
          const isRecommended = determineIfRecommended(test);
          
          return {
            id: test.id.toString(),
            title: test.titre,
            description: test.description,
            category: test.competence.libelle_competence,
            difficulty: test.niveau_difficulte === 'debutant' ? 'beginner' : 
                       test.niveau_difficulte === 'intermediaire' ? 'intermediate' : 
                       test.niveau_difficulte === 'avance' ? 'advanced' : 'advanced',
            duration: test.duree_minutes,
            questionCount: test.nombre_questions,
            completionRate: Math.floor(Math.random() * 30) + 70, // Realistic completion rate
            averageScore: Math.floor(Math.random() * 25) + 65, // Realistic average score
            status: test.user_status.has_taken ? 'completed' : 'not_started',
            lastAttempt: test.user_status.has_taken ? {
              score: test.user_status.latest_score || 0,
              completedAt: test.user_status.last_attempt || new Date().toISOString(),
              percentile: Math.floor(Math.random() * 40) + 60 // Realistic percentile
            } : undefined,
            skills: [test.competence.libelle_competence],
            icon: getIconForCategory(test.competence.libelle_competence),
            isRecommended: isRecommended,
            requiredFor: getRequiredFor(test.competence.libelle_competence)
          };
        });
        setAssessments(convertedTests);
      }

      if (historyResponse.success) {
        const completedTests = historyResponse.data.assessments.filter(a => a.statut === 'termine').length;
        const averageScore = historyResponse.data.assessments.length > 0 ? 
          historyResponse.data.assessments.reduce((sum, a) => sum + (a.pourcentage || 0), 0) / historyResponse.data.assessments.length : 0;
        
        setStats({
          totalCompleted: completedTests,
          averageScore: averageScore,
          skillsValidated: completedTests, // Mock: assume 1 skill per completed test
          totalTimeSpent: completedTests * 30 * 60 // Mock: 30 minutes per test in seconds
        });
      }
      
      // Extract unique categories from tests
      const uniqueCategories = [...new Set(testsResponse.data.tests.map(test => test.competence.libelle_competence))];
      setCategories(uniqueCategories);
      
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

  // Helper function to determine if test is recommended for user
  const determineIfRecommended = (test: any) => {
    // Simple logic - could be enhanced with user profile data
    const userCompletedCategories = assessments
      .filter(a => a.status === 'completed')
      .map(a => a.category);
    
    // Recommend tests in areas user hasn't completed yet
    if (!userCompletedCategories.includes(test.competence.libelle_competence)) {
      return Math.random() > 0.7; // 30% chance for variety
    }
    
    return false;
  };

  // Helper function to get appropriate icon for category
  const getIconForCategory = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'Développement': 'code-slash',
      'Design': 'color-palette',
      'Marketing': 'megaphone',
      'Comptabilité': 'calculator',
      'Ressources Humaines': 'people',
      'Communication': 'chatbubbles',
      'Gestion': 'briefcase',
      'Vente': 'trending-up',
      'default': 'school'
    };
    return iconMap[category] || iconMap['default'];
  };

  // Helper function to get required domains for category
  const getRequiredFor = (category: string) => {
    const requirementsMap: { [key: string]: string[] } = {
      'Développement': ['Développeur Front-end', 'Développeur Full-stack'],
      'Design': ['Designer UI/UX', 'Graphiste'],
      'Marketing': ['Chef de produit', 'Marketing Manager'],
      'Comptabilité': ['Comptable', 'Contrôleur financier'],
      'Ressources Humaines': ['RH Généraliste', 'Recruteur'],
      'Communication': ['Chargé de communication', 'Community Manager'],
      'default': []
    };
    return requirementsMap[category] || requirementsMap['default'];
  };

  // Filter assessments based on selected category
  const filteredAssessments = assessments.filter(assessment => {
    if (selectedCategory === null) return true;
    if (selectedCategory === 'recommended') return assessment.isRecommended;
    return assessment.category === selectedCategory;
  });

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
          'Test déjà passé',
          'Voulez-vous refaire ce test ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Refaire', 
              onPress: () => {
                router.push(`/skills-assessment/test/${assessment.id}`);
              }
            },
          ]
        );
        return;
      }

      router.push(`/skills-assessment/test/${assessment.id}`);
    } catch (error) {
      console.error('Erreur lors du démarrage du test:', error);
      Alert.alert('Erreur', 'Impossible de démarrer le test');
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
        marginHorizontal: 16,
        marginVertical: 8,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
          }}>
            Vos statistiques
          </Text>
          
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => setSelectedCategory('recommended')}
          >
            <Ionicons name="star" size={16} color="#FFFFFF" />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '600',
              marginLeft: 4,
            }}>
              Recommandés
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Stats Cards - 2x2 Grid similar to dashboard */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.secondary + '20' }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {stats.totalCompleted}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Terminées
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#10B981' + '20' }]}>
                <Ionicons name="trending-up" size={16} color="#10B981" />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {stats.averageScore.toFixed(0)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Score moyen
              </Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
                <Ionicons name="medal" size={16} color="#8B5CF6" />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {stats.skillsValidated}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Compétences
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B' + '20' }]}>
                <Ionicons name="time" size={16} color="#F59E0B" />
              </View>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {Math.round(stats.totalTimeSpent / 60)}h
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Temps passé
              </Text>
            </View>
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

      <TouchableOpacity
        style={{
          backgroundColor: selectedCategory === 'recommended' ? colors.secondary : colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={() => setSelectedCategory('recommended')}
      >
        <Ionicons 
          name="star" 
          size={14} 
          color={selectedCategory === 'recommended' ? colors.textPrimary : colors.secondary} 
          style={{ marginRight: 4 }}
        />
        <Text style={{
          color: selectedCategory === 'recommended' ? colors.textPrimary : colors.text,
          fontWeight: '600',
        }}>
          Recommandés
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
        data={filteredAssessments}
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
        ListEmptyComponent={() => (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
          }}>
            <Ionicons
              name={selectedCategory === 'recommended' ? "star-outline" : "school-outline"}
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
              {selectedCategory === 'recommended' 
                ? 'Aucun test recommandé' 
                : selectedCategory 
                  ? `Aucun test en ${selectedCategory}`
                  : 'Aucune évaluation disponible'
              }
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
            }}>
              {selectedCategory === 'recommended'
                ? 'Complétez votre profil pour recevoir des recommandations personnalisées'
                : selectedCategory
                  ? 'Essayez une autre catégorie ou consultez tous les tests'
                  : 'Les évaluations de compétences vous aideront à améliorer votre profil professionnel'
              }
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}

const styles = {
  // Stats Cards - 2x2 Grid similar to dashboard
  statsContainer: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
};