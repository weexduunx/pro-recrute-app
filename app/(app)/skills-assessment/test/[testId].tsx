import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TextInput
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../components/ThemeContext';
import { useAuth } from '../../../../components/AuthProvider';
import { 
  startTest, 
  getAssessmentQuestions, 
  submitAnswer, 
  submitTest,
  cancelAssessment,
  resumeSkillAssessment
} from '../../../../utils/skills-api';
import CustomHeader from '../../../../components/CustomHeader';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Question {
  id: number;
  question: string;
  type_question: 'multiple_choice' | 'true_false' | 'text' | 'code' | 'practical' | 'qcm' | 'qcu' | 'boolean';
  options: string[] | null;
  points: number;
  ordre: number;
  answered: boolean;
  user_answer: any;
}

interface Assessment {
  id: number;
  time_remaining: number;
  progress: number;
}

interface TestData {
  id: number;
  titre: string;
  description: string;
  duree_minutes: number;
  nombre_questions: number;
  score_passage: number;
}

export default function SkillTestScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { testId, resumeAssessmentId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Test states
  const [testData, setTestData] = useState<TestData | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: any}>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTime = useRef<number>(Date.now());

  const startAssessment = useCallback(async () => {
    try {
      setStarting(true);
      const response = await startTest(testId as string);
      
      if (response.success) {
        setTestData(response.data.test);
        setAssessment({ 
          id: response.data.assessment_id,
          time_remaining: response.data.test.duree_minutes * 60,
          progress: 0 
        });
        setTimeRemaining(response.data.test.duree_minutes * 60);
        
        // Load questions
        const questionsResponse = await getAssessmentQuestions(response.data.assessment_id);
        if (questionsResponse.success) {
          setQuestions(questionsResponse.data.questions);
          questionStartTime.current = Date.now();
        }
      }
    } catch (error: any) {
      // Vérifier si c'est une erreur 409 (test déjà en cours)
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        
        if (errorData?.assessment_id) {
          const existingAssessmentId = errorData.assessment_id;
          
          // S'assurer que l'état est réinitialisé avant d'afficher l'Alert
          setStarting(false);
          setLoading(false);
          
          // Utiliser setTimeout pour s'assurer que l'Alert s'affiche après que l'état soit mis à jour
          setTimeout(() => {
            try {
              Alert.alert(
                'Test en cours',
                'Vous avez déjà un test en cours. Vous pouvez reprendre où vous vous étiez arrêté ou redémarrer complètement.',
                [
                  {
                    text: 'Annuler',
                    style: 'cancel',
                    onPress: () => {
                      console.log('Utilisateur a choisi Annuler');
                      router.back();
                    }
                  },
                  {
                    text: 'Reprendre',
                    onPress: () => {
                      console.log('Utilisateur a choisi Reprendre');
                      setStarting(true);
                      resumeExistingAssessment(existingAssessmentId);
                    }
                  },
                  {
                    text: 'Redémarrer',
                    onPress: () => {
                      console.log('Utilisateur a choisi Redémarrer');
                      setStarting(true);
                      restartAssessment(existingAssessmentId);
                    }
                  }
                ]
              );
            } catch (alertError) {
              console.error('Erreur lors de l\'affichage de l\'Alert:', alertError);
            }
          }, 100);
          return;
        } else {
          Alert.alert(
            'Test en cours', 
            'Vous avez déjà un test en cours. Veuillez terminer le test en cours avant d\'en commencer un nouveau.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setStarting(false);
                  setLoading(false);
                  router.back();
                }
              }
            ]
          );
          return;
        }
      } else {
        // Pour les autres erreurs (non 409)
        console.error('Erreur lors du démarrage du test:', error);
      }
      
      Alert.alert('Erreur', 'Impossible de démarrer le test');
      setStarting(false);
      setLoading(false);
    }
  }, [testId]);

  const resumeExistingAssessment = useCallback(async (assessmentId: number) => {
    try {
      console.log('Tentative de reprise avec assessment ID:', assessmentId);
      
      // Utiliser le nouveau endpoint resumeSkillAssessment
      const resumeResponse = await resumeSkillAssessment(assessmentId);
      console.log('Réponse de reprise:', resumeResponse);
      
      if (resumeResponse.success) {
        const assessmentData = resumeResponse.data;
        
        setAssessment({ 
          id: assessmentData.assessment_id,
          time_remaining: assessmentData.time_remaining,
          progress: assessmentData.progress
        });
        
        setTestData(assessmentData.test);
        setTimeRemaining(assessmentData.time_remaining);
        
        console.log('Assessment ID:', assessmentData.assessment_id);
        console.log('Temps restant:', assessmentData.time_remaining);
        console.log('Progrès:', assessmentData.progress);
        
        // Charger les questions
        const questionsResponse = await getAssessmentQuestions(assessmentData.assessment_id);
        if (questionsResponse.success) {
          setQuestions(questionsResponse.data.questions);
          console.log('Questions configurées:', questionsResponse.data.questions.length);
          
          // Restaurer les réponses existantes si disponibles
          if (assessmentData.existing_answers) {
            setAnswers(assessmentData.existing_answers);
            console.log('Réponses existantes restaurées:', Object.keys(assessmentData.existing_answers).length);
            
            // Calculer la question courante basée sur les réponses
            const answeredQuestions = Object.keys(assessmentData.existing_answers).length;
            setCurrentQuestionIndex(Math.min(answeredQuestions, questionsResponse.data.questions.length - 1));
            console.log('Question courante définie à:', answeredQuestions);
          } else {
            // Aucune réponse existante, commencer au début
            setAnswers({});
            setCurrentQuestionIndex(0);
          }
          
          questionStartTime.current = Date.now();
          console.log('Test repris avec succès');
        }
      } else {
        console.error('Échec de reprise:', resumeResponse);
        throw new Error(resumeResponse.message || 'Impossible de reprendre le test');
      }
    } catch (error: any) {
      console.error('Erreur lors de la reprise du test:', error);
      console.error('Détails de l\'erreur:', error.response?.data || error.message);
      
      // Afficher une erreur spécifique selon le type d'erreur
      let errorMessage = 'Impossible de reprendre le test.';
      if (error.response?.status === 404) {
        errorMessage = 'Le test demandé n\'existe pas ou n\'est plus disponible.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Vous n\'avez pas l\'autorisation d\'accéder à ce test.';
      } else if (error.response?.status === 400) {
        const responseData = error.response?.data;
        if (responseData?.reason) {
          errorMessage = responseData.reason;
        }
      }
      
      Alert.alert('Erreur', errorMessage + ' Nous allons vous rediriger vers la liste des tests.');
      router.back();
    } finally {
      setStarting(false);
      setLoading(false);
    }
  }, []);

  const restartAssessment = useCallback(async (existingAssessmentId: number) => {
    try {
      console.log('Tentative de redémarrage avec assessment ID existant:', existingAssessmentId);
      
      // D'abord, essayer d'annuler l'assessment existant
      try {
        console.log('Annulation de l\'assessment existant...');
        await cancelAssessment(existingAssessmentId);
        console.log('Assessment annulé avec succès');
      } catch (cancelError: any) {
        console.warn('Impossible d\'annuler l\'assessment existant:', cancelError.response?.data || cancelError.message);
        // Si l'annulation échoue, essayer quand même de reprendre
        await resumeExistingAssessment(existingAssessmentId);
        return;
      }
      
      // Ensuite, démarrer un nouveau test
      console.log('Démarrage d\'un nouveau test...');
      const response = await startTest(testId as string);
      
      if (response.success) {
        setTestData(response.data.test);
        setAssessment({ 
          id: response.data.assessment_id,
          time_remaining: response.data.test.duree_minutes * 60,
          progress: 0 
        });
        setTimeRemaining(response.data.test.duree_minutes * 60);
        setAnswers({}); // Réinitialiser les réponses
        setCurrentQuestionIndex(0); // Recommencer à la première question
        
        // Charger les questions
        const questionsResponse = await getAssessmentQuestions(response.data.assessment_id);
        if (questionsResponse.success) {
          setQuestions(questionsResponse.data.questions);
          questionStartTime.current = Date.now();
          console.log('Test redémarré avec succès');
        }
      }
      
    } catch (error: any) {
      console.error('Erreur lors du redémarrage du test:', error);
      
      Alert.alert(
        'Impossible de redémarrer',
        'Le test ne peut pas être redémarré pour le moment. Nous allons vous rediriger vers la liste des tests.',
        [
          {
            text: 'OK',
            onPress: () => {
              setStarting(false);
              setLoading(false);
              router.back();
            }
          }
        ]
      );
      return;
    } finally {
      setStarting(false);
      setLoading(false);
    }
  }, [testId, resumeExistingAssessment]);

  useEffect(() => {
    if (testId) {
      // Si on a un resumeAssessmentId depuis l'index, reprendre directement l'assessment
      if (resumeAssessmentId) {
        console.log('Reprise directe de l\'assessment:', resumeAssessmentId);
        resumeExistingAssessment(Number(resumeAssessmentId));
      } else {
        startAssessment();
      }
    }
  }, [testId, resumeAssessmentId, startAssessment, resumeExistingAssessment]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && assessment) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, assessment]);

  const handleTimeUp = () => {
    Alert.alert(
      'Temps écoulé',
      'Le temps imparti pour ce test est écoulé. Vos réponses seront automatiquement soumises.',
      [
        {
          text: 'OK',
          onPress: () => handleSubmitTest()
        }
      ]
    );
  };

  const handleAnswer = async (answer: any) => {
    if (!assessment || !questions[currentQuestionIndex]) return;
    
    const question = questions[currentQuestionIndex];
    const timeTaken = Math.round((Date.now() - questionStartTime.current) / 1000);
    
    try {
      // Update local state
      setAnswers(prev => ({
        ...prev,
        [question.id]: answer
      }));

      // Submit answer to backend
      await submitAnswer(assessment.id, question.id, answer, timeTaken);
      
      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        questionStartTime.current = Date.now();
      } else {
        // All questions answered, show completion options
        Alert.alert(
          'Test terminé',
          'Vous avez répondu à toutes les questions. Voulez-vous soumettre votre test ?',
          [
            { text: 'Revoir les réponses', style: 'cancel' },
            { text: 'Soumettre', onPress: handleSubmitTest }
          ]
        );
      }
    } catch (error: any) {
      console.error('Erreur lors de la soumission de la réponse:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder votre réponse');
    }
  };

  const handleSubmitTest = async () => {
    if (!assessment) return;

    setSubmitting(true);
    try {
      const response = await submitTest(assessment.id);
      if (response.success) {
        router.replace(`/skills-assessment/results/${assessment.id}`);
      }
    } catch (error: any) {
      console.error('Erreur lors de la soumission du test:', error);
      Alert.alert('Erreur', 'Impossible de soumettre le test');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      questionStartTime.current = Date.now();
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      questionStartTime.current = Date.now();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const percentage = timeRemaining / ((testData?.duree_minutes || 1) * 60);
    if (percentage > 0.5) return '#10B981';
    if (percentage > 0.25) return '#F59E0B';
    return '#EF4444';
  };

  // Helper function to extract text and value from options (can be string or object)
  const getOptionData = (option: any) => {
    if (typeof option === 'string') {
      return { text: option, value: option };
    }
    if (typeof option === 'object' && option !== null) {
      return {
        text: option.text || option.label || option.value || String(option),
        value: option.value || option.text || option.label || String(option)
      };
    }
    return { text: String(option), value: String(option) };
  };

  const renderQuestion = () => {
    if (!questions[currentQuestionIndex]) return null;
    
    const question = questions[currentQuestionIndex];
    const currentAnswer = answers[question.id];
    
    // Debug log pour voir la structure des options
    console.log('Question options:', question.options);

    return (
      <View style={styles.questionContainer}>
        <Text style={[styles.questionText, { color: colors.primary }]}>
          {question.question}
        </Text>

        {(question.type_question === 'multiple_choice' || question.type_question === 'qcm') && question.options && (
          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => {
              const { text: optionText, value: optionValue } = getOptionData(option);
              
              // Pour les questions à choix multiple, on peut avoir plusieurs réponses
              const isSelected = question.type_question === 'multiple_choice' 
                ? (Array.isArray(currentAnswer) ? currentAnswer.includes(optionValue) : currentAnswer === optionValue)
                : (Array.isArray(currentAnswer) && currentAnswer.includes(optionValue));
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: isSelected ? colors.secondary + '20' : colors.background,
                      borderColor: isSelected ? colors.secondary : '#E5E7EB'
                    }
                  ]}
                  onPress={() => {
                    // Si c'est une question 'multiple_choice', on traite comme choix unique
                    if (question.type_question === 'multiple_choice') {
                      handleAnswer(optionValue);
                    } else {
                      // Sinon, traitement multiple choice classique
                      let newAnswer = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
                      if (isSelected) {
                        newAnswer = newAnswer.filter(a => a !== optionValue);
                      } else {
                        newAnswer.push(optionValue);
                      }
                      handleAnswer(newAnswer);
                    }
                  }}
                >
                  <View style={[
                    question.type_question === 'multiple_choice' ? styles.optionRadio : styles.optionCheckbox,
                    {
                      backgroundColor: isSelected ? colors.secondary : 'transparent',
                      borderColor: isSelected ? colors.secondary : '#9CA3AF'
                    }
                  ]}>
                    {isSelected && (
                      question.type_question === 'multiple_choice' 
                        ? <View style={[styles.optionRadioDot, { backgroundColor: colors.secondary }]} />
                        : <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[
                    styles.optionText,
                    { color: isSelected ? colors.secondary : colors.textSecondary }
                  ]}>
                    {optionText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {(question.type_question === 'qcu') && question.options && (
          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => {
              const { text: optionText, value: optionValue } = getOptionData(option);
              
              const isSelected = currentAnswer === optionValue;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: isSelected ? colors.secondary + '20' : colors.background,
                      borderColor: isSelected ? colors.secondary : '#E5E7EB'
                    }
                  ]}
                  onPress={() => handleAnswer(optionValue)}
                >
                  <View style={[
                    styles.optionRadio,
                    {
                      borderColor: isSelected ? colors.secondary : '#9CA3AF'
                    }
                  ]}>
                    {isSelected && (
                      <View style={[
                        styles.optionRadioDot,
                        { backgroundColor: colors.secondary }
                      ]} />
                    )}
                  </View>
                  <Text style={[
                    styles.optionText,
                    { color: isSelected ? colors.secondary : colors.textSecondary }
                  ]}>
                    {optionText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {(question.type_question === 'true_false' || question.type_question === 'boolean') && (
          <View style={styles.booleanContainer}>
            {[true, false].map((value) => {
              const isSelected = currentAnswer === value;
              const label = value ? 'Vrai' : 'Faux';
              
              return (
                <TouchableOpacity
                  key={value.toString()}
                  style={[
                    styles.booleanButton,
                    { 
                      backgroundColor: isSelected ? colors.secondary : '#F3F4F6',
                      borderColor: isSelected ? colors.secondary : '#E5E7EB'
                    }
                  ]}
                  onPress={() => handleAnswer(value)}
                >
                  <Text style={[
                    styles.booleanText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary }
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {(question.type_question === 'text' || question.type_question === 'code') && (
          <View style={styles.textInputContainer}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: '#E5E7EB',
                  color: colors.text,
                  minHeight: question.type_question === 'code' ? 150 : 100,
                }
              ]}
              multiline
              placeholder={question.type_question === 'code' 
                ? "Entrez votre code ici..." 
                : "Entrez votre réponse ici..."}
              placeholderTextColor={colors.textSecondary}
              value={currentAnswer || ''}
              onChangeText={(text) => setAnswers(prev => ({
                ...prev,
                [question.id]: text
              }))}
              textAlignVertical="top"
              fontSize={question.type_question === 'code' ? 14 : 16}
              fontFamily={question.type_question === 'code' ? 'monospace' : undefined}
            />
            <TouchableOpacity
              style={[
                styles.submitTextButton,
                { 
                  backgroundColor: currentAnswer && currentAnswer.trim() ? colors.secondary : '#E5E7EB',
                }
              ]}
              onPress={() => handleAnswer(currentAnswer)}
              disabled={!currentAnswer || !currentAnswer.trim()}
            >
              <Text style={[
                styles.submitTextButtonText,
                { 
                  color: currentAnswer && currentAnswer.trim() ? '#FFFFFF' : '#9CA3AF'
                }
              ]}>
                Valider la réponse
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading || starting) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <CustomHeader title="Chargement du test..." showBackButton={true} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {starting ? 'Démarrage du test...' : 'Chargement...'}
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!assessment || !testData || questions.length === 0) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <CustomHeader title="Erreur" showBackButton={true} />
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              Impossible de charger le test.
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
          title={testData.titre}
          showBackButton={true}
          rightComponent={
            <TouchableOpacity onPress={() => {
              Alert.alert(
                'Quitter le test',
                'Êtes-vous sûr de vouloir quitter ? Votre progression sera perdue.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Quitter', style: 'destructive', onPress: () => router.back() }
                ]
              );
            }}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          }
        />

        {/* Timer and Progress */}
        <View style={[styles.timerContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.timerInfo}>
            <View style={styles.timerBox}>
              <Ionicons name="time" size={20} color={getTimeColor()} />
              <Text style={[styles.timerText, { color: getTimeColor() }]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
            
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              Question {currentQuestionIndex + 1} sur {questions.length}
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[colors.secondary, colors.secondary + 'CC']}
              style={[
                styles.progressFill,
                { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
              ]}
            />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderQuestion()}
        </ScrollView>

        {/* Navigation */}
        <View style={[styles.navigationContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.navButton,
              { 
                backgroundColor: currentQuestionIndex > 0 ? colors.background : '#F3F4F6',
                borderColor: currentQuestionIndex > 0 ? colors.textSecondary : '#E5E7EB'
              }
            ]}
            onPress={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons 
              name="chevron-back" 
              size={20} 
              color={currentQuestionIndex > 0 ? colors.textSecondary : '#9CA3AF'} 
            />
            <Text style={[
              styles.navButtonText,
              { color: currentQuestionIndex > 0 ? colors.textSecondary : '#9CA3AF' }
            ]}>
              Précédent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              { 
                backgroundColor: currentQuestionIndex < questions.length - 1 ? colors.secondary : '#10B981',
              }
            ]}
            onPress={currentQuestionIndex < questions.length - 1 ? handleNextQuestion : handleSubmitTest}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={[styles.navButtonText, { color: '#FFFFFF' }]}>
                  {currentQuestionIndex < questions.length - 1 ? 'Suivant' : 'Terminer'}
                </Text>
                <Ionicons 
                  name={currentQuestionIndex < questions.length - 1 ? "chevron-forward" : "checkmark"} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </>
            )}
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
  timerContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timerInfo: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  timerBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginLeft: 8,
  },
  progressText: {
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
  },
  optionCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  booleanContainer: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  booleanButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  booleanText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  navigationContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    justifyContent: 'center' as const,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginHorizontal: 8,
  },
  textInputContainer: {
    marginTop: 8,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  submitTextButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  submitTextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
};