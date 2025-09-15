import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../components/AuthProvider";
import CustomHeader from "../../components/CustomHeader";
import { useTheme } from '../../components/ThemeContext';
import { getOffres, getRecommendedOffres, getActualites, getUserApplications, getCandidatEntretiens } from "../../utils/api";
import { getAIJobRecommendations } from "../../utils/ai-api";
import { getCandidatProfile } from "../../utils/api";
import { router } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from "date-fns";
import { decode } from 'html-entities';

const { width } = Dimensions.get("window");

// Fonction helper pour s'assurer qu'on a toujours un tableau
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  return [];
};

// Interface pour les actions rapides
interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  description: string;
}

// Interface pour les statistiques de candidature
interface CandidateStats {
  applications: number;
  interviews: number;
  responses: number;
  profileCompletion: number;
}

/**
 * Composant de slider avec auto-scroll
 */
type AutoSliderProps<T> = {
  data: T[] | undefined;
  renderItem: (item: T, index: number) => React.ReactNode;
  height?: number;
  showPagination?: boolean;
  autoScrollInterval?: number;
};

const AutoSlider = <T extends { id?: string | number }>({
  data,
  renderItem,
  height = 200,
  showPagination = true,
  autoScrollInterval = 4000,
}: AutoSliderProps<T>) => {
  const flatListRef = useRef<FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);


  // Auto-scroll effect
  useEffect(() => {
    if (ensureArray(data).length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % ensureArray(data).length;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [currentIndex, ensureArray(data).length, autoScrollInterval]);

  const onViewableItemsChanged = useRef(
    (info: { viewableItems: { index: number | null }[] }) => {
      if (info.viewableItems.length > 0) {
        const firstIndex = info.viewableItems[0].index;
        setCurrentIndex(typeof firstIndex === 'number' && firstIndex >= 0 ? firstIndex : 0);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={[styles.sliderContainer, { height }]}>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={ensureArray(data)}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={({ item, index }) => renderItem(item, index)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToInterval={width - 32}
        decelerationRate="fast"
        contentContainerStyle={styles.sliderContent}
      />

      {showPagination && ensureArray(data).length > 1 && (
        <View style={styles.paginationContainer}>
          {ensureArray(data).map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                { opacity: index === currentIndex ? 1 : 0.3 }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  // États
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendedOffres, setRecommendedOffres] = useState<any[]>([]);
  const [featuredOffres, setFeaturedOffres] = useState<any[]>([]);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [candidateStats, setCandidateStats] = useState<CandidateStats>({
    applications: 0,
    interviews: 0,
    responses: 0,
    profileCompletion: 0,
  });

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Actions rapides
  const quickActions: QuickAction[] = [
    {
      id: 'profile',
      title: 'Mon profil',
      icon: 'person',
      color: '#F59E0B',
      route: '/(app)/profile-details',
      description: 'Gérer mon profil'
    },
    {
      id: 'actualites',
      title: 'Actualités',
      icon: 'article',
      color: '#8B5CF6',
      route: '/(app)/actualites',
      description: 'Conseils emploi'
    },
    {
      id: 'job_board',
      title: 'Offres d\'emploi',
      icon: 'work-outline',
      color: '#3B82F6',
      route: '/(app)/job_board',
      description: 'Parcourir les offres'
    },
    {
      id: 'candidatures',
      title: 'Mes candidatures',
      icon: 'description',
      color: '#10B981',
      route: '/(app)/candidature',
      description: 'Suivre mes candidatures'
    },

  ];

  // Animation d'entrée
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Chargement des données
  const loadData = useCallback(async () => {
    // Éviter les appels API si l'utilisateur n'est pas connecté
    if (!user) {
      console.log('Utilisateur non connecté, pas de chargement de données');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [
        recommendedResponse,
        featuredResponse,
        newsResponse,
        statsResponse
      ] = await Promise.allSettled([
        fetchRecommendations(),
        getOffres().then(offres => offres.slice(0, 5)),
        getActualites({ type: 'Conseil RH' }).then(news => news.slice(0, 3)),
        loadCandidateStats()
      ]);

      if (recommendedResponse.status === 'fulfilled') {
        // Les recommandations sont déjà gérées dans fetchRecommendations()
        console.log('Recommandations chargées via Promise.allSettled');
      }

      if (featuredResponse.status === 'fulfilled') {
        setFeaturedOffres(ensureArray(featuredResponse.value));
      }

      if (newsResponse.status === 'fulfilled') {
        setNewsData(ensureArray(newsResponse.value));
      }

      if (statsResponse.status === 'fulfilled') {
        setCandidateStats(statsResponse.value);
      }

    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCandidateStats = async (): Promise<CandidateStats> => {
    // Vérifier si l'utilisateur est connecté avant de faire des appels API
    if (!user) {
      console.log('Utilisateur non connecté, statistiques par défaut');
      return {
        applications: 0,
        interviews: 0,
        responses: 0,
        profileCompletion: 0
      };
    }

    try {
      // Chargement séquentiel pour éviter les erreurs qui pourraient affecter les autres
      let applications = 0;
      let interviews = 0;
      let responses = 0;
      let profileCompletion = 0;

      // Statistiques des candidatures
      try {
        const userApplications = await getUserApplications();
        console.log('Données candidatures brutes:', userApplications);
        if (userApplications && Array.isArray(userApplications)) {
          applications = userApplications.length;
          // Une réponse = toute candidature qui a reçu une réponse (refusée, acceptée, etc.)
          responses = userApplications.filter((app: any) => {
            const statut = app.statut || app.status;
            console.log('Candidature statut:', statut);
            // Considérer comme réponse: refusé, accepté, entretien programmé, etc.
            // Ne pas considérer: En attente, pending, null, undefined
            return statut &&
              statut !== 'En attente' &&
              statut !== 'en_attente' &&
              statut !== 'pending' &&
              statut !== 'En cours' &&
              statut !== 'en_cours';
          }).length;
        }
        console.log('Statistiques candidatures calculées:', { applications, responses });
      } catch (error) {
        console.warn('Erreur chargement candidatures:', error);
      }

      // Statistiques des entretiens - nouvelle gestion améliorée
      try {
        const entretiensResponse = await getCandidatEntretiens();
        console.log('Données entretiens depuis API:', entretiensResponse);

        if (entretiensResponse.needsProfileCreation) {
          console.log('Info Home: Profil candidat manquant pour entretiens');
          interviews = 0; // Pas d'entretiens sans profil candidat
        } else if (entretiensResponse.entretiens && Array.isArray(entretiensResponse.entretiens)) {
          interviews = entretiensResponse.entretiens.length;
        } else {
          interviews = 0;
        }
        console.log('Statistiques entretiens depuis API:', interviews);
      } catch (error) {
        console.log('Info: Statistiques entretiens non disponibles');
        interviews = 0; // Par défaut 0 entretiens
      }

      // Calcul du pourcentage de complétude du profil
      try {
        const profile = await getCandidatProfile();
        console.log('Données profil brutes:', profile);
        console.log('Photo profil check:', {
          photo_profil: profile.photo_profil,
          profile_photo_path: profile.profile_photo_path,
          profile_photo: profile.profile_photo,
          user_from_parsed_cv: profile.parsed_cv?.full_name,
          user_profile_photo: user?.profile_photo,
          user_photo_profil: user?.photo_profil
        });
        if (profile) {
          let completedFields = 0;
          const totalFields = 10; // Nombre total de champs importants

          // Vérification des champs essentiels du profil basé sur les vraies propriétés
          const checks = [
            { field: 'titreProfil', value: profile.titreProfil },
            { field: 'telephone', value: profile.telephone },
            { field: 'date_naissance', value: profile.date_naissance },
            { field: 'genre', value: profile.genre },
            { field: 'disponibilite', value: profile.disponibilite },
            { field: 'competences', value: profile.competences && profile.competences.length > 0 },
            { field: 'experiences', value: profile.experiences && profile.experiences.length > 0 },
            { field: 'formations', value: profile.formations && profile.formations.length > 0 },
            { field: 'parsed_cv', value: profile.parsed_cv && (profile.parsed_cv.full_name || profile.parsed_cv.summary) },
            { field: 'photo_profil', value: profile.photo_profil || profile.profile_photo_path || profile.profile_photo || user?.profile_photo || user?.photo_profil }
          ];

          checks.forEach(check => {
            if (check.value) {
              completedFields++;
              console.log(`✓ ${check.field}: présent`);
            } else {
              console.log(`✗ ${check.field}: manquant`);
            }
          });

          profileCompletion = Math.round((completedFields / totalFields) * 100);
          console.log(`Complétude profil: ${completedFields}/${totalFields} = ${profileCompletion}%`);
        }
      } catch (error) {
        console.warn('Erreur chargement profil:', error);
        // Fallback: estimation basée sur l'utilisateur connecté
        profileCompletion = user ? 40 : 0; // 40% si utilisateur connecté
      }

      console.log('Statistiques calculées:', { applications, interviews, responses, profileCompletion });

      return {
        applications,
        interviews,
        responses,
        profileCompletion
      };
    } catch (error) {
      console.error('Erreur générale chargement statistiques:', error);
      return {
        applications: 0,
        interviews: 0,
        responses: 0,
        profileCompletion: 0
      };
    }
  };

  const fetchRecommendations = async () => {
    if (!user) return;

    try {
      const candidatData = await getCandidatProfile();
      const userCompetenceIds = ensureArray(candidatData?.competences).map(comp => comp.id);

      if (userCompetenceIds.length === 0) return;

      const aiResponse = await getAIJobRecommendations({
        limit: 3,
        competence_ids: userCompetenceIds,
        source: 'candidat_competences'
      });

      const transformedRecommendations = ensureArray(aiResponse.data?.recommendations).map((rec: any) => ({
        id: rec.offre?.id || Math.random().toString(),
        poste: {
          titre_poste: rec.offre?.titre || 'Titre non disponible'
        },
        entreprise: {
          libelleE: rec.offre?.entreprise || 'Entreprise non spécifiée'
        },
        lieux: rec.offre?.lieu_travail || 'Lieu non spécifié',
        match_score: rec.match_percentage || 0,
        created_at: rec.offre?.created_at || new Date().toISOString()
      }));

      setRecommendedOffres(transformedRecommendations);
      return transformedRecommendations;
    } catch (error) {
      console.error('Erreur recommandations:', error);
      setRecommendedOffres(ensureArray([]));
      return ensureArray([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handlePressOffre = (offreId: string) => {
    router.push(`/(app)/job_board/job_details?id=${offreId}`);
  };

  const handlePressNews = (newsId: string) => {
    router.push(`/(app)/actualites/actualites_details?id=${newsId}`);
  };

  const handleQuickAction = (route: string) => {
    router.push(route as any);
  };

  // Composants de rendu
  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Vos statistiques</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{candidateStats.applications}</Text>
          <Text style={styles.statLabel}>Candidatures</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{candidateStats.interviews}</Text>
          <Text style={styles.statLabel}>Entretiens</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{candidateStats.responses}</Text>
          <Text style={styles.statLabel}>Réponses</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{candidateStats.profileCompletion}%</Text>
          <Text style={styles.statLabel}>Profil</Text>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionCard}
            onPress={() => handleQuickAction(action.route)}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionContent}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                <MaterialIcons name={action.icon as any} size={20} color={action.color} />
              </View>
              <View style={styles.quickActionTextContainer}>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionDescription}>{action.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderOffreCard = (item: any, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={styles.offreCard}
      onPress={() => handlePressOffre(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.offreHeader}>
        <View style={styles.offreIconContainer}>
          <FontAwesome5 name="briefcase" size={20} color="#3B82F6" />
        </View>
        {item.match_score && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{item.match_score}%</Text>
          </View>
        )}
      </View>

      <Text style={styles.offreTitle} numberOfLines={2}>
        {item.poste?.titre_poste || "Poste non spécifié"}
      </Text>

      <Text style={styles.offreCompany} numberOfLines={1}>
        {item.entreprise?.libelleE || item.demande?.entreprise?.libelleE || "Entreprise"}
      </Text>

      <View style={styles.offreLocation}>
        <Ionicons name="location-outline" size={16} color="#6B7280" />
        <Text style={styles.offreLocationText} numberOfLines={1}>
          {item.lieux || "Lieu non spécifié"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderNewsCard = (item: any, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={styles.newsCard}
      onPress={() => handlePressNews(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.newsImageContainer}>
        <Image
          source={{ uri: `https://globalbusiness-gbg.com/storage/images-actualite/${item.fr_image}` }}
          style={styles.newsImage}
          contentFit="cover"
          transition={200}
        />
        {item.type_mag?.fr_libelle && (
          <View style={styles.newsCategoryTag}>
            <Text style={styles.newsCategoryText}>{item.type_mag.fr_libelle}</Text>
          </View>
        )}
      </View>

      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.fr_titre_mag || item.en_titre_mag || 'Titre actualité'}
        </Text>
        <Text style={styles.newsDescription} numberOfLines={3}>
          {decode((item.apercu || item.fr_description || '').replace(/<[^>]+>/g, ''))}
        </Text>
        <View style={styles.newsFooter}>
          <Text style={styles.newsDate}>
            {format(new Date(item.created_at), 'dd MMM yyyy')}
          </Text>
          <Text style={styles.newsReadTime}>5 min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
    <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={styles.container}>
        <CustomHeader
          title="Accueil"
          user={user}
          showNotificationIcon={true}
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
              tintColor="#0f8e35" />
          }
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

            {/* Message de bienvenue */}
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeContent}>
                <Text style={[styles.welcomeTitle, { color: colors.primary }]}>
                  Bienvenue {user?.name?.split(' ')[0] || 'Candidat'} !
                </Text>
                <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                  Prêt à décrocher votre prochain emploi ? Explorez les offres qui vous correspondent.
                </Text>
              </View>
              <View style={[styles.welcomeIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="hand-right-outline" size={24} color={colors.primary} />
              </View>
            </View>

            {/* Statistiques */}
            {renderStatsCard()}

            {/* Actions rapides */}
            {renderQuickActions()}

            {/* Offres recommandées */}
            {ensureArray(recommendedOffres).length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recommandé pour vous</Text>
                  <TouchableOpacity onPress={() => router.push('/(app)/job_board')}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                  </TouchableOpacity>
                </View>
                <AutoSlider
                  data={recommendedOffres}
                  renderItem={renderOffreCard}
                  height={200}
                  autoScrollInterval={5000}
                />
              </View>
            )}

            {/* Offres en vedette */}
            {ensureArray(featuredOffres).length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Offres en vedette</Text>
                  <TouchableOpacity onPress={() => router.push('/(app)/job_board')}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                  </TouchableOpacity>
                </View>
                <AutoSlider
                  data={featuredOffres}
                  renderItem={renderOffreCard}
                  height={200}
                  autoScrollInterval={4500}
                />
              </View>
            )}

            {/* Actualités */}
            {ensureArray(newsData).length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Conseils emploi</Text>
                  <TouchableOpacity onPress={() => router.push('/(app)/actualites')}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                  </TouchableOpacity>
                </View>
                <AutoSlider
                  data={newsData}
                  renderItem={renderNewsCard}
                  height={320}
                  autoScrollInterval={6000}
                />
              </View>
            )}

            {/* État de chargement */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0f8e35" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },

  // Message de bienvenue
  welcomeContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#091e60',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },

  // Statistiques
  statsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f8e35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
  },
  viewAllText: {
    fontSize: 14,
    color: '#0f8e35',
    fontWeight: '600',
  },

  // Actions rapides
  quickActionsGrid: {
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },

  quickActionCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  quickActionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    lineHeight: 18,
  },
  quickActionDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
  },

  // Slider
  sliderContainer: {
    marginBottom: 8,
  },
  sliderContent: {
    paddingRight: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#091e60',
    marginHorizontal: 3,
  },

  // Cards d'offres
  offreCard: {
    width: width - 32,
    height: 160,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  offreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offreIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  offreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  offreCompany: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  offreLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offreLocationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },

  // Cards d'actualités
  newsCard: {
    width: width - 32,
    height: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  newsImageContainer: {
    height: 120,
    position: 'relative',
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  newsCategoryTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newsCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
  },
  newsContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  newsDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  newsReadTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // État de chargement
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
});