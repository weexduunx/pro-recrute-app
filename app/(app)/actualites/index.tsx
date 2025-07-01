import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  FlatList,
  Dimensions,
  StatusBar
} from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { getActualites } from '../../../utils/api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'html-entities';

const { width } = Dimensions.get('window');

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

  const handleMenuPress = () => {
    Alert.alert("Menu", "Le menu hamburger a été pressé ! (À implémenter)");
  };

  const handleAvatarPress = () => {
    router.push('/(app)/profile-details');
  };

  const renderNewsCard = ({ item, index }: { item: ActualiteItem; index: number }) => {
    return (
      <TouchableOpacity
        style={styles.newsCard}
        onPress={() => handleNewsPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Image de l'actualité */}
        <Image
          source={{ uri: 'https://globalbusiness-gbg.com/storage/images-actualite/' + item.fr_image }}
          style={styles.newsImage}
          resizeMode="cover"
          onError={(e) => console.log('Error loading news list image:', e.nativeEvent.error)}
        />

        {/* Contenu de la carte */}
        <View style={styles.newsContent}>
          {/* Header de la carte */}
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.newsTitle} numberOfLines={2}>
                {item.fr_titre_mag || item.en_titre_mag || 'Titre actualité'}
              </Text>
              {/* Catégorie */}
              {item.categorieMag?.fr_libelle && (
                <View style={styles.categoryContainer}>
                  <Ionicons name="pricetag" size={12} color="#0f8e35" />
                  <Text style={styles.categoryText}>{item.categorieMag.fr_libelle}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.favoriteButton}>
              <Ionicons name="bookmark-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.newsDescription} numberOfLines={3}>
            {decode((item.apercu || item.fr_description)?.replace(/<[^>]+>/g, '') ?? '') || 'Description non disponible.'}
          </Text>

          {/* Informations de date et vues */}
          <View style={styles.infoSection}>
            <View style={styles.dateInfo}>
              <Ionicons name="calendar" size={14} color="#6B7280" />
              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            <View style={styles.viewsInfo}>
              <Ionicons name="eye" size={14} color="#6B7280" />
              <Text style={styles.viewsText}>{item.vues} vues</Text>
            </View>
          </View>

          {/* Footer de la carte */}
          <View style={styles.cardFooter}>
            <View style={styles.tagsContainer}>
              <View style={styles.tag}>
                <Ionicons name="newspaper" size={12} color="#6B7280" />
                <Text style={styles.tagText}>Actualité</Text>
              </View>
              <View style={styles.positionTag}>
                <Text style={styles.positionText}>#{index + 1}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.detailsButtonText}>Lire plus</Text>
              <Ionicons name="chevron-forward" size={16} color="#0f8e35" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#0f8e35" />
        <Text style={styles.loadingText}>Chargement des actualités...</Text>
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
        <TouchableOpacity style={styles.retryButton} onPress={loadAllNews}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        <Ionicons name="newspaper-outline" size={80} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Aucune actualité</Text>
        <Text style={styles.emptyText}>
          Restez à l'écoute pour les dernières nouvelles et mises à jour !
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadAllNews}>
          <Ionicons name="refresh" size={20} color="#0f8e35" />
          <Text style={styles.refreshButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader
        title="Actualités"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {loading ? renderLoadingState() :
        error ? renderErrorState() :
          news.length === 0 ? renderEmptyState() : (
            <View style={styles.container}>
              {/* Header de la section */}
              <View style={styles.sectionHeader}>
                <View style={styles.titleSection}>
                  <Text style={styles.sectionTitle}>Toutes les Actualités</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{news.length}</Text>
                  </View>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Restez informé des dernières nouvelles et mises à jour
                </Text>
              </View>

              {/* Liste des actualités */}
              <FlatList
                data={news}
                renderItem={renderNewsCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#0f8e35']}
                    tintColor="#0f8e35"
                  />
                }
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
              />
            </View>
          )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  // États de chargement
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
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // État d'erreur
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
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091e60',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // État vide
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
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f8e35',
    gap: 8,
  },
  refreshButtonText: {
    color: '#0f8e35',
    fontSize: 16,
    fontWeight: '600',
  },
  // Section header
  sectionHeader: {
    padding: 24,
    paddingBottom: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#091e60',
    marginRight: 12,
  },
  countBadge: {
    backgroundColor: '#0f8e35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  // Cartes d'actualités
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: 180,
  },
  newsContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 8,
    lineHeight: 24,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f8e35',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  newsDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  positionTag: {
    backgroundColor: '#091e60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  positionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsButtonText: {
    color: '#0f8e35',
    fontSize: 14,
    fontWeight: '600',
  },
});