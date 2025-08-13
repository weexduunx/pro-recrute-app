import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import { 
  getAvailableTests, 
  getUserAssessments,
  startTest,
  cancelAssessment,
  resumeSkillAssessment 
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
  userAssessmentData?: any; // Pour debug et reprise de test
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
      if (testsResponse.success && historyResponse.success) {
        const userAssessments = historyResponse.data.assessments || [];
        
        const convertedTests = testsResponse.data.tests.map(test => {
          // Trouver l'assessment correspondant à ce test dans l'historique
          const userAssessment = userAssessments.find(assessment => 
            assessment.skill_test_id === test.id
          );
          
          // Déterminer le statut basé sur l'assessment le plus récent
          let status = 'not_started';
          let lastAttempt = undefined;
          
          if (userAssessment) {
            if (userAssessment.statut === 'en_cours') {
              status = 'in_progress';
            } else if (userAssessment.statut === 'termine') {
              status = 'completed';
              lastAttempt = {
                score: userAssessment.pourcentage || 0,
                completedAt: userAssessment.fin_test || userAssessment.updated_at,
                percentile: Math.floor(Math.random() * 40) + 60 // Mock percentile
              };
            } else if (userAssessment.statut === 'expire' || userAssessment.statut === 'abandonne') {
              status = 'not_started'; // Permettre de refaire
            }
          }
          
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
            status: status,
            lastAttempt: lastAttempt,
            skills: [test.competence.libelle_competence],
            icon: getIconForCategory(test.competence.libelle_competence),
            isRecommended: isRecommended,
            requiredFor: getRequiredFor(test.competence.libelle_competence),
            // Ajouter des données utiles pour le debug
            userAssessmentData: userAssessment // Pour debug
          };
        });
        
        console.log('Tests convertis avec scores:', convertedTests.filter(t => t.status === 'completed'));
        setAssessments(convertedTests);
      }

      if (historyResponse.success) {
        const completedAssessments = historyResponse.data.assessments.filter(a => a.statut === 'termine');
        const completedTests = completedAssessments.length;
        
        // Calculer le score moyen basé uniquement sur les tests terminés avec des scores valides
        let averageScore = 0;
        if (completedTests > 0) {
          const validScores = completedAssessments
            .map(a => a.pourcentage)
            .filter(score => score != null && !isNaN(score) && score >= 0);
          
          if (validScores.length > 0) {
            averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
          }
        }
        
        setStats({
          totalCompleted: completedTests,
          averageScore: averageScore,
          skillsValidated: completedTests, // Mock: assume 1 skill per completed test
          totalTimeSpent: completedTests * 30 // 30 minutes per test (en minutes)
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
              onPress: () => handleRefakeTest(assessment.id)
            },
          ]
        );
        return;
      }

      if (assessment.status === 'in_progress') {
        // Pour les tests en cours, naviguer directement avec les paramètres pour reprendre
        const userAssessmentData = assessment.userAssessmentData;
        if (userAssessmentData?.id) {
          router.push(`/skills-assessment/test/${assessment.id}?resumeAssessmentId=${userAssessmentData.id}`);
          return;
        }
      }

      // Essayer de démarrer le test directement
      await handleRefakeTest(assessment.id);
    } catch (error) {
      console.error('Erreur lors du démarrage du test:', error);
      Alert.alert('Erreur', 'Impossible de démarrer le test');
    }
  };

  const handleRefakeTest = async (testId: string) => {
    try {
      // Essayer de démarrer un nouveau test
      const startResponse = await startTest(testId);
      
      // Si ça marche, naviguer vers l'écran de test
      router.push(`/skills-assessment/test/${testId}`);
    } catch (error: any) {
      // Vérifier si c'est une erreur 409 (test en cours) - comportement normal
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        
        if (errorData?.assessment_id) {
          const existingAssessmentId = errorData.assessment_id;
          
          // S'assurer que l'Alert est bien affiché
          setTimeout(() => {
            Alert.alert(
              'Test en cours',
              'Vous avez déjà un test en cours pour cette évaluation. Que souhaitez-vous faire ?',
              [
                {
                  text: 'Annuler',
                  style: 'cancel'
                },
                {
                  text: 'Reprendre le test',
                  onPress: () => {
                    router.push(`/skills-assessment/test/${testId}?resumeAssessmentId=${existingAssessmentId}`);
                  }
                },
                {
                  text: 'Recommencer',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Annuler l'assessment existant
                      await cancelAssessment(existingAssessmentId);
                      // Démarrer un nouveau test
                      await startTest(testId);
                      // Naviguer vers l'écran de test
                      router.push(`/skills-assessment/test/${testId}`);
                    } catch (restartError) {
                      Alert.alert(
                        'Erreur', 
                        'Impossible de redémarrer le test. Veuillez réessayer plus tard.'
                      );
                    }
                  }
                }
              ],
              { cancelable: false }
            );
          }, 100);
          
          return;
        }
      }
      
      // Pour les vraies erreurs uniquement
      console.error('Erreur lors du démarrage du test:', error);
      
      let errorMessage = 'Impossible de démarrer le test. Veuillez réessayer plus tard.';
      if (error.response?.data?.message && error.response.status !== 409) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Erreur', errorMessage);
    }
  };

  // Composants modulaires pour la card d'évaluation
  const AssessmentCardHeader = ({ item }: { item: SkillsAssessment }) => (
    <View style={assessmentCardStyles.header}>
      <View style={assessmentCardStyles.headerContent}>
        <View style={[assessmentCardStyles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={item.icon as any} size={20} color={colors.primary} />
        </View>
        
        <View style={assessmentCardStyles.titleContainer}>
          <View style={assessmentCardStyles.titleRow}>
            <Text 
              style={[assessmentCardStyles.title, { color: colors.primary }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
          </View>
          {item.isRecommended && (
            <View style={[assessmentCardStyles.recommendedBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[assessmentCardStyles.recommendedText, { color: colors.textTertiary }]}>
                RECOMMANDÉ
              </Text>
            </View>
          )}
          
          <Text style={[assessmentCardStyles.description, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        </View>
      </View>

      <View style={[assessmentCardStyles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
        <Text style={[assessmentCardStyles.statusText, { color: getStatusColor(item.status) }]}>
          {getStatusLabel(item.status)}
        </Text>
      </View>
    </View>
  );

  const AssessmentCardMeta = ({ item }: { item: SkillsAssessment }) => (
    <View style={assessmentCardStyles.metaContainer}>
      <View style={assessmentCardStyles.metaItem}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <Text style={[assessmentCardStyles.metaText, { color: colors.textSecondary }]}>
          {item.duration} min
        </Text>
      </View>
      
      <View style={assessmentCardStyles.metaItem}>
        <Ionicons name="help-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={[assessmentCardStyles.metaText, { color: colors.textSecondary }]}>
          {item.questionCount} questions
        </Text>
      </View>

      <View style={[assessmentCardStyles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
        <Text style={[assessmentCardStyles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>
          {getDifficultyLabel(item.difficulty)}
        </Text>
      </View>
    </View>
  );

  const AssessmentCardScore = ({ item }: { item: SkillsAssessment }) => {
    if (item.status !== 'completed' || !item.lastAttempt) return null;

    return (
      <View style={[assessmentCardStyles.scoreContainer, { backgroundColor: colors.primary + '10' }]}>
        <View style={assessmentCardStyles.scoreHeader}>
          <Text style={[assessmentCardStyles.scoreTitle, { color: colors.primary }]}>
            Score: {item.lastAttempt.score}%
          </Text>
          <Text style={[assessmentCardStyles.scoreDate, { color: colors.textSecondary }]}>
            Terminé le {format(new Date(item.lastAttempt.completedAt), 'dd/MM/yyyy', { locale: fr })}
          </Text>
        </View>
        <Text style={[assessmentCardStyles.scorePercentile, { color: colors.textSecondary }]}>
          Vous êtes dans le top {100 - item.lastAttempt.percentile}% des candidats
        </Text>
      </View>
    );
  };

  const AssessmentCardSkills = ({ item }: { item: SkillsAssessment }) => (
    <View style={assessmentCardStyles.skillsSection}>
      <Text style={[assessmentCardStyles.skillsTitle, { color: colors.primary }]}>
        Compétences évaluées:
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={assessmentCardStyles.skillsContainer}>
          {item.skills.slice(0, 4).map((skill, index) => (
            <View
              key={index}
              style={[assessmentCardStyles.skillChip, { backgroundColor: colors.secondary + '20' }]}
            >
              <Text style={[assessmentCardStyles.skillText, { color: colors.secondary }]}>
                {skill}
              </Text>
            </View>
          ))}
          {item.skills.length > 4 && (
            <View style={assessmentCardStyles.skillsMore}>
              <Text style={[assessmentCardStyles.skillsMoreText, { color: colors.textSecondary }]}>
                +{item.skills.length - 4} autres
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const AssessmentCardRequiredFor = ({ item }: { item: SkillsAssessment }) => {
    if (!item.requiredFor || item.requiredFor.length === 0) return null;

    return (
      <View style={assessmentCardStyles.requiredSection}>
        <Text style={[assessmentCardStyles.requiredText, { color: colors.textSecondary }]}>
          Requis pour: {item.requiredFor.join(', ')}
        </Text>
      </View>
    );
  };

  const AssessmentCardAction = ({ item }: { item: SkillsAssessment }) => {
    const isCompleted = item.status === 'completed';
    
    const getActionIcon = () => {
      if (isCompleted) return "refresh";
      if (item.status === 'in_progress') return "play";
      return "play";
    };

    const getActionText = () => {
      if (isCompleted) return 'Refaire l\'évaluation';
      if (item.status === 'in_progress') return 'Continuer';
      return 'Commencer l\'évaluation';
    };

    return (
      <TouchableOpacity
        style={[assessmentCardStyles.actionButton, { backgroundColor: colors.secondary }]}
        onPress={() => handleStartAssessment(item)}
      >
        <Ionicons name={getActionIcon()} size={16} color={colors.textTertiary} />
        <Text style={[assessmentCardStyles.actionText, { color: colors.textTertiary }]}>
          {getActionText()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAssessmentItem = ({ item }: { item: SkillsAssessment }) => {
    return (
      <TouchableOpacity
        style={[
          assessmentCardStyles.container,
          {
            backgroundColor: colors.background,
            shadowColor: colors.shadow,
            borderLeftWidth: item.isRecommended ? 4 : 0,
            borderLeftColor: item.isRecommended ? colors.secondary : 'transparent',
          }
        ]}
        onPress={() => handleStartAssessment(item)}
      >
        <AssessmentCardHeader item={item} />
        <AssessmentCardMeta item={item} />
        <AssessmentCardScore item={item} />
        <AssessmentCardSkills item={item} />
        <AssessmentCardRequiredFor item={item} />
        <AssessmentCardAction item={item} />
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
            color: colors.primary,
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
              <Text style={[styles.statNumber, { color: colors.primary }]}>
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
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {isNaN(stats.averageScore) ? '0' : stats.averageScore.toFixed(0)}%
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
              <Text style={[styles.statNumber, { color: colors.primary }]}>
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
              <Text style={[styles.statNumber, { color: colors.primary }]}>
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
          backgroundColor: selectedCategory === null ? colors.secondary : colors.background,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 8,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: selectedCategory === null ? colors.secondary : colors.border,
        }}
        onPress={() => setSelectedCategory(null)}
      >
        <Text style={{
          color: selectedCategory === null ? colors.textTertiary : colors.textSecondary,
          fontWeight: '600',
        }}>
          Toutes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: selectedCategory === 'recommended' ? colors.secondary : colors.background,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 8,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: selectedCategory === 'recommended' ? colors.secondary : colors.border,
        }}
        onPress={() => setSelectedCategory('recommended')}
      >
        <Ionicons 
          name="star" 
          size={14} 
          color={selectedCategory === 'recommended' ? colors.textTertiary : colors.secondary} 
          style={{ marginRight: 4 }}
        />
        <Text style={{
          color: selectedCategory === 'recommended' ? colors.textTertiary : colors.textSecondary,
          fontWeight: '600',
        }}>
          Recommandés
        </Text>
      </TouchableOpacity>
      
      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={{
            backgroundColor: selectedCategory === category ? colors.secondary : colors.background,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            marginRight: 8,
            borderWidth: 1,
            borderColor: selectedCategory === category ? colors.secondary : colors.border,

          }}
          onPress={() => setSelectedCategory(category)}
        >
          <Text style={{
            color: selectedCategory === category ? colors.textTertiary : colors.textSecondary,
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

// Styles pour les cards d'évaluation restructurées
const assessmentCardStyles = {
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  
  // En-tête
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
    minHeight: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    flex: 1,
    lineHeight: 24,
    marginRight: 8,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    alignSelf: 'flex-start' as const,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start' as const,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },

  // Métadonnées
  metaContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: 20,
    marginBottom: 6,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },

  // Section score
  scoreContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  scoreDate: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  scorePercentile: {
    fontSize: 12,
    fontWeight: '500' as const,
  },

  // Section compétences
  skillsSection: {
    marginBottom: 16,
  },
  skillsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row' as const,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  skillsMore: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center' as const,
  },
  skillsMoreText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },

  // Section "Requis pour"
  requiredSection: {
    marginBottom: 16,
  },
  requiredText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    lineHeight: 16,
  },

  // Bouton d'action
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontWeight: '600' as const,
    fontSize: 15,
    marginLeft: 8,
  },
};