import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, ActivityIndicator, Alert, StatusBar, RefreshControl, Modal, Pressable, Linking } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getUserApplications, getRecommendedOffres, getCandidatEntretiensCalendrier } from '../../utils/api'; 
import { router, useRouter  } from 'expo-router';
import CustomHeader from '../../components/CustomHeader';
import { useTheme } from '../../components/ThemeContext'; 

/**
 * Écran du Tableau de bord de l'utilisateur :
 * Interface minimaliste et intuitive avec une UX améliorée.
 * Conserve la palette de couleurs et la structure fonctionnelle.
 * Ajout du pull-to-refresh pour actualiser les données.
 */
export default function DashboardScreen() {
  const { user, logout, loading: authLoading } = useAuth();
   const { isDarkMode, toggleDarkMode, colors } = useTheme();
   const router = useRouter();
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
  const [entretiens, setEntretiens] = useState<any[]>([]);
  const [loadingEntretiens, setLoadingEntretiens] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntretien, setSelectedEntretien] = useState<any>(null);
  const [showEntretienModal, setShowEntretienModal] = useState(false);

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

  const loadEntretiens = useCallback(async () => {
    console.log('=== LOAD ENTRETIENS DEBUG ===');
    console.log('User:', user?.id, user?.email);
    
    if (user) {
      setLoadingEntretiens(true);
      try {
        console.log('Calling getCandidatEntretiensCalendrier...');
        const fetchedEntretiens = await getCandidatEntretiensCalendrier();
        console.log('Entretiens récupérés:', fetchedEntretiens);
        console.log('Type des entretiens:', typeof fetchedEntretiens);
        console.log('Length des entretiens:', fetchedEntretiens?.length);
        setEntretiens(fetchedEntretiens);
      } catch (error: any) {
        console.error("Erreur de chargement des entretiens:", error);
        console.error("Error details:", error.response?.data);
        // En cas d'erreur, on met un tableau vide pour éviter les bugs d'affichage
        setEntretiens([]);
      } finally {
        setLoadingEntretiens(false);
      }
    } else {
      console.log('Pas d\'utilisateur connecté');
      setEntretiens([]);
      setLoadingEntretiens(false);
    }
  }, [user]);

  // Fonction pour rafraîchir toutes les données
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Charger les données en parallèle pour plus d'efficacité
      await Promise.all([
        loadApplications(),
        loadRecommendations(),
        loadEntretiens()
      ]);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadApplications, loadRecommendations, loadEntretiens]);


  useEffect(() => {
    loadApplications();
    loadRecommendations();
    loadEntretiens();
  }, [user, loadApplications, loadRecommendations, loadEntretiens]);

  const handleRecommendedOffrePress = (offreId: string) => {
    router.push(`/(app)/job_board/job_details?id=${offreId}`);
  };

  const handleApplicationPress = (applicationId: string) => {
    router.push(`/candidature/application_details?id=${applicationId}`);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd&apos;hui";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Demain";
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const getDecisionColor = (decision: number) => {
    switch (decision) {
      case 0: return '#F59E0B'; // En attente - orange
      case 1: return '#3B82F6'; // Passe étape suivante - bleu
      case 2: return '#EF4444'; // Refusé - rouge
      case 3: return '#10B981'; // Accepté - vert
      default: return '#6B7280'; // Par défaut - gris
    }
  };

  const handleEntretienPress = (entretien: any) => {
    setSelectedEntretien(entretien);
    setShowEntretienModal(true);
  };

  const closeEntretienModal = () => {
    setShowEntretienModal(false);
    setSelectedEntretien(null);
  };

  const handleLinkPress = async (url: string) => {
    if (url) {
      try {
        await Linking.openURL(url);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible d&apos;ouvrir le lien');
      }
    }
  };

  return (
    <>
     <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader
        title="Tableau de bord"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0f8e35']} // Android
            tintColor="#0f8e35" // iOS
            title="Actualisation..." // iOS
            titleColor="#6B7280" // iOS
          />
        }
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
              <FontAwesome5 name="briefcase" size={16} color="#0f8e35" />
            </View>
            <Text style={styles.statNumber}>{applications.length}</Text>
            <Text style={styles.statLabel}>Candidatures</Text>
          </View>
           <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FontAwesome5 name="calendar-alt" size={16} color="#8B5CF6" />
            </View>
            <Text style={styles.statNumber}>{entretiens.length}</Text>
            <Text style={styles.statLabel}>Entretiens</Text>
          </View>
          {/* <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FontAwesome5 name="star" size={16} color="#0f8e35" />
            </View>
            <Text style={styles.statNumber}>{recommendedOffres.length}</Text>
            <Text style={styles.statLabel}>Recommandations</Text>
          </View> */}
        </View>
        {/* Section Entretiens à venir */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Entretiens à venir</Text>
            {entretiens.length > 0 && (
              <TouchableOpacity style={styles.viewAllLink} onPress={() => router.push('/(app)/entretiens')}>
                <Text style={styles.viewAllText}>Voir tout</Text>
                <FontAwesome5 name="arrow-right" size={12} color="#0f8e35" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </View>
          {/* DEBUG: Afficher les infos de débogage */}
          {/* {__DEV__ && (
            <Text style={{ fontSize: 10, color: 'gray', padding: 5 }}>
              DEBUG: entretiens.length = {entretiens.length}, loadingEntretiens = {loadingEntretiens.toString()}
            </Text>
          )} */}

          {loadingEntretiens ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0f8e35" />
              <Text style={styles.loadingText}>Chargement des entretiens...</Text>
            </View>
          ) : entretiens.length > 0 ? (
            <View style={styles.calendarContainer}>
              {entretiens.slice(0, 3).map((entretien: any, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.entretienItem}
                  onPress={() => handleEntretienPress(entretien)}
                  activeOpacity={0.7}
                >
                  <View style={styles.entretienDate}>
                    <Text style={styles.entretienDateText}>
                      {formatDate(entretien.date)}
                    </Text>
                    <Text style={styles.entretienTimeText}>
                      {entretien.heure}
                    </Text>
                  </View>
                  
                  <View style={styles.entretienDetails}>
                    <Text style={styles.entretienTitle} numberOfLines={1}>
                      {entretien.titre_offre}
                    </Text>
                    <View style={styles.entretienStatusContainer}>
                      <View style={[
                        styles.entretienStatusBadge, 
                        { backgroundColor: getDecisionColor(entretien.decision) }
                      ]}>
                        <Text style={styles.entretienStatusText}>
                          {entretien.decision_label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.entretienIcon}>
                    <FontAwesome5 name="calendar-check" size={20} color="#8B5CF6" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="calendar-alt" size={24} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>Aucun entretien planifié</Text>
              <Text style={styles.emptyStateText}>Vos entretiens à venir apparaîtront ici</Text>
            </View>
          )}
        </View>

        {/* Section Mes Candidatures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes candidatures</Text>
            {applications.length > 0 && (
              <TouchableOpacity style={styles.viewAllLink} onPress={() => router.push('/(app)/candidature')}>
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
            <View style={styles.listContainer} >
              {applications.slice(0, 3).map(app => (
                <TouchableOpacity key={app.id} style={styles.listItem} onPress={() => handleApplicationPress(app.id)} activeOpacity={0.7}>
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
                </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>Offres Recommandées</Text>
            {recommendedOffres.length > 0 && (
              <TouchableOpacity style={styles.viewAllLink} onPress={() => router.push('/(app)/job_board')}>
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
              <Text style={styles.emptyStateText}>Remplissez votre profil personnel et professionnel pour recevoir des recommandations personnalisées</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Modal des détails d'entretien */}
      <Modal
        visible={showEntretienModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEntretienModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedEntretien && (
                <>
                  {/* Header du modal */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Détails de l&apos;entretien</Text>
                    <TouchableOpacity onPress={closeEntretienModal} style={styles.closeButton}>
                      <FontAwesome5 name="times" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Date et heure */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <FontAwesome5 name="calendar" size={16} color="#091e60" />
                      <Text style={styles.modalSectionTitle}>Date et heure</Text>
                    </View>
                    <Text style={styles.modalText}>
                      {formatDate(selectedEntretien.date)} à {selectedEntretien.heure}
                    </Text>
                  </View>

                  {/* Type d'entretien */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <FontAwesome5 name="clipboard-list" size={16} color="#091e60" />
                      <Text style={styles.modalSectionTitle}>Type d&apos;entretien</Text>
                    </View>
                    <Text style={styles.modalText}>
                      {selectedEntretien.type_entretien_label}
                    </Text>
                  </View>

                  {/* Offre d'emploi */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <FontAwesome5 name="briefcase" size={16} color="#091e60" />
                      <Text style={styles.modalSectionTitle}>Offre d&apos;emploi</Text>
                    </View>
                    <Text style={styles.modalTextBold}>{selectedEntretien.titre_offre}</Text>
                    <Text style={styles.modalText}>{selectedEntretien.entreprise_nom}</Text>
                    <Text style={styles.modalTextSecondary}>{selectedEntretien.lieux_entretien}</Text>
                  </View>

                  {/* Statuts - Affiché seulement si le candidat était présent */}
                  {selectedEntretien.presence === 1 && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="info-circle" size={16} color="#091e60" />
                        <Text style={styles.modalSectionTitle}>Statut</Text>
                      </View>
                      <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Présence:</Text>
                        <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                          <Text style={styles.statusBadgeText}>{selectedEntretien.presence_label}</Text>
                        </View>
                      </View>
                      <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Décision:</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getDecisionColor(selectedEntretien.decision) }]}>
                          <Text style={styles.statusBadgeText}>{selectedEntretien.decision_label}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Observations - Affiché seulement si le candidat était présent et qu'il y a des observations */}
                  {selectedEntretien.presence === 1 && selectedEntretien.observations && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="sticky-note" size={16} color="#091e60" />
                        <Text style={styles.modalSectionTitle}>Observations</Text>
                      </View>
                      <Text style={styles.modalText}>{selectedEntretien.observations}</Text>
                    </View>
                  )}

                  {/* Commentaire - Affiché seulement si le candidat était présent et qu'il y a un commentaire */}
                  {selectedEntretien.presence === 1 && selectedEntretien.commentaire && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="comment" size={16} color="#091e60" />
                        <Text style={styles.modalSectionTitle}>Commentaire</Text>
                      </View>
                      <Text style={styles.modalText}>{selectedEntretien.commentaire}</Text>
                    </View>
                  )}

                  {/* Raison du rejet - Affiché seulement si le candidat était présent et qu'il y a une raison */}
                  {selectedEntretien.presence === 1 && selectedEntretien.raison_rejet && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="exclamation-triangle" size={16} color="#EF4444" />
                        <Text style={styles.modalSectionTitle}>Raison du rejet</Text>
                      </View>
                      <Text style={[styles.modalText, { color: '#EF4444' }]}>{selectedEntretien.raison_rejet}</Text>
                    </View>
                  )}

                  {/* Lien */}
                  {selectedEntretien.lien && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <FontAwesome5 name="link" size={16} color="#091e60" />
                        <Text style={styles.modalSectionTitle}>Lien de connexion</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleLinkPress(selectedEntretien.lien)}>
                        <Text style={styles.linkText}>{selectedEntretien.lien}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    fontSize: 12,
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

  // Styles pour la section entretiens
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  entretienItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  entretienDate: {
    width: 80,
    alignItems: 'center',
  },
  entretienDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 2,
  },
  entretienTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#091e60',
    textAlign: 'center',
  },
  entretienDetails: {
    flex: 1,
    marginLeft: 16,
  },
  entretienTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 6,
  },
  entretienStatusContainer: {
    flexDirection: 'row',
  },
  entretienStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  entretienStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  entretienIcon: {
    marginLeft: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Styles pour le modal des détails d'entretien
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
  },
  closeButton: {
    padding: 8,
  },
  modalSection: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginLeft: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  modalTextBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 4,
  },
  modalTextSecondary: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
});