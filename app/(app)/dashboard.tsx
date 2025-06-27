import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, ActivityIndicator, Alert,StatusBar } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getUserApplications, getRecommendedOffres } from '../../utils/api'; 
import { router } from 'expo-router';
import CustomHeader from '../../components/CustomHeader';

/**
 * Écran du Tableau de bord de l'utilisateur :
 * Interface minimaliste et intuitive avec une UX améliorée.
 * Conserve la palette de couleurs et la structure fonctionnelle.
 */
export default function DashboardScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  type Application = {
    id: string;
    etat: string;
    offre?: {
      poste?: {
        titre_poste?: string;
      };
    };
    // Ajoutez d'autres propriétés si nécessaire
  };

  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [recommendedOffres, setRecommendedOffres] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  const loadApplications = useCallback(async () => {
    if (user) {
      setLoadingApplications(true);
      try {
        const fetchedApplications = await getUserApplications();
        setApplications(fetchedApplications);
      } catch (error: any) {
        console.error("Erreur de chargement des candidatures:", error);
      } finally {
        setLoadingApplications(false);
      }
    } else {
      setApplications([]);
      setLoadingApplications(false);
    }
  }, [user]);

  const loadRecommendations = useCallback(async () => {
    if (user) {
      setLoadingRecommendations(true);
      try {
        const fetchedRecommendations = await getRecommendedOffres();
        setRecommendedOffres(fetchedRecommendations);
      } catch (error: any) {
        console.error("Erreur de chargement des recommandations:", error);
      } finally {
        setLoadingRecommendations(false);
      }
    } else {
      setRecommendedOffres([]);
      setLoadingRecommendations(false);
    }
  }, [user]);

  useEffect(() => {
    loadApplications();
    loadRecommendations();
  }, [user, loadApplications, loadRecommendations]);

  const handleRecommendedOffrePress = (offreId: string) => {
    router.push(`/(app)/job_board/job_details?id=${offreId}`);
  };

  const handleMenuPress = () => { /* ... */ };
  const handleAvatarPress = () => { /* ... */ };

  const getStatusColor = (etat: string) => {
    console.log('Dashboard: Statut de candidature pour couleur:', etat); // LOG DE DÉBOGAGE
    switch (etat) {
      case 'En attente': return '#F59E0B'; // Doit correspondre exactement à l'accesseur Laravel
      case 'Acceptée': return '#10B981';
      case 'Refusée': return '#EF4444';
      default: return '#6B7280'; // Couleur par défaut
    }
  };

  // N'a pas besoin de changement si getStatusColor est ajusté
  const getStatusText = (etat: string) => {
    switch (etat) {
      case 'En attente': return 'En attente';
      case 'Acceptée': return 'Acceptée';
      case 'Refusée': return 'Refusée';
      default: return etat;
    }
  };

  return (
    <>
     <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        title="Tableau de bord"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - Bienvenue */}
        <View style={styles.heroSection}>
          <Text style={styles.welcomeText}>Bonjour {user?.name?.split(' ')[0] || 'Utilisateur'} 👋</Text>
          <Text style={styles.heroSubtext}>Voici un aperçu de votre activité</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FontAwesome5 name="briefcase" size={16} color="#091e60" />
            </View>
            <Text style={styles.statNumber}>{applications.length}</Text>
            <Text style={styles.statLabel}>Candidatures</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FontAwesome5 name="star" size={16} color="#0f8e35" />
            </View>
            <Text style={styles.statNumber}>{recommendedOffres.length}</Text>
            <Text style={styles.statLabel}>Recommandations</Text>
          </View>
        </View>

        {/* Section Mes Candidatures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes candidatures</Text>
            {applications.length > 0 && (
              <TouchableOpacity style={styles.viewAllLink}>
                <Text style={styles.viewAllText}>Voir tout</Text>
                <FontAwesome5 name="arrow-right" size={12} color="#0f8e35" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          {loadingApplications ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0f8e35" />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : applications.length > 0 ? (
            <View style={styles.listContainer}>
              {applications.slice(0, 3).map(app => (
                <View key={app.id} style={styles.listItem}>
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle} numberOfLines={1}>
                      {app.offre?.poste?.titre_poste || 'Titre de l\'offre inconnu'}
                    </Text>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(app.etat) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(app.etat) }]}>
                        {getStatusText(app.etat)}
                      </Text>
                    </View>
                  </View>
                  <FontAwesome5 name="chevron-right" size={12} color="#9CA3AF" />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="folder-open" size={24} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>Aucune candidature</Text>
              <Text style={styles.emptyStateText}>Vos candidatures apparaîtront ici</Text>
            </View>
          )}
        </View>

        {/* Section Offres Recommandées */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommandées pour vous</Text>
            {recommendedOffres.length > 0 && (
              <TouchableOpacity style={styles.viewAllLink}>
                <Text style={styles.viewAllText}>Voir tout</Text>
                <FontAwesome5 name="arrow-right" size={12} color="#0f8e35" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          {loadingRecommendations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0f8e35" />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : recommendedOffres.length > 0 ? (
            <View style={styles.listContainer}>
              {recommendedOffres.slice(0, 3).map((offre: any) => (
                <TouchableOpacity 
                  key={offre.id} 
                  style={styles.recommendedItem} 
                  onPress={() => handleRecommendedOffrePress(offre.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recommendedContent}>
                    <Text style={styles.recommendedTitle} numberOfLines={1}>
                      {offre.poste?.titre_poste || 'Poste non spécifié'}
                    </Text>
                    <Text style={styles.recommendedCompany} numberOfLines={1}>
                      {offre.demande?.entreprise?.libelleE || 'Entreprise non spécifiée'}
                    </Text>
                    <Text style={styles.recommendedLocation}>{offre.lieux}</Text>
                  </View>
                  <View style={styles.matchScore}>
                    <Text style={styles.matchScoreText}>{offre.match_score}%</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="lightbulb" size={24} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>Aucune recommandation</Text>
              <Text style={styles.emptyStateText}>Téléchargez votre CV pour obtenir des recommandations personnalisées</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
    </>

  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },

  // Quick Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#091e60',
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#0f8e35',
    fontWeight: '500',
  },

  // List Container
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // List Items (Applications)
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Recommended Items
  recommendedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recommendedContent: {
    flex: 1,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 6,
  },
  recommendedCompany: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  recommendedLocation: {
    fontSize: 13,
    color: '#6B7280',
  },
  matchScore: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  matchScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f8e35',
  },

  // Loading State
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});