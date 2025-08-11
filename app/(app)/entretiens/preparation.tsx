import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Linking, Alert } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader';
import { useTheme } from '../../../components/ThemeContext';

interface ConseilItem {
  id: string;
  titre: string;
  description: string;
  icone: string;
  couleur: string;
  contenu: string[];
}

interface ChecklistItem {
  id: string;
  titre: string;
  fait: boolean;
}

export default function EntretiensPreparationScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'conseils' | 'checklist' | 'questions' | 'ressources'>('conseils');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', titre: 'Rechercher l\'entreprise et son secteur d\'activité', fait: false },
    { id: '2', titre: 'Relire attentivement l\'offre d\'emploi', fait: false },
    { id: '3', titre: 'Préparer des questions à poser au recruteur', fait: false },
    { id: '4', titre: 'Réviser son CV et ses expériences', fait: false },
    { id: '5', titre: 'Préparer des exemples concrets de réalisations', fait: false },
    { id: '6', titre: 'Choisir une tenue professionnelle', fait: false },
    { id: '7', titre: 'Préparer les documents nécessaires', fait: false },
    { id: '8', titre: 'Tester la connexion Internet (entretien en ligne)', fait: false },
    { id: '9', titre: 'Préparer l\'espace pour l\'entretien', fait: false },
    { id: '10', titre: 'Se reposer suffisamment la veille', fait: false },
  ]);

  const conseils: ConseilItem[] = [
    {
      id: '1',
      titre: 'Avant l\'entretien',
      description: 'Préparation essentielle pour réussir',
      icone: 'clock',
      couleur: '#3B82F6',
      contenu: [
        'Recherchez l\'entreprise : histoire, valeurs, actualités récentes',
        'Analysez le poste : missions, compétences requises, évolutions possibles',
        'Préparez vos arguments : pourquoi vous, pourquoi cette entreprise ?',
        'Préparez des exemples concrets de vos réalisations (méthode STAR)',
        'Anticipez les questions classiques et préparez vos réponses',
        'Préparez vos propres questions sur le poste et l\'entreprise'
      ]
    },
    {
      id: '2',
      titre: 'Pendant l\'entretien',
      description: 'Conseils pour bien se présenter',
      icone: 'handshake',
      couleur: '#10B981',
      contenu: [
        'Arrivez 5-10 minutes en avance (pas plus)',
        'Soignez votre présentation et votre posture',
        'Maintenez un contact visuel avec le recruteur',
        'Écoutez activement les questions posées',
        'Répondez de manière structurée avec des exemples',
        'Montrez votre motivation et votre intérêt',
        'Posez vos questions préparées',
        'Prenez des notes si nécessaire'
      ]
    },
    {
      id: '3',
      titre: 'Après l\'entretien',
      description: 'Suivi et bonnes pratiques',
      icone: 'paper-plane',
      couleur: '#8B5CF6',
      contenu: [
        'Envoyez un email de remerciement dans les 24h',
        'Réitérez votre intérêt pour le poste',
        'Apportez des précisions si nécessaire',
        'Respectez les délais de réponse annoncés',
        'Faites un bilan : points positifs et à améliorer',
        'Continuez vos recherches en parallèle'
      ]
    },
    {
      id: '4',
      titre: 'Gestion du stress',
      description: 'Techniques pour rester serein',
      icone: 'heart',
      couleur: '#F59E0B',
      contenu: [
        'Pratiquez des exercices de respiration',
        'Visualisez positivement l\'entretien',
        'Arrivez reposé et bien préparé',
        'Transformez le stress en énergie positive',
        'Rappelez-vous que c\'est un échange mutuel',
        'Gardez confiance en vos compétences'
      ]
    }
  ];

  const questionsFrequentes = [
    {
      categorie: 'Questions sur vous',
      questions: [
        'Parlez-moi de vous',
        'Quelles sont vos principales qualités ?',
        'Quel est votre plus grand défaut ?',
        'Où vous voyez-vous dans 5 ans ?',
        'Pourquoi avez-vous choisi ce domaine ?'
      ]
    },
    {
      categorie: 'Questions sur l\'entreprise',
      questions: [
        'Pourquoi voulez-vous travailler chez nous ?',
        'Que savez-vous de notre entreprise ?',
        'Qu\'est-ce qui vous attire dans ce poste ?',
        'Comment pouvez-vous contribuer à notre équipe ?',
        'Pourquoi quittez-vous votre emploi actuel ?'
      ]
    },
    {
      categorie: 'Questions techniques',
      questions: [
        'Décrivez-moi une situation difficile que vous avez gérée',
        'Donnez un exemple de projet dont vous êtes fier',
        'Comment gérez-vous la pression ?',
        'Quelle est votre méthode de travail ?',
        'Comment vous tenez-vous au courant des évolutions de votre secteur ?'
      ]
    }
  ];

  const ressourcesUtiles = [
    {
      titre: 'Guide complet de l\'entretien d\'embauche',
      type: 'Article',
      icone: 'book-open',
      couleur: '#3B82F6',
      url: 'https://www.exemple.com/guide-entretien'
    },
    {
      titre: 'Méthode STAR pour structurer vos réponses',
      type: 'Vidéo',
      icone: 'play-circle',
      couleur: '#EF4444',
      url: 'https://www.exemple.com/methode-star'
    },
    {
      titre: 'Simulateur d\'entretien en ligne',
      type: 'Outil',
      icone: 'laptop',
      couleur: '#10B981',
      url: 'https://www.exemple.com/simulateur'
    },
    {
      titre: 'Questions à poser en entretien',
      type: 'Liste',
      icone: 'list-ul',
      couleur: '#8B5CF6',
      url: 'https://www.exemple.com/questions'
    }
  ];

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, fait: !item.fait } : item
      )
    );
  };

  const getChecklistProgress = () => {
    const completed = checklist.filter(item => item.fait).length;
    return Math.round((completed / checklist.length) * 100);
  };

  const handleResourcePress = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
    }
  };

  const renderConseils = () => (
    <View style={styles.tabContent}>
      {conseils.map((conseil) => (
        <View key={conseil.id} style={styles.conseilCard}>
          <View style={styles.conseilHeader}>
            <View style={[styles.conseilIcon, { backgroundColor: conseil.couleur }]}>
              <FontAwesome5 name={conseil.icone as any} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.conseilHeaderText}>
              <Text style={styles.conseilTitre}>{conseil.titre}</Text>
              <Text style={styles.conseilDescription}>{conseil.description}</Text>
            </View>
          </View>
          
          <View style={styles.conseilContenu}>
            {conseil.contenu.map((point, index) => (
              <View key={index} style={styles.conseilPoint}>
                <FontAwesome5 name="check-circle" size={16} color={conseil.couleur} />
                <Text style={styles.conseilPointText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );

  const renderChecklist = () => {
    const progress = getChecklistProgress();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progression de votre préparation</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {checklist.filter(item => item.fait).length} sur {checklist.length} tâches terminées
          </Text>
        </View>

        {checklist.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.checklistItem, item.fait && styles.checklistItemDone]}
            onPress={() => toggleChecklistItem(item.id)}
          >
            <FontAwesome5 
              name={item.fait ? "check-circle" : "circle"} 
              size={20} 
              color={item.fait ? "#10B981" : "#D1D5DB"} 
            />
            <Text style={[
              styles.checklistItemText,
              item.fait && styles.checklistItemTextDone
            ]}>
              {item.titre}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderQuestions = () => (
    <View style={styles.tabContent}>
      {questionsFrequentes.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.questionSection}>
          <Text style={styles.questionSectionTitle}>{section.categorie}</Text>
          {section.questions.map((question, questionIndex) => (
            <View key={questionIndex} style={styles.questionItem}>
              <FontAwesome5 name="question-circle" size={16} color="#6B7280" />
              <Text style={styles.questionText}>{question}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  const renderRessources = () => (
    <View style={styles.tabContent}>
      {ressourcesUtiles.map((ressource, index) => (
        <TouchableOpacity
          key={index}
          style={styles.ressourceCard}
          onPress={() => handleResourcePress(ressource.url)}
        >
          <View style={[styles.ressourceIcon, { backgroundColor: ressource.couleur }]}>
            <FontAwesome5 name={ressource.icone as any} size={20} color="#FFFFFF" />
          </View>
          <View style={styles.ressourceContent}>
            <Text style={styles.ressourceTitre}>{ressource.titre}</Text>
            <Text style={styles.ressourceType}>{ressource.type}</Text>
          </View>
          <FontAwesome5 name="external-link-alt" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'conseils': return renderConseils();
      case 'checklist': return renderChecklist();
      case 'questions': return renderQuestions();
      case 'ressources': return renderRessources();
      default: return renderConseils();
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Préparation d'Entretien"
          user={user}
          showBackButton={true}
        />

        {/* Onglets */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'conseils' && styles.activeTab]}
              onPress={() => setActiveTab('conseils')}
            >
              <FontAwesome5 
                name="lightbulb" 
                size={16} 
                color={activeTab === 'conseils' ? '#FFFFFF' : '#6B7280'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'conseils' && styles.activeTabText
              ]}>
                Conseils
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'checklist' && styles.activeTab]}
              onPress={() => setActiveTab('checklist')}
            >
              <FontAwesome5 
                name="tasks" 
                size={16} 
                color={activeTab === 'checklist' ? '#FFFFFF' : '#6B7280'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'checklist' && styles.activeTabText
              ]}>
                Checklist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'questions' && styles.activeTab]}
              onPress={() => setActiveTab('questions')}
            >
              <FontAwesome5 
                name="question-circle" 
                size={16} 
                color={activeTab === 'questions' ? '#FFFFFF' : '#6B7280'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'questions' && styles.activeTabText
              ]}>
                Questions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'ressources' && styles.activeTab]}
              onPress={() => setActiveTab('ressources')}
            >
              <FontAwesome5 
                name="book" 
                size={16} 
                color={activeTab === 'ressources' ? '#FFFFFF' : '#6B7280'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'ressources' && styles.activeTabText
              ]}>
                Ressources
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderTabContent()}
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

  // Onglets
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#091e60',
    borderColor: '#091e60',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Contenu des onglets
  tabContent: {
    padding: 20,
  },

  // Conseils
  conseilCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  conseilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  conseilIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  conseilHeaderText: {
    flex: 1,
  },
  conseilTitre: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 4,
  },
  conseilDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  conseilContenu: {
    gap: 12,
  },
  conseilPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  conseilPointText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 12,
  },

  // Checklist
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  checklistItemDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  checklistItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    lineHeight: 20,
  },
  checklistItemTextDone: {
    color: '#059669',
    textDecorationLine: 'line-through',
  },

  // Questions
  questionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  questionSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 16,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 12,
  },

  // Ressources
  ressourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  ressourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ressourceContent: {
    flex: 1,
  },
  ressourceTitre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 4,
  },
  ressourceType: {
    fontSize: 14,
    color: '#6B7280',
  },
});