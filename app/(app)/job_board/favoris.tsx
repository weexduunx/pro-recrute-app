import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../components/AuthProvider';
import { getFavoris, toggleFavori } from '../../../utils/api';
import { router } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader';

export default function FavorisScreen() {
  const { user, logout } = useAuth();
  const [favoris, setFavoris] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingFavori, setTogglingFavori] = useState(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFavoris = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getFavoris();
      console.log('Favoris response:', response);

      if (response.success && response.data) {
        setFavoris(response.data);
      } else {
        setError('Impossible de charger les favoris');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des favoris:', err);
      setError(err.message || 'Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavoris();
    setRefreshing(false);
  };

  const handleToggleFavori = async (offreId: string) => {
    try {
      setTogglingFavori(offreId);
      const response = await toggleFavori(offreId);

      // Supprimer de la liste locale puisqu'on retire des favoris
      setFavoris(prev => prev.filter(item => item.offre_id.toString() !== offreId));

      Alert.alert("Succès", "Offre supprimée des favoris !");

    } catch (error: any) {
      console.error('Erreur lors de la suppression des favoris:', error);
      Alert.alert("Erreur", "Impossible de supprimer des favoris. Veuillez réessayer.");
    } finally {
      setTogglingFavori(null);
    }
  };

  const handleOffrePress = (offreId: string) => {
    router.push(`/job_board/job_details?id=${offreId}`);
  };

  const handleMenuPress = () => {
    Alert.alert("Menu", "Le menu hamburger a été pressé ! (À implémenter)");
  };

  const handleAvatarPress = () => {
    router.push('/(app)/dashboard');
  };

  const getContractTypeIcon = (contractType: string) => {
    const type = contractType?.toLowerCase();
    if (type?.includes('cdi')) return 'briefcase';
    if (type?.includes('cdd')) return 'calendar';
    if (type?.includes('stage')) return 'school';
    if (type?.includes('freelance')) return 'laptop';
    return 'document-text';
  };

  const renderFavoriCard = ({ item }: { item: any }) => {
    const offre = item.offre || item; // Gestion des structures variables
    const offreId = item.offre_id || offre.id;

    return (
      <TouchableOpacity
        style={styles.offreCard}
        onPress={() => handleOffrePress(offreId.toString())}
        activeOpacity={0.7}
      >
        {/* Header de la carte */}
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.offreTitle} numberOfLines={2}>
              {offre.poste?.titre_poste || offre.titre || 'Poste non spécifié'}
            </Text>
            <View style={styles.contractTypeContainer}>
              <Ionicons
                name={getContractTypeIcon(offre.type_contrat?.libelle_type_contrat || offre.type_contrat)}
                size={14}
                color="#0f8e35"
              />
              <Text style={styles.contractTypeText}>
                {offre.type_contrat?.libelle_type_contrat || offre.type_contrat || 'Non spécifié'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleToggleFavori(offreId.toString())}
            disabled={togglingFavori === offreId.toString()}
          >
            {togglingFavori === offreId.toString() ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons
                name="heart"
                size={20}
                color="#EF4444"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Informations de l'entreprise */}
        <View style={styles.companyInfo}>
          <Ionicons name="business" size={16} color="#091e60" />
          <Text style={styles.companyText}>
            {offre.demande?.entreprise?.libelleE || offre.entreprise?.libelleE || offre.entreprise || 'Entreprise non spécifiée'}
          </Text>
        </View>

        {/* Localisation */}
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={16} color="#0f8e35" />
          <Text style={styles.locationText}>{offre.lieux || offre.lieu || 'Lieu non spécifié'}</Text>
        </View>

        {/* Description */}
        <Text style={styles.offreDescription} numberOfLines={3}>
          {offre.description || 'Aucune description disponible'}
        </Text>

        {/* Date d'ajout aux favoris */}
        <View style={styles.cardFooter}>
          <View style={styles.tag}>
            <Ionicons name="heart" size={12} color="#EF4444" />
            <Text style={styles.tagText}>Favori</Text>
          </View>
          <TouchableOpacity style={styles.detailsButton} onPress={() => handleOffrePress(offreId.toString())}>
            <Text style={styles.detailsButtonText}>Voir détails</Text>
            <Ionicons name="chevron-forward" size={16} color="#0f8e35" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        <Ionicons name="heart-outline" size={80} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Aucun favori pour le moment</Text>
        <Text style={styles.emptyText}>
          Ajoutez des offres à vos favoris pour les retrouver facilement ici.
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => router.push('/job_board')}
        >
          <Ionicons name="search" size={20} color="#0f8e35" />
          <Text style={styles.browseButtonText}>Parcourir les offres</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0f8e35" />
      <Text style={styles.loadingText}>Chargement de vos favoris...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Erreur de chargement</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchFavoris}>
        <Ionicons name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    fetchFavoris();
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <CustomHeader
          title="Mes Favoris"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Connexion requise</Text>
          <Text style={styles.errorText}>
            Vous devez être connecté pour accéder à vos favoris.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader
        title="Mes Favoris"
        user={user}
        showBackButton={true}
        onBackPress={() => router.back()}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {loading ? renderLoadingState() :
       error ? renderErrorState() :
       favoris.length === 0 ? renderEmptyState() : (
        <View style={styles.container}>
          {/* Header de la section */}
          <View style={styles.sectionHeader}>
            <View style={styles.titleSection}>
              <Text style={styles.sectionTitle}>Mes offres favorites</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{favoris.length}</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Retrouvez ici toutes les offres que vous avez sauvegardées
            </Text>
          </View>

          {/* Liste des favoris */}
          <FlatList
            data={favoris}
            renderItem={renderFavoriCard}
            keyExtractor={(item) => item.offre_id?.toString() || item.id?.toString() || Math.random().toString()}
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
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  // État d'erreur
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  browseButton: {
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
  browseButtonText: {
    color: '#0f8e35',
    fontSize: 16,
    fontWeight: '600',
  },
  // Contenu principal
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
    backgroundColor: '#EF4444',
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
  // Cartes d'offres
  offreCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FEE2E2', // Bordure rouge légère pour les favoris
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  offreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 8,
    lineHeight: 24,
  },
  contractTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractTypeText: {
    fontSize: 14,
    color: '#0f8e35',
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  companyText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  offreDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
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