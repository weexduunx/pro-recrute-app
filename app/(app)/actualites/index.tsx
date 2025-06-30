import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { getActualites } from '../../../utils/api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'html-entities';

// Définition de type pour une actualité (doit correspondre à votre backend)
interface ActualiteItem {
  id: string;
  fr_titre_mag: string;
  en_titre_mag?: string;
  fr_description?: string;
  en_description?: string;
  fr_image?: string; // URL de l'image
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
 * Écran de la liste complète des actualités.
 * Affiche toutes les actualités et permet la navigation vers leurs détails.
 * Inclut maintenant l'affichage de la catégorie.
 */
export default function ActualitesScreen() {
  const { user } = useAuth();
  const [news, setNews] = useState<ActualiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAllNews = useCallback(async () => {
    if (!user) {
      setNews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedNews = await getActualites();
      setNews(fetchedNews);
    } catch (err: any) {
      console.error("Erreur de chargement des actualités:", err);
      setError(err.message || "Impossible de charger les actualités.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllNews();
    setRefreshing(false);
  }, [loadAllNews]);

  useEffect(() => {
    loadAllNews();
  }, [loadAllNews]);

  const handleNewsPress = (newsId: string) => {
    router.push(`/(app)/actualites/actualites_details?id=${newsId}`);
  };

  const handleMenuPress = () => { Alert.alert("Menu", "Menu Actualités pressé!"); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader title="Actualités" user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="newspaper-outline" size={20} color="#091e60" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Toutes les Actualités</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0f8e35" />
              <Text style={styles.loadingText}>Chargement des actualités...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
              <Text style={styles.errorText}>Erreur: {error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadAllNews}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : news.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bulb-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucune actualité trouvée</Text>
              <Text style={styles.emptyText}>Restez à l'écoute pour les dernières nouvelles !</Text>
            </View>
          ) : (
            <View style={styles.newsList}>
              {news.map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.newsCard} 
                  onPress={() => handleNewsPress(item.id)}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={{ uri: 'https://globalbusiness-gbg.com/storage/images-actualite/' + item.fr_image }}
                    style={styles.newsImage}
                    resizeMode="cover"
                    onError={(e) => console.log('Error loading news list image:', e.nativeEvent.error)}
                  />
                  <View style={styles.newsContent}>
                    <Text style={styles.newsCardTitle} numberOfLines={2}>
                      {item.fr_titre_mag || item.en_titre_mag || 'Titre actualité'}
                    </Text>
                    {/* <Text style={styles.newsCardSubtitle} numberOfLines={3}>
                      {item.apercu || item.fr_description || 'Contenu actualité...'}
                    </Text> */}
                     <Text style={styles.newsCardSubtitle} numberOfLines={3}> 
                        {decode((item.apercu || item.fr_description).replace(/<[^>]+>/g, '') )|| 'Description non disponible.'}
                      </Text>
                    {/* NOUVEAU : Affichage de la catégorie */}
                    {item.categorieMag?.fr_libelle && (
                      <View style={styles.newsCategoryContainer}>
                        <Ionicons name="pricetag-outline" size={14} color="#1c6003" />
                        <Text style={styles.newsCategoryText}>{item.categorieMag.fr_libelle}</Text>
                      </View>
                    )}
                    <Text style={styles.newsCardDate}>
                      Publié le: {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#091e60',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 10,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: '#091e60',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  callToActionButton: {
    marginTop: 20,
    backgroundColor: '#0f8e35',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  callToActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // News List Specific Styles
  newsList: {
    // Aucune propriété spécifique pour le conteneur de liste si les cartes ont déjà des marges
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden', // Pour les bords arrondis de l'image
  },
  newsImage: {
    width: '100%',
    height: 180, // Hauteur fixe pour les images des actualités
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  newsContent: {
    padding: 15,
  },
  newsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 8,
  },
  newsCardSubtitle: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  newsCardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // NOUVEAU : Styles pour la catégorie
  newsCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF', // Fond clair pour le tag
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start', // Pour que le badge ne prenne pas toute la largeur
    marginBottom: 8,
    gap: 4,
  },
  newsCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6', // Couleur bleue pour le texte du tag
  },
});
