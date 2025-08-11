import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Platform, StatusBar } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { router, useLocalSearchParams } from 'expo-router';
import { getActualiteById } from '../../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'html-entities';

// Définition de type pour une actualité détaillée (doit correspondre à votre backend)
interface ActualiteDetail {
  id: string;
  fr_titre_mag: string;
  en_titre_mag?: string;
  fr_description: string; // Contenu complet
  en_description?: string;
  fr_image?: string;
  en_image?: string;
  apercu?: string;
  vues: number;
  type_id: number;
  categorie_id: number;
  created_at: string;
  // NOUVEAU : Ajout de la relation categorieMag
  categorieMag?: {
    id: number;
    fr_libelle: string;
    en_libelle?: string;
  };
}

/**
 * Écran des détails d'une actualité spécifique.
 * Récupère et affiche toutes les informations d'une actualité.
 * Inclut maintenant l'affichage de la catégorie.
 */
export default function ActualiteDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [actualiteDetail, setActualiteDetail] = useState<ActualiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActualiteDetails = useCallback(async () => {
    if (!id || !user) {
      setError("ID d'actualité ou utilisateur manquant.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedDetail = await getActualiteById(id.toString());
      setActualiteDetail(fetchedDetail as ActualiteDetail);
    } catch (err: any) {
      console.error("Erreur de chargement des détails de l'actualité:", err);
      setError(err.message || "Impossible de charger les détails de l'actualité.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadActualiteDetails();
  }, [loadActualiteDetails]);

  const handleMenuPress = () => { Alert.alert("Menu", "Menu Détails Actualité pressé!"); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <CustomHeader title="Détails Actualité" user={user} showBackButton={true} onAvatarPress={handleAvatarPress} />
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
        <CustomHeader title="Détails Actualité" user={user} showBackButton={true} onAvatarPress={handleAvatarPress} />
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Erreur</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadActualiteDetails}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!actualiteDetail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CustomHeader title="Détails Actualité" user={user} showBackButton={true} onAvatarPress={handleAvatarPress} />
        <View style={styles.centerContainer}>
          <View style={styles.emptyCard}>
            <Ionicons name="document-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Actualité introuvable</Text>
            <Text style={styles.emptyText}>L'actualité que vous recherchez n'existe plus ou n'est pas accessible.</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="Détails Actualité" user={user} showBackButton={true} onAvatarPress={handleAvatarPress} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Image de l'actualité */}
          {actualiteDetail.fr_image && (
            <Image 
              source={{ uri: 'https://globalbusiness-gbg.com/storage/images-actualite/' + actualiteDetail.fr_image }} 
              style={styles.mainImage} 
              resizeMode="cover" 
              onError={(e) => console.log('Error loading main news image:', e.nativeEvent.error)}
            />
          )}

          {/* Titre de l'actualité */}
          <Text style={styles.newsTitle}>{actualiteDetail.fr_titre_mag || actualiteDetail.en_titre_mag || 'Titre Actualité'}</Text>
          
          {/* Métadonnées */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>
                Publié le: {new Date(actualiteDetail.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>Vues: {actualiteDetail.vues}</Text>
            </View>
            {/* NOUVEAU : Affichage de la catégorie */}
            {actualiteDetail.categorieMag?.fr_libelle && (
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                <Text style={styles.metaText}>Catégorie: {actualiteDetail.categorieMag.fr_libelle}</Text>
              </View>
            )}
            {/* Vous pouvez ajouter type_id ici si vous avez des mappings */}
          </View>

          {/* Description complète */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}> 
              {decode((actualiteDetail.apercu || actualiteDetail.fr_description).replace(/<[^>]+>/g, '') )|| 'Description non disponible.'}
            </Text>
            
          </View>

          {/* Bouton retour */}
          <TouchableOpacity style={styles.mainButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.mainButtonText}>Retour aux actualités</Text>
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

  // Loading & Error States (réutilisés)
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
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091e60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 15,
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
    marginTop: 15,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mainButton: { // Style pour le bouton principal (Retour)
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
  
  // Actualité spécifique
  mainImage: {
    width: '100%',
    height: 250, // Hauteur plus grande pour l'image principale
    borderRadius: 16,
    marginBottom: 20,
  },
  newsTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 15, // Espacement entre les éléments de meta
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});
