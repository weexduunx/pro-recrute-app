import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { router, useLocalSearchParams } from 'expo-router';
import { getUserApplications } from '../../../utils/api';
import { Ionicons } from '@expo/vector-icons';

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
        nom_entreprise: string;
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

  const getStatusConfig = (etat: string) => {
    switch (etat) {
      case 'pending': 
        return { 
          color: '#F59E0B', 
          text: 'En attente', 
          icon: 'time-outline',
          bgColor: '#FEF3C7'
        };
      case 'approved': 
        return { 
          color: '#0f8e35', 
          text: 'Acceptée', 
          icon: 'checkmark-circle-outline',
          bgColor: '#D1FAE5'
        };
      case 'rejected': 
        return { 
          color: '#EF4444', 
          text: 'Refusée', 
          icon: 'close-circle-outline',
          bgColor: '#FEE2E2'
        };
      default: 
        return { 
          color: '#6B7280', 
          text: etat, 
          icon: 'help-circle-outline',
          bgColor: '#F3F4F6'
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

  useEffect(() => {
    loadApplicationDetails();
  }, [loadApplicationDetails]);

  const handleMenuPress = () => { Alert.alert("Menu", "Menu Détails Candidature pressé!"); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CustomHeader title="Détails Candidature" user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />
        <View style={styles.centerContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0f8e35" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CustomHeader title="Détails Candidature" user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Erreur</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadApplicationDetails}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!applicationDetail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CustomHeader title="Détails Candidature" user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />
        <View style={styles.centerContainer}>
          <View style={styles.emptyCard}>
            <Ionicons name="document-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Candidature introuvable</Text>
            <Text style={styles.emptyText}>Cette candidature n'existe plus ou n'est pas accessible.</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(applicationDetail.etat);
  const offre = applicationDetail.offre;

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="Détails Candidature" user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          
          {/* Statut Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.icon} size={20} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>

          {/* Date Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={20} color="#091e60" />
              <Text style={styles.cardTitle}>Candidature postulée</Text>
            </View>
            <Text style={styles.dateText}>
              {applicationDetail.date_postule ? 
                new Date(applicationDetail.date_postule).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Date non disponible'}
            </Text>
          </View>

          {/* Job Details Card */}
          {offre && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="briefcase-outline" size={20} color="#091e60" />
                <Text style={styles.cardTitle}>Offre d'emploi</Text>
              </View>
              
              <Text style={styles.jobTitle}>{offre.poste?.titre_poste || 'Poste non spécifié'}</Text>
              <Text style={styles.companyName}>{offre.demande?.entreprise?.nom_entreprise || 'Entreprise non spécifiée'}</Text>
              
              <View style={styles.detailsGrid}>
                {offre.lieux && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Lieu</Text>
                    <Text style={styles.detailValue}>{offre.lieux}</Text>
                  </View>
                )}
                
                {offre.type_contrat && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Contrat</Text>
                    <Text style={styles.detailValue}>{offre.type_contrat.libelle_type_contrat}</Text>
                  </View>
                )}
                
                {(offre.salaire_minimum || offre.salaire_maximum) && (
                  <View style={styles.detailRow}>
                    <Ionicons name="card" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Salaire</Text>
                    <Text style={styles.detailValue}>
                      {offre.salaire_minimum && offre.salaire_maximum 
                        ? `${offre.salaire_minimum} - ${offre.salaire_maximum} FCFA`
                        : 'Non spécifié'}
                    </Text>
                  </View>
                )}
                
                {offre.experience !== undefined && offre.experience !== null && (
                  <View style={styles.detailRow}>
                    <Ionicons name="trending-up" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Expérience</Text>
                    <Text style={styles.detailValue}>{offre.experience} an{offre.experience > 1 ? 's' : ''}</Text>
                  </View>
                )}
                
                {offre.niveau_etude && (
                  <View style={styles.detailRow}>
                    <Ionicons name="school" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Niveau</Text>
                    <Text style={styles.detailValue}>{offre.niveau_etude.libelle_niveau_etude}</Text>
                  </View>
                )}
                
                {offre.domaine_activite && (
                  <View style={styles.detailRow}>
                    <Ionicons name="layers" size={16} color="#6B7280" />
                    <Text style={styles.detailLabel}>Domaine</Text>
                    <Text style={styles.detailValue}>{offre.domaine_activite.libelle_domaine}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Motivation Letter Card */}
          {applicationDetail.motivation_letter && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="mail-outline" size={20} color="#091e60" />
                <Text style={styles.cardTitle}>Lettre de motivation</Text>
              </View>
              <View style={styles.motivationContainer}>
                <Text style={styles.motivationText}>{applicationDetail.motivation_letter}</Text>
              </View>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity style={styles.mainButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.mainButtonText}>Retour aux candidatures</Text>
          </TouchableOpacity>

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
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Loading & Error States
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Card Components
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginLeft: 8,
  },

  // Date
  dateText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },

  // Job Details
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    color: '#0f8e35',
    fontWeight: '600',
    marginBottom: 20,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },

  // Motivation Letter
  motivationContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#0f8e35',
  },
  motivationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },

  // Buttons
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091e60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#091e60',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
    shadowColor: '#091e60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});