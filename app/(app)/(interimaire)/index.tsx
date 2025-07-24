import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { getIpmRecapByMonth, getAffiliatedStructures } from "../../../utils/api"; // NOUVEAU
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from "date-fns"; // Pour le formatage des dates si nécessaire

const { width } = Dimensions.get("window");

// Interfaces pour les données IPM et Structures
interface IpmRecap {
  id: number;
  mois: number;
  annee: number;
  consultations: number;
  soins: number;
  medicaments: number;
  protheses: number;
  examens: number;
  retenu: number;
  exclu: number;
  remboursement: number;
  name?: string; // Nom de la société, si joint
}

interface Structure {
  id: number;
  name: string;
  adresse: string;
  region: string;
  tel: string;
  email: string;
  type: string;
  PersonneRessource: string;
  affilie: boolean; // Ou number (0/1) si ce n'est pas casté en boolean par Laravel
}


export default function InterimDashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  // États pour l'avancement IPM
  const [ipmRecap, setIpmRecap] = useState<IpmRecap[]>([]);
  const [loadingIpmRecap, setLoadingIpmRecap] = useState(true);
  const [errorIpmRecap, setErrorIpmRecap] = useState<string | null>(null);

  // États pour les structures affiliées
  const [affiliatedStructures, setAffiliatedStructures] = useState<Structure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(true);
  const [errorStructures, setErrorStructures] = useState<string | null>(null);
  const [structuresPage, setStructuresPage] = useState(1); // Page actuelle
  const [hasMoreStructures, setHasMoreStructures] = useState(true); // Y a-t-il plus de pages ?
  const [loadingMoreStructures, setLoadingMoreStructures] = useState(false); // Chargement de pages supplémentaires

  // Animation d'entrée des sections (peut être conservée ou retirée)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  // --- LOGIQUE DE RÉCUPÉRATION DES DONNÉES ---
  const loadIpmRecap = useCallback(async () => {
    if (!user) {
      setIpmRecap([]);
      setLoadingIpmRecap(false);
      return;
    }
    setLoadingIpmRecap(true);
    setErrorIpmRecap(null);
    try {
      const data = await getIpmRecapByMonth();
      setIpmRecap(data);
    } catch (err: any) {
      console.error("Erreur de chargement du récap IPM:", err);
      setErrorIpmRecap(err.message || t("Impossible de charger l'état d'avancement IPM."));
    } finally {
      setLoadingIpmRecap(false);
    }
  }, [user, t]);

  const loadAffiliatedStructures = useCallback(async (page = 1, append = false) => {
    if (!user) {
      setAffiliatedStructures([]);
      setLoadingStructures(false);
      setLoadingMoreStructures(false);
      setHasMoreStructures(false);
      return;
    }

    if (page === 1) {
      setLoadingStructures(true);
    } else {
      setLoadingMoreStructures(true);
    }

    setErrorStructures(null);

    try {
      const response = await getAffiliatedStructures(page, 3);

      const structures = response.data; // ✅ le vrai tableau
      const currentPage = response.current_page;
      const lastPage = response.last_page;

      if (append) {
        setAffiliatedStructures(prev => {
          const newStructures = structures.filter(
            (newItem: Structure) => !prev.some(existingItem => existingItem.id === newItem.id)
          );
          return [...prev, ...newStructures];
        });
      } else {
        setAffiliatedStructures(structures);
      }

      setStructuresPage(currentPage);
      setHasMoreStructures(currentPage < lastPage);
      console.log("✅ Page mise à jour:", currentPage, "/", lastPage);

    } catch (err: any) {
      console.error("Erreur de chargement des structures affiliées:", err);
      setErrorStructures(err.message || t("Impossible de charger les structures affiliées."));
    } finally {
      setLoadingStructures(false);
      setLoadingMoreStructures(false);
    }
  }, [user, t]);



  useEffect(() => {
    loadIpmRecap();
    loadAffiliatedStructures();
  }, [loadIpmRecap, loadAffiliatedStructures]);

  // Fonction pour charger plus de structures
  const handleLoadMoreStructures = () => {
    console.log("→ Clic sur Charger plus !");
    if (!hasMoreStructures || loadingMoreStructures || loadingStructures) return;
    loadAffiliatedStructures(structuresPage + 1, true);
  };



  // --- Fonctions de navigation ou d'action ---
  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Intérimaire pressé !")); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };
  const handleGoToHrFile = () => { router.push('/(app)/(interimaire)/hr_file'); }; // Chemin absolu
  const handleGoToIpmFile = () => { router.push('/(app)/(interimaire)/ipm_file'); }; // Chemin absolu


  // --- Fonctions de rendu des sections ---

  // Rendu de l'état d'avancement IPM
  const renderIpmRecap = () => {
    // Calculer le total et le pourcentage pour la barre de progression globale
    const totalConsultations = ipmRecap.reduce((sum, item) => sum + item.consultations, 0);
    const totalSoins = ipmRecap.reduce((sum, item) => sum + item.soins, 0);
    const totalMedicaments = ipmRecap.reduce((sum, item) => sum + item.medicaments, 0);
    const totalProtheses = ipmRecap.reduce((sum, item) => sum + item.protheses, 0);
    const totalExamens = ipmRecap.reduce((sum, item) => sum + item.examens, 0);

    const overallTotal = totalConsultations + totalSoins + totalMedicaments + totalProtheses + totalExamens;
    const overallCovered = ipmRecap.reduce((sum, item) => sum + item.remboursement, 0);
    const completionPercentage = overallTotal > 0 ? (overallCovered / overallTotal) * 100 : 0;

    const getMonthName = (monthNum: number) => {
      const date = new Date(2000, monthNum - 1, 1); // Mois est 0-indexed
      return date.toLocaleString(t('fr-FR'), { month: 'long' }); // Utilisez la langue de l'app
    };

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
        {/* Header avec design épuré */}
        <View style={styles.sectionHeaderInner}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitleInner, { color: colors.textPrimary }]}>
            {t('Votre Recap IPM')}
          </Text>
        </View>

        {loadingIpmRecap ? (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingIndicator, { backgroundColor: colors.primary + '10' }]}>
              <ActivityIndicator size="small" color={colors.secondary} />
            </View>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('Chargement du récap IPM...')}
            </Text>
          </View>
        ) : errorIpmRecap ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '08' }]}>
            <View style={[styles.errorIconContainer, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            </View>
            <Text style={[styles.errorText, { color: colors.error }]}>{errorIpmRecap}</Text>
          </View>
        ) : ipmRecap.length === 0 ? (
          <View style={styles.emptyStateContent}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.textSecondary + '10' }]}>
              <Ionicons name="bar-chart-outline" size={28} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitleContent, { color: colors.textPrimary }]}>
              {t('Aucun récapitulatif IPM')}
            </Text>
            <Text style={[styles.emptyTextContent, { color: colors.textSecondary }]}>
              {t('Les données d\'avancement IPM s\'afficheront ici.')}
            </Text>
          </View>
        ) : (
          <>
            {/* Barre de progression modernisée */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressBarLabel, { color: colors.textPrimary }]}>
                  {t('Couverture Générale')}
                </Text>
                <View style={[styles.percentageBadge, { backgroundColor: colors.success + '15' }]}>
                  <Text style={[styles.percentageText, { color: colors.success }]}>
                    {completionPercentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
                <View style={[
                  styles.progressBarFill,
                  {
                    width: `${completionPercentage}%`,
                    backgroundColor: colors.success
                  }
                ]} />
              </View>
            </View>

            {/* Liste des récaps avec design cards */}
            <FlatList
              data={ipmRecap}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={[
                  styles.ipmRecapItem,
                  {
                    backgroundColor: colors.background,
                    marginBottom: index === ipmRecap.length - 1 ? 0 : 12
                  }
                ]}>
                  <View style={styles.itemHeader}>
                    <View style={[styles.monthBadge, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.ipmRecapMonth, { color: colors.primary }]}>
                        {getMonthName(item.mois)} {item.annee}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ipmRecapDetails}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {t('Consultations')}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {item.consultations} fcfa
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {t('Soins')}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {item.soins} fcfa
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {t('Médicaments')}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {item.medicaments} fcfa
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {t('Prothèses')}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {item.protheses} fcfa
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {t('Examens')}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {item.examens} fcfa
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          {t('Remboursement')}
                        </Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                          {item.remboursement} fcfa
                        </Text>
                        <View style={styles.detailItem}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                            {t('Retenu')}
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                            {item.retenu} fcfa
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            />
          </>
        )}
      </View>

    );
  };

  // Rendu des structures affiliées
  const renderAffiliatedStructures = () => {
    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.sectionHeaderInner}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitleInner, { color: colors.textPrimary }]}>
            {t('Structures Affiliées')}
          </Text>
        </View>

        {loadingStructures && affiliatedStructures.length === 0 ? (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingIndicator, { backgroundColor: colors.primary + '10' }]}>
              <ActivityIndicator size="small" color={colors.secondary} />
            </View>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('Chargement des structures...')}
            </Text>
          </View>
        ) : errorStructures ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{errorStructures}</Text>
          </View>
        ) : affiliatedStructures.length === 0 ? (
          <View style={styles.emptyStateContent}>
            <Ionicons name="home-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitleContent, { color: colors.textPrimary }]}>
              {t('Aucune structure affiliée')}
            </Text>
            <Text style={[styles.emptyTextContent, { color: colors.textSecondary }]}>
              {t('Aucune structure affiliée disponible pour le moment.')}
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={affiliatedStructures}
              keyExtractor={(item, index) => `structure-${item.id || index}`}
              scrollEnabled={false} // ✅ Pas de scroll, car ScrollView parent
              renderItem={({ item }) => (
                <View style={[styles.structureItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.structureName, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.structureDetail, { color: colors.textSecondary }]}>
                    {t('Adresse')}: {item.adresse}, {item.region}
                  </Text>
                  <Text style={[styles.structureDetail, { color: colors.textSecondary }]}>
                    {t('Téléphone')}: {item.tel}
                  </Text>
                  {item.PersonneRessource && (
                    <Text style={[styles.structureDetail, { color: colors.textSecondary }]}>
                      {t('Personne Ressource')}: {item.PersonneRessource}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Footer manuel au lieu de onEndReached */}
            {hasMoreStructures && (
              <View style={{ marginTop: 10 }}>
                {loadingMoreStructures ? (
                  <ActivityIndicator size="small" color={colors.secondary} />
                ) : (
                  <TouchableOpacity onPress={handleLoadMoreStructures} style={styles.loadMoreButton}>
                    <Text style={[styles.loadMoreButtonText, { color: colors.secondary }]}>
                      {t('voir plus de structures')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

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

        {user?.is_contract_active === false ? ( // Si contrat inactif
          <View style={[styles.emptyStateFull, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={[styles.emptyTitleFull, { color: colors.textPrimary }]}>{t('Accès restreint')}</Text>
            <Text style={[styles.emptyTextFull, { color: colors.textSecondary }]}>
              {t('Votre contrat intérimaire est terminé ou inactif. Vous n\'avez plus accès à cet espace.')}
            </Text>
            <Text style={[styles.emptyTextFull, { color: colors.textSecondary }]}>
              {t('Veuillez contacter l\'administration pour plus d\'informations.')}
            </Text>
          </View>
        ) : (
          <>
            {/* Section de Bienvenue et accès rapide */}
            <View style={styles.welcomeContainer}>
              <LinearGradient
                colors={['#1c6003', '#13af3f']}
                style={styles.welcomeGradient}
              >
                <Text style={styles.welcomeText}>
                  {t("Bonjour")}, {user?.name || t("Intérimaire")}! 👋
                </Text>
                <Text style={styles.welcomeSubtext}>
                  {t("Bienvenue sur l'app Pro Recrute de")}{" "}
                  <Text style={{ fontWeight: "bold" }}>GBG</Text>,{" "}
                  {t("ici vous pouvez gérer vos informations et accéder à vos dossiers RH et IPM.")}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.quickAccessContainer}>
              <TouchableOpacity
                style={[
                  styles.quickAccessCard,
                  { backgroundColor: colors.cardBackground },
                ]}
                onPress={handleGoToHrFile}
              >
                <Ionicons name="folder-outline" size={30} color={colors.primary} />
                <Text style={[styles.quickAccessText, { color: colors.textPrimary }]}>
                  {t("Dossier RH")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickAccessCard,
                  { backgroundColor: colors.cardBackground },
                ]}
                onPress={handleGoToIpmFile}
              >
                <Ionicons name="medkit-outline" size={30} color={colors.primary} />
                <Text style={[styles.quickAccessText, { color: colors.textPrimary }]}>
                  {t("Dossier IPM")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section Avancement IPM par mois */}
            {renderIpmRecap()}

            {/* Section Structures Affiliées */}
            {renderAffiliatedStructures()}
            {/* Espacement pour le bas de l'écran */}
            <View style={{ height: 60 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  welcomeSubtext: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    gap: 12,
  },
  quickAccessCard: {
    flex: 1,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickAccessText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  sectionHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  sectionTitleInner: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },

  loadingIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },

  errorIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  emptyStateContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },

  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitleContent: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyTextContent: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  emptyStateFull: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  emptyTitleFull: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyTextFull: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  // Styles de la barre de progression
  progressBarContainer: {
    marginBottom: 24,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  progressBarLabel: {
    fontSize: 15,
    fontWeight: '600',
  },

  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  percentageText: {
    fontSize: 13,
    fontWeight: '700',
  },

  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Styles des items IPM
  ipmRecapItem: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  itemHeader: {
    marginBottom: 16,
  },

  monthBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  ipmRecapMonth: {
    fontSize: 14,
    fontWeight: '700',
  },

  ipmRecapDetails: {
    gap: 12,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  detailItem: {
    flex: 1,
    alignItems: 'center',
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },

  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Styles spécifiques aux structures
  structureItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 5,
  },
  structureName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  structureDetail: {
    fontSize: 13,
  },
  loadMoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0f8e35',
    marginTop: 15,
    alignSelf: 'center', // Centrer le bouton
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f8e35',
  },
});
