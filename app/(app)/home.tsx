import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { useAuth } from "../../components/AuthProvider";
import CustomHeader from "../../components/CustomHeader";
import { getOffres, getRecommendedOffres } from "../../utils/api";
import { router } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from "date-fns";
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get("window");

/**
 * Composant de slider automatique réutilisable
 */
type AutoSliderProps<T> = {
  data: T[];
  renderItem: (item: T, index: number, onPress: (id: string) => void) => React.ReactNode;
  onPress: (id: string) => void;
  autoScrollInterval?: number;
};

const AutoSlider = <T extends { id?: string | number }>({
  data,
  renderItem,
  onPress,
  autoScrollInterval = 4000,
}: AutoSliderProps<T>) => {
  const flatListRef = useRef<FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (data.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % data.length;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [currentIndex, data.length, autoScrollInterval]);

  const onViewableItemsChanged = useRef(
    (info: { viewableItems: Array<{ index: number | null }> }) => {
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
    <View style={styles.sliderContainer}>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={({ item, index }) => {
          const element = renderItem(item, index, onPress);
          // Only return if it's a valid React element, otherwise null
          return React.isValidElement(element) ? element : null;
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToInterval={width * 0.9 + 20}
        decelerationRate="fast"
        bounces={false}
      />

      {/* Indicateurs de pagination */}
      <View style={styles.paginationContainer}>
        {data.map((_: any, index: number) => {
          const opacity = scrollX.interpolate({
            inputRange: [
              (index - 1) * (width * 0.9 + 20),
              index * (width * 0.9 + 20),
              (index + 1) * (width * 0.9 + 20),
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[styles.paginationDot, { opacity }]}
            />
          );
        })}
      </View>
    </View>
  );
};

/**
 * Écran d'accueil principal amélioré
 */
export default function HomeScreen() {
  const { user } = useAuth();
  const [jobOffers, setJobOffers] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [errorJobs, setErrorJobs] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // États pour les recommandations
  const [recommendedOffres, setRecommendedOffres] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [errorRecommendations, setErrorRecommendations] = useState<string | null>(null);

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Données d'actualités avec gradients colorés
  const newsItems = [
    {
      id: "news1",
      title: "Découvrez notre suivi de candidatures",
      content: "Notre nouvelle fonctionnalité simplifie le processus pour vous.",
      image: "https://picsum.photos/id/0/400/600",
      gradient: ['#0f8e35', '#50b45d'],
      icon: "search-plus",
      readTime: "5 min read",
      author: "Idrissa Ndiouck",
      category: "RH",
      publishDate: new Date(),
    },
    {
      id: "news2",
      title: "Atelier CV: Maximisez vos chances!",
      content: "Participez à notre webinaire gratuit pour un CV percutant.",
      image: "https://picsum.photos/id/2/400/600",
      gradient: ['#091e60', '#3B82F6'],
      icon: "file-contract",
      readTime: "2 min read",
      author: "Idrissa Ndiouck",
      category: "Coaching",
      publishDate: new Date(),
    },
    {
      id: "news3",
      title: "Les emplois les plus recherchés en 2025",
      content: "Explorez les tendances du marché du travail et préparez l'avenir.",
      image: "https://picsum.photos/id/3/400/600",
      gradient: ['#bf2f2f', '#f07e7e'],
      icon: "chart-line",
      readTime: "6 min read",
      author: "Idrissa Ndiouck",
      category: "Emplois",
      publishDate: new Date(),
    },
    {
      id: "news4",
      title: "Conseils pour réussir votre entretien",
      content: "Apprenez les techniques pour laisser une impression durable.",
      image: "https://picsum.photos/id/4/400/600",
      gradient: ['#10B981', '#34D399'],
      icon: "business-time",
      readTime: "10 min read",
      author: "Idrissa Ndiouck",
      category: "Management",
      publishDate: new Date(),
    },
  ];

  // Données d'astuces avec icônes
  const tipsItems = [
    {
      id: "tip1",
      title: "Préparez votre entretien",
      content: "Faites des recherches approfondies sur l'entreprise et le poste.",
      icon: "🎯",
      color: "#F59E0B"
    },
    {
      id: "tip2",
      title: "Développez votre réseau",
      content: "Activez votre réseau professionnel pour découvrir des opportunités cachées.",
      icon: "🤝",
      color: "#8B5CF6"
    },
    {
      id: "tip3",
      title: "CV Clair et Concis",
      content: "Assurez-vous que votre CV est facile à lire et met en avant vos compétences clés.",
      icon: "📄",
      color: "#EF4444"
    },
    {
      id: "tip4",
      title: "Suivi post-candidature",
      content: "Un simple e-mail de remerciement peut faire la différence après un entretien.",
      icon: "📧",
      color: "#06B6D4"
    },
  ];

  // LOGIQUE DE RÉCUPÉRATION DES OFFRES D'EMPLOI
  useEffect(() => {
    async function fetchOffersForSlider() {
      try {
        setLoadingJobs(true);
        const fetchedOffres = await getOffres();
        setJobOffers(fetchedOffres.slice(0, 6)); // Limiter à 6 offres pour le slider
      } catch (err: any) {
        console.error("Échec de la récupération des offres pour le slider:", err);
        setErrorJobs("Impossible de charger les offres.");
      } finally {
        setLoadingJobs(false);
      }
    }
    fetchOffersForSlider();
  }, []); // S'exécute une seule fois au montage

  // LOGIQUE DE RÉCUPÉRATION DES RECOMMANDATIONS
  useEffect(() => {
    async function fetchRecommendations() {
      if (!user) { // Si pas d'utilisateur, pas de recommandations personnalisées
        setRecommendedOffres([]);
        setLoadingRecommendations(false);
        return;
      }

      try {
        setLoadingRecommendations(true);
        const fetchedRecommendations = await getRecommendedOffres(); // Appel à votre fonction API
        setRecommendedOffres(fetchedRecommendations.slice(0, 5)); // Limiter à 5 recommandations
      } catch (err: any) {
        console.error("Erreur de chargement des recommandations:", err);
        setErrorRecommendations("Impossible de charger les recommandations.");
      } finally {
        setLoadingRecommendations(false);
      }
    }
    fetchRecommendations();
  }, [user]); // Recharger si l'objet utilisateur change (ex: après connexion/déconnexion/màj profil)

  const handlePressOffre = (offreId: string) => {
    router.push(`/(app)/job_board/job_details?id=${offreId}`);
  };

  const handlePressNews = (newsId: string) => {
    Alert.alert("Actualité", `Détails de l'actualité ${newsId}`);
  };

  const handlePressTip = (tipId: string) => {
    Alert.alert("Astuce", `Détails de l'astuce ${tipId}`);
  };

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = () => {
    Alert.alert("Partage", "Fonction de partage déclenchée");
  };

  const handleCardClick = () => {
    Alert.alert("Navigation", "Vers l'article complet...");
  };

  const formatDate = (date) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  };
  // Rendu des cartes spécifiques pour chaque type de slider

  // Rendu pour les offres d'emploi (carte de slider)
  const renderJobOffer = (item: any, index: number, onPress: (id: string) => void) => (
    <TouchableOpacity
      key={item.id?.toString() || index.toString()}
      style={styles.jobCard}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.cardGradient}
      >
        <View style={styles.jobCardHeader}>
          <View style={styles.jobIconContainer}>
            <FontAwesome5 name="business-time" size={28} color="#4fbef9" style={styles.jobIcon} />
          </View>
          <View style={styles.jobBadge}>
            <Text style={styles.jobBadgeText}>VEDETTE</Text>
          </View>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.poste?.titre_poste || "Offre non spécifiée"}
        </Text>

        <Text style={styles.jobCompany} numberOfLines={1}>
          {item.demande?.entreprise?.libelleE || "Entreprise"}
        </Text>

        <View style={styles.jobLocationContainer}>

          <EvilIcons name="location" size={24} style={styles.locationIcon} color="black" />
          <Text style={styles.jobLocation} numberOfLines={1}>
            {item.lieux}
          </Text>
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.contractTypeContainer}>
            <Text style={styles.contractType}>
              {item.type_contrat?.libelle_type_contrat || "Type"}
            </Text>
          </View>
          <Text style={styles.jobSalary}>
            {item.salaire_minimum && item.salaire_maximum
              ? `${item.salaire_minimum}-${item.salaire_maximum} FCFA`
              : "Salaire N/A"}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Rendu pour les actualités (carte de slider)
  const renderNews = (item: any, index: number, onPress: (id: string) => void) => (
    <TouchableOpacity
      key={item.id?.toString() || index.toString()}
      style={styles.card}
      onPress={() => {
        onPress(item.id);
        handleCardClick();
      }}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {!isImageLoaded && (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator color="#999" size="small" />
          </View>
        )}
        <Image
          source={{ uri: item.image }}
          style={[
            styles.image, 
            { opacity: isImageLoaded ? 1 : 0 }]}
          onLoad={() => setIsImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setIsImageLoaded(false);
          }}
          onLoadEnd={() => setIsImageLoaded(true)}
          contentFit="cover"
          cachePolicy="memory"
          transition={1000}
        />
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.headline} numberOfLines={2}> {item.title}</Text>
        <Text style={styles.description} numberOfLines={3}> {item.content}</Text>

        <View style={styles.footer}>
          {/* Colonne gauche */}
          <View style={styles.footerLeft}>
            <View style={styles.meta}>
              <Text style={styles.author}>{item.author}</Text>
              <Text style={styles.dot}>·</Text>
              <Text>{formatDate(new Date(item.publishDate))}</Text>
            </View>
            <View style={styles.readTime}>
              <Feather name="clock" size={14} style={{ marginRight: 4 }} />
              <Text>{item.readTime}</Text>
            </View>
          </View>

          {/* Colonne droite */}
          <View style={styles.footerRight}>
            <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
              <Feather name="share-2" size={18} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBookmark} style={styles.iconButton}>
              <Feather
                name="bookmark"
                size={18}
                color={isBookmarked ? "#2563eb" : "#000"}
              />
            </TouchableOpacity>
          </View>
        </View>

      </View>

    </TouchableOpacity>
  );

  // Rendu pour les astuces (carte de slider)
  const renderTip = (item: any, index: number, onPress: (id: string) => void) => (
    <TouchableOpacity
      key={item.id?.toString() || index.toString()}
      style={styles.tipCard}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.tipIconContainer, { backgroundColor: item.color }]}>
        <Text style={styles.tipIconLarge}>{item.icon}</Text>
      </View>

      <Text style={styles.tipTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.tipContent} numberOfLines={4}>
        {item.content}
      </Text>

      <View style={styles.tipFooter}>
        <Text style={[styles.tipAction, { color: item.color }]}>
          Découvrir →
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Rendu pour les recommandations
  const renderRecommendation = (item: any, index: number, onPress: (id: string) => void) => (
    <TouchableOpacity
      key={item.id?.toString() || index.toString()}
      style={styles.recommendationCard}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#FEF7ED', '#FFFFFF']}
        style={styles.recommendationGradient}
      >
        <View style={styles.recommendationHeader}>
          <View style={styles.recommendationIconContainer}>
            <FontAwesome5 name="lightbulb" size={24} color="#F59E0B" />
          </View>
          <View style={styles.matchScoreContainer}>
            <Text style={styles.matchScoreText}>
              {item.match_score ? `${item.match_score}% Match` : 'N/A Match'}
            </Text>
          </View>
        </View>

        <Text style={styles.recommendationTitle} numberOfLines={2}>
          {item.poste?.titre_poste || "Poste non spécifié"}
        </Text>

        <Text style={styles.recommendationCompany} numberOfLines={1}>
          {item.demande?.entreprise?.libelleE || "Entreprise non spécifiée"}
        </Text>

        <View style={styles.recommendationLocationContainer}>
          <EvilIcons name="location" size={20} color="#6B7280" />
          <Text style={styles.recommendationLocation} numberOfLines={1}>
            {item.lieux || "Lieu non spécifié"}
          </Text>
        </View>

        <View style={styles.recommendationFooter}>
          <Text style={styles.recommendedText}>Recommandé pour vous</Text>
          <FontAwesome5 name="arrow-right" size={14} color="#F59E0B" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        title="Accueil"
        user={user}
        onMenuPress={() => Alert.alert("Menu", "Menu Accueil pressé!")}
        onAvatarPress={() => router.push('/(app)/profile-details')} // Naviguer vers la page de profil
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Message de bienvenue personnalisé */}
          <View style={styles.welcomeContainer}>
            <LinearGradient
              colors={['#091e60', '#3B82F6']}
              style={styles.welcomeGradient}
            >
              <Text style={styles.welcomeText}>
                Bonjour {user?.name || 'Utilisateur'} ! 👋
              </Text>
              <Text style={styles.welcomeSubtext}>
                Découvrez les opportunités qui vous attendent
              </Text>
            </LinearGradient>
          </View>

          {/* Section Offres Recommandées (Nouveau) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Offres Recommandées</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/(app)/job_board')}>
                <Text style={styles.viewAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {loadingRecommendations ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0f8e35" />
                <Text style={styles.loadingText}>Chargement des recommandations...</Text>
              </View>
            ) : errorRecommendations ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errorRecommendations}</Text>
              </View>
            ) : recommendedOffres.length > 0 ? (
              <AutoSlider
                data={recommendedOffres}
                renderItem={renderRecommendation}
                onPress={handlePressOffre} // Utilise la même fonction de presse que pour les offres
                autoScrollInterval={5000}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateIcon}>💡</Text>
                <Text style={styles.emptyStateText}>
                  Pas de recommandations pour le moment. Téléchargez votre CV pour en obtenir !
                </Text>
              </View>
            )}
          </View>

          {/* Section Offres d'emploi en vedette */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}> Offres en Vedette</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/(app)/job_board')}>
                <Text style={styles.viewAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {loadingJobs ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0f8e35" />
                <Text style={styles.loadingText}>Chargement des offres...</Text>
              </View>
            ) : errorJobs ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errorJobs}</Text>
              </View>
            ) : jobOffers.length > 0 ? (
              <AutoSlider
                data={jobOffers}
                renderItem={renderJobOffer}
                onPress={handlePressOffre}
                autoScrollInterval={5000}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateIcon}>📭</Text>
                <Text style={styles.emptyStateText}>
                  Aucune offre en vedette pour le moment.
                </Text>
              </View>
            )}
          </View>

          {/* Section Dernières Actualités */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dernières Actualités</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/(app)/actualites')}>
                <Text style={styles.viewAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            <AutoSlider
              data={newsItems}
              renderItem={renderNews}
              onPress={handlePressNews}
              autoScrollInterval={6000}
            />
          </View>

          {/* Section Astuces Carrière */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Astuces Carrière</Text>
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            <AutoSlider
              data={tipsItems}
              renderItem={renderTip}
              onPress={handlePressTip}
              autoScrollInterval={7000}
            />
          </View>

          {/* Espacement pour le bas de l'écran */}
          <View style={{ height: 60 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  animatedContainer: {
    flex: 1,
  },

  // Conteneur de bienvenue
  welcomeContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  welcomeGradient: {
    padding: 20,
    borderRadius: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: "#E5E7EB",
    opacity: 0.9,
  },

  // Sections
  sectionContainer: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EBF8FF",
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },

  // Slider container
  sliderContainer: {
    marginBottom: 10,
  },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginHorizontal: 4,
  },

  // Cartes d'offres d'emploi
  jobCard: {
    width: width * 0.85,
    height: 220,
    marginLeft: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    justifyContent: 'space-between',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobIcon: {
    fontSize: 20,
  },
  jobBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  jobBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D97706',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  jobCompany: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 10,
  },
  jobLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationIcon: {
    marginRight: 5,
  },
  jobLocation: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractTypeContainer: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  contractType: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: "600",
  },
  jobSalary: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "bold",
  },

  // Cartes d'actualités
  newsCard: {
    width: width * 0.9,
    height: 300,
    marginLeft: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  newsGradient: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#fff', // fallback au cas où
  },
  newsHeader: {
    alignItems: 'flex-end',
  },
  newsIconLarge: {
    fontSize: 32,
  },
  newsContent: {
    flex: 1,
    justifyContent: 'center',
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  newsDescription: {
    fontSize: 14,
    color: "#F3F4F6",
    opacity: 0.9,
  },
  newsFooter: {
    alignItems: 'flex-end',
  },
  readMoreText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Cartes d'astuces
  tipCard: {
    width: width * 0.9,
    height: 200,
    marginLeft: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    justifyContent: 'space-between',
  },
  tipIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  tipIconLarge: {
    fontSize: 24,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
  },
  tipContent: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    flex: 1,
  },
  tipFooter: {
    alignItems: 'flex-end',
  },
  tipAction: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Cartes de recommandations (Nouveau)
  recommendationCard: {
    width: width * 0.85,
    height: 220,
    marginLeft: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  recommendationGradient: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    justifyContent: 'space-between',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recommendationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchScoreContainer: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchScoreText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#B45309',
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  recommendationCompany: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 10,
  },
  recommendationLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recommendationLocation: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendedText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: "600",
  },

  // États de chargement et d'erreur
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 10,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    fontSize: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    margin: 16,
    width: width * 0.9,
    height: 400,
    marginLeft: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    overflow: "hidden",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#e5e7eb", // fallback loading
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#2563eb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  headline: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
    flexWrap: 'wrap',
  },

  footerLeft: {
    flex: 1,
    paddingRight: 10,
  },

  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },

  author: {
    fontWeight: "600",
    fontSize: 14,
    color: "#1F2937",
  },

  dot: {
    marginHorizontal: 4,
    fontSize: 14,
    color: "#6B7280",
  },

  readTime: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },

  footerRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconButton: {
    padding: 6,
    borderRadius: 20,
    marginLeft: 8,
  },

});