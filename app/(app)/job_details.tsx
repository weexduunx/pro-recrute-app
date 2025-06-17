import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getOffreById } from '../../utils/api'; // Importer la nouvelle fonction getOffreById
import { router } from 'expo-router';

/**
 * Écran des Détails de l'Offre:
 * Affiche les détails complets d'une offre d'emploi spécifique.
 * Récupère les données de l'offre via l'ID passé dans les paramètres de la route.
 */
export default function OffreDetailsScreen() { // Renommé de JobDetailsScreen
  const { id } = useLocalSearchParams();
  const [offre, setOffre] = useState(null); // Renommé de job à offre
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOffreDetails() { // Renommé de fetchJobDetails
      if (!id) {
        setError("Aucun ID d'offre fourni.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedOffre = await getOffreById(id); // Appel à la nouvelle fonction
        setOffre(fetchedOffre);
      } catch (err: any) {
        console.error("Échec de la récupération des détails de l'offre:", err);
        setError(err.message || "Impossible de charger les détails de l'offre.");
      } finally {
        setLoading(false);
      }
    }
    fetchOffreDetails();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f8e35" />
          <Text style={styles.loadingText}>Chargement des détails de l'offre...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur: {error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!offre) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Offre non trouvée.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>{'< Retour'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de l'offre</Text>
        <View style={styles.placeholderRight} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Utilisation des noms de colonnes et des relations chargés */}
        <Text style={styles.offreTitle}>{offre.poste?.titre_poste || 'Poste non spécifié'}</Text>
        <Text style={styles.offreCompany}>{offre.demande?.entreprise?.nom_entreprise || 'Entreprise non spécifiée'}</Text>
        <Text style={styles.offreLocation}>{offre.lieux}</Text>

        {(offre.salaire_minimum || offre.salaire_maximum) && (
          <Text style={styles.offreInfo}>
            Salaire: {offre.salaire_minimum} - {offre.salaire_maximum}
          </Text>
        )}
        {offre.type_contrat && <Text style={styles.offreInfo}>Type de contrat: {offre.type_contrat.libelle_type_contrat || 'Non spécifié'}</Text>}
        {offre.experience !== null && <Text style={styles.offreInfo}>Expérience: {offre.experience} an(s)</Text>}
        {offre.niveau_etude && <Text style={styles.offreInfo}>Niveau d'étude: {offre.niveau_etude.libelle_niveau_etude || 'Non spécifié'}</Text>}
        {offre.domaine_activite && <Text style={styles.offreInfo}>Domaine: {offre.domaine_activite.libelle_domaine || 'Non spécifié'}</Text>}
        {offre.date_debut && (
          <Text style={styles.offreInfo}>Date de début: {new Date(offre.date_debut).toLocaleDateString('fr-FR')}</Text>
        )}
        {offre.date_fin && (
          <Text style={styles.offreInfo}>Date de fin: {new Date(offre.date_fin).toLocaleDateString('fr-FR')}</Text>
        )}
        {offre.status_offre && <Text style={styles.offreInfo}>Statut: {offre.status_offre}</Text>}


        <View style={styles.separator} />

        <Text style={styles.sectionHeading}>Description du poste</Text>
        <Text style={styles.offreDescription}>{offre.description}</Text>

        <Text style={styles.sectionHeading}>Profil recherché</Text>
        <Text style={styles.offreDescription}>{offre.profil_recherche}</Text>

        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Postuler à cette offre</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Gris clair
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Hauteur de la barre de statut Android
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
  backButton: {
    backgroundColor: '#091e60',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#091e60', // Bleu foncé primaire
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? 25 : 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backIcon: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholderRight: {
    width: 60, // Équilibrer l'espace du bouton de retour
  },
  scrollContainer: {
    padding: 24,
  },
  offreTitle: { // Renommé
    fontSize: 26,
    fontWeight: 'bold',
    color: '#091e60',
    marginBottom: 10,
  },
  offreCompany: { // Renommé
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  offreLocation: { // Renommé
    fontSize: 18,
    color: '#4B5563',
    marginBottom: 15,
  },
  offreInfo: { // Renommé
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 5,
  },
  separator: {
    borderBottomColor: '#D1D5DB',
    borderBottomWidth: 1,
    marginVertical: 20,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#091e60',
    marginBottom: 15,
  },
  offreDescription: { // Renommé
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 15, // Réduit pour laisser de la place au profil recherché
  },
  applyButton: {
    backgroundColor: '#0f8e35', // Vert secondaire
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 20, // Ajouter un peu d'espace au-dessus du bouton
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
