import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Share
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../components/ThemeContext';
import { useAuth } from '../../../../components/AuthProvider';
import { getAssessmentResults, startTest, cancelAssessment } from '../../../../utils/skills-api';
import CustomHeader from '../../../../components/CustomHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AssessmentResult {
  assessment: {
    id: number;
    status: string;
    started_at: string;
    completed_at: string;
    duration_minutes: number;
    score: number;
    percentage: number;
    passed: boolean;
    passing_score: number;
  };
  test: {
    id: number;
    titre: string;
    competence: string;
    niveau_difficulte: string;
  };
  detailed_results: any;
  recommendations: string[];
  answers: Array<{
    question: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
    points_earned: number;
    max_points: number;
    explanation: string;
  }>;
}

export default function SkillAssessmentResultsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { assessmentId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'recommendations'>('overview');

  useEffect(() => {
    fetchResults();
  }, [assessmentId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await getAssessmentResults(assessmentId as string);
      
      if (response.success) {
        setResults(response.data);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des résultats:', error);
      Alert.alert('Erreur', 'Impossible de charger les résultats');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage: number, passed: boolean) => {
    if (passed) return '#10B981';
    if (percentage >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const getDifficultyColor = (niveau: string) => {
    switch (niveau) {
      case 'debutant': return '#10B981';
      case 'intermediaire': return '#F59E0B';
      case 'avance': return '#EF4444';
      case 'expert': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const handleRetakeTest = async () => {
    if (!results) return;

    const testId = results.test.id.toString();

    try {
      // Essayer de démarrer un nouveau test
      await startTest(testId);
      // Si ça marche, naviguer vers l'écran de test
      router.push(`/skills-assessment/test/${testId}`);
    } catch (error: any) {
      console.error('Erreur lors du redémarrage du test:', error);
      
      // Vérifier si c'est une erreur 409 (test en cours)
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        console.log('Erreur 409 détectée depuis les résultats:', errorData);
        
        if (errorData?.assessment_id) {
          const existingAssessmentId = errorData.assessment_id;
          
          Alert.alert(
            'Test en cours',
            'Un autre test est en cours. Que voulez-vous faire ?',
            [
              {
                text: 'Annuler',
                style: 'cancel'
              },
              {
                text: 'Redémarrer',
                onPress: async () => {
                  try {
                    // Annuler l'assessment existant
                    await cancelAssessment(existingAssessmentId);
                    // Démarrer un nouveau test
                    await startTest(testId);
                    // Naviguer vers l'écran de test
                    router.push(`/skills-assessment/test/${testId}`);
                  } catch (restartError) {
                    console.error('Erreur lors du redémarrage:', restartError);
                    Alert.alert('Erreur', 'Impossible de redémarrer le test');
                  }
                }
              }
            ]
          );
          return;
        }
      }
      
      Alert.alert('Erreur', 'Impossible de redémarrer le test');
    }
  };

  const handleShare = async () => {
    if (!results) return;

    const shareMessage = `
🎯 Résultats de mon test de compétences

📋 Test: ${results.test.titre}
🏆 Score: ${results.assessment.percentage}%
${results.assessment.passed ? '✅ Réussi' : '❌ Échoué'}
⏱️ Durée: ${results.assessment.duration_minutes} minutes

📱 Testé via Pro-Recrute
`.trim();

    try {
      await Share.share({
        message: shareMessage,
        title: 'Résultats de test de compétences'
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  const renderOverview = () => {
    if (!results) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <LinearGradient
          colors={[
            getScoreColor(results.assessment.percentage, results.assessment.passed),
            getScoreColor(results.assessment.percentage, results.assessment.passed) + 'CC'
          ]}
          style={styles.scoreCard}
        >
          <View style={styles.scoreContent}>
            <MaterialCommunityIcons 
              name={results.assessment.passed ? "trophy" : "target"} 
              size={48} 
              color="#FFFFFF" 
            />
            <Text style={styles.scoreTitle}>
              {results.assessment.passed ? 'Félicitations !' : 'Continuez vos efforts !'}
            </Text>
            <Text style={styles.scorePercentage}>
              {results.assessment.percentage}%
            </Text>
            <Text style={styles.scoreSubtitle}>
              {results.assessment.score} / {results.answers.reduce((total, answer) => total + answer.max_points, 0)} points
            </Text>
            
            <View style={styles.passStatus}>
              <Ionicons 
                name={results.assessment.passed ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.passStatusText}>
                {results.assessment.passed 
                  ? `Réussi (${results.assessment.passing_score}% requis)`
                  : `Échoué (${results.assessment.passing_score}% requis)`
                }
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Test Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            Informations du test
          </Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="document-text" size={20} color={colors.textSecondary} />
              <View style={styles.infoItemContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Test</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {results.test.titre}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="school" size={20} color={colors.textSecondary} />
              <View style={styles.infoItemContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Compétence</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {results.test.competence}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={[
                styles.difficultyBadge,
                { backgroundColor: getDifficultyColor(results.test.niveau_difficulte) + '20' }
              ]}>
                <View style={[
                  styles.difficultyDot,
                  { backgroundColor: getDifficultyColor(results.test.niveau_difficulte) }
                ]} />
              </View>
              <View style={styles.infoItemContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Niveau</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {results.test.niveau_difficulte.charAt(0).toUpperCase() + results.test.niveau_difficulte.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color={colors.textSecondary} />
              <View style={styles.infoItemContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Durée</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {results.assessment.duration_minutes} minutes
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color={colors.textSecondary} />
              <View style={styles.infoItemContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {format(new Date(results.assessment.completed_at), 'dd MMMM yyyy', { locale: fr })}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="help-circle" size={20} color={colors.textSecondary} />
              <View style={styles.infoItemContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Questions</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {results.answers.length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Performance Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsTitle, { color: colors.primary }]}>
            Performance
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {results.answers.filter(a => a.is_correct).length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correctes</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {results.answers.filter(a => !a.is_correct).length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Incorrectes</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.secondary }]}>
                {Math.round((results.answers.filter(a => a.is_correct).length / results.answers.length) * 100)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Précision</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderDetails = () => {
    if (!results) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {results.answers.map((answer, index) => (
          <View key={index} style={[styles.questionCard, { backgroundColor: colors.surface }]}>
            <View style={styles.questionHeader}>
              <Text style={[styles.questionNumber, { color: colors.textSecondary }]}>
                Question {index + 1}
              </Text>
              <View style={[
                styles.correctnessBadge,
                { backgroundColor: answer.is_correct ? '#10B981' : '#EF4444' }
              ]}>
                <Ionicons 
                  name={answer.is_correct ? "checkmark" : "close"} 
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.correctnessText}>
                  {answer.points_earned} / {answer.max_points} pts
                </Text>
              </View>
            </View>

            <Text style={[styles.questionText, { color: colors.primary }]}>
              {answer.question}
            </Text>

            <View style={styles.answerSection}>
              <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>
                Votre réponse:
              </Text>
              <Text style={[
                styles.answerText,
                { color: answer.is_correct ? '#10B981' : '#EF4444' }
              ]}>
                {answer.user_answer}
              </Text>
            </View>

            {!answer.is_correct && (
              <View style={styles.answerSection}>
                <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>
                  Bonne réponse:
                </Text>
                <Text style={[styles.answerText, { color: '#10B981' }]}>
                  {answer.correct_answer}
                </Text>
              </View>
            )}

            {answer.explanation && (
              <View style={styles.explanationSection}>
                <Text style={[styles.explanationLabel, { color: colors.textSecondary }]}>
                  Explication:
                </Text>
                <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                  {answer.explanation}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderRecommendations = () => {
    if (!results || !results.recommendations.length) {
      return (
        <View style={styles.emptyRecommendations}>
          <MaterialCommunityIcons name="lightbulb-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucune recommandation disponible pour ce test.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {results.recommendations.map((recommendation, index) => (
          <View key={index} style={[styles.recommendationCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="lightbulb" size={24} color={colors.secondary} />
            <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
              {recommendation}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <CustomHeader title="Résultats" showBackButton={true} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement des résultats...
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!results) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <CustomHeader title="Erreur" showBackButton={true} />
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              Impossible de charger les résultats.
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader 
          title="Résultats du Test"
          showBackButton={true}
          rightComponent={
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          }
        />

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
          {[
            { key: 'overview', label: 'Aperçu', icon: 'analytics' },
            { key: 'details', label: 'Détails', icon: 'list' },
            { key: 'recommendations', label: 'Conseils', icon: 'bulb' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && [styles.activeTab, { backgroundColor: colors.secondary }]
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={activeTab === tab.key ? '#FFFFFF' : colors.textSecondary} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#FFFFFF' : colors.textSecondary }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'recommendations' && renderRecommendations()}

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.textSecondary }]}
            onPress={() => router.push('/skills-assessment')}
          >
            <Ionicons name="list" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
              Autres tests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={handleRetakeTest}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
              Refaire le test
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center' as const,
  },
  tabsContainer: {
    flexDirection: 'row' as const,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  scoreCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden' as const,
  },
  scoreContent: {
    padding: 24,
    alignItems: 'center' as const,
  },
  scoreTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  scorePercentage: {
    fontSize: 48,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scoreSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 16,
  },
  passStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  passStatusText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  infoItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  difficultyBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },
  statItem: {
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  questionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  correctnessBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  correctnessText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
    lineHeight: 22,
  },
  answerSection: {
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  explanationSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyRecommendations: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 16,
  },
  recommendationCard: {
    flexDirection: 'row' as const,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
};