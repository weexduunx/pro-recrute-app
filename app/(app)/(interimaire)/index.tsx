import React, { useEffect, useState, useRef } from 'react';
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
  StatusBar,
} from "react-native";
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getOffres, getRecommendedOffres, getActualites } from "../../../utils/api";
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from "date-fns";
import { Feather } from '@expo/vector-icons';
import { decode } from 'html-entities';

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
export default function InterimDashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  // Ajout des états pour les actualités
  const [newsData, setNewsData] = useState<any[]>([]); // NOUVEAU: Pour les actualités réelles
  const [loadingNews, setLoadingNews] = useState(true); // NOUVEAU: État de chargement des actualités
  const [errorNews, setErrorNews] = useState<string | null>(null); // NOUVEAU: Erreur de chargement des actualités
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Intérimaire pressé !")); };
  const handleAvatarPress = () => { Alert.alert(t("Profil"), t("Avatar Intérimaire pressé !")); };

  // Ajout de la fonction handlePressNews pour corriger l'erreur
  const handlePressNews = (item: any) => {
    // Naviguer vers la page de détail de l'actualité ou afficher une alerte
    Alert.alert(t("Actualité"), item?.title || t("Détail de l'actualité"));
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

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  };



  // MODIFIÉ : LOGIQUE DE RÉCUPÉRATION DES ACTUALITÉS (filtrées)
  useEffect(() => {
    async function fetchNewsForSlider() {
      console.log('HomeScreen: Début fetchNewsForSlider'); // LOG
      try {
        setLoadingNews(true);
        const fetchedNews = await getActualites({ type: 'Conseil RH' });
        setNewsData(fetchedNews.slice(0, 4));
        console.log('InterimaireScreen: Actualités récupérées (NewsData):', fetchedNews); // LOG LES DONNÉES COMPLÈTES ICI
      } catch (err: any) {
        console.error("InterimaireScreen: Échec de la récupération des actualités pour le slider:", err);
        setErrorNews("Impossible de charger les actualités.");
      } finally {
        setLoadingNews(false);
      }
    }
    fetchNewsForSlider();
  }, []);


  // Fonction pour afficher chaque actualité (adapter selon vos besoins)
  // Rendu pour les actualités (utilisant les données réelles de l'API)
  const renderNews = (item: any, index: number, onPress: (id: string) => void) => (
    <TouchableOpacity
      key={item.id?.toString() || index.toString()}
      style={styles.cardNews}
      onPress={() => {
        onPress(item.id);

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
          source={{ uri: 'https://globalbusiness-gbg.com/storage/images-actualite/' + item.fr_image }}
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
        {item.type_mag?.fr_libelle && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{item.type_mag.fr_libelle}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.headline} numberOfLines={2}>{item.fr_titre_mag || item.en_titre_mag || 'Titre actualité'}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {decode((item.apercu || item.fr_description || 'Contenu actualité...').replace(/<[^>]+>/g, ''))}
        </Text>
        <View style={styles.footer}>
          {/* Colonne gauche */}
          <View style={styles.footerLeft}>
            <View style={styles.meta}>
              <Text style={styles.author}>GBG</Text>
              <Text style={styles.dot}>·</Text>
              <Text>{formatDate(new Date(item.created_at))}</Text>
            </View>
            <View style={styles.readTime}>
              <Feather name="clock" size={14} style={{ marginRight: 4 }} />
              <Text>5mn</Text>
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


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader
        title={t("Espace Intérimaire")}
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>


        <View style={styles.welcomeContainer}>
          <LinearGradient
            colors={['#1c6003', '#13af3f']}
            style={styles.welcomeGradient}
          >
            <Text style={styles.welcomeText}>
              {t("Bonjour")}, {user?.name || t("Intérimaire")}! ! 👋
            </Text>
            <Text style={styles.welcomeSubtext}>
              Bienvenue sur l'app Pro Recrute de <Text style={{ fontWeight: "bold" }}>GBG</Text>, ici vous pouvez gérer vos informations et accéder à vos dossiers RH et IPM.
            </Text>
          </LinearGradient>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.cardBackground,
                width: '48%',
                marginBottom: 20,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onTouchEnd={() => router.push('/(app)/(interimaire)/hr_file')}
          >
            <FontAwesome name="folder" size={40} color={colors.secondary} style={{ marginBottom: 10 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t("Dossier RH")}
            </Text>
            <Text style={[styles.detailText, { color: colors.textSecondary, textAlign: 'center' }]}>
              {t("Gérez vos documents RH.")}
            </Text>
          </View>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.cardBackground,
                width: '48%',
                marginBottom: 20,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onTouchEnd={() => router.push('/(app)/(interimaire)/ipm_file')}
          >
            <FontAwesome name="medkit" size={40} color={colors.secondary} style={{ marginBottom: 10 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t("Dossier IPM")}
            </Text>
            <Text style={[styles.detailText, { color: colors.textSecondary, textAlign: 'center' }]}>
              {t("Accédez à vos informations IPM.")}
            </Text>
          </View>
        </View>
        {/* Section Dernières Actualités */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dernières Actualités</Text>
            <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/(app)/actualites')}>
              <Text style={styles.viewAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {loadingNews ? ( // NOUVEAU: Ajout de l'état de chargement pour les actualités
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0f8e35" />
              <Text style={styles.loadingText}>Chargement des actualités...</Text>
            </View>
          ) : errorNews ? ( // NOUVEAU: Ajout de l'état d'erreur pour les actualités
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorNews}</Text>
            </View>
          ) : newsData.length > 0 ? ( // NOUVEAU: Utilisation de newsData
            <AutoSlider
              data={newsData}
              renderItem={renderNews}
              onPress={handlePressNews}
              autoScrollInterval={6000}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateIcon}>📰</Text>
              <Text style={styles.emptyStateText}>
                Aucune actualité disponible pour le moment.
              </Text>
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
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  welcomeContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: 20,
    borderRadius: 16,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Sections
  sectionContainer: {
    marginTop: 8,
    marginBottom: 20,
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
  welcomeSubtext: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 4,
  },
  viewAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#e6f5ea',
    borderRadius: 8,
  },
  viewAllText: {
    color: '#0f8e35',
    fontWeight: 'bold',
    fontSize: 14,
  },


  // Cartes d'actualités
  // newsCard: {
  //   width: width * 0.9,
  //   height: 300,
  //   marginLeft: 20,
  //   borderRadius: 16,
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: 8 },
  //   shadowOpacity: 0.15,
  //   shadowRadius: 12,
  //   elevation: 8,
  // },
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

  newsImage: {
    width: '100%',
    height: '60%', // Image prend 60% de la hauteur de la carte
  },
  newsContentOverlay: { // NOUVEAU: Overlay pour le texte
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', // Fond semi-transparent pour le texte
    padding: 10,
    borderBottomLeftRadius: 16, // Coins arrondis pour l'overlay
    borderBottomRightRadius: 16,
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
  cardNews: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    margin: 8,
    width: width * 0.9,
    height: 398,
    marginLeft: 4,
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
    backgroundColor: "#dbffe5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: "#1c6003",
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