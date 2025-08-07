import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList, Animated } from 'react-native';
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { getInterimAttestations, getDetailsUserGbg, getPdf, getContractHistory, getCertificatInfo, getCertificatPdf, fetchEncryptedTypes } from '../../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  const [, setExportError] = useState<string | null>(null);
  const [certificat, setCertificat] = useState<any>(null);
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);


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

  const loadCertificats = useCallback(async () => {
    if (!user) {
      setCertificat(null);
      setShowDownloadBtn(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getCertificatInfo();
      setCertificat(res.certificat);
      setShowDownloadBtn(res.statutContrat === true);
    } catch (err: any) {
      console.error("Erreur de chargement du certificat :", err);
      setCertificat(null);
      setShowDownloadBtn(false);
      setError(err.message || t("Impossible de charger le certificat."));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadAttestations();
  }, [loadAttestations]);

  useEffect(() => {
    loadCertificats();
  }, [loadCertificats]);

  useEffect(() => {
    const fetchDetailsUser = async () => {
      try {
        const response = await getDetailsUserGbg();
        setDetailsUser(response);
      } catch (err) {
        console.error("Erreur chargement des détails utilisateur :", err);
        setDetailsUser([]);
      }
    };

    fetchDetailsUser();
  }, []);

  useEffect(() => {
    const fetchContractHistory = async () => {
      try {
        const data = await getContractHistory();
        setContractHistory(data);
      } catch (err) {
        console.error('Erreur chargement historique contrats:', err);
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: "Impossible de charger l'historique des contrats.",
        });
      }
    };

    fetchContractHistory();
  }, []);

  useEffect(() => {
    const fetchCertificat = async () => {
      try {
        const res = await getCertificatInfo();
        setCertificat(res.certificat);
        setShowDownloadBtn(res.statutContrat === false);
      } catch (err) {
        console.error("Erreur lors du chargement du certificat :", err);
        setCertificat(null);
        setShowDownloadBtn(false);
      }
    };

    fetchCertificat();
  }, []);

  const [encryptedTypes, setEncryptedTypes] = useState<{ regulier: string; irregulier: string } | null>(null);

  useEffect(() => {
    fetchEncryptedTypes().then(setEncryptedTypes).catch(console.error);
  }, []);

  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Dossier RH pressé !")); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };


  const handleDownloadPdf = async (encryptedContratId: string) => {
    setExportingPdf(true);
    setExportError(null);
    try {
      await getPdf(encryptedContratId, 'attestation');
      Alert.alert(t("Succès"), t("Attestation téléchargée avec succès !"));
    } catch (err: any) {
      console.error("Erreur lors du téléchargement de l'attestation:", err);
      setExportError(err.message || t("Échec du téléchargement de l'attestation."));
      Alert.alert(t("Erreur"), err.message || t("Impossible de télécharger l'attestation."));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadCertificat = async (encryptedType: string) => {
    setExportingPdf(true);
    setExportError(null);
    try {
      await getCertificatPdf(encryptedType);
      Alert.alert(t("Succès"), t("Certificat téléchargé avec succès !"));
    } catch (err: any) {
      console.error("Erreur lors du téléchargement du certificat:", err);
      setExportError(err.message || t("Échec du téléchargement du certificat."));
      Alert.alert(t("Erreur"), err.message || t("Impossible de télécharger le certificat."));
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


        </View>
      </View>
    </View>
  );

  const renderCertificateCard = () => {
    if (!certificat) return null;

    const formattedDate = new Date(certificat.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border, overflow: 'hidden' }]}>
        <Ionicons
          name="school-outline"
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
              backgroundColor: colors.error + '20',
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 8,
              alignSelf: 'flex-start',
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: certificat.delivre === 1 ? colors.success : colors.error,
                fontWeight: 'bold',
                fontSize: 13,
              }}
            >
              {certificat.delivre === 1 ? t("Délivré") : t("Non délivré")}
            </Text>
          </View>

          <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
            {t("Certificat de travail")}
          </Text>

          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
            <Text>{t("Créé le :")} </Text>
            <Text>{formattedDate}</Text>
          </Text>



          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            {showDownloadBtn && (

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={() => encryptedTypes?.regulier && handleDownloadCertificat(encryptedTypes.regulier)}
                disabled={exportingPdf}
              >
                {exportingPdf ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionButtonText}>{t("Télécharger le Certificat régulier")}</Text>
                  </>
                )}
              </TouchableOpacity>

            )}
          </View>
        </View>
      </View>
    );
  };


  const filteredContracts = contractHistory.filter((c) => {
    return selectedFilter === 'Tous' || (c as { statut: string }).statut === selectedFilter;
  });

  const groupedByYear = filteredContracts.reduce((acc, contrat) => {
    const year = new Date((contrat as { date_debut: string }).date_debut).getFullYear();
    if (!acc[year]) acc[year] = [] as {
      statut: string;
      society_name: string;
      date_debut: string;
      date_terminaison: string;
      duration: number;
      temps_ecoule: string;
      rupture_motif?: string;
    }[];
    (acc as { [key: string]: any[] })[year].push(contrat);
    return acc;
  }, {} as { [key: string]: any[] });

  // Trier les contrats par date de début dans chaque année (plus récent en premier)
  Object.keys(groupedByYear).forEach(year => {
    groupedByYear[year].sort((a, b) =>
      new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime()
    );
  });

  const SimpleContractTimeline = ({
    contractHistory,
    colors,
    t,
    styles
  }: {
    contractHistory: {
      statut: string;
      society_name: string;
      date_debut: string;
      date_terminaison: string;
      duration: number;
      temps_ecoule: string;
      rupture_motif?: string;
      affectations?: {
        dateAffectation: string;
        structure: string;
      }[];
    }[];
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
          <View style={styles.section}>
            <View style={simpleStyles.header}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[simpleStyles.headerTitle, { color: colors.textPrimary }]}>
                {t("Historique des Contrats")} ({contractHistory.length})
              </Text>
            </View>

            <View style={simpleStyles.timeline}>
              {Object.keys(groupedByYear)
                .sort((a, b) => Number(b) - Number(a))
                .map((year) => (
                  <View key={year}>
                    <Text style={[simpleStyles.yearTitle, { color: colors.textSecondary }]}>
                      {year}
                    </Text>

                    {(groupedByYear as { [key: string]: any[] })[year].map((contrat, index) => {
                      const statusColor = getStatusColor(contrat.statut);

                      return (
                        <View key={index} style={simpleStyles.contractItem}>
                          <View style={[simpleStyles.statusDot, { backgroundColor: statusColor, width: 8, height: 8, borderRadius: 4 }]} />

                          <View style={[simpleStyles.contractCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <View style={simpleStyles.contractHeader}>
                              <Text style={[simpleStyles.companyName, { color: colors.textPrimary }]}>
                                {contrat.society_name || t("Société inconnue")}
                              </Text>
                              <Text style={[simpleStyles.status, { color: statusColor }]}>
                                {contrat.statut}
                              </Text>
                            </View>

                            <View style={simpleStyles.contractInfo}>
                              <Text style={[simpleStyles.infoText, { color: colors.textSecondary }]}>
                                {new Date(contrat.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {contrat.date_terminaison && ` - ${new Date(contrat.date_terminaison).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                              </Text>
                              <Text style={[simpleStyles.duration, { color: colors.textSecondary }]}>
                                {contrat.duration} {t("jours")} • {contrat.temps_ecoule}
                              </Text>
                            </View>
                            {contrat.affectations?.length > 0 && (
                              <View style={[modernStyles.infoBox, { backgroundColor: colors.secondary + '08' }]}>
                                <Text style={[modernStyles.sectionSubtitle, { color: colors.textPrimary, marginBottom: 8 }]}>
                                  {t("Affectations")}
                                </Text>
                                {contrat.affectations.map((affectation, idx) => (
                                  <View key={idx} style={modernStyles.infoRow}>
                                    <Ionicons name="location-outline" size={18} color={colors.secondary} style={modernStyles.icon} />
                                    <View style={modernStyles.infoContent}>
                                      <Text style={[modernStyles.infoTitle, { color: colors.textPrimary }]}>
                                        {affectation.structure}
                                      </Text>
                                      <Text style={[modernStyles.infoDate, { color: colors.textSecondary }]}>
                                        {t("Depuis le")} {new Date(affectation.dateAffectation).toLocaleDateString('fr-FR')}
                                      </Text>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                            {contrat.rupture_motif && (
                              <View style={[simpleStyles.alertBanner, { backgroundColor: colors.error + '10' }]}>
                                <Text style={[simpleStyles.alertText, { color: colors.error }]}>
                                  {contrat.rupture_motif}
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
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader title={t("Mon Dossier RH")} user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section timeline des contrats */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="arrow-back-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
          </TouchableOpacity>
          {['Tous', 'En cours', 'Terminé'].map((label) => (
            <TouchableOpacity
              key={label}
              onPress={() => setSelectedFilter(label as "Tous" | "En cours" | "Terminé")}
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
        <SimpleContractTimeline
          contractHistory={filteredContracts}
          colors={colors}
          t={t}
          styles={styles}
        />
        {/* Section Attestations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="documents-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[simpleStyles.headerTitle, { color: colors.textPrimary }]}>{t('Mes Attestations')}</Text>
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

        {/* Section Certificats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[simpleStyles.headerTitle, { color: colors.textPrimary }]}>{t('Mes Certificats')}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {t('Chargement des certificats...')}
              </Text>
            </View>
          ) : error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {typeof error === 'string' ? error : t('Une erreur est survenue.')}
              </Text>

              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={loadCertificats}
              >
                <Text style={styles.retryButtonText}>{t('Réessayer')}</Text>
              </TouchableOpacity>
            </View>
          ) : !certificat ? (
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
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>
                {t('Aucun certificat trouvé')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>
                {t('Vos certificats apparaîtront ici.')}
              </Text>
            </View>
          ) : (
            <View>
              {renderCertificateCard()}
            </View>
          )}
        </View>
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
                      ? '#4CAF50'
                      : selectedCertificate.contract_status === 0
                        ? '#2196F3'
                        : colors.textSecondary
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

const simpleStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeline: {
    gap: 12,
  },
  yearTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
    paddingLeft: 16,
  },
  contractItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginRight: 12,
  },
  contractCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  contractInfo: {
    gap: 2,
  },
  infoText: {
    fontSize: 12,
  },
  duration: {
    fontSize: 11,
  },
  alertBanner: {
    marginTop: 8,
    padding: 6,
    borderRadius: 4,
  },
  alertText: {
    fontSize: 11,
    fontStyle: 'italic',
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
    marginLeft: -15,
    flexDirection: 'row',
    position: 'relative',
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
    marginTop: 8,
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
  },
  infoBox: {
    padding: 8,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 4,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },

  icon: {
    marginRight: 10,
    marginTop: 2,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },

  infoDetails: {
    fontSize: 13,
    marginBottom: 2,
  },

  infoDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },

});
