import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList, Animated, RefreshControl, Modal, TextInput } from 'react-native';
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import {
  getInterimLoans,
  getFamilleMembers,
  requestPriseEnCharge,
  requestFeuilleDeSoins,
  getPrisesEnChargeHistory,
  getFeuillesDeSoinsHistory,
  getPdf,
  getAffiliatedStructures,
} from '../../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

interface Loan {
  id: number;
  nombre_echeances: number;
  montant_retenu: number;
  montant_echeances?: number;
  duree_echelonnement?: number;
  date_debut?: string;
  date_fin?: string;
  mois_pret: number;
  valider_par?: number;
  valider_par_name?: string;
  statut: number;
  details?: LoanDetail[];
}

interface LoanDetail {
  id: number;
  echelonnement_id: number;
  montant: number;
  mois: string;
}

interface FamilleMember {
  id: number;
  prenom: string;
  nom: string;
  lien: string;
  naissance: string;
  user_id: number;
}

interface PriseEnChargeRequest {
  id: number;
  objet: string;
  date: string;
  user_id: number;
  famille_id?: number;
  medcin_id?: number;
  structure_id?: number;
  statut: number;
  statut_label: string;
  famille?: { prenom: string; nom: string; lien: string };
}

interface FeuilleDeSoinsRequest {
  id: number;
  type: string;
  created_at: string;
  user_id: number;
  encrypted_id: number;
  famille_id?: number;
  statut: number;
  statut_label: string;
  famille?: { prenom: string; nom: string; lien: string };
}

export default function IpmFileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [errorLoans, setErrorLoans] = useState<string | null>(null);

  const [familleMembers, setFamilleMembers] = useState<FamilleMember[]>([]);
  const [loadingFamilleMembers, setLoadingFamilleMembers] = useState(true);

  const [affiliatedStructures, setAffiliatedStructures] = useState<any[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(true);

  const [prisesEnChargeHistory, setPrisesEnChargeHistory] = useState<PriseEnChargeRequest[]>([]);
  const [loadingPrisesEnCharge, setLoadingPrisesEnCharge] = useState(true);

  const [feuillesDeSoinsHistory, setFeuillesDeSoinsHistory] = useState<FeuilleDeSoinsRequest[]>([]);
  const [loadingFeuillesDeSoins, setLoadingFeuillesDeSoins] = useState(true);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'prise_en_charge' | 'feuille_de_soins' | null>(null);

  // États pour le formulaire de prise en charge
  const [pecObjet, setPecObjet] = useState('');
  const [pecDate, setPecDate] = useState(new Date().toISOString().split('T')[0]);
  const [pecFamilleId, setPecFamilleId] = useState<number | undefined>(undefined);
  const [pecStructureId, setPecStructureId] = useState<number | undefined>(undefined);
  const [submittingPec, setSubmittingPec] = useState(false);

  // États pour le formulaire de feuille de soins
  const [fdsType, setFdsType] = useState('');
  const [fdsFamilleId, setFdsFamilleId] = useState<number | undefined>(undefined);
  const [submittingFds, setSubmittingFds] = useState(false);

  // États pour les téléchargements
  const [downloadingPec, setDownloadingPec] = useState<string | null>(null);
  const [downloadingFds, setDownloadingFds] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const loadLoans = useCallback(async () => {
    if (!user) { setLoadingLoans(false); return; }
    setLoadingLoans(true); setErrorLoans(null);
    try {
      const fetchedLoans = await getInterimLoans();
      setLoans(fetchedLoans);
    } catch (err: any) {
      setErrorLoans(err.response?.data?.message || t("Impossible de charger les détails des prêts."));
    } finally { setLoadingLoans(false); }
  }, [user, t]);

  const loadFamilleMembers = useCallback(async () => {
    if (!user) { setFamilleMembers([]); setLoadingFamilleMembers(false); return; }
    setLoadingFamilleMembers(true);
    try {
      const members = await getFamilleMembers();
      setFamilleMembers(Array.isArray(members) ? members : []);
    } catch (err: any) {
      setFamilleMembers([]);
    } finally { setLoadingFamilleMembers(false); }
  }, [user, t]);

  const loadPrisesEnChargeHistory = useCallback(async () => {
    if (!user) { setLoadingPrisesEnCharge(false); return; }
    setLoadingPrisesEnCharge(true);
    try {
      const history = await getPrisesEnChargeHistory();
      setPrisesEnChargeHistory(history);
    } catch (err: any) {
      console.error("Erreur prises en charge:", err);
    } finally { setLoadingPrisesEnCharge(false); }
  }, [user, t]);

  const loadFeuillesDeSoinsHistory = useCallback(async () => {
    if (!user) { setLoadingFeuillesDeSoins(false); return; }
    setLoadingFeuillesDeSoins(true);
    try {
      const history = await getFeuillesDeSoinsHistory();
      setFeuillesDeSoinsHistory(history);
    } catch (err: any) {
      console.error("Erreur feuilles de soins:", err);
    } finally { setLoadingFeuillesDeSoins(false); }
  }, [user, t]);

  const loadAffiliatedStructures = useCallback(async () => {
    if (!user) { setAffiliatedStructures([]); setLoadingStructures(false); return; }
    setLoadingStructures(true);
    try {
      let allStructures: any[] = [];
      let page = 1;
      let hasMorePages = true;
      const perPage = 50;

      while (hasMorePages && page <= 10) {
        const response = await getAffiliatedStructures(page, perPage);

        if (response && response.hasOwnProperty('success') && !response.success) {
          setAffiliatedStructures([]);
          return;
        }

        const structures = response.data || response || [];
        const structuresArray = Array.isArray(structures) ? structures : [];
        allStructures = [...allStructures, ...structuresArray];
        hasMorePages = structuresArray.length === perPage;
        page++;
      }

      setAffiliatedStructures(allStructures);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setAffiliatedStructures([]);
        return;
      }
      setAffiliatedStructures([]);
    } finally { setLoadingStructures(false); }
  }, [user, t]);

  useEffect(() => {
    loadLoans();
    loadFamilleMembers();
    loadPrisesEnChargeHistory();
    loadFeuillesDeSoinsHistory();
    loadAffiliatedStructures();
  }, [loadLoans, loadFamilleMembers, loadPrisesEnChargeHistory, loadFeuillesDeSoinsHistory, loadAffiliatedStructures]);

  useEffect(() => {
    if (affiliatedStructures.length > 0 && !pecStructureId) {
      setPecStructureId(affiliatedStructures[0].id);
    }
  }, [affiliatedStructures]);

  // Fonction de rafraîchissement
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadLoans(),
        loadFamilleMembers(),
        loadPrisesEnChargeHistory(),
        loadFeuillesDeSoinsHistory(),
        loadAffiliatedStructures()
      ]);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadLoans, loadFamilleMembers, loadPrisesEnChargeHistory, loadFeuillesDeSoinsHistory, loadAffiliatedStructures]);

  const openRequestModal = (type: 'prise_en_charge' | 'feuille_de_soins') => {
    setRequestType(type);
    setShowRequestModal(true);

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

  const closeRequestModal = () => {
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
      setShowRequestModal(false);
      setRequestType(null);
      setPecObjet(''); setPecDate(new Date().toISOString().split('T')[0]); setPecFamilleId(undefined);
      if (affiliatedStructures.length > 0) {
        setPecStructureId(affiliatedStructures[0].id);
      }
      setFdsType(''); setFdsFamilleId(undefined);
    });
  };

  const handleSubmitPriseEnCharge = async () => {
    if (!pecObjet.trim()) {
      Alert.alert(t('Erreur'), t('Veuillez renseigner l\'objet de la demande.'));
      return;
    }

    if (pecFamilleId) {
      const selectedMember = familleMembers.find(member => member.id === pecFamilleId);
      if (selectedMember) {
        const lienCode = parseInt(selectedMember.lien.toString());
        if (lienCode === 3 || lienCode === 4) {
          Alert.alert(t('Erreur'), t('Les parents ne peuvent pas être bénéficiaires d\'une prise en charge.'));
          return;
        }
      }
    }

    if (!pecStructureId && affiliatedStructures.length > 0) {
      setPecStructureId(affiliatedStructures[0].id);
    }

    if (!pecStructureId) {
      Alert.alert(t('Erreur'), t('Veuillez sélectionner une structure médicale.'));
      return;
    }

    setSubmittingPec(true);
    try {
      await requestPriseEnCharge({
        objet: pecObjet,
        date: pecDate,
        famille_id: pecFamilleId,
        structure_id: pecStructureId,
      });
      Alert.alert(t('Succès'), t('Demande de prise en charge soumise !'));
      closeRequestModal();
      loadPrisesEnChargeHistory();
    } catch (err: any) {
      Alert.alert(t('Erreur'), err.response?.data?.message || t('Échec de la soumission de la demande.'));
    } finally {
      setSubmittingPec(false);
    }
  };

  const handleSubmitFeuilleDeSoins = async () => {
    if (fdsFamilleId) {
      const selectedMember = familleMembers.find(member => member.id === fdsFamilleId);
      if (selectedMember) {
        const lienCode = parseInt(selectedMember.lien.toString());
        if (lienCode === 3 || lienCode === 4) {
          Alert.alert(t('Erreur'), t('Les parents ne peuvent pas être bénéficiaires d\'une feuille de soins.'));
          return;
        }
      }
    }

    setSubmittingFds(true);
    try {
      await requestFeuilleDeSoins({
        type: fdsType,
        famille_id: fdsFamilleId,
      });
      Alert.alert(t('Succès'), t('Demande de feuille de soins soumise !'));
      closeRequestModal();
      loadFeuillesDeSoinsHistory();
    } catch (err: any) {
      Alert.alert(t('Erreur'), err.response?.data?.message || t('Échec de la soumission de la demande.'));
    } finally {
      setSubmittingFds(false);
    }
  };

  const handleDownloadPdf = async (encryptedId: string, type: 'prise_en_charge' | 'feuille_de_soins') => {
    try {
      if (type === 'prise_en_charge') {
        setDownloadingPec(encryptedId);
      } else {
        setDownloadingFds(encryptedId);
      }

      await getPdf(encryptedId, type);
      Alert.alert(t("Succès"), t("Document téléchargé avec succès !"));
    } catch (err: any) {
      Alert.alert(t("Erreur"), err.response?.data?.message || t("Impossible de télécharger le document."));
    } finally {
      if (type === 'prise_en_charge') {
        setDownloadingPec(null);
      } else {
        setDownloadingFds(null);
      }
    }
  };

  const getMonthName = (monthNumber: number): string => {
    const months = [
      '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[monthNumber] || `Mois ${monthNumber}`;
  };

  const getLienLabel = (lienCode: string | number) => {
    const code = parseInt(lienCode.toString());
    switch (code) {
      case 1: return 'Enfant';
      case 2: return 'Conjoint';
      case 3: return 'Père';
      case 4: return 'Mère';
      case 5: return 'Autre';
      case 6: return 'Personne Ressource';
      default: return lienCode || 'Non spécifié';
    }
  };

  const getEligibleFamilyMembers = (members: FamilleMember[]) => {
    return members.filter(member => {
      const lienCode = parseInt(member.lien.toString());
      return lienCode !== 3 && lienCode !== 4;
    });
  };

  const renderLoanItem = ({ item }: { item: Loan }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border, overflow: 'hidden' }]}>
      <Ionicons
        name="wallet-outline"
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
            backgroundColor: item.statut === 1
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
              color: item.statut === 1
                ? colors.success
                : colors.warning,
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            {item.statut === 1 ? t('Validé') : t('En attente')}
          </Text>
        </View>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
          {t('Échéancier')} - {item.mois_pret ? getMonthName(item.mois_pret) : t("N/A")}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t('Montant retenu :')} {item.montant_retenu ?? t('Non spécifié')} FCFA
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t('Durée :')} {item.duree_echelonnement ? `${Math.floor(item.duree_echelonnement / 30)} mois` : t("N/A")}
        </Text>

        {item.valider_par_name && (
          <Text style={[styles.itemSubtitle, { color: colors.success, marginTop: 5 }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} /> {t("Validé par:")} {item.valider_par_name}
          </Text>
        )}
      </View>
    </View>
  );

  const renderPriseEnChargeItem = ({ item }: { item: PriseEnChargeRequest }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border, overflow: 'hidden' }]}>
      <Ionicons
        name="medkit-outline"
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
            backgroundColor: item.statut === 1 ? colors.success + '20' : item.statut === 2 ? colors.error + '20' : colors.warning + '20',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 8,
            alignSelf: 'flex-start',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: item.statut === 1 ? colors.success : item.statut === 2 ? colors.error : colors.warning,
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            {item.statut_label}
          </Text>
        </View>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
          {item.objet}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t('Date :')} {new Date(item.date).toLocaleDateString()}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t('Bénéficiaire :')} {item.famille ? `${item.famille.prenom} ${item.famille.nom}` : t("Vous-même")}
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {item.statut === 1 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleDownloadPdf(item.encrypted_id?.toString() || '', 'prise_en_charge')}
              disabled={downloadingPec === item.encrypted_id?.toString()}
            >
              {downloadingPec === item.encrypted_id?.toString() ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>{t("Télécharger")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderFeuilleDeSoinsItem = ({ item }: { item: FeuilleDeSoinsRequest }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border, overflow: 'hidden' }]}>
      <Ionicons
        name="receipt-outline"
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
            backgroundColor: item.statut === 1 ? colors.success + '20' : item.statut === 2 ? colors.error + '20' : colors.warning + '20',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 8,
            alignSelf: 'flex-start',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: item.statut === 1 ? colors.success : item.statut === 2 ? colors.error : colors.warning,
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            {item.statut_label}
          </Text>
        </View>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
          {item.type}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t('Date :')} {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t('Bénéficiaire :')} {item.famille ? `${item.famille.prenom} ${item.famille.nom}` : t("Vous-même")}
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {item.statut === 1 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
              onPress={() => handleDownloadPdf(item.encrypted_id?.toString() || '', 'feuille_de_soins')}
              disabled={downloadingFds === item.encrypted_id?.toString()}
            >
              {downloadingFds === item.encrypted_id?.toString() ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>{t("Télécharger")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader
        title={t("Prestations IPM")}
        user={user}
        showBackButton={true}
        showNotificationIcon={true}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0f8e35']}
            tintColor="#0f8e35"
          />
        }
      >
        {/* Section Nouvelles demandes */}
        {user?.is_contract_active !== false && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('Nouvelles demandes')}
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.requestButton, { backgroundColor: colors.primary }]}
                onPress={() => openRequestModal('prise_en_charge')}
              >
                <Ionicons name="medkit" size={16} color="#FFFFFF" />
                <Text style={styles.requestButtonText}>{t('Prise en charge')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.requestButton, { backgroundColor: colors.secondary }]}
                onPress={() => openRequestModal('feuille_de_soins')}
              >
                <Ionicons name="receipt" size={16} color="#FFFFFF" />
                <Text style={styles.requestButtonText}>{t('Feuille de soins')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Section Échéanciers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="wallet-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Mes Échéanciers')}</Text>
            </View>
          </View>

          {loadingLoans ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement des échéanciers...')}</Text>
            </View>
          ) : errorLoans ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{errorLoans}</Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadLoans}>
                <Text style={styles.retryButtonText}>{t('Réessayer')}</Text>
              </TouchableOpacity>
            </View>
          ) : loans.length === 0 ? (
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
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>{t('Aucun échéancier trouvé')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>{t('Vos échéanciers apparaîtront ici.')}</Text>
            </View>
          ) : (
            <FlatList
              data={loans}
              renderItem={renderLoanItem}
              keyExtractor={(item, index) => item.id?.toString() || `loan-${index}`}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>

        {/* Section Prises en charge */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="medkit-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Prises en charge')}</Text>
            </View>
          </View>

          {loadingPrisesEnCharge ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement...')}</Text>
            </View>
          ) : prisesEnChargeHistory.length === 0 ? (
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
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>{t('Aucune prise en charge')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>{t('Vos demandes apparaîtront ici.')}</Text>
            </View>
          ) : (
            <FlatList
              data={prisesEnChargeHistory}
              renderItem={renderPriseEnChargeItem}
              keyExtractor={(item, index) => item.id?.toString() || `pec-${index}`}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>

        {/* Section Feuilles de soins */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="receipt-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Feuilles de soins')}</Text>
            </View>
          </View>

          {loadingFeuillesDeSoins ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement...')}</Text>
            </View>
          ) : feuillesDeSoinsHistory.length === 0 ? (
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
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>{t('Aucune feuille de soins')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>{t('Vos demandes apparaîtront ici.')}</Text>
            </View>
          ) : (
            <FlatList
              data={feuillesDeSoinsHistory}
              renderItem={renderFeuilleDeSoinsItem}
              keyExtractor={(item, index) => item.id?.toString() || `fds-${index}`}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal de demande */}
      {showRequestModal && (
        <Animated.View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
          zIndex: 99,
          opacity: fadeAnim,
        }}>
          <Animated.View style={{
            backgroundColor: colors.background || '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
            paddingBottom: 20,
            transform: [{ translateY: slideAnim }],
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border || '#F3F4F6'
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.textPrimary || '#091e60'
              }}>
                {requestType === 'prise_en_charge' ? t('Prise en charge') : t('Feuille de soins')}
              </Text>
              <TouchableOpacity
                onPress={closeRequestModal}
                style={{ padding: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: colors.textPrimary || '#091e60',
                marginBottom: 12
              }}>
                {t('Bénéficiaire')}
              </Text>

              {loadingFamilleMembers ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={{
                  borderWidth: 1,
                  borderColor: colors.border || '#E5E7EB',
                  borderRadius: 8,
                  marginBottom: 20,
                  backgroundColor: colors.cardBackground || '#F9FAFB'
                }}>
                  <Picker
                    selectedValue={requestType === 'prise_en_charge' ? pecFamilleId : fdsFamilleId}
                    onValueChange={(itemValue: number | undefined) => {
                      if (requestType === 'prise_en_charge') setPecFamilleId(itemValue);
                      else setFdsFamilleId(itemValue);
                    }}
                    style={{
                      height: 50,
                      paddingHorizontal: 12,
                      color: colors.textPrimary || '#091e60'
                    }}
                  >
                    <Picker.Item label={t("Vous-même")} value={undefined} />
                    {getEligibleFamilyMembers(familleMembers).map(member => (
                      <Picker.Item
                        key={member.id}
                        label={`${member.prenom} ${member.nom} (${getLienLabel(member.lien)})`}
                        value={member.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}

              {requestType === 'prise_en_charge' ? (
                <>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: colors.textPrimary || '#091e60',
                    marginBottom: 12
                  }}>
                    {t('Objet de la demande')}
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border || '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      marginBottom: 20,
                      backgroundColor: colors.cardBackground || '#F9FAFB',
                      color: colors.textPrimary || '#091e60'
                    }}
                    placeholder={t("Ex: Consultation générale, Médicaments")}
                    placeholderTextColor={colors.textSecondary}
                    value={pecObjet}
                    onChangeText={setPecObjet}
                  />

                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: colors.textPrimary || '#091e60',
                    marginBottom: 12
                  }}>
                    {t('Date de la demande')}
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border || '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      marginBottom: 20,
                      backgroundColor: colors.cardBackground || '#F9FAFB',
                      color: colors.textPrimary || '#091e60'
                    }}
                    placeholder={t("AAAA-MM-JJ")}
                    placeholderTextColor={colors.textSecondary}
                    value={pecDate}
                    onChangeText={setPecDate}
                  />

                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: colors.textPrimary || '#091e60',
                    marginBottom: 12
                  }}>
                    {t('Structure médicale')}
                  </Text>
                  {loadingStructures ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={{
                      borderWidth: 1,
                      borderColor: colors.border || '#E5E7EB',
                      borderRadius: 8,
                      marginBottom: 20,
                      backgroundColor: colors.cardBackground || '#F9FAFB'
                    }}>
                      <Picker
                        selectedValue={pecStructureId}
                        onValueChange={(itemValue: number | undefined) => setPecStructureId(itemValue)}
                        style={{
                          height: 50,
                          paddingHorizontal: 12,
                          color: colors.textPrimary || '#091e60'
                        }}
                      >
                        <Picker.Item label={t("Sélectionner une structure")} value={undefined} />
                        {affiliatedStructures.map(structure => (
                          <Picker.Item
                            key={structure.id}
                            label={structure.name || `Structure ${structure.id}`}
                            value={structure.id}
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: colors.textPrimary || '#091e60',
                    marginBottom: 12
                  }}>
                    {t('Type de soins')}
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border || '#E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                      marginBottom: 20,
                      backgroundColor: colors.cardBackground || '#F9FAFB',
                      color: colors.textPrimary || '#091e60'
                    }}
                    placeholder={t("Ex: Consultation, Médicaments, Examen")}
                    placeholderTextColor={colors.textSecondary}
                    value={fdsType}
                    onChangeText={setFdsType}
                  />
                </>
              )}

              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary || '#091e60',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginBottom: 12
                }}
                onPress={requestType === 'prise_en_charge' ? handleSubmitPriseEnCharge : handleSubmitFeuilleDeSoins}
                disabled={requestType === 'prise_en_charge' ? submittingPec : submittingFds}
              >
                {(requestType === 'prise_en_charge' ? submittingPec : submittingFds) ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    fontSize: 16
                  }}>
                    {t('Soumettre la demande')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: colors.border || '#E5E7EB',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={closeRequestModal}
              >
                <Text style={{
                  color: colors.textSecondary || '#6B7280',
                  fontWeight: 'bold'
                }}>
                  {t('Annuler')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  requestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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