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
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  FlatList
} from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { getUserApplications } from '../../../utils/api';
import { router } from 'expo-router';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Application {
  id: string;
  etat: string;
  offre?: {
    poste?: {
      titre_poste?: string;
    };
    demande?: {
      entreprise?: {
        libelleE?: string;
      };
    };
  };
  date_postule?: string;
}

export default function MyApplicationsScreen() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const getStatusConfig = (etat: string) => {
    switch (etat) {
      case 'En attente':
        return {
          color: '#F59E0B',
          backgroundColor: '#FEF3C7',
          icon: 'time',
          text: 'En attente',
        };
      case 'Acceptée':
        return {
          color: '#10B981',
          backgroundColor: '#D1FAE5',
          icon: 'checkmark-circle-outline',
          text: 'Acceptée',
        };
      case 'Refusée':
        return {
          color: '#EF4444',
          backgroundColor: '#FEE2E2',
          icon: 'close-circle-outline',
          text: 'Refusée',
        };
      default:
        return {
          color: '#6B7280',
          backgroundColor: '#F3F4F6',
          icon: 'help-circle-outline',
          text: etat,
        };
    }
  };

  const loadApplications = useCallback(async () => {
    if (!user) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedApplications = await getUserApplications();
      setApplications(fetchedApplications);
    } catch (err: any) {
      console.error("Erreur de chargement des candidatures:", err);
      setError(err.message || "Impossible de charger vos candidatures.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  }, [loadApplications]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleApplicationPress = (applicationId: string) => {
    router.push(`/candidature/application_details?id=${applicationId}`);
  };

  const handleMenuPress = () => {
    Alert.alert("Menu", "Le menu hamburger a été pressé ! (À implémenter)");
  };

  const handleAvatarPress = () => {
    router.push('/(app)/profile-details');
  };

  const renderApplicationCard = ({ item: app, index }: { item: Application; index: number }) => {
    const statusConfig = getStatusConfig(app.etat);

    return (
      <TouchableOpacity 
        style={styles.applicationCard} 
        onPress={() => handleApplicationPress(app.id)}
        activeOpacity={0.7}
      >
        {/* Header de la carte */}
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.applicationTitle} numberOfLines={2}>
              {app.offre?.poste?.titre_poste || 'Poste non spécifié'}
            </Text>
            <View style={styles.companyContainer}>
              <Ionicons name="business" size={14} color="#091e60" />
              <Text style={styles.companyText}>
                {app.offre?.demande?.entreprise?.libelleE || 'Entreprise non spécifiée'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons name="bookmark-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Informations de date */}
        <View style={styles.dateInfo}>
          <Ionicons name="calendar" size={16} color="#0f8e35" />
          <Text style={styles.dateText}>
            Postulé le {app.date_postule ? new Date(app.date_postule).toLocaleDateString('fr-FR') : 'N/A'}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.backgroundColor }]}>
            <Ionicons
              name={statusConfig.icon as any}
              size={14}
              color={statusConfig.color}
            />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>

        {/* Footer de la carte */}
        <View style={styles.cardFooter}>
          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Ionicons name="time" size={12} color="#6B7280" />
              <Text style={styles.tagText}>Candidature</Text>
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
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#0f8e35" />
        <Text style={styles.loadingText}>Récupération de vos candidatures...</Text>
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
        <TouchableOpacity style={styles.retryButton} onPress={loadApplications}>
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
        <Text style={styles.emptyTitle}>Aucune candidature</Text>
        <Text style={styles.emptyText}>
          Commencez votre recherche d'emploi en postulant à des offres qui vous intéressent !
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => router.push('/(app)/job_board')}
        >
          <Ionicons name="search" size={20} color="#0f8e35" />
          <Text style={styles.refreshButtonText}>Parcourir les offres</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>

      <CustomHeader
        title="Candidatures"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {loading ? renderLoadingState() : 
       error ? renderErrorState() : 
       applications.length === 0 ? renderEmptyState() : (
        <View style={styles.container}>
          {/* Header de la section */}
          <View style={styles.sectionHeader}>
            <View style={styles.titleSection}>
              <Text style={styles.sectionTitle}>Mes candidatures</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{applications.length}</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Suivez l'état de vos candidatures en temps réel
            </Text>
          </View>

          {/* Liste des candidatures */}
          <FlatList
            data={applications}
            renderItem={renderApplicationCard}
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
  // Cartes de candidatures
  applicationCard: {
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
  applicationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 8,
    lineHeight: 24,
  },
  companyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  statusSection: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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