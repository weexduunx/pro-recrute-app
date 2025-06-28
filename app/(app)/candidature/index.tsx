import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  RefreshControl, 
  Platform,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { getUserApplications } from '../../../utils/api';
import { router } from 'expo-router';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
        nom_entreprise?: string;
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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getStatusConfig = (etat: string) => {
    switch (etat) {
      case 'pending': 
        return { 
          color: '#F59E0B', 
          backgroundColor: '#FEF3C7', 
          icon: 'clock-outline',
          text: 'En attente',
          gradient: ['#FEF3C7', '#FDE68A']
        };
      case 'approved': 
        return { 
          color: '#10B981', 
          backgroundColor: '#D1FAE5', 
          icon: 'checkmark-circle-outline',
          text: 'Acceptée',
          gradient: ['#D1FAE5', '#A7F3D0']
        };
      case 'rejected': 
        return { 
          color: '#EF4444', 
          backgroundColor: '#FEE2E2', 
          icon: 'close-circle-outline',
          text: 'Refusée',
          gradient: ['#FEE2E2', '#FECACA']
        };
      default: 
        return { 
          color: '#6B7280', 
          backgroundColor: '#F3F4F6', 
          icon: 'help-circle-outline',
          text: etat,
          gradient: ['#F3F4F6', '#E5E7EB']
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

  const ApplicationCard = ({ app, index }: { app: Application; index: number }) => {
    const [cardScale] = useState(new Animated.Value(1));
    const statusConfig = getStatusConfig(app.etat);

    const handlePressIn = () => {
      Animated.spring(cardScale, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            transform: [{ scale: cardScale }],
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.applicationCard}
          onPress={() => handleApplicationPress(app.id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <LinearGradient
                  colors={['#091e60', '#1e40af']}
                  style={styles.cardIcon}
                >
                  <Ionicons name="briefcase" size={16} color="#FFFFFF" />
                </LinearGradient>
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {app.offre?.poste?.titre_poste || 'Offre non spécifiée'}
                </Text>
                <View style={styles.companyRow}>
                  <Ionicons name="business-outline" size={12} color="#6B7280" />
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {app.offre?.demande?.entreprise?.nom_entreprise || 'Entreprise non spécifiée'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusContainer}>
                <LinearGradient
                  colors={statusConfig.gradient}
                  style={styles.statusBadge}
                >
                  <Ionicons 
                    name={statusConfig.icon as any} 
                    size={12} 
                    color={statusConfig.color} 
                  />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.text}
                  </Text>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                <Text style={styles.cardDate}>
                  {app.date_postule ? new Date(app.date_postule).toLocaleDateString('fr-FR') : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.actionIndicator}>
                <Text style={styles.actionText}>Voir détails</Text>
                <Ionicons name="arrow-forward" size={14} color="#0f8e35" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <CustomHeader
        title="Mes Candidatures"
        user={user}
        onMenuPress={() => Alert.alert("Menu", "Menu Candidatures pressé!")}
        onAvatarPress={() => router.push('/(app)/profile-details')}
      />

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
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#091e60', '#1e40af']}
              style={styles.sectionIconContainer}
            >
              <Ionicons name="briefcase" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Mes candidatures</Text>
              <Text style={styles.sectionSubtitle}>
                {applications.length} candidature{applications.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.loadingCard}
              >
                <View style={styles.loadingIconContainer}>
                  <ActivityIndicator size="large" color="#0f8e35" />
                </View>
                <Text style={styles.loadingText}>Chargement de vos candidatures...</Text>
                <View style={styles.loadingDots}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.loadingDot, { backgroundColor: '#0f8e35' }]} />
                  ))}
                </View>
              </LinearGradient>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <LinearGradient
                colors={['#FEE2E2', '#FECACA']}
                style={styles.errorCard}
              >
                <View style={styles.errorIconContainer}>
                  <Ionicons name="alert-circle" size={32} color="#EF4444" />
                </View>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadApplications}>
                  <LinearGradient
                    colors={['#091e60', '#1e40af']}
                    style={styles.retryButtonGradient}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : applications.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.emptyCard}
              >
                <View style={styles.emptyIconContainer}>
                  <LinearGradient
                    colors={['#E5E7EB', '#F3F4F6']}
                    style={styles.emptyIconBackground}
                  >
                    <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>Aucune candidature</Text>
                <Text style={styles.emptyText}>
                  Commencez votre recherche d'emploi en postulant à des offres qui vous intéressent !
                </Text>
                <TouchableOpacity 
                  style={styles.callToActionButton} 
                  onPress={() => router.push('/(app)/tabs/job_board')}
                >
                  <LinearGradient
                    colors={['#0f8e35', '#059669']}
                    style={styles.callToActionGradient}
                  >
                    <Ionicons name="search" size={18} color="#FFFFFF" />
                    <Text style={styles.callToActionButtonText}>Parcourir les offres</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.applicationsList}>
              {applications.map((app, index) => (
                <ApplicationCard key={app.id} app={app} index={index} />
              ))}
            </View>
          )}
        </Animated.View>
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
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#091e60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#091e60',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingContainer: {
    marginHorizontal: 4,
  },
  loadingCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  loadingIconContainer: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  errorContainer: {
    marginHorizontal: 4,
  },
  errorCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    marginHorizontal: 4,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  callToActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f8e35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  callToActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
  },
  callToActionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  applicationsList: {
    gap: 16,
  },
  cardWrapper: {
    marginHorizontal: 4,
  },
  applicationCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIconContainer: {
    marginRight: 16,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 8,
    lineHeight: 24,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    flex: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minWidth: 100,
    justifyContent: 'center',
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
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#0f8e35',
    fontWeight: '600',
  },
});