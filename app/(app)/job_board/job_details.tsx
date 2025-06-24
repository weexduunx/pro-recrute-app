import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  SafeAreaView, 
  TouchableOpacity, 
  Platform, 
  Alert,
  Animated,
  Dimensions,
  StatusBar 
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getOffreById, applyForOffre } from '../../../utils/api';
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import AntDesign from '@expo/vector-icons/AntDesign';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';


const { width, height } = Dimensions.get('window');

/**
 * Composant d'information avec icône
 */
const InfoItem = ({ icon, label, value, color = '#6B7280' }) => (
  <View style={styles.infoItem}>
    <View style={[styles.infoIcon, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.infoIconText, { color }]}>{icon}</Text>
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

/**
 * Composant de section avec animation
 */
const AnimatedSection = ({ title, children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    setTimeout(() => {
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
    }, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.sectionContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Animated.View>
  );
};

/**
 * Écran des Détails de l'Offre amélioré
 */
export default function OffreDetailsScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams();
  const [offre, setOffre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function fetchOffreDetails() {
      if (!id) {
        setError("Aucun ID d'offre fourni.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedOffre = await getOffreById(id);
        setOffre(fetchedOffre);
        
        // Animation d'entrée
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      } catch (err: any) {
        console.error("Échec de la récupération des détails de l'offre:", err);
        setError(err.message || "Impossible de charger les détails de l'offre.");
      } finally {
        setLoading(false);
      }
    }
    fetchOffreDetails();
  }, [id]);

  const handleApply = async () => {
    if (!offre || applying) return;
    setApplying(true);
    try {
      const response = await applyForOffre(offre.id);
      Alert.alert(
        "✅ Candidature soumise", 
        response.message || "Votre candidature a été soumise avec succès !",
        [
          { text: "Continuer", style: "default" },
          { text: "Voir mes candidatures", onPress: () => router.push('/(app)/dashboard') }
        ]
      );
    } catch (err: any) {
      console.error("Échec de la candidature:", err.response?.data || err.message);
      Alert.alert(
        "❌ Erreur de candidature", 
        err.response?.data?.message || "Impossible de postuler à cette offre. Veuillez réessayer."
      );
    } finally {
      setApplying(false);
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    Alert.alert(
      bookmarked ? "Supprimé des favoris" : "Ajouté aux favoris",
      bookmarked ? "L'offre a été supprimée de vos favoris" : "L'offre a été ajoutée à vos favoris"
    );
  };

  const handleMenuPress = () => {
    Alert.alert("Menu", "Menu Détails pressé !");
  };

  const handleAvatarPress = () => {
    Alert.alert("Profil", "Avatar Détails pressé !");
  };

  const handleShare = () => {
    Alert.alert("Partager", "Fonctionnalité de partage à implémenter");
  };

  // États de chargement et d'erreur avec design amélioré
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <LinearGradient colors={['#091e60', '#3B82F6']} style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0f8e35" />
            <Text style={styles.loadingText}>Chargement des détails...</Text>
            <Text style={styles.loadingSubtext}>Veuillez patienter</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error || !offre) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#EF4444" />
        <LinearGradient colors={['#EF4444', '#F87171']} style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Oups !</Text>
            <Text style={styles.errorText}>
              {error || "Offre non trouvée."}
            </Text>
            <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
              <Text style={styles.errorButtonText}>← Retour</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      
      <CustomHeader
        title="Détails de l'offre"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {/* Header avec gradient et actions */}
      <Animated.View style={[styles.heroHeader, { opacity: headerOpacity }]}>
        <LinearGradient colors={['#091e60', '#3B82F6']} style={styles.heroGradient}>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <AntDesign name="arrowleft" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <TouchableOpacity onPress={handleBookmark} style={styles.actionButton}>
                <AntDesign 
                  name={bookmarked ? "heart" : "hearto"} 
                  size={22} 
                  color={bookmarked ? "#EF4444" : "#ffffff"} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                <AntDesign name="sharealt" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.heroContent}>
            <View style={styles.companyBadge}>
              <Text style={styles.companyBadgeText}>
                {offre.demande?.entreprise?.libelleE || 'Entreprise'}
              </Text>
            </View>
            <Text style={styles.heroTitle}>
              {offre.poste?.titre_poste || 'Poste non spécifié'}
            </Text>
            <View style={styles.heroLocation}>
              <EvilIcons name="location" size={20} color="#ffffff" style={styles.locationIcon} />
              
              <Text style={styles.heroLocationText}>{offre.lieux}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Informations principales */}
        <AnimatedSection title="Informations générales" delay={100}>
          <View style={styles.infoGrid}>
            {(offre.salaire_minimum || offre.salaire_maximum) && (
              <InfoItem
                icon={<FontAwesome name="money" size={20} color="#10B981" />}
                label="Salaire"
                value={`${offre.salaire_minimum || '?'} - ${offre.salaire_maximum || '?'} FCFA`}
                color="#10B981"
              />
            )}
            
            {offre.typeContrat && (
              <InfoItem
                icon={<AntDesign name="file1" size={20} color="#3B82F6" />}
                label="Type de contrat"
                value={offre.typeContrat.libelle_type_contrat || 'Non spécifié'}
                color="#3B82F6"
              />
            )}
            
            {offre.experience !== null && (
              <InfoItem
                icon={<AntDesign name="clockcircleo" size={20} color="#F59E0B" />}
                label="Expérience"
                value={`${offre.experience} an${offre.experience > 1 ? 's' : ''}`}
                color="#F59E0B"
              />
            )}
            
            {offre.niveau_etude && (
              <InfoItem
                icon={<FontAwesome name="graduation-cap" size={20} color="#8B5CF6" />}
                label="Niveau d'étude"
                value={offre.niveau_etude.libelle_niveau_etude || 'Non spécifié'}
                color="#8B5CF6"
              />
            )}
            
            {offre.domaine_activite && (
              <InfoItem
                icon={<FontAwesome name="building-o" size={20} color="#EF4444" />}
                label="Domaine"
                value={offre.domaine_activite.libelle_domaine || 'Non spécifié'}
                color="#EF4444"
              />
            )}
            
            {offre.status_offre && (
              <InfoItem
                icon={<AntDesign name="checkcircleo" size={20} color="#06B6D4" />}
                label="Statut"
                value={offre.status_offre}
                color="#06B6D4"
              />
            )}
          </View>
        </AnimatedSection>

        {/* Dates importantes */}
        {(offre.date_debut || offre.date_fin) && (
          <AnimatedSection title="Dates importantes" delay={200}>
            <View style={styles.datesContainer}>
              {offre.date_debut && (
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Date de début</Text>
                  <Text style={styles.dateValue}>
                    {new Date(offre.date_debut).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              )}
              
              {offre.date_fin && (
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Date de fin</Text>
                  <Text style={styles.dateValue}>
                    {new Date(offre.date_fin).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              )}
            </View>
          </AnimatedSection>
        )}

        {/* Description du poste */}
        <AnimatedSection title="Description du poste" delay={300}>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{offre.description}</Text>
          </View>
        </AnimatedSection>

        {/* Profil recherché */}
        <AnimatedSection title="Profil recherché" delay={400}>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{offre.profil_recherche}</Text>
          </View>
        </AnimatedSection>

        {/* Espacement pour le bouton fixe */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bouton de candidature fixe */}
      <View style={styles.bottomContainer}>
        <LinearGradient
          colors={['transparent', 'rgba(248, 250, 252, 0.95)', '#F8FAFC']}
          style={styles.bottomGradient}
        >
          <TouchableOpacity
            style={[styles.applyButton, applying && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={applying}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={applying ? ['#9CA3AF', '#6B7280'] : ['#0f8e35', '#10B981']}
              style={styles.applyGradient}
            >
              {applying ? (
                <View style={styles.applyContent}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.applyButtonText}>Candidature en cours...</Text>
                </View>
              ) : (
                <View style={styles.applyContent}>
                  <AntDesign name="checkcircleo" size={26} color="#ffffff" style={styles.applyIcon} />
                  <Text style={styles.applyButtonText}>Postuler maintenant</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // États de chargement et d'erreur
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: '#091e60',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Header hero
  heroHeader: {
    height: 200,
  },
  heroGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  companyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  companyBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 30,
  },
  heroLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 4,
  },
  heroLocationText: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  
  // Contenu principal
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  
  // Grille d'informations
  infoGrid: {
    gap: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoIconText: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  
  // Dates
  datesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dateItem: {
    marginBottom: 15,
  },
  dateLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  
  // Descriptions
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  
  // Bouton de candidature
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
  },
  applyButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  applyGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyIcon: {
    fontSize: 26,
    marginRight: 10,
    paddingTop: 3,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
});