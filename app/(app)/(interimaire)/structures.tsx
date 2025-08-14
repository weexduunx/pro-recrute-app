import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  TextInput,
  Dimensions,
  Linking,
  ActivityIndicator,
  ScrollView,
  Platform,
  SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import {
  searchStructures,
  getCurrentLocation,
  reverseGeocode,
  formatDistance,
  openStructureInMaps,
  getSpecialties,
  getStructureTypes,
  STRUCTURE_TYPES,
  SEARCH_RADIUS_OPTIONS
} from '../../../utils/geolocation-api';
import CustomHeader from '../../../components/CustomHeader';

const { width } = Dimensions.get('window');

export default function StructuresScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  // États principaux
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // États de recherche et filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(25);
  const [urgenciesOnly, setUrgenciesOnly] = useState(false);

  // États de géolocalisation
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');

  // Données pour les filtres
  const [availableSpecialties, setAvailableSpecialties] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (userLocation) {
      searchWithCurrentFilters();
    }
  }, [selectedType, selectedSpecialty, selectedRadius, urgenciesOnly]);

  const loadInitialData = async () => {
    await Promise.all([
      loadFilterData(),
      requestLocationAndSearch()
    ]);
  };

  const loadFilterData = async () => {
    try {
      const [specialtiesRes, typesRes] = await Promise.all([
        getSpecialties(),
        getStructureTypes()
      ]);

      if (specialtiesRes.success) {
        setAvailableSpecialties(specialtiesRes.data);
      }

      if (typesRes.success) {
        setAvailableTypes(typesRes.data);
      }
    } catch (error) {
      console.error('Erreur chargement filtres:', error);
    }
  };

  const requestLocationAndSearch = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setLocationPermission('granted');

      // Obtenir l'adresse de la position actuelle
      const address = await reverseGeocode(location.latitude, location.longitude);
      if (address) {
        setCurrentAddress(address.formattedAddress);
      }

      // Effectuer la première recherche
      await performSearch(location, 1, true);
    } catch (error) {
      console.error('Erreur géolocalisation:', error);
      setLocationPermission('denied');

      Alert.alert(
        'Géolocalisation indisponible',
        'Pour une meilleure expérience, activez la géolocalisation pour trouver les structures les plus proches.',
        [
          { text: 'Continuer sans', onPress: () => performSearch(null, 1, true) },
          { text: 'Paramètres', onPress: () => Linking.openSettings() }
        ]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const performSearch = async (location = null, page = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setStructures([]);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const searchParams = {
        page,
        per_page: 20,
        search: searchQuery || undefined,
        type: selectedType || undefined,
        specialite: selectedSpecialty || undefined,
        urgences_24h: urgenciesOnly || undefined
      };

      // Ajouter la géolocalisation si disponible
      if (location || userLocation) {
        const coords = location || userLocation;
        searchParams.latitude = coords.latitude;
        searchParams.longitude = coords.longitude;
        searchParams.radius = selectedRadius;
      }

      const response = await searchStructures(searchParams);

      if (response.success) {
        const newStructures = response.data.structures;

        if (reset) {
          setStructures(newStructures);
        } else {
          setStructures(prev => [...prev, ...newStructures]);
        }

        setHasMore(response.data.pagination.has_more);
        setCurrentPage(response.data.pagination.current_page);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      Alert.alert('Erreur', 'Impossible de charger les structures');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const searchWithCurrentFilters = () => {
    performSearch(userLocation, 1, true);
  };

  const handleSearch = () => {
    searchWithCurrentFilters();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    performSearch(userLocation, 1, true);
  }, [userLocation, searchQuery, selectedType, selectedSpecialty, selectedRadius, urgenciesOnly]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      performSearch(userLocation, currentPage + 1, false);
    }
  };

  const handleStructurePress = (structure) => {
    router.push({
      pathname: '/(app)/(interimaire)/structure-details',
      params: {
        id: structure.id,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude
      }
    });
  };

  const handleDirections = (structure: { latitude: number; longitude: number }) => {
    if (!userLocation) {
      Alert.alert('Position indisponible', 'Impossible de calculer l\'itinéraire sans votre position');
      return;
    }

    const mapsUrl = openStructureInMaps(structure, userLocation);
    Linking.openURL(mapsUrl);
  };

  const renderStructureItem = ({ item }) => {
    const hasCoordinates = item.latitude && item.longitude;
    const distance = item.distance ? formatDistance(parseFloat(item.distance)) : null;

    return (
      <TouchableOpacity
        style={[styles.structureCard, { backgroundColor: colors.background }]}
        onPress={() => handleStructurePress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Text style={[styles.structureName, { color: colors.primary }]} numberOfLines={2}>
              {item.name}
            </Text>
            {distance && (
              <Text style={[styles.distance, { color: colors.secondary }]}>
                {distance}
              </Text>
            )}
          </View>

          <View style={styles.typeContainer}>
            <Text style={[styles.structureType, { color: colors.textSecondary }]}>
              {(() => {
                switch (parseInt(item.type)) {
                  case 0: return 'Clinique';
                  case 1: return 'Hôpital';
                  case 2: return 'Pharmacie';
                  case 3: return 'Opticien';
                  default: return 'Non spécifié';
                }
              })()}
            </Text>
            {item.urgences_24h && (
              <View style={[styles.urgencyBadge, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="medical" size={12} color={colors.error} />
                <Text style={[styles.urgencyText, { color: colors.error }]}>24h</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.adresse}
          </Text>
        </View>

        {item.tel && (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.contact, { color: colors.textSecondary }]}>
              {item.tel}
            </Text>
          </View>
        )}

        {item.specialites && item.specialites.length > 0 && (
          <View style={styles.specialtiesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {item.specialites.slice(0, 3).map((specialty, index) => (
                <View
                  key={index}
                  style={[styles.specialtyChip, { backgroundColor: colors.secondary + '20' }]}
                >
                  <Text style={[styles.specialtyText, { color: colors.secondary }]}>
                    {specialty}
                  </Text>
                </View>
              ))}
              {item.specialites.length > 3 && (
                <Text style={[styles.moreSpecialties, { color: colors.textSecondary }]}>
                  +{item.specialites.length - 3}
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleStructurePress(item)}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.actionText, { color: colors.textTertiary }]}>
              Détails
            </Text>
          </TouchableOpacity>

          {hasCoordinates && userLocation && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
              onPress={() => handleDirections(item)}
            >
              <Ionicons name="navigate-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.actionText, { color: colors.textTertiary }]}>
                Itinéraire
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchHeader = () => (
    <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInputContainer, { borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher une structure..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); handleSearch(); }}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.secondary }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options-outline" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {currentAddress && (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={colors.secondary} />
          <Text style={[styles.currentLocation, { color: colors.textSecondary }]} numberOfLines={1}>
            {currentAddress}
          </Text>
        </View>
      )}

      {showFilters && renderFilters()}
    </View>
  );

  const renderFilters = () => (
    <View style={[styles.filtersContainer, { borderTopColor: colors.border }]}>
      {/* Type de structure */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.primary }]}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STRUCTURE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value || 'all'}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedType === type.value ? colors.secondary : colors.background,
                  borderColor: colors.border
                }
              ]}
              onPress={() => setSelectedType(selectedType === type.value ? null : type.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedType === type.value ? colors.textTertiary : colors.textSecondary }
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Rayon de recherche */}
      {userLocation && (
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.primary }]}>Rayon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SEARCH_RADIUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedRadius === option.value ? colors.secondary : colors.background,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedRadius(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedRadius === option.value ? colors.textTertiary : colors.textSecondary }
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Options supplémentaires */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setUrgenciesOnly(!urgenciesOnly)}
        >
          <Ionicons
            name={urgenciesOnly ? "checkbox" : "checkbox-outline"}
            size={20}
            color={urgenciesOnly ? colors.secondary : colors.textSecondary}
          />
          <Text style={[styles.checkboxText, { color: colors.text }]}>
            Urgences 24h seulement
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="business-outline"
        size={64}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Aucune structure trouvée
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Essayez d'élargir votre rayon de recherche ou de modifier vos filtres
      </Text>
    </View>
  );

  if (locationLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader title="Structures de soins" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Localisation en cours...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title="Structures de soins" showBackButton={true} />

      <FlatList
        data={structures}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStructureItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.secondary]}
          />
        }
        ListHeaderComponent={renderSearchHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator color={colors.secondary} />
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={structures.length === 0 ? styles.emptyListContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  // Search header
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    padding: 12,
    borderRadius: 25,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  currentLocation: {
    marginLeft: 6,
    fontSize: 13,
    flex: 1,
  },

  // Filters
  filtersContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: 14,
  },

  // Structure items
  structureCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  structureName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  distance: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  structureType: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  address: {
    flex: 1,
    fontSize: 14,
    marginLeft: 6,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contact: {
    fontSize: 14,
    marginLeft: 6,
  },
  specialtiesContainer: {
    marginBottom: 12,
  },
  specialtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreSpecialties: {
    fontSize: 11,
    alignSelf: 'center',
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Empty state
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Load more
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
});