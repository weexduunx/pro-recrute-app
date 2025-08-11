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
      <ActivityIndicator size="large" color="#0f8e35" />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color="#EF4444" />
      <Text style={styles.errorTitle}>Erreur</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadApplicationDetails}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="document-outline" size={48} color="#D1D5DB" />
      <Text style={styles.errorTitle}>Candidature introuvable</Text>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNextSteps = () => {
    const etat = applicationDetail?.etat;

    if (etat === 'Acceptée') {
      return (
        <View style={styles.stepsCard}>
          <View style={styles.stepsHeader}>
            <Ionicons name="trophy" size={24} color="#0f8e35" />
            <Text style={styles.stepsTitle}>Félicitations ! Prochaines étapes</Text>
          </View>

          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>L'entreprise vous contactera sous 48h</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Préparez vos documents (CV, diplômes)</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Entretien final avec l'équipe</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Signature du contrat</Text>
            </View>
          </View>
        </View>
      );
    }

    if (etat === 'Refusée') {
      return (
        <View style={styles.encouragementCard}>
          <View style={styles.encouragementHeader}>
            <Ionicons name="heart" size={24} color="#EF4444" />
            <Text style={styles.encouragementTitle}>Ne vous découragez pas !</Text>
          </View>

          <Text style={styles.encouragementText}>
            Cette opportunité n'était peut-être pas la bonne, mais d'autres vous attendent.
          </Text>

          <View style={styles.encouragementActions}>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(app)/job_board')}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.exploreButtonText}>Voir d'autres offres</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push('/(app)/profile-details')}
            >
              <Ionicons name="person" size={20} color="#0f8e35" />
              <Text style={styles.profileButtonText}>Améliorer mon profil</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (etat === 'En attente') {
      return (
        <View style={styles.waitingCard}>
          <View style={styles.waitingHeader}>
            <Ionicons name="hourglass" size={24} color="#F59E0B" />
            <Text style={styles.waitingTitle}>En cours d'évaluation</Text>
          </View>
          <Text style={styles.waitingText}>
            Votre candidature est en cours d'examen. Nous vous tiendrons informé de l'évolution.
          </Text>
        </View>
      );
    }

    return null;
  };

  if (loading) return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="État de la Candidature" user={user} onAvatarPress={handleAvatarPress} showBackButton={true} />
      {renderLoadingState()}
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="État de la Candidature" user={user} onAvatarPress={handleAvatarPress} showBackButton={true} />
      {renderErrorState()}
    </SafeAreaView>
  );

  if (!applicationDetail) return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="État de la Candidature" user={user} onAvatarPress={handleAvatarPress} showBackButton={true} />
      {renderEmptyState()}
    </SafeAreaView>
  );

  const statusConfig = getStatusConfig(applicationDetail.etat);
  const offre = applicationDetail.offre;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader
        title="État de la Candidature"
        user={user}
        showBackButton={true}
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
        {/* Status Section */}
        <View style={[styles.statusSection, { backgroundColor: statusConfig.lightBg }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.icon as any} size={24} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>

          <Text style={styles.jobTitle}>{offre?.poste?.titre_poste || 'Poste non spécifié'}</Text>
          <Text style={styles.companyName}>{offre?.demande?.entreprise?.libelleE || 'Entreprise non spécifiée'}</Text>

          <Text style={styles.applicationDate}>
            Postulée le {applicationDetail.date_postule ?
              new Date(applicationDetail.date_postule).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : 'Date non disponible'}
          </Text>
        </View>
        <View style={styles.container}>
          {/* Job Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Résumé de l'offre</Text>

            <View style={styles.summaryRow}>
              <Ionicons name="location" size={16} color="#6B7280" />
              <Text style={styles.summaryText}>{offre?.lieux || 'Non spécifié'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Ionicons name="briefcase" size={16} color="#6B7280" />
              <Text style={styles.summaryText}>{offre?.type_contrat?.libelle_type_contrat || 'Non spécifié'}</Text>
            </View>

            {(offre?.salaire_minimum || offre?.salaire_maximum) && (
              <View style={styles.summaryRow}>
                <Ionicons name="card" size={16} color="#6B7280" />
                <Text style={styles.summaryText}>
                  {offre.salaire_minimum && offre.salaire_maximum
                    ? `${offre.salaire_minimum} - ${offre.salaire_maximum} FCFA`
                    : 'Salaire à négocier'}
                </Text>
              </View>
            )}
          </View>

          {/* Next Steps / Encouragement */}
          {renderNextSteps()}

          {/* Motivation Letter (simplified) */}
          {applicationDetail.motivation_letter && (
            <View style={styles.motivationCard}>
              <Text style={styles.motivationTitle}>Votre message</Text>
              <Text style={styles.motivationPreview} numberOfLines={3}>
                {applicationDetail.motivation_letter}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.refreshButton} onPress={loadApplicationDetails}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Actualiser</Text>
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
    padding: 16,
  },

  // Loading & Error States (simplified)
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0f8e35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Status Section (simplified)
  statusSection: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
    textAlign: 'center',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    color: '#0f8e35',
    fontWeight: '600',
    marginBottom: 8,
  },
  applicationDate: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Summary Card (simplified)
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
  },

  // Steps Card (for accepted applications)
  stepsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0f8e35',
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f8e35',
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0f8e35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },

  // Encouragement Card (for rejected applications)
  encouragementCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  encouragementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  encouragementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  encouragementText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  encouragementActions: {
    gap: 8,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f8e35',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0f8e35',
    gap: 8,
  },
  profileButtonText: {
    color: '#0f8e35',
    fontWeight: '600',
  },

  // Waiting Card (for pending applications)
  waitingCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  waitingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  waitingText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  // Motivation Card (simplified)
  motivationCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 8,
  },
  motivationPreview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Action Buttons (simplified)
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  backButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  refreshButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0f8e35',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});