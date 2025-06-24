import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,SafeAreaView, ActivityIndicator, Alert } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../components/AuthProvider';
import { getOffres } from '../../../utils/api';
import { router } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader'; 

/**
 * Écran du Tableau d'Offres (Job Board) authentifié:
 * Affiche les offres d'emploi récupérées depuis l'API pour les utilisateurs connectés.
 * Permet la navigation vers les détails de l'offre.
 */
export default function AuthenticatedJobBoardScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [offres, setOffres] = useState([]);
  const [loadingOffres, setLoadingOffres] = useState(true);
  const [errorOffres, setErrorOffres] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOffres() {
      try {
        setLoadingOffres(true);
        setErrorOffres(null);
        const fetchedOffres = await getOffres();
        setOffres(fetchedOffres);
      } catch (err: any) {
        console.error("Échec de la récupération des offres:", err);
        setErrorOffres(err.message || "Impossible de charger les offres d'emploi.");
      } finally {
        setLoadingOffres(false);
      }
    }
    fetchOffres();
  }, []);

  const handleOffrePress = (offreId: string) => {
    router.push(`/job_board/job_details?id=${offreId}`);
  };

  const handleMenuPress = () => {
    Alert.alert("Menu", "Le menu hamburger a été pressé ! (À implémenter)");
    // Ici, vous intégreriez la logique pour ouvrir un tiroir de navigation ou un modal de menu.
  };

  const handleAvatarPress = () => {
    Alert.alert("Profil", "L'avatar de l'utilisateur a été pressé ! (À implémenter, ex: naviguer vers le profil)");
    // Ici, vous navigeriez vers la page de profil ou afficheriez un menu déroulant du profil.
    router.push('/(app)/dashboard'); // Exemple : naviguer vers le tableau de bord
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Remplacer l'en-tête par CustomHeader */}
      <CustomHeader
        title="Offres d'emploi"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {loadingOffres ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f8e35" />
          <Text style={styles.loadingText}>Récupération des offres d'emploi...</Text>
        </View>
      ) : errorOffres ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur: {errorOffres}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOffres()}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : offres.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune offre d'emploi disponible pour le moment.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.sectionTitle}>Offres disponibles</Text>
          {offres.map(offre => (
            <TouchableOpacity key={offre.id} style={styles.offreCard} onPress={() => handleOffrePress(offre.id)}>
              <Text style={styles.offreTitle}>{offre.poste?.titre_poste || 'Poste non spécifié'}</Text>
              <Text style={styles.offreCompany}>{offre.demande?.entreprise?.nom_entreprise || 'Entreprise non spécifiée'} - {offre.lieux}</Text>
              <Text style={styles.offreContractType}>{offre.typeContrat?.libelle_type_contrat || 'Contrat non spécifié'}</Text>
              <Text style={styles.offreDescription}>{offre.description.substring(0, 100)}...</Text>
              <View style={styles.readMoreButton}>
                <Text style={styles.readMoreButtonText}>Voir les détails</Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={styles.footerText}>Fin des annonces.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#091e60',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollContainer: {
    padding: 24,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 20,
  },
  offreCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  offreTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 8,
  },
  offreCompany: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 5,
  },
  offreContractType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  offreDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  readMoreButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  readMoreButtonText: {
    color: '#0f8e35',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
});
