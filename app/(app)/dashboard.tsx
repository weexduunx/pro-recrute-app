import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getUserApplications, getRecommendedOffres } from '../../utils/api'; 
import { router } from 'expo-router';
import CustomHeader from '../../components/CustomHeader';

/**
 * Écran du Tableau de bord de l'utilisateur :
 * Affiche le contenu pertinent pour l'utilisateur authentifié avec une UI/UX moderne.
 * Gère les candidatures et affiche les données du CV parsé.
 * Les sections "Mon Profil" et "Mon CV Parsé" ont été déplacées vers `profile-details.tsx`.
 */
export default function DashboardScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [recommendedOffres, setRecommendedOffres] = useState([]);
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
    // loadParsedCv(); // N'est plus appelé ici
    loadRecommendations();
  }, [user, loadApplications, loadRecommendations]);


  // Supprimé : pickDocument (car déplacé)
  // Supprimé : handleProfileSave (car déplacé)

  const handleRecommendedOffrePress = (offreId: string) => {
    router.push(`/(app)/job_board/job_details?id=${offreId}`);
  };

  const handleMenuPress = () => { /* ... */ };
  const handleAvatarPress = () => { /* ... */ };


  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        title="Mon Tableau de bord"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Section de Bienvenue */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenue, {user?.name || 'Utilisateur'}!</Text>
          <Text style={styles.cardSubtitle}>Gérez votre carrière ici.</Text>
        </View>

        {/* Section Mes Candidatures */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="file-contract" size={20} color="#091e60" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Mes Candidatures</Text>
          </View>
          {loadingApplications ? (
            <ActivityIndicator size="small" color="#0f8e35" />
          ) : applications.length > 0 ? (
            applications.map(app => (
              <View key={app.id} style={styles.applicationItem}>
                <Text style={styles.applicationTitle}>{app.offre?.poste?.titre_poste || 'Titre de l\'offre inconnu'}</Text>
                <Text style={styles.applicationStatus}>Statut:
                  <Text style={[
                    styles.statusText,
                    app.status === 'pending' && styles.statusPending,
                    app.status === 'approved' && styles.statusApproved,
                    app.status === 'rejected' && styles.statusRejected,
                  ]}> {app.status}</Text>
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyStateText}>Aucune candidature trouvée.</Text>
          )}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllButtonText}>Voir toutes mes candidatures</Text>
          </TouchableOpacity>
        </View>


        {/* Section Offres Recommandées (Reste ici) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="lightbulb" size={20} color="#091e60" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Offres Recommandées</Text>
          </View>
          {loadingRecommendations ? (
            <ActivityIndicator size="small" color="#0f8e35" />
          ) : recommendedOffres.length > 0 ? (
            recommendedOffres.map((offre: any) => (
              <TouchableOpacity key={offre.id} style={styles.recommendedOffreItem} onPress={() => handleRecommendedOffrePress(offre.id)}>
                <Text style={styles.recommendedOffreTitle}>{offre.poste?.titre_poste || 'Poste non spécifié'}</Text>
                <Text style={styles.recommendedOffreCompany}>{offre.demande?.entreprise?.nom_entreprise || 'Entreprise non spécifiée'} - {offre.lieux}</Text>
                <Text style={styles.recommendedOffreMatch}>Score de correspondance: {offre.match_score}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyStateText}>Pas de recommandations pour le moment. Téléchargez votre CV pour en obtenir !</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  cardIcon: {
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 5,
    marginBottom: 15,
  },
  // Styles pour Mes Candidatures
  applicationItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  applicationStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#F59E0B',
  },
  statusApproved: {
    color: '#10B981',
  },
  statusRejected: {
    color: '#EF4444',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 10,
  },
  viewAllButton: {
    marginTop: 15,
    backgroundColor: '#0f8e35',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Styles pour Offres Recommandées (restent ici)
  recommendedOffreItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#0f8e35',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recommendedOffreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 5,
  },
  recommendedOffreCompany: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 5,
  },
  recommendedOffreMatch: {
    fontSize: 12,
    color: '#0f8e35',
    fontWeight: 'bold',
    marginTop: 5,
  },
});
