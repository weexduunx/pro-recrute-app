import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { getInterimAttestations, getDetailsUserGbg, getPdf, getContractHistory } from '../../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Animated } from 'react-native';
import { useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';


interface Attestation {
  attestation_id: number;
  contrat_id: number;
  contrat_id_encrypted: string;
  user_id: number;
  start_date?: string;
  end_date?: string;
  label_masc?: string;
  label_fem?: string;
  contract_status?: number;
  user_name?: string;
  society_designation?: string;
  category_label?: string;
  category_class?: string;
  convention_label?: string;
  position_title?: string; // Titre du poste
  created_at?: string;
  updated_at?: string;
}

interface DetailsUser {
  attestation_id: number;
  gbg_user_name: string;
  attestation_created_at: string;
  attestation_updated_at: string;
}

export default function HrFileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [detailsUser, setDetailsUser] = useState<DetailsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Attestation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [contractHistory, setContractHistory] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState<'Tous' | 'En cours' | 'Terminé'>('Tous');


  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const openModal = async (item: Attestation) => {
    setSelectedCertificate(item);
    setModalVisible(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedCertificate(null);
    });
  };

  const loadAttestations = useCallback(async () => {
    if (!user) {
      setAttestations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedAttestations = await getInterimAttestations();
      setAttestations(fetchedAttestations);
    } catch (err: any) {
      console.error("Erreur de chargement des attestations:", err);
      setError(err.message || t("Impossible de charger les attestations."));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadAttestations();
  }, [loadAttestations]);

  useEffect(() => {
    const fetchDetailsUser = async () => {
      try {
        const response = await getDetailsUserGbg();
        setDetailsUser(response);
      } catch (error) {
        console.error("Erreur chargement des détails utilisateur :", error);
        setDetailsUser([]);
      }
    };

    fetchDetailsUser();
  }, []);

  useEffect(() => {
    const fetchContractHistory = async () => {
      try {
        const data = await getContractHistory();
        setContractHistory(data); // Tu dois avoir ce state : const [contractHistory, setContractHistory] = useState([])
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: "Impossible de charger l'historique des contrats.",
        });
      }
    };

    fetchContractHistory();
  }, []);

  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Dossier RH pressé !")); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  const sendLocalNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t("✅ Attestation prête"),
        body: t("Votre attestation a été téléchargée avec succès."),
      },
      trigger: null, // immédiat
    });
  };

  const handleDownloadPdf = async (encryptedContratId: string) => {
    setExportingPdf(true);
    setExportError(null);
    try {
      // Toast.show({
      //   type: 'success',
      //   text1: '✅ Téléchargement réussi',
      //   text2: 'L’attestation est prête à être partagée.',
      // });
      await getPdf(encryptedContratId); // Appel API pour télécharger le PDF
      Alert.alert(t("Succès"), t("Attestation téléchargée avec succès !"));
    } catch (err: any) {
      console.error("Erreur lors du téléchargement de l'attestation:", err);
      setExportError(err.message || t("Échec du téléchargement de l'attestation."));
      Alert.alert(t("Erreur"), err.message || t("Impossible de télécharger l'attestation."));
      // Toast.show({
      //   type: 'error',
      //   text1: '❌ Erreur',
      //   text2: 'Le téléchargement de l’attestation a échoué.',
      // });
    } finally {
      setExportingPdf(false);
    }
  };

  const renderCertificateItem = ({ item }: { item: Attestation }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border, overflow: 'hidden' }]}>
      <Ionicons
        name="document-outline"
        size={190}
        color={colors.textSecondary + '12'}
        style={{
          position: 'absolute',
          right: -30,
          top: -10,
          zIndex: 0,
        }}
      />
      <View style={[styles.itemContent, { zIndex: 1 }]}>
        <View
          style={{
            backgroundColor: item.updated_at
              ? colors.success + '20'
              : colors.warning + '20',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 8,
            alignSelf: 'flex-start',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: item.updated_at
                ? colors.success
                : colors.warning,
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            {item.updated_at ? t('Récupéré') : t('Non récupéré')}
          </Text>
        </View>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
          {t("Date Attestée :")}  {item.start_date ? new Date(item.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '...'}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Période :")} {item.start_date ? new Date(item.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '...'} - {item.end_date ? new Date(item.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '...'}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{t("Convention :")} {item.convention_label || t("Non renseigné")}</Text>

        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary, marginRight: 10 }]}
            onPress={() => openModal(item)}
          >
            <Ionicons name="eye-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionButtonText}>{t("Voir détails")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={() => handleDownloadPdf(item.contrat_id_encrypted)}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionButtonText}>{t("Télécharger")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  const filteredContracts = contractHistory.filter((c) => {
    return selectedFilter === 'Tous' || (c as { statut: string }).statut === selectedFilter;
  });

  const groupedByYear = filteredContracts.reduce((acc, contrat) => {
    const year = new Date((contrat as { date_debut: string }).date_debut).getFullYear();
    if (!acc[year]) acc[year] = [] as Array<{
      statut: string;
      society_name: string;
      date_debut: string;
      date_terminaison: string;
      duration: number;
      temps_ecoule: string;
      rupture_motif?: string;
    }>;
    (acc as { [key: string]: Array<any> })[year].push(contrat);
    return acc;
  }, {});

  const ModernContractTimeline = ({
    contractHistory,
    colors,
    t,
    styles
  }: {
    contractHistory: Array<{
      statut: string;
      society_name: string;
      date_debut: string;
      date_terminaison: string;
      duration: number;
      temps_ecoule: string;
      rupture_motif?: string;
    }>;
    colors: {
      primary: string;
      secondary: string;
      success: string;
      warning: string;
      error: string;
      textPrimary: string;
      textSecondary: string;
      border: string;
      cardBackground: string;
    };
    t: (key: string) => string;
    styles: any;
  }) => {
    // Animation pour l'apparition des éléments
    const fadeIn = new Animated.Value(0);

    React.useEffect(() => {
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, []);

    const getStatusIcon = (statut: string) => {
      switch (statut) {
        case "En cours":
          return "play-circle";
        case "Terminé":
          return "checkmark-circle";
        default:
          return "pause-circle";
      }
    };

    const getStatusColor = (statut: string) => {
      switch (statut) {
        case "En cours":
          return colors.success;
        case "Terminé":
          return colors.error;
        default:
          return colors.warning;
      }
    };

    return (
      <>
        {contractHistory.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeIn }]}>
            {/* En-tête moderne */}
            <View style={modernStyles.headerContainer}>
              <View style={modernStyles.headerIconContainer}>
                <Ionicons name="git-branch-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[modernStyles.headerTitle, { color: colors.textPrimary }]}>
                {t("Historique des Contrats")}
              </Text>
              <View style={modernStyles.headerBadge}>
                <Text style={[modernStyles.headerBadgeText, { color: colors.primary }]}>
                  {contractHistory.length}
                </Text>
              </View>
            </View>

            {/* Timeline Container */}
            <View style={modernStyles.timelineContainer}>
              {Object.keys(groupedByYear)
                .sort((a, b) => Number(b) - Number(a))
                .map((year) => (
                  <View key={year}>
                    <Text style={[styles.sectionTitle, { marginBottom: 10, marginTop: 20, color: colors.textPrimary }]}>
                      {year}
                    </Text>

                    {(groupedByYear as { [key: string]: Array<any> })[year].map((contrat, index) => {
                      const statusColor = getStatusColor(contrat.statut);
                      const isLast = index === (groupedByYear as { [key: string]: Array<any> })[year].length - 1;

                      return (
                        <View key={index} style={modernStyles.timelineItem}>
                          {/* Ligne de connection */}
                          {!isLast && (
                            <View style={[modernStyles.timelineLine, { backgroundColor: colors.border }]} />
                          )}

                          {/* Point de timeline */}
                          <View style={[modernStyles.timelinePoint, { borderColor: statusColor }]}>
                            <View style={[modernStyles.timelinePointInner, { backgroundColor: statusColor }]}>
                              <Ionicons
                                name={getStatusIcon(contrat.statut)}
                                size={12}
                                color="white"
                              />
                            </View>
                          </View>

                          {/* Contenu de la carte */}
                          <View style={[modernStyles.timelineCard, { backgroundColor: colors.cardBackground }]}>
                            {/* Header de la carte */}
                            <View style={modernStyles.cardHeader}>
                              <View style={modernStyles.cardHeaderLeft}>
                                <Ionicons name="business" size={18} color={colors.primary} />
                                <Text style={[modernStyles.companyName, { color: colors.textPrimary }]}>
                                  {contrat.society_name || t("Société inconnue")}
                                </Text>
                              </View>
                              <View style={[modernStyles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                <Text style={[modernStyles.statusText, { color: statusColor }]}>
                                  {contrat.statut}
                                </Text>
                              </View>
                            </View>

                            {/* Dates */}
                            <View style={modernStyles.dateSection}>
                              <View style={modernStyles.dateItem}>
                                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                                <Text style={[modernStyles.dateText, { color: colors.textSecondary }]}>
                                  {contrat.date_debut}
                                </Text>
                              </View>
                              <View style={modernStyles.dateArrow}>
                                <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                              </View>
                              <View style={modernStyles.dateItem}>
                                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                                <Text style={[modernStyles.dateText, { color: colors.textSecondary }]}>
                                  {contrat.date_terminaison}
                                </Text>
                              </View>
                            </View>

                            {/* Durée et temps écoulé */}
                            <View style={modernStyles.metricsRow}>
                              <View style={modernStyles.metric}>
                                <Text style={[modernStyles.metricLabel, { color: colors.textSecondary }]}>
                                  {t("Durée")}
                                </Text>
                                <Text style={[modernStyles.metricValue, { color: colors.textPrimary }]}>
                                  {contrat.duration} jours
                                </Text>
                              </View>

                              <View style={modernStyles.metric}>
                                <Text style={[modernStyles.metricLabel, { color: colors.textSecondary }]}>
                                  {t(" Temps Écoulé")}
                                </Text>
                                <Text style={[modernStyles.metricValue, { color: colors.textPrimary }]}>
                                  {contrat.temps_ecoule}
                                </Text>
                              </View>
                            </View>

                            {contrat.rupture_motif && (
                              <View style={[modernStyles.alertSection, { backgroundColor: colors.error + '10' }]}>
                                <Ionicons name="alert-circle" size={16} color={colors.error} />
                                <Text style={[modernStyles.alertText, { color: colors.error }]}>
                                  {t("Rupture :")} {contrat.rupture_motif}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}

            </View>
          </Animated.View>
        )}
      </>
    );
  };



  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader title={t("Mon Dossier RH")} user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="arrow-back-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            </TouchableOpacity>
            <Ionicons name="documents-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Mes Attestations')}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement des attestations...')}</Text>
            </View>
          ) : error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadAttestations}>
                <Text style={styles.retryButtonText}>{t('Réessayer')}</Text>
              </TouchableOpacity>
            </View>
          ) : attestations.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground, position: 'relative', overflow: 'hidden' }]}>
              <Ionicons
                name="file-tray-outline"
                size={120}
                color={colors.textSecondary + '22'}
                style={{
                  position: 'absolute',
                  top: '20%',
                  left: '50%',
                  transform: [{ translateX: -60 }],
                  zIndex: 0,
                }}
              />
              <Ionicons name="file-tray-outline" size={48} color={colors.textSecondary} style={{ zIndex: 1 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>{t('Aucune attestation trouvée')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>{t('Vos attestations apparaîtront ici.')}</Text>
            </View>
          ) : (
            <FlatList
              data={attestations}
              renderItem={renderCertificateItem}
              keyExtractor={item => item?.attestation_id?.toString() ?? `item-${Math.random()}`}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}

        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
          {['Tous', 'En cours', 'Terminé'].map((label) => (
            <TouchableOpacity
              key={label}
              onPress={() => setSelectedFilter(label)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: selectedFilter === label ? colors.primary : colors.cardBackground,
                borderWidth: 1,
                borderColor: selectedFilter === label ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: selectedFilter === label ? '#fff' : colors.textPrimary }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ModernContractTimeline
          contractHistory={contractHistory}
          colors={colors}
          t={t}
          styles={styles}
        />

      </ScrollView>
      {
        modalVisible && selectedCertificate && (
          <Animated.View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            zIndex: 99,
            opacity: fadeAnim,
          }}>
            <Animated.View style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxHeight: '90%',
              transform: [{ translateY: slideAnim }],
            }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.itemTitle, { fontSize: 18, marginBottom: 10, color: colors.textPrimary }]}>
                  <Ionicons name="briefcase-outline" size={18} color={colors.textPrimary} /> {selectedCertificate.label_masc || t("Poste")}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="person-outline" size={16} /> {t("Employé :")} {selectedCertificate.user_name || t("Non renseigné")}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="business-outline" size={16} /> {t("Société :")} {selectedCertificate.society_designation || t("Non renseigné")}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="document-outline" size={16} /> {t("Statut :")}
                  <Text style={{
                    color: selectedCertificate.contract_status === 1
                      ? '#4CAF50' // Green for renewal
                      : selectedCertificate.contract_status === 0
                        ? '#2196F3' // Blue for new contract
                        : colors.textSecondary // Default color for unknown status
                  }}>
                    {selectedCertificate.contract_status === 1
                      ? t("Renouvellement")
                      : selectedCertificate.contract_status === 0
                        ? t("Nouveau contrat")
                        : t("Non renseigné")}
                  </Text>
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="calendar-outline" size={16} /> {t("Période :")}
                  {selectedCertificate.start_date
                    ? new Date(selectedCertificate.start_date).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                    : t("N/A")
                  } - {selectedCertificate.end_date ? new Date(selectedCertificate.end_date).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  }) : t("N/A")}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="podium-outline" size={16} /> {t("Catégorie :")} {selectedCertificate.category_label || t("Non renseigné")} ({selectedCertificate.category_class || t("N/A")})
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="book-outline" size={16} /> {t("Convention :")} {selectedCertificate.convention_label || t("Non renseigné")}
                </Text>

                {selectedCertificate?.contrat_id_encrypted && (
                  <TouchableOpacity
                    onPress={() => handleDownloadPdf(selectedCertificate.contrat_id_encrypted)}
                    style={[{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: colors.secondary,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginTop: 15
                    }]}
                    disabled={exportingPdf}
                  >
                    {exportingPdf ? (
                      <ActivityIndicator color={colors.secondary} size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="download-outline"
                          size={16}
                          color={colors.secondary}
                        />
                        <Text style={{
                          marginLeft: 8,
                          color: colors.secondary,
                          fontSize: 14,
                          fontWeight: '500'
                        }}>
                          {t("Télécharger l'attestation")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

              </ScrollView>

              {/* Détails utilisateur */}
              {selectedCertificate && detailsUser.length > 0 && (() => {
                const match = detailsUser.find(d => d.attestation_id === selectedCertificate.attestation_id);
                if (!match) return null;

                return (
                  <View style={{ marginTop: 20 }}>
                    <Text style={[styles.itemTitle, { fontSize: 16, color: colors.textPrimary }]}>
                      {t("Attestation créée par :")}
                    </Text>

                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                      <Ionicons name="person-outline" size={16} /> {t("Nom :")} {match.gbg_user_name}
                    </Text>

                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                      <Ionicons name="time-outline" size={16} /> {t("Créé le :")} {new Date(match.attestation_created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                );
              })()}

              {/* Modern minimal close button */}
              <TouchableOpacity
                onPress={closeModal}
                style={{
                  marginTop: 20,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: colors.primary + '40',
                  borderRadius: 10,
                  alignSelf: 'center',
                  minWidth: 120,
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >

                <Text style={{
                  color: colors.primary,
                  fontSize: 15,
                  fontWeight: '500',
                  letterSpacing: 0.5
                }}>

                  {t("Fermer")}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )
      }
    </SafeAreaView>

  );
}

// Styles pour le composant HrFileScreen
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 12,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    // Styles pour le conteneur de FlatList si nécessaire
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemIcon: {
    marginRight: 15,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
  },
  detailsList: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  detailsListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailsListItem: {
    fontSize: 13,
    marginBottom: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

});
const modernStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10
  },
  headerIconContainer: {
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  headerBadge: {
    backgroundColor: '#E8F0FE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontWeight: '600',
  },
  timelineContainer: {
    paddingLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#ccc',
  },
  timelineItem: {
    marginBottom: 30,
    marginLeft: -16,
    flexDirection: 'row',
  },
  timelineLine: {
    position: 'absolute',
    top: 36,
    left: 22,
    width: 2,
    height: '100%',
  },
  timelinePoint: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelinePointInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCard: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    marginLeft: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  companyName: {
    fontWeight: 'bold',
    fontSize: 14
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13
  },
  dateArrow: {
    marginHorizontal: 6
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4
  },
  metric: {
    flexDirection: 'column',
    gap: 2,
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 12
  },
  metricValue: {
    fontWeight: '600'
  },
  alertSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
    padding: 6,
    borderRadius: 6,
  },
  alertText: {
    fontSize: 13,
  }
});

