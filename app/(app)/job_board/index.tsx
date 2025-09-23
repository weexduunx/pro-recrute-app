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
  FlatList,
  StatusBar,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../components/AuthProvider';
import { getOffres, toggleFavori, checkFavoriStatus, getFavoris } from '../../../utils/api';
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
  
  // États pour la recherche et les filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    type_contrat: '',
    lieu_travail: '',
    secteur: ''
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filteredOffres, setFilteredOffres] = useState([]);
  
  // États pour la gestion des favoris
  const [favorisIds, setFavorisIds] = useState(new Set()); // Set des IDs des offres en favoris
  const [togglingFavori, setTogglingFavori] = useState(null); // ID de l'offre en cours de toggle

  // Fonction pour recharger seulement les favoris
  const refreshFavoris = async () => {
    if (!user) return;
    
    try {
      const favorisResponse = await getFavoris();
      
      if (favorisResponse.success && favorisResponse.data) {
        const favorisSet = new Set();
        favorisResponse.data.forEach((favori: { offre_id: number | string }) => {
          favorisSet.add(favori.offre_id.toString());
        });
        setFavorisIds(favorisSet);
      }
    } catch (error) {
      console.log('Erreur lors du rafraîchissement des favoris:', error);
    }
  };

  // Fonction de filtrage et de recherche
  const applyFiltersAndSearch = (offres: any[], query: string, filters: { type_contrat: string, lieu_travail: string, secteur: string }) => {
    console.log('🔍 Début filtrage:', {
      totalOffres: offres.length,
      query,
      filters,
      premierElement: offres[0]
    });

    let result = offres;

    // Filtre par recherche
    if (query.trim()) {
      const beforeCount = result.length;
      result = result.filter(offre =>
        offre.poste?.titre_poste?.toLowerCase().includes(query.toLowerCase()) ||
        offre.demande?.entreprise?.libelleE?.toLowerCase().includes(query.toLowerCase()) ||
        offre.entreprise?.libelleE?.toLowerCase().includes(query.toLowerCase()) ||
        offre.lieux?.toLowerCase().includes(query.toLowerCase())
      );
      console.log(`📝 Filtre recherche "${query}": ${beforeCount} → ${result.length}`);
    }

    // Filtre par type de contrat
    if (filters.type_contrat) {
      const beforeCount = result.length;
      result = result.filter(offre => {
        const typeContrat = offre.type_contrat?.libelle_type_contrat || offre.poste?.type_contrat;
        const match = typeContrat?.toLowerCase().includes(filters.type_contrat.toLowerCase());
        return match;
      });
      console.log(`💼 Filtre contrat "${filters.type_contrat}": ${beforeCount} → ${result.length}`);
    }

    // Filtre par lieu
    if (filters.lieu_travail) {
      const beforeCount = result.length;
      console.log(`🔍 Debug lieux dans offres:`, result.slice(0, 3).map(o => `"${o.lieux || o.ville || o.lieu || 'Non défini'}"`));
      result = result.filter(offre => {
        // Récupérer toutes les variantes possibles de lieu
        const offreLieux = (offre.lieux || offre.ville || offre.lieu || '').toLowerCase().trim();
        const filterLieu = filters.lieu_travail.toLowerCase().trim();

        // Correspondance directe ou partielle
        let matches = false;

        if (offreLieux && filterLieu) {
          // Correspondance exacte
          matches = offreLieux === filterLieu;

          // Correspondance partielle (contient)
          if (!matches) {
            matches = offreLieux.includes(filterLieu) || filterLieu.includes(offreLieux);
          }

          // Correspondance avec normalisation (enlever accents, espaces, etc.)
          if (!matches) {
            const normalizeString = (str) => str
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^\w]/g, '')
              .toLowerCase();

            const normalizedOffre = normalizeString(offreLieux);
            const normalizedFilter = normalizeString(filterLieu);

            matches = normalizedOffre.includes(normalizedFilter) || normalizedFilter.includes(normalizedOffre);
          }
        }

        if (beforeCount <= 5) console.log(`  Offre "${offreLieux}" vs filtre "${filterLieu}": ${matches}`);
        return matches;
      });
      console.log(`📍 Filtre lieu "${filters.lieu_travail}": ${beforeCount} → ${result.length}`);
    }

    // Filtre par secteur
    if (filters.secteur) {
      const beforeCount = result.length;
      result = result.filter(offre => {
        const secteur = offre.secteur?.libelle_secteur || offre.poste?.secteur;
        return secteur?.toLowerCase().includes(filters.secteur.toLowerCase());
      });
      console.log(`🏢 Filtre secteur "${filters.secteur}": ${beforeCount} → ${result.length}`);
    }

    console.log('✅ Résultat final du filtrage:', result.length);
    return result;
  };

  // Déterminer si des filtres sont actifs
  const hasActiveFilters = searchQuery.trim() !== '' ||
    selectedFilters.type_contrat !== '' ||
    selectedFilters.lieu_travail !== '' ||
    selectedFilters.secteur !== '';

  // Calculs de pagination basés sur les offres filtrées
  const workingOffres = hasActiveFilters ? filteredOffres : allOffres;
  const totalPages = Math.ceil(workingOffres.length / ITEMS_PER_PAGE);
  const hasMoreData = currentPage < totalPages;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const fetchOffres = async () => {
    try {
      setLoadingOffres(true);
      setErrorOffres(null);
      const fetchedOffres = await getOffres();
      setAllOffres(fetchedOffres);
      
      // Charger l'état des favoris si l'utilisateur est connecté
      if (user && fetchedOffres.length > 0) {
        try {
          // Utiliser l'API getFavoris pour récupérer tous les favoris d'un coup
          const favorisResponse = await getFavoris();
          
          if (favorisResponse.success && favorisResponse.data) {
            const favorisSet = new Set();
            favorisResponse.data.forEach((favori: { offre_id: string | number }) => {
              favorisSet.add(favori.offre_id.toString());
            });
            setFavorisIds(favorisSet);
          } else {
            // Si la réponse n'est pas successful, garder l'état actuel des favoris
            console.log('Réponse favoris non successful:', favorisResponse);
          }
        } catch (error) {
          console.log('Erreur lors du chargement des favoris, conservation de l\'état actuel:', error);
          // Ne pas vider l'état des favoris en cas d'erreur
        }
      }
      
      // Appliquer les filtres et recherche
      const filtered = applyFiltersAndSearch(fetchedOffres, searchQuery, selectedFilters);
      setFilteredOffres(filtered);

      // Charger la première page
      const firstPageOffres = filtered.slice(0, ITEMS_PER_PAGE);
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
      const newOffres = workingOffres.slice(newStartIndex, newEndIndex);
      
      setDisplayedOffres(prev => [...prev, ...newOffres]);
      setCurrentPage(nextPage);
      setLoadingMore(false);
    }, 800);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOffres();
    // Rafraîchir aussi les favoris après avoir chargé les offres
    await refreshFavoris();
    setRefreshing(false);
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    const newStartIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
    const newEndIndex = newStartIndex + ITEMS_PER_PAGE;
    const pageOffres = workingOffres.slice(0, newEndIndex); // Utiliser les offres filtrées
    
    setDisplayedOffres(pageOffres);
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    fetchOffres();
  }, []);

  // Charger les favoris quand l'utilisateur change
  useEffect(() => {
    if (user) {
      refreshFavoris();
    } else {
      // Si l'utilisateur se déconnecte, vider les favoris
      setFavorisIds(new Set());
    }
  }, [user]);

  // Fonction pour appliquer la recherche
  const handleSearch = (query: string) => {
    console.log('🔎 Recherche lancée:', query);
    setSearchQuery(query);
    const filtered = applyFiltersAndSearch(allOffres, query, selectedFilters);
    setFilteredOffres(filtered);

    // Réinitialiser la pagination
    setCurrentPage(1);
    const firstPage = filtered.slice(0, ITEMS_PER_PAGE);
    setDisplayedOffres(firstPage);
    console.log(' Mise à jour affichage:', firstPage.length);
  };

  // Fonction pour appliquer les filtres
  const applyFilters = (filters: { type_contrat: string, lieu_travail: string, secteur: string }) => {
    console.log('Filtres appliqués:', filters);
    setSelectedFilters(filters);
    const filtered = applyFiltersAndSearch(allOffres, searchQuery, filters);
    setFilteredOffres(filtered);

    // Réinitialiser la pagination
    setCurrentPage(1);
    const firstPage = filtered.slice(0, ITEMS_PER_PAGE);
    setDisplayedOffres(firstPage);
    setShowFilterModal(false);
    console.log(' Mise à jour affichage (filtres):', firstPage.length);
  };

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedFilters({ type_contrat: '', lieu_travail: '', secteur: '' });
    setFilteredOffres([]);
    
    // Réinitialiser avec toutes les offres
    setCurrentPage(1);
    const firstPage = allOffres.slice(0, ITEMS_PER_PAGE);
    setDisplayedOffres(firstPage);
    setShowFilterModal(false);
  };

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

  // Fonction pour gérer l'ajout/suppression des favoris
  const handleToggleFavori = async (offreId: string) => {
    if (!user) {
      Alert.alert("Connexion requise", "Vous devez être connecté pour ajouter des favoris.");
      return;
    }

    const wasInFavoris = favorisIds.has(offreId);
    console.log(`🔄 Toggle favori pour offre ${offreId}, était en favoris: ${wasInFavoris}`);

    try {
      setTogglingFavori(offreId);

      // Mise à jour optimiste de l'UI
      const newFavorisIds = new Set(favorisIds);
      if (wasInFavoris) {
        newFavorisIds.delete(offreId);
      } else {
        newFavorisIds.add(offreId);
      }
      setFavorisIds(newFavorisIds);

      const response = await toggleFavori(offreId);
      console.log('✅ Réponse toggle favori complète:', JSON.stringify(response, null, 2));

      // Vérifier si l'API a retourné un état différent de ce qu'on attend
      let apiStatus = null;
      if (response.data && response.data.is_favorite !== undefined) {
        apiStatus = response.data.is_favorite;
      } else if (response.is_favorite !== undefined) {
        apiStatus = response.is_favorite;
      } else if (response.is_favorited !== undefined) {
        apiStatus = response.is_favorited;
      } else if (response.favorited !== undefined) {
        apiStatus = response.favorited;
      }

      // Si l'API retourne un état différent de notre prédiction, corriger
      if (apiStatus !== null) {
        const currentState = newFavorisIds.has(offreId);
        if (apiStatus !== currentState) {
          console.log(`🔧 Correction nécessaire: API dit ${apiStatus}, UI dit ${currentState}`);
          if (apiStatus) {
            newFavorisIds.add(offreId);
          } else {
            newFavorisIds.delete(offreId);
          }
          setFavorisIds(new Set(newFavorisIds));
        }
      }

      // Afficher le message de succès
      if (!wasInFavoris) {
        Alert.alert("Succès", "Offre ajoutée aux favoris !");
      } else {
        Alert.alert("Succès", "Offre supprimée des favoris !");
      }

    } catch (error: any) {
      console.error('❌ Erreur lors du toggle favori:', error);

      // En cas d'erreur, revenir à l'état initial
      const revertedFavorisIds = new Set(favorisIds);
      if (wasInFavoris) {
        revertedFavorisIds.add(offreId);
      } else {
        revertedFavorisIds.delete(offreId);
      }
      setFavorisIds(revertedFavorisIds);

      Alert.alert("Erreur", "Impossible de modifier les favoris. Veuillez réessayer.");
    } finally {
      setTogglingFavori(null);
    }
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
              name={getContractTypeIcon(offre.type_contrat?.libelle_type_contrat)} 
              size={14} 
              color="#0f8e35" 
            />
            <Text style={styles.contractTypeText}>
              {offre.type_contrat?.libelle_type_contrat || 'Non spécifié'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => handleToggleFavori(offre.id)}
          disabled={togglingFavori === offre.id}
        >
          {togglingFavori === offre.id ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons 
              name={favorisIds.has(offre.id) ? "heart" : "heart-outline"} 
              size={20} 
              color={favorisIds.has(offre.id) ? "#EF4444" : "#6B7280"} 
            />
          )}
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
        <TouchableOpacity style={styles.detailsButton} onPress={() => handleOffrePress(offre.id)}>
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
            Affichage de {displayedOffres.length} sur {workingOffres.length} offres
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
              {loadingMore ? 'Chargement...' : `Charger plus (${workingOffres.length - displayedOffres.length} restantes)`}
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

  // Compte des filtres actifs
  const activeFiltersCount = Object.values(selectedFilters).filter(value => value !== '').length;

  const renderSearchAndFilters = () => (
    <View style={styles.searchAndFiltersContainer}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des offres..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Section des filtres */}
      <View style={styles.filtersSection}>
        <TouchableOpacity 
          style={[styles.filterButton, activeFiltersCount > 0 && styles.activeFilterButton]} 
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={16} color={activeFiltersCount > 0 ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.filterButtonText, activeFiltersCount > 0 && styles.activeFilterButtonText]}>
            Filtrer
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {(activeFiltersCount > 0 || searchQuery.length > 0) && (
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Ionicons name="refresh" size={16} color="#EF4444" />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres de recherche</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Filtre Type de contrat */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Type de contrat</Text>
              <View style={styles.contractTypeOptions}>
                {['', 'CDI', 'CDD', 'Stage', 'Freelance', 'Alternance'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.contractOption,
                      selectedFilters.type_contrat === type && styles.selectedContractOption
                    ]}
                    onPress={() => setSelectedFilters(prev => ({ ...prev, type_contrat: type }))}
                  >
                    <Text style={[
                      styles.contractOptionText,
                      selectedFilters.type_contrat === type && styles.selectedContractOptionText
                    ]}>
                      {type || 'Tous'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtre Lieu de travail */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Lieu de travail</Text>
              <View style={styles.locationInputContainer}>
                <Ionicons name="location" size={20} color="#6B7280" style={styles.locationIcon} />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Ville, région..."
                  placeholderTextColor="#9CA3AF"
                  value={selectedFilters.lieu_travail}
                  onChangeText={(text) => setSelectedFilters(prev => ({ ...prev, lieu_travail: text }))}
                />
              </View>
            </View>

            {/* Filtre Secteur */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Secteur d'activité</Text>
              <View style={styles.locationInputContainer}>
                <Ionicons name="business" size={20} color="#6B7280" style={styles.locationIcon} />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Informatique, Commerce..."
                  placeholderTextColor="#9CA3AF"
                  value={selectedFilters.secteur}
                  onChangeText={(text) => setSelectedFilters(prev => ({ ...prev, secteur: text }))}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={() => applyFilters(selectedFilters)}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader
        title="Offres d'emploi"
        user={user}
        showNotificationIcon={true}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
        rightComponent={
          <TouchableOpacity
            style={styles.favoriteHeaderButton}
            onPress={() => router.push('/job_board/favoris')}
          >
            <Ionicons name="heart" size={24} color="#FFFFFF" />
            <Text style={styles.favoriteHeaderText}>Favoris</Text>
          </TouchableOpacity>
        }
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
                <Text style={styles.countText}>{workingOffres.length}</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Découvrez les opportunités qui vous correspondent
            </Text>
          </View>

          {/* Barre de recherche et filtres */}
          {renderSearchAndFilters()}

          {/* Modal de filtrage */}
          {renderFilterModal()}

          {/* Liste des offres avec FlatList pour de meilleures performances */}
          <FlatList
            data={displayedOffres || []}
            renderItem={renderOffreCard}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
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
  // Styles pour la recherche et les filtres
  searchAndFiltersContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filtersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: '#0f8e35',
    borderColor: '#0f8e35',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  filterCountBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  filterCountText: {
    fontSize: 12,
    color: '#0f8e35',
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 4,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  // Styles pour le modal de filtres
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  contractTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contractOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedContractOption: {
    backgroundColor: '#091e60',
    borderColor: '#091e60',
  },
  contractOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedContractOptionText: {
    color: '#FFFFFF',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationIcon: {
    marginRight: 8,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    padding: 0,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0f8e35',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Styles pour le bouton favoris dans l'en-tête
  favoriteHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  favoriteHeaderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});