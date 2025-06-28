import React, { useEffect, useState, useMemo } from 'react';
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
  Dimensions,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../components/AuthProvider';
import { getOffres } from '../../../utils/api';
import { router } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 10; // Nombre d'offres par page

/**
 * Écran du Tableau d'Offres (Job Board) authentifié:
 * Interface améliorée avec pagination et lazy loading
 */
export default function AuthenticatedJobBoardScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [allOffres, setAllOffres] = useState([]); // Toutes les offres
  const [displayedOffres, setDisplayedOffres] = useState([]); // Offres affichées
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingOffres, setLoadingOffres] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorOffres, setErrorOffres] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Calculs de pagination
  const totalPages = Math.ceil(allOffres.length / ITEMS_PER_PAGE);
  const hasMoreData = currentPage < totalPages;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const fetchOffres = async () => {
    try {
      setLoadingOffres(true);
      setErrorOffres(null);
      const fetchedOffres = await getOffres();
      setAllOffres(fetchedOffres);
      
      // Charger la première page
      const firstPageOffres = fetchedOffres.slice(0, ITEMS_PER_PAGE);
      setDisplayedOffres(firstPageOffres);
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Échec de la récupération des offres:", err);
      setErrorOffres(err.message || "Impossible de charger les offres d'emploi.");
    } finally {
      setLoadingOffres(false);
    }
  };

  const loadMoreOffres = () => {
    if (!hasMoreData || loadingMore) return;
    
    setLoadingMore(true);
    
    // Simuler un délai de chargement (dans un vrai projet, ce serait un appel API)
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const newStartIndex = (nextPage - 1) * ITEMS_PER_PAGE;
      const newEndIndex = newStartIndex + ITEMS_PER_PAGE;
      const newOffres = allOffres.slice(newStartIndex, newEndIndex);
      
      setDisplayedOffres(prev => [...prev, ...newOffres]);
      setCurrentPage(nextPage);
      setLoadingMore(false);
    }, 800);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOffres();
    setRefreshing(false);
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    const newStartIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
    const newEndIndex = newStartIndex + ITEMS_PER_PAGE;
    const pageOffres = allOffres.slice(0, newEndIndex); // Charger jusqu'à cette page
    
    setDisplayedOffres(pageOffres);
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    fetchOffres();
  }, []);

  const handleOffrePress = (offreId: string) => {
    router.push(`/job_board/job_details?id=${offreId}`);
  };

  const handleMenuPress = () => {
    Alert.alert("Menu", "Le menu hamburger a été pressé ! (À implémenter)");
  };

  const handleAvatarPress = () => {
    Alert.alert("Profil", "L'avatar de l'utilisateur a été pressé ! (À implémenter)");
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

  const renderOffreCard = ({ item: offre, index }: { item: any, index: number }) => (
    <TouchableOpacity 
      style={styles.offreCard} 
      onPress={() => handleOffrePress(offre.id)}
      activeOpacity={0.7}
    >
      {/* Header de la carte */}
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.offreTitle} numberOfLines={2}>
            {offre.poste?.titre_poste || 'Poste non spécifié'}
          </Text>
          <View style={styles.contractTypeContainer}>
            <Ionicons 
              name={getContractTypeIcon(offre.typeContrat?.libelle_type_contrat)} 
              size={14} 
              color="#0f8e35" 
            />
            <Text style={styles.contractTypeText}>
              {offre.type_contrat?.libelle_type_contrat || 'Non spécifié'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Informations de l'entreprise */}
      <View style={styles.companyInfo}>
        <Ionicons name="business" size={16} color="#091e60" />
        <Text style={styles.companyText}>
          {offre.demande?.entreprise?.libelleE || 'Entreprise non spécifiée'}
        </Text>
      </View>

      {/* Localisation */}
      <View style={styles.locationInfo}>
        <Ionicons name="location" size={16} color="#0f8e35" />
        <Text style={styles.locationText}>{offre.lieux}</Text>
      </View>

      {/* Description */}
      <Text style={styles.offreDescription} numberOfLines={3}>
        {offre.description}
      </Text>

      {/* Footer de la carte */}
      <View style={styles.cardFooter}>
        <View style={styles.tagsContainer}>
          <View style={styles.tag}>
            <Ionicons name="time" size={12} color="#6B7280" />
            <Text style={styles.tagText}>Récent</Text>
          </View>
          <View style={styles.positionTag}>
            <Text style={styles.positionText}>#{index + 1}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>Voir détails</Text>
          <Ionicons name="chevron-forward" size={16} color="#0f8e35" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); 
           i <= Math.min(totalPages - 1, currentPage + delta); 
           i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Affichage de {displayedOffres.length} sur {allOffres.length} offres
          </Text>
          <Text style={styles.paginationSubtext}>
            Page {currentPage} sur {totalPages}
          </Text>
        </View>

        <View style={styles.paginationControls}>
          {/* Bouton Précédent */}
          <TouchableOpacity 
            style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
            onPress={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? "#D1D5DB" : "#091e60"} />
          </TouchableOpacity>

          {/* Numéros de pages */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumbers}>
            {getVisiblePages().map((page, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pageButton,
                  page === currentPage && styles.activePageButton,
                  page === '...' && styles.dotsButton
                ]}
                onPress={() => typeof page === 'number' && goToPage(page)}
                disabled={page === '...' || page === currentPage}
              >
                <Text style={[
                  styles.pageButtonText,
                  page === currentPage && styles.activePageButtonText
                ]}>
                  {page}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bouton Suivant */}
          <TouchableOpacity 
            style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
            onPress={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? "#D1D5DB" : "#091e60"} />
          </TouchableOpacity>
        </View>

        {/* Bouton Charger plus (lazy loading) */}
        {hasMoreData && (
          <TouchableOpacity 
            style={styles.loadMoreButton} 
            onPress={loadMoreOffres}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="#0f8e35" />
            ) : (
              <Ionicons name="add-circle-outline" size={20} color="#0f8e35" />
            )}
            <Text style={styles.loadMoreText}>
              {loadingMore ? 'Chargement...' : `Charger plus (${allOffres.length - displayedOffres.length} restantes)`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#0f8e35" />
        <Text style={styles.loadingText}>Récupération des offres d'emploi...</Text>
        <Text style={styles.loadingSubtext}>Veuillez patienter</Text>
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Oops ! Une erreur s'est produite</Text>
        <Text style={styles.errorText}>{errorOffres}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchOffres}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        <Ionicons name="briefcase-outline" size={80} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Aucune offre disponible</Text>
        <Text style={styles.emptyText}>
          Il n'y a pas d'offres d'emploi disponibles pour le moment. 
          Revenez plus tard ou actualisez la page.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#0f8e35" />
          <Text style={styles.refreshButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        title="Offres d'emploi"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {loadingOffres ? renderLoadingState() : 
       errorOffres ? renderErrorState() : 
       allOffres.length === 0 ? renderEmptyState() : (
        <View style={styles.container}>
          {/* Header de la section */}
          <View style={styles.sectionHeader}>
            <View style={styles.titleSection}>
              <Text style={styles.sectionTitle}>Offres disponibles</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{allOffres.length}</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Découvrez les opportunités qui vous correspondent
            </Text>
          </View>

          {/* Liste des offres avec FlatList pour de meilleures performances */}
          <FlatList
            data={displayedOffres}
            renderItem={renderOffreCard}
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
            ListFooterComponent={renderPaginationControls}
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
    borderColor: '#F1F5F9',
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
    backgroundColor: '#F8FAFC',
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
  // Pagination
  paginationContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  paginationText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  paginationSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paginationButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  disabledButton: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  pageNumbers: {
    marginHorizontal: 16,
  },
  pageButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 2,
  },
  activePageButton: {
    backgroundColor: '#091e60',
    borderColor: '#091e60',
  },
  dotsButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pageButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  activePageButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f8e35',
    gap: 8,
    marginTop: 16,
  },
  loadMoreText: {
    color: '#0f8e35',
    fontSize: 16,
    fontWeight: '600',
  },
});