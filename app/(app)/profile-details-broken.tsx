import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import CustomHeader from '../../components/CustomHeader';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import {
  getCandidatProfile,
  getInterimProfile,
} from '../../utils/api';

const { width } = Dimensions.get('window');

// Types pour les profils
interface ProfileStats {
  completionPercentage: number;
  totalSections: number;
  completedSections: number;
}

interface ProfileAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  route?: string;
  action?: () => void;
  color: string;
  badge?: string | number;
}

export default function ProfileDetailsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    completionPercentage: 0,
    totalSections: 0,
    completedSections: 0
  });

  // Détermine le type d'utilisateur
  const isInterim = user?.role === 'interimaire';
  const isCandidate = user?.role === 'user';

  // Actions pour les candidats
  const candidateActions: ProfileAction[] = [
    {
      id: 'personal_info',
      title: 'Informations personnelles',
      description: 'Nom, téléphone, adresse, photo',
      icon: 'person',
      route: '/(app)/profile/personal',
      color: '#3B82F6',
    },
    {
      id: 'professional_title',
      title: 'Titre professionnel',
      description: 'Définir votre objectif de carrière',
      icon: 'work',
      route: '/(app)/profile/title',
      color: '#10B981',
    },
    {
      id: 'skills',
      title: 'Compétences',
      description: 'Technologies et savoir-faire',
      icon: 'star',
      route: '/(app)/profile/skills',
      color: '#F59E0B',
    },
    {
      id: 'experience',
      title: 'Expériences',
      description: 'Parcours professionnel',
      icon: 'business',
      route: '/(app)/profile/experience',
      color: '#8B5CF6',
    },
    {
      id: 'education',
      title: 'Formations',
      description: 'Diplômes et certifications',
      icon: 'school',
      route: '/(app)/profile/education',
      color: '#EF4444',
    },
    {
      id: 'cv',
      title: 'CV & Documents',
      description: 'Télécharger et gérer votre CV',
      icon: 'document',
      route: '/(app)/profile/cv',
      color: '#06B6D4',
    },
  ];

  // Actions pour les intérimaires
  const interimActions: ProfileAction[] = [
    {
      id: 'personal_info',
      title: 'Informations personnelles',
      description: 'Données personnelles et contact',
      icon: 'person',
      route: '/(app)/profile/interim/personal',
      color: '#3B82F6',
    },
    {
      id: 'availability',
      title: 'Disponibilité',
      description: 'Créneaux et préférences',
      icon: 'calendar',
      route: '/(app)/profile/interim/availability',
      color: '#10B981',
    },
    {
      id: 'contracts',
      title: 'Contrats',
      description: 'Historique des missions',
      icon: 'description',
      route: '/(app)/(interimaire)/contrats',
      color: '#F59E0B',
    },
    {
      id: 'certificates',
      title: 'Attestations',
      description: 'Documents et certificats',
      icon: 'verified',
      route: '/(app)/(interimaire)/attestations',
      color: '#8B5CF6',
    },
    {
      id: 'medical',
      title: 'Couverture médicale',
      description: 'Gestion IPM et soins',
      icon: 'medical',
      route: '/(app)/(interimaire)/ipm',
      color: '#EF4444',
    },
  ];

  const currentActions = isInterim ? interimActions : candidateActions;

  // Chargement des données de profil
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      
      if (isInterim) {
        data = await getInterimProfile();
      } else {
        data = await getCandidatProfile();
      }

      setProfileData(data);
      calculateProfileStats(data);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du profil');
    } finally {
      setLoading(false);
    }
  }, [isInterim]);

  // Calcul des statistiques du profil
  const calculateProfileStats = (data: any) => {
    if (!data) return;

    let completedSections = 0;
    const totalSections = currentActions.length;

    // Logique spécifique selon le type de profil
    if (isCandidate) {
      if (data.telephone && data.date_naissance) completedSections++;
      if (data.titreProfil) completedSections++;
      if (data.competences && data.competences.length > 0) completedSections++;
      if (data.experiences && data.experiences.length > 0) completedSections++;
      if (data.formations && data.formations.length > 0) completedSections++;
      if (data.parsed_cv || data.cv_file) completedSections++;
    } else if (isInterim) {
      if (data.telephone && data.date_naissance) completedSections++;
      if (data.disponibilite) completedSections++;
      // Ajouter d'autres vérifications pour intérimaires
    }

    const completionPercentage = Math.round((completedSections / totalSections) * 100);

    setProfileStats({
      completionPercentage,
      totalSections,
      completedSections
    });
  };

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Composant de progression du profil
  const renderProfileProgress = () => (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressTitle}>Complétude du profil</Text>
          <Text style={styles.progressPercentage}>{profileStats.completionPercentage}%</Text>
        </View>
        <View style={[
          styles.progressCircle, 
          { backgroundColor: getProgressColor(profileStats.completionPercentage) }
        ]}>
          <Text style={styles.progressCircleText}>
            {profileStats.completedSections}/{profileStats.totalSections}
          </Text>
        </View>
      </View>
      
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressBarFill, 
            { 
              width: `${profileStats.completionPercentage}%`,
              backgroundColor: getProgressColor(profileStats.completionPercentage)
            }
          ]} 
        />
      </View>
      
      <Text style={styles.progressDescription}>
        {profileStats.completionPercentage === 100 
          ? '🎉 Profil complet ! Vous maximisez vos chances'
          : `Complétez ${profileStats.totalSections - profileStats.completedSections} section${profileStats.totalSections - profileStats.completedSections > 1 ? 's' : ''} pour optimiser votre profil`
        }
      </Text>
    </View>
  );

  // Couleur selon le pourcentage
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return '#10B981'; // Vert
    if (percentage >= 50) return '#F59E0B'; // Orange
    return '#EF4444'; // Rouge
  };

  // Composant d'action du profil
  const renderProfileAction = (action: ProfileAction) => (
    <TouchableOpacity
      key={action.id}
      style={styles.actionCard}
      onPress={() => {
        if (action.route) {
          router.push(action.route as any);
        } else if (action.action) {
          action.action();
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.actionHeader}>
        <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
          <MaterialIcons name={action.icon as any} size={24} color={action.color} />
        </View>
        {action.badge && (
          <View style={[styles.actionBadge, { backgroundColor: action.color }]}>
            <Text style={styles.actionBadgeText}>{action.badge}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionDescription}>{action.description}</Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  // Actions rapides selon le rôle
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(app)/settings')}>
          <Ionicons name="settings-outline" size={24} color="#6B7280" />
          <Text style={styles.quickActionText}>Paramètres</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(app)/help')}>
          <Ionicons name="help-circle-outline" size={24} color="#6B7280" />
          <Text style={styles.quickActionText}>Aide</Text>
        </TouchableOpacity>
        
        {isCandidate && (
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(app)/candidature')}>
            <Ionicons name="briefcase-outline" size={24} color="#6B7280" />
            <Text style={styles.quickActionText}>Candidatures</Text>
          </TouchableOpacity>
        )}
        
        {isInterim && (
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/(app)/(interimaire)/dashboard')}>
            <Ionicons name="stats-chart-outline" size={24} color="#6B7280" />
            <Text style={styles.quickActionText}>Tableau de bord</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Mon profil" showBackButton onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f8e35" />
          <Text style={styles.loadingText}>Chargement de votre profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Mon profil" showBackButton onBackPress={() => router.back()} />
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* En-tête utilisateur */}
          <View style={styles.userHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
              <Text style={styles.userRole}>
                {isInterim ? 'Intérimaire' : 'Candidat'}
              </Text>
            </View>
          </View>

          {/* Progression du profil */}
          {renderProfileProgress()}

          {/* Sections du profil */}
          <View style={styles.sectionsContainer}>
            <Text style={styles.sectionTitle}>Gérer mon profil</Text>
            {currentActions.map(renderProfileAction)}
          </View>

          {/* Actions rapides */}
          {renderQuickActions()}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // En-tête utilisateur
  userHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#091e60',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#6B7280',
  },

  // Progression du profil
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sections
  sectionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionHeader: {
    marginRight: 12,
    position: 'relative',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Actions rapides
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#FFFFFF',
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});