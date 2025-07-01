import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, Dimensions, StatusBar } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { router, useLocalSearchParams } from 'expo-router';
import { getUserApplications } from '../../../utils/api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ApplicationDetail {
  id: string;
  etat: string;
  date_postule: string;
  motivation_letter?: string;
  offre?: {
    id: number;
    description: string;
    profil_recherche: string;
    lieux: string;
    salaire_minimum?: string;
    salaire_maximum?: string;
    poste?: {
      titre_poste: string;
    };
    demande?: {
      entreprise?: {
        libelleE: string;
      };
    };
    type_contrat?: {
      libelle_type_contrat: string;
    };
    niveau_etude?: {
      libelle_niveau_etude: string;
    };
    domaine_activite?: {
      libelle_domaine: string;
    };
    experience?: number;
  };
}

export default function ApplicationDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [applicationDetail, setApplicationDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const getStatusConfig = (etat: string) => {
    switch (etat) {
      case 'En attente': 
        return { 
          color: '#F59E0B', 
          text: 'En attente', 
          icon: 'time-outline',
          bgColor: '#FEF3C7',
          lightBg: '#FFFBEB'
        };
      case 'Acceptée': 
        return { 
          color: '#0f8e35', 
          text: 'Acceptée', 
          icon: 'checkmark-circle-outline',
          bgColor: '#D1FAE5',
          lightBg: '#ECFDF5'
        };
      case 'Refusée': 
        return { 
          color: '#EF4444', 
          text: 'Refusée', 
          icon: 'close-circle-outline',
          bgColor: '#FEE2E2',
          lightBg: '#FEF2F2'
        };
      default: 
        return { 
          color: '#6B7280', 
          text: etat, 
          icon: 'help-circle-outline',
          bgColor: '#F3F4F6',
          lightBg: '#F9FAFB'
        };
    }
  };

  const getContractTypeIcon = (contractType: string) => {
    const type = contractType?.toLowerCase();
    if (type?.includes('cdi')) return 'briefcase';
    if (type?.includes('cdd')) return 'calendar';
    if (type?.includes('stage')) return 'school';
    if (type?.includes('freelance')) return 'laptop';
    return 'document-text';
  };

  const loadApplicationDetails = useCallback(async () => {
    if (!id || !user) {
      setError("ID de candidature ou utilisateur manquant.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const allApplications = await getUserApplications();
      const detail = allApplications.find((app: ApplicationDetail) => app.id.toString() === id.toString());

      if (detail) {
        setApplicationDetail(detail);
      } else {
        setError("Candidature non trouvée.");
      }
    } catch (err: any) {
      console.error("Erreur de chargement des détails de candidature:", err);
      setError(err.message || "Impossible de charger les détails de la candidature.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplicationDetails();
    setRefreshing(false);
  };

  useEffect(() => {
    loadApplicationDetails();
  }, [loadApplicationDetails]);

  const handleMenuPress = () => { 
    Alert.alert("Menu", "Menu Détails Candidature pressé!"); 
  };
  
  const handleAvatarPress = () => { 
    router.push('/(app)/profile-details'); 
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#0f8e35" />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
        <Text style={styles.loadingSubtext}>Veuillez patienter</Text>
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Oops ! Une erreur s'est produite</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadApplicationDetails}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        <Ionicons name="document-outline" size={80} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Candidature introuvable</Text>
        <Text style={styles.emptyText}>
          Cette candidature n'existe plus ou n'est pas accessible.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f8e35" />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="Détails Candidature" user={user} onAvatarPress={handleAvatarPress} />
      {renderLoadingState()}
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="Détails Candidature" user={user} onAvatarPress={handleAvatarPress} />
      {renderErrorState()}
    </SafeAreaView>
  );

  if (!applicationDetail) return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="Détails Candidature" user={user} onAvatarPress={handleAvatarPress} />
      {renderEmptyState()}
    </SafeAreaView>
  );

  const statusConfig = getStatusConfig(applicationDetail.etat);
  const offre = applicationDetail.offre;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader 
        title="Etat de la Candidature" 
        user={user} 
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress} 
      />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0f8e35']}
            tintColor="#0f8e35"
          />
        }
      >
        <View style={styles.container}>
          
          {/* Hero Section avec Status */}
          <View style={[styles.heroSection, { backgroundColor: statusConfig.lightBg }]}>
            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroTitle}>{offre.poste?.titre_poste || 'Poste non spécifié'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                  <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.text}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.heroSubtitle}>
                Postulée le {applicationDetail.date_postule ? 
                  new Date(applicationDetail.date_postule).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Date non disponible'}
              </Text>
            </View>
          </View>

          {/* Job Details Card */}
          {offre && (
            <View style={styles.primaryCard}>
              
              <View style={styles.jobMainInfo}>
                
                <View style={styles.companyContainer}>
                  <Ionicons name="business" size={16} color="#091e60" />
                  <Text style={styles.companyName}>{offre.demande?.entreprise?.libelleE || 'Entreprise non spécifiée'}</Text>
                </View>
                
                {offre.lieux && (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location" size={16} color="#0f8e35" />
                    <Text style={styles.locationText}>{offre.lieux}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailsGrid}>
                {offre.type_contrat && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailIcon}>
                      <Ionicons name={getContractTypeIcon(offre.type_contrat.libelle_type_contrat)} size={20} color="#0f8e35" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Type de contrat</Text>
                      <Text style={styles.detailValue}>{offre.type_contrat.libelle_type_contrat}</Text>
                    </View>
                  </View>
                )}
                
                {(offre.salaire_minimum || offre.salaire_maximum) && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="card" size={20} color="#0f8e35" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Rémunération</Text>
                      <Text style={styles.detailValue}>
                        {offre.salaire_minimum && offre.salaire_maximum 
                          ? `${offre.salaire_minimum} - ${offre.salaire_maximum} FCFA`
                          : 'Non spécifié'}
                      </Text>
                    </View>
                  </View>
                )}
                
                {offre.experience !== undefined && offre.experience !== null && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="trending-up" size={20} color="#0f8e35" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Expérience requise</Text>
                      <Text style={styles.detailValue}>{offre.experience} an{offre.experience > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                )}
                
                {offre.niveau_etude && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="school" size={20} color="#0f8e35" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Niveau d'étude</Text>
                      <Text style={styles.detailValue}>{offre.niveau_etude.libelle_niveau_etude}</Text>
                    </View>
                  </View>
                )}
                
                {offre.domaine_activite && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="layers" size={20} color="#0f8e35" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Domaine d'activité</Text>
                      <Text style={styles.detailValue}>{offre.domaine_activite.libelle_domaine}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Job Description */}
              {offre.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>Description du poste</Text>
                  <Text style={styles.descriptionText}>{offre.description}</Text>
                </View>
              )}
            </View>
          )}

          {/* Motivation Letter Card */}
          {applicationDetail.motivation_letter && (
            <View style={styles.motivationCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="mail" size={24} color="#091e60" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>Lettre de motivation</Text>
                    <Text style={styles.cardSubtitle}>Votre message personnel</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.motivationContainer}>
                <Text style={styles.motivationText}>{applicationDetail.motivation_letter}</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(app)/candidature')}>
              <Ionicons name="arrow-back" size={20} color="#091e60" />
              <Text style={styles.secondaryButtonText}>Retour</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.primaryButton} onPress={loadApplicationDetails}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Actualiser</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Loading & Error States (matching index.tsx)
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091e60',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f8e35',
    gap: 6,
  },
  backButtonText: {
    color: '#0f8e35',
    fontSize: 13,
    fontWeight: '600',
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 12,
    paddingVertical: 24,
    marginBottom: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Card Components
  primaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  motivationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },

  // Job Main Info
  jobMainInfo: {
    marginBottom: 20,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 12,
    lineHeight: 32,
  },
  companyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    color: '#0f8e35',
    fontWeight: '600',
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Details Grid
  detailsGrid: {
    gap: 16,
    marginBottom: 20,
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    flexBasis: '48%',
    gap: 10,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0f8e35',
  },
  detailIcon: {
    width: 24,
    height: 24,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },

  // Description Section
  descriptionSection: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 24,
  },

  // Motivation Letter
  motivationContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    // borderLeftWidth removed
    // borderLeftColor removed
  },
  motivationText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 24,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 24,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f8e35',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#0f8e35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#091e60',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#091e60',
    fontSize: 13,
    fontWeight: '600',
  },
});