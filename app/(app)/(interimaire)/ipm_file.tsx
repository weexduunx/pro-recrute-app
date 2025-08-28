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
  FlatList,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
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
  getPdf, // Utiliser la même fonction getPdf pour télécharger
} from '../../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

// Interface pour un échéancier parent (Echelonnement)
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

// Interface pour un détail d'échéancier (EchelonnemenDetails)
interface LoanDetail {
  id: number;
  echelonnement_id: number;
  montant: number;
  mois: string;
}

//  Interfaces pour les données IPM
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
  statut: number; // 0=en attente, 1=accordée, 2=refusée
  statut_label: string; // Via accesseur
  famille?: { prenom: string; nom: string; lien: string }; // Relation
}

interface FeuilleDeSoinsRequest {
  id: number;
  type: string;
  created_at: string;
  user_id: number;
  encrypted_id: number;
  famille_id?: number;
  statut: number; // 0=en attente, 1=validée, 2=remboursée
  statut_label: string; // Via accesseur
  famille?: { prenom: string; nom: string; lien: string }; // Relation
}


export default function IpmFileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { width } = Dimensions.get('window');

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [errorLoans, setErrorLoans] = useState<string | null>(null);

  // NOUVEAU : États pour les demandes IPM
  const [familleMembers, setFamilleMembers] = useState<FamilleMember[]>([]);
  const [loadingFamilleMembers, setLoadingFamilleMembers] = useState(true);
  const [errorFamilleMembers, setErrorFamilleMembers] = useState<string | null>(null);

  const [prisesEnChargeHistory, setPrisesEnChargeHistory] = useState<PriseEnChargeRequest[]>([]);
  const [loadingPrisesEnCharge, setLoadingPrisesEnCharge] = useState(true);
  const [errorPrisesEnCharge, setErrorPrisesEnCharge] = useState<string | null>(null);

  const [feuillesDeSoinsHistory, setFeuillesDeSoinsHistory] = useState<FeuilleDeSoinsRequest[]>([]);
  const [loadingFeuillesDeSoins, setLoadingFeuillesDeSoins] = useState(true);
  const [errorFeuillesDeSoins, setErrorFeuillesDeSoins] = useState<string | null>(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'prise_en_charge' | 'feuille_de_soins' | null>(null);

  // États pour le formulaire de prise en charge
  const [pecObjet, setPecObjet] = useState('');
  const [pecDate, setPecDate] = useState(new Date().toISOString().split('T')[0]);
  const [pecFamilleId, setPecFamilleId] = useState<number | undefined>(undefined);
  const [pecMedcinId, setPecMedcinId] = useState<number | undefined>(undefined);
  const [pecStructureId, setPecStructureId] = useState<number | undefined>(undefined);
  const [submittingPec, setSubmittingPec] = useState(false);

  // États pour le formulaire de feuille de soins
  const [fdsType, setFdsType] = useState('');
  const [fdsDateSoins, setFdsDateSoins] = useState(new Date().toISOString().split('T')[0]);
  const [fdsMontantTotal, setFdsMontantTotal] = useState('');
  const [fdsFamilleId, setFdsFamilleId] = useState<number | undefined>(undefined);
  const [submittingFds, setSubmittingFds] = useState(false);



  // --- Callbacks de chargement ---
  const loadLoans = useCallback(async () => {
    if (!user) { setLoadingLoans(false); return; }
    setLoadingLoans(true); setErrorLoans(null);
    try {
      const fetchedLoans = await getInterimLoans();
      setLoans(fetchedLoans);
    } catch (err: any) {
      console.error("Erreur de chargement des prêts:", err);
      setErrorLoans(err.response?.data?.message || t("Impossible de charger les détails des prêts."));
    } finally { setLoadingLoans(false); }
  }, [user, t]);

  const loadFamilleMembers = useCallback(async () => {
    if (!user) { 
      setFamilleMembers([]);
      setLoadingFamilleMembers(false); 
      return; 
    }
    setLoadingFamilleMembers(true); 
    setErrorFamilleMembers(null);
    try {
      const members = await getFamilleMembers();
      setFamilleMembers(Array.isArray(members) ? members : []);
    } catch (err: any) {
      console.error("Erreur de chargement des membres de la famille:", err);
      setFamilleMembers([]);
      setErrorFamilleMembers(err.response?.data?.message || t("Impossible de charger les membres de la famille."));
    } finally { 
      setLoadingFamilleMembers(false); 
    }
  }, [user, t]);

  const loadPrisesEnChargeHistory = useCallback(async () => {
    if (!user) { setLoadingPrisesEnCharge(false); return; }
    setLoadingPrisesEnCharge(true); setErrorPrisesEnCharge(null);
    try {
      const history = await getPrisesEnChargeHistory();
      setPrisesEnChargeHistory(history);
    } catch (err: any) {
      console.error("Erreur de chargement de l'historique des prises en charge:", err);
      setErrorPrisesEnCharge(err.response?.data?.message || t("Impossible de charger l'historique des prises en charge."));
    } finally { setLoadingPrisesEnCharge(false); }
  }, [user, t]);

  const loadFeuillesDeSoinsHistory = useCallback(async () => {
    if (!user) { setLoadingFeuillesDeSoins(false); return; }
    setLoadingFeuillesDeSoins(true); setErrorFeuillesDeSoins(null);
    try {
      const history = await getFeuillesDeSoinsHistory();
      setFeuillesDeSoinsHistory(history);
    } catch (err: any) {
      console.error("Erreur de chargement de l'historique des feuilles de soins:", err);
      setErrorFeuillesDeSoins(err.response?.data?.message || t("Impossible de charger l'historique des feuilles de soins."));
    } finally { setLoadingFeuillesDeSoins(false); }
  }, [user, t]);


  // --- useEffects ---
  useEffect(() => {
    loadLoans();
    loadFamilleMembers();
    loadPrisesEnChargeHistory();
    loadFeuillesDeSoinsHistory();
  }, [loadLoans, loadFamilleMembers, loadPrisesEnChargeHistory, loadFeuillesDeSoinsHistory]);

  // --- Gestion des formulaires de demande ---
  const openRequestModal = (type: 'prise_en_charge' | 'feuille_de_soins') => {
    setRequestType(type);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestType(null);
    // Réinitialiser les champs du formulaire
    setPecObjet(''); setPecDate(new Date().toISOString().split('T')[0]); setPecFamilleId(undefined);
    setFdsType(''); setFdsDateSoins(new Date().toISOString().split('T')[0]); setFdsMontantTotal(''); setFdsFamilleId(undefined);
  };

  const handleSubmitPriseEnCharge = async () => {
    setSubmittingPec(true);
    try {
      await requestPriseEnCharge({
        objet: pecObjet,
        date: pecDate,
        famille_id: pecFamilleId,
        medcin_id: pecMedcinId, // Assurez-vous que ces IDs sont gérés si besoin
        structure_id: pecStructureId, // Assurez-vous que ces IDs sont gérés si besoin
      });
      Alert.alert(t('Succès'), t('Demande de prise en charge soumise !'));
      closeRequestModal();
      loadPrisesEnChargeHistory(); // Recharger l'historique
    } catch (err: any) {
      console.error("Erreur soumission PEC:", err.response?.data || err.message);
      Alert.alert(t('Erreur'), err.response?.data?.message || t('Échec de la soumission de la demande.'));
    } finally {
      setSubmittingPec(false);
    }
  };

  const handleSubmitFeuilleDeSoins = async () => {
    setSubmittingFds(true);
    try {
      await requestFeuilleDeSoins({
        type: fdsType,
        date_soins: fdsDateSoins,
        montant_total: parseFloat(fdsMontantTotal),
        famille_id: fdsFamilleId,
      });
      Alert.alert(t('Succès'), t('Demande de feuille de soins soumise !'));
      closeRequestModal();
      loadFeuillesDeSoinsHistory(); // Recharger l'historique
    } catch (err: any) {
      console.error("Erreur soumission FDS:", err.response?.data || err.message);
      Alert.alert(t('Erreur'), err.response?.data?.message || t('Échec de la soumission de la demande.'));
    } finally {
      setSubmittingFds(false);
    }
  };

  const handleDownloadPdf = async (encryptedId: string, type: 'prise_en_charge' | 'feuille_de_soins') => {
    try {
      // Le PDF est généré par le backend, la fonction getPdf va le télécharger et l'ouvrir
      await getPdf(encryptedId, type); // getPdf doit être adapté pour prendre le type et l'ID encrypté
      Alert.alert(t("Succès"), t("Document téléchargé avec succès !"));
    } catch (err: any) {
      console.error(`Erreur lors du téléchargement du PDF de ${type}:`, err);
      Alert.alert(t("Erreur"), err.response?.data?.message || t("Impossible de télécharger le document."));
    }
  };

  // --- Fonctions de rendu ---
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };


  // Fonction pour convertir le mois integer en nom du mois
  const getMonthName = (monthNumber: number): string => {
    const months = [
      '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[monthNumber] || `Mois ${monthNumber}`;
  };

  // Fonction pour obtenir le nom du lien familial
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

  const renderLoanItem = ({ item }: { item: Loan }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Ionicons name="wallet-outline" size={24} color={colors.secondary} style={styles.itemIcon} />
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.error }]}>{t('Retenu')} : {item.montant_retenu ?? t('Non spécifié')} FCFA</Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Mois du prêt:")} {item.mois_pret ? getMonthName(item.mois_pret) : t("N/A")}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Durée échéance:")} {item.duree_echelonnement ?
            `${Math.floor(item.duree_echelonnement / 30)} ${Math.floor(item.duree_echelonnement / 30) > 1 ? 'mois' : 'mois'}`
            : t("N/A")}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Début échéance:")} {item.date_debut ? new Date(item.date_debut).toLocaleDateString() : t("N/A")}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Fin échéance:")} {item.date_fin ? new Date(item.date_fin).toLocaleDateString() : t("N/A")}
        </Text>
        {item.valider_par_name && (
          <Text style={[styles.itemSubtitle, { color: colors.success }]}>
            {t("Validé par:")} {item.valider_par_name}
          </Text>
        )}
        <Text style={[styles.itemSubtitle, { color: item.statut === 1 ? colors.success : colors.warning }]}>
          {t("Statut:")} {item.statut === 1 ? t("Validé") : t("En attente")}
        </Text>
        {item.details && item.details.length > 0 && (
          <View style={[styles.detailsList, { borderTopColor: colors.border }]}>
            <Text style={[styles.detailsListTitle, { color: colors.textPrimary }]}>{t('Détails des mensualités :')}</Text>
            {item.details.map(detail => (
              <Text key={detail.id} style={[styles.detailsListItem, { color: colors.textSecondary }]}>
                - {detail.mois}: {detail.montant} FCFA
              </Text>
            ))}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
    </View>
  );

  const renderPriseEnChargeItem = ({ item }: { item: PriseEnChargeRequest }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Ionicons name="medkit-outline" size={24} color={colors.secondary} style={styles.itemIcon} />
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.objet}</Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Date:")} {new Date(item.date).toLocaleDateString()}
        </Text>
        {item.famille ? (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
            {t("Bénéficiaire:")} {item.famille.prenom} {item.famille.nom} ({getLienLabel(item.famille.lien)})
          </Text>
        ) : (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{t("Bénéficiaire:")} {t("Vous-même")}</Text>
        )}
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Statut:")} <Text style={{ color: item.statut === 1 ? colors.success : item.statut === 2 ? colors.error : colors.warning }}>{item.statut_label}</Text>
        </Text>
      </View>
      {item.statut === 1 && ( // Bouton de téléchargement si accordée
        <TouchableOpacity onPress={() => handleDownloadPdf(item.id?.toString() || '', 'prise_en_charge')}>
          <Ionicons name="download-outline" size={24} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFeuilleDeSoinsItem = ({ item }: { item: FeuilleDeSoinsRequest }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Ionicons name="receipt-outline" size={24} color={colors.secondary} style={styles.itemIcon} />
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.type}</Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Feuille générée le:")} {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {/* <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Montant:")} {item.montant_total} FCFA
        </Text> */}
        {item.famille ? (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
            {t("Bénéficiaire:")} {item.famille.prenom} {item.famille.nom} ({getLienLabel(item.famille.lien)})
          </Text>
        ) : (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{t("Bénéficiaire:")} {t("Vous-même")}</Text>
        )}
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Statut:")} <Text style={{ color: item.statut === 1 ? colors.success : item.statut === 2 ? colors.error : colors.warning }}>{item.statut_label}</Text>
        </Text>
      </View>
      {item.statut === 1 && ( // Bouton de téléchargement si validée
        <TouchableOpacity onPress={() => handleDownloadPdf(item.encrypted_id?.toString() || '', 'feuille_de_soins')}>
          <Ionicons name="download-outline" size={24} color={colors.secondary} />
        </TouchableOpacity>

      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader title={t("Prestations IPM")} user={user} showBackButton={true} onAvatarPress={handleAvatarPress} showNotificationIcon={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Bouton Retour & Section Demandes */}
         {user?.is_contract_active !== false && (
            <View style={styles.header}>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: colors.primary }]}>
                  Feuille de Soins
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Demandez et téléchargez vos feuilles de soins
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: colors.secondary }]}
                onPress={() => openRequestModal('feuille_de_soins')}
              >
                <Ionicons name="add" size={20} color={colors.textTertiary} />
                <Text style={[styles.generateButtonText, { color: colors.textTertiary }]}>
                  Demandez
                </Text>
              </TouchableOpacity>
            </View>
          )}
        {/* Section Mes Prêts et Échéanciers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Mes Échéanciers')}</Text>
          </View>

          {loadingLoans ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement des prêts...')}</Text>
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
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>
                {t('Aucun prêt trouvé')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>
                {t('Aucun détail de prêt disponible pour le moment.')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={loans || []}
              renderItem={renderLoanItem}
              keyExtractor={item => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>

        {/* Section Historique Prises en Charge */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Historique Prises en Charge')}</Text>
          </View>

          {loadingPrisesEnCharge ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement historique...')}</Text>
            </View>
          ) : errorPrisesEnCharge ? (

            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{errorPrisesEnCharge}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={loadPrisesEnChargeHistory}
              >
                <Text style={styles.retryButtonText}>{t('Réessayer')}</Text>
              </TouchableOpacity>
            </View>
          ) : prisesEnChargeHistory.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground, position: 'relative', overflow: 'hidden' }]}>
              <Ionicons name="document-text-outline" size={120}
                color={colors.textSecondary + '22'}
                style={{
                  position: 'absolute',
                  top: '20%',
                  left: '50%',
                  transform: [{ translateX: -60 }],
                  zIndex: 0,
                }} />
              <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} style={{ zIndex: 1 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>
                {t('Aucune prise en charge')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>
                {t('Vos prises en charge apparaîtront ici.')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={prisesEnChargeHistory || []}
              renderItem={renderPriseEnChargeItem}
              keyExtractor={item => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>

        {/* Section Historique Feuilles de Soins */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Historique Feuilles de Soins')}</Text>
          </View>

          {loadingFeuillesDeSoins ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement historique...')}</Text>
            </View>
          ) : errorFeuillesDeSoins ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{errorFeuillesDeSoins}</Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadFeuillesDeSoinsHistory}>
                <Text style={styles.retryButtonText}>{t('Réessayer')}</Text>
              </TouchableOpacity>
            </View>
          ) : feuillesDeSoinsHistory.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground, position: 'relative', overflow: 'hidden' }]}>
              <Ionicons name="receipt-outline" size={120}
                color={colors.textSecondary + '22'}
                style={{
                  position: 'absolute',
                  top: '20%',
                  left: '50%',
                  transform: [{ translateX: -60 }],
                  zIndex: 0,
                }} />
              <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} style={{ zIndex: 1 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>
                {t('Aucune feuille de soins')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>
                {t('Vos feuilles de soins apparaîtront ici.')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={feuillesDeSoinsHistory || []}
              renderItem={renderFeuilleDeSoinsItem}
              keyExtractor={item => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal de demande de prise en charge / feuille de soins */}
      <Modal visible={showRequestModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View style={{ 
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
            paddingBottom: 20
          }}>
            {/* Header - Style identique à la modale de stockage */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6'
            }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#091e60' }}>
                {requestType === 'prise_en_charge' ? t('Demande de Prise en Charge') : t('Demande de Feuille de Soins')}
              </Text>
              <TouchableOpacity onPress={closeRequestModal} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content - Style identique à la modale de stockage */}
            <View style={{ padding: 20 }}>
              {/* Section Bénéficiaire */}
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#091e60', marginBottom: 12 }}>
                {t('Bénéficiaire')}
              </Text>
              
              {loadingFamilleMembers ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
                  <ActivityIndicator size="small" color={colors.secondary} />
                  <Text style={{ color: colors.textSecondary, marginLeft: 10 }}>
                    {t('Chargement...')}
                  </Text>
                </View>
              ) : (
                <View style={{ 
                  borderWidth: 1, 
                  borderColor: '#E5E7EB', 
                  borderRadius: 8, 
                  marginBottom: 20,
                  backgroundColor: '#F9FAFB' 
                }}>
                  <Picker
                    selectedValue={requestType === 'prise_en_charge' ? pecFamilleId : fdsFamilleId}
                    onValueChange={(itemValue: number | undefined) => {
                      if (requestType === 'prise_en_charge') setPecFamilleId(itemValue);
                      else setFdsFamilleId(itemValue);
                    }}
                    style={{ height: 50, paddingHorizontal: 12, color: '#091e60' }}
                  >
                    <Picker.Item label={t("Vous-même")} value={undefined} />
                    {Array.isArray(familleMembers) && familleMembers.map(member => (
                      <Picker.Item key={member.id} label={`${member.prenom} ${member.nom} (${getLienLabel(member.lien)})`} value={member.id} />
                    ))}
                  </Picker>
                </View>
              )}

              {/* Section Détails */}
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#091e60', marginTop: 10, marginBottom: 12 }}>
                {requestType === 'prise_en_charge' ? t('Détails de la prise en charge') : t('Détails de la feuille de soins')}
              </Text>

              {requestType === 'prise_en_charge' ? (
                <>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                    {t('Objet de la demande')}
                  </Text>
                  <TextInput
                    style={{ 
                      borderWidth: 1, 
                      borderColor: '#E5E7EB', 
                      borderRadius: 8, 
                      padding: 12, 
                      fontSize: 16, 
                      marginBottom: 16,
                      backgroundColor: '#F9FAFB',
                      color: '#091e60'
                    }}
                    placeholder={t("Ex: Consultation générale, Médicaments")}
                    placeholderTextColor={colors.textSecondary}
                    value={pecObjet}
                    onChangeText={setPecObjet}
                  />

                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                    {t('Date de la demande')}
                  </Text>
                  <TextInput
                    style={{ 
                      borderWidth: 1, 
                      borderColor: '#E5E7EB', 
                      borderRadius: 8, 
                      padding: 12, 
                      fontSize: 16, 
                      marginBottom: 16,
                      backgroundColor: '#F9FAFB',
                      color: '#091e60'
                    }}
                    placeholder={t("AAAA-MM-JJ")}
                    placeholderTextColor={colors.textSecondary}
                    value={pecDate}
                    onChangeText={setPecDate}
                  />
                </>
              ) : (
                <>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                    {t('Type de soins')}
                  </Text>
                  <TextInput
                    style={{ 
                      borderWidth: 1, 
                      borderColor: '#E5E7EB', 
                      borderRadius: 8, 
                      padding: 12, 
                      fontSize: 16, 
                      marginBottom: 16,
                      backgroundColor: '#F9FAFB',
                      color: '#091e60'
                    }}
                    placeholder={t("Ex: Consultation, Médicaments, Examen")}
                    placeholderTextColor={colors.textSecondary}
                    value={fdsType}
                    onChangeText={setFdsType}
                  />
                </>
              )}

              {/* Boutons d'action - Style identique à la modale de stockage */}
              <TouchableOpacity
                style={{ 
                  backgroundColor: requestType === 'prise_en_charge' ? '#091e60' : colors.secondary, 
                  padding: 12, 
                  borderRadius: 8, 
                  alignItems: 'center', 
                  marginTop: 20 
                }}
                onPress={requestType === 'prise_en_charge' ? handleSubmitPriseEnCharge : handleSubmitFeuilleDeSoins}
                disabled={requestType === 'prise_en_charge' ? submittingPec : submittingFds}
              >
                {(requestType === 'prise_en_charge' ? submittingPec : submittingFds) ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                    {t('Soumettre la demande')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ 
                  backgroundColor: '#E5E7EB', 
                  padding: 12, 
                  borderRadius: 8, 
                  alignItems: 'center', 
                  marginTop: 12 
                }}
                onPress={closeRequestModal}
              >
                <Text style={{ color: '#6B7280', fontWeight: 'bold' }}>
                  {t('Annuler')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  sectionDemande: {
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 200,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexShrink: 0,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  // Styles pour les boutons de demande
  requestButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    gap: 10,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor:  '#091e60' ,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  // NOUVEAU : Styles pour le modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.3,
  },
  inputGroup: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    minHeight: 54,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerContainer: {
    borderWidth: 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    height: 54,
    paddingHorizontal: 18,
  },
  modalButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalCancelButton: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Styles pour la compatibilité avec le reste du composant
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
  },
});
