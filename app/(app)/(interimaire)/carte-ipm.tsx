import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  Animated,
  Dimensions,
  RefreshControl
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { getInterimProfile, getIPMCardData, getIpmRecapByMonth } from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createShadow } from '../../../utils/shadow-utils';

const { width } = Dimensions.get('window');

interface CardUsageEvent {
  id: string;
  type: 'access' | 'validation' | 'modification' | 'lock' | 'unlock' | 'prise_en_charge' | 'feuille_soins' | 'ayant_droit_ajout' | 'carte_activation';
  description: string;
  timestamp: string;
  location?: string;
  ip_address?: string;
  montant?: string;
  beneficiaire?: string;
  statut?: string;
}

export default function CarteIPMScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [ipmData, setIpmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDataVisible, setIsDataVisible] = useState(false);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [contractExpiringSoon, setContractExpiringSoon] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [cardEvents, setCardEvents] = useState<CardUsageEvent[]>([]);
  const [showAyantsDroit, setShowAyantsDroit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    loadProfile();
    const loadData = async () => {
      const ipmDataResponse = await loadIPMData();
      await loadCardEvents(ipmDataResponse);
    };
    loadData();
    loadCardLockState();
    
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fonction de rechargement complète des données
  const reloadAllData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      console.log('=== RELOADING ALL DATA ===');
      
      // Charger les données IPM d'abord
      const ipmDataResponse = await loadIPMData();
      
      // Puis charger les événements avec les données IPM fraîches
      await loadCardEvents(ipmDataResponse);
      
    } catch (error) {
      console.error('Erreur lors du rechargement des données:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fonction pour pull-to-refresh
  const onRefresh = useCallback(async () => {
    console.log('=== PULL TO REFRESH ===');
    setRefreshing(true);
    try {
      await reloadAllData(false); // Ne pas montrer le loader principal
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Recharger les données à chaque fois que l'utilisateur revient sur la page
  useFocusEffect(
    useCallback(() => {
      console.log('=== CARTE IPM FOCUSED - RECHARGING DATA ===');
      reloadAllData();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const response = await getInterimProfile();
      if (response.success) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations de la carte');
    } finally {
      setLoading(false);
    }
  };

  const loadIPMData = async () => {
    try {
      console.log('=== LOADING IPM DATA START ===');
      setIpmData(null); // Vider les anciennes données
      
      console.log('=== CALLING getIPMCardData() ===');
      const response = await getIPMCardData();
      console.log('=== getIPMCardData() RESPONSE RECEIVED ===');
      console.log('=== DEBUG IPM CARD DATA RESPONSE ===');
      console.log('Response keys:', response ? Object.keys(response) : 'null response');
      console.log('Full response:', JSON.stringify(response, null, 2));
      
      if (response) {
        setIpmData(response);
        console.log('=== IPM DATA SET ===', {
          hasProfile: !!response.profile,
          profileKeys: response.profile ? Object.keys(response.profile) : null,
          hasContract: !!response.contract
        });
        
        // Logging détaillé des relations
        if (response.profile) {
          const profile = response.profile;
          console.log('=== RELATIONS DETAILED LOG ===');
          console.log('Profile has consultations?', 'consultations' in profile, Array.isArray(profile.consultations) ? profile.consultations.length : 'not array');
          console.log('Profile has ordonnances?', 'ordonnances' in profile, Array.isArray(profile.ordonnances) ? profile.ordonnances.length : 'not array');
          console.log('Profile has prisesEnCharge?', 'prisesEnCharge' in profile, Array.isArray(profile.prisesEnCharge) ? profile.prisesEnCharge.length : 'not array');
          console.log('Profile has prises_en_charge?', 'prises_en_charge' in profile, Array.isArray(profile.prises_en_charge) ? profile.prises_en_charge.length : 'not array');
          console.log('Profile has feuillesDeSoins?', 'feuillesDeSoins' in profile, Array.isArray(profile.feuillesDeSoins) ? profile.feuillesDeSoins.length : 'not array');
          console.log('Profile has feuilles_de_soins?', 'feuilles_de_soins' in profile, Array.isArray(profile.feuilles_de_soins) ? profile.feuilles_de_soins.length : 'not array');
          console.log('Profile has examens?', 'examens' in profile, Array.isArray(profile.examens) ? profile.examens.length : 'not array');
          console.log('Profile has derogations?', 'derogations' in profile, Array.isArray(profile.derogations) ? profile.derogations.length : 'not array');
          
          // Log all array properties
          Object.keys(profile).forEach(key => {
            if (Array.isArray(profile[key])) {
              console.log(`Array found: ${key} with ${profile[key].length} items`);
              if (profile[key].length > 0) {
                console.log(`First item structure:`, Object.keys(profile[key][0]));
              }
            }
          });
        }
        
        // Vérifier si le contrat expire dans moins de 3 mois
        if (response.contract_end_date) {
          const endDate = new Date(response.contract_end_date);
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
          
          setContractExpiringSoon(endDate < threeMonthsFromNow);
        }
        
        return response; // Retourner les données pour reloadAllData
      }
    } catch (error) {
      console.error('=== ERREUR LORS DU CHARGEMENT DES DONNÉES IPM ===');
      console.error('Error details:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      setIpmData(null);
      return null;
    }
  };

  const loadCardEvents = async (freshIpmData = null) => {
    try {
      console.log('=== LOADING CARD EVENTS START ===');
      console.log('Current ipmData state:', !!ipmData, ipmData ? 'has data' : 'no data');
      console.log('Fresh IPM data passed:', !!freshIpmData, freshIpmData ? 'has fresh data' : 'no fresh data');
      
      // Utiliser les données fraîches si disponibles, sinon l'état
      const dataToUse = freshIpmData || ipmData;
      // Vider les événements existants et indiquer le chargement
      setCardEvents([]);
      setLoadingEvents(true);
      
      // Set pour éviter les doublons
      const eventIds = new Set<string>();
      const events: CardUsageEvent[] = [];
      
      const addEventIfUnique = (event: CardUsageEvent) => {
        if (!eventIds.has(event.id)) {
          eventIds.add(event.id);
          events.push(event);
        }
      };
      
      // Si nous avons les données IPM chargées avec les relations
      if (dataToUse) {
        console.log('=== DEBUG IPM DATA WITH RELATIONS ===');
        console.log('dataToUse structure:', Object.keys(dataToUse));
        console.log('profile structure:', (dataToUse as any).profile ? Object.keys((dataToUse as any).profile) : 'no profile');
        console.log('Full dataToUse:', JSON.stringify(dataToUse, null, 2));
        
        // Ajouter les événements depuis les consultations
        if ((dataToUse as any)?.profile?.consultations) {
          console.log('Processing consultations:', (dataToUse as any).profile.consultations.length);
          (dataToUse as any).profile.consultations.forEach((consultation: any) => {
            addEventIfUnique({
              id: `consultation_detail_${consultation.id}`,
              type: 'prise_en_charge',
              description: `Consultation médicale - ${consultation.libelle || 'Consultation'}`,
              timestamp: consultation.updated_at || consultation.created_at,
              montant: consultation.montant ? `${consultation.montant} FCFA` : undefined,
              statut: consultation.nature === 1 ? 'Remboursable' : consultation.nature === 0 ? 'Non remboursable' : 'Inconnue'
            });
          });
        }

        // Ajouter les événements depuis les ordonnances
        if ((dataToUse as any)?.profile?.ordonnances) {
          console.log('Processing ordonnances:', (dataToUse as any).profile.ordonnances.length);
          (dataToUse as any).profile.ordonnances.forEach((ordonnance: any) => {
            addEventIfUnique({
              id: `ordonnance_detail_${ordonnance.id}`,
              type: 'feuille_soins',
              description: `Ordonnance médicale - ${ordonnance.numero_ordonnance || 'Ordonnance'}`,
              timestamp: ordonnance.updated_at || ordonnance.created_at,
              montant: ordonnance.montant_total ? `${ordonnance.montant_total} FCFA` : undefined,
              statut: ordonnance.nature === 1 ? 'Remboursable' : ordonnance.nature === 0 ? 'Non remboursable' : 'Inconnue'
            });
          });
        }

        // Ajouter les événements depuis les examens
        if ((dataToUse as any)?.profile?.examens) {
          console.log('Processing examens:', (dataToUse as any).profile.examens.length);
          (dataToUse as any).profile.examens.forEach((examen: any) => {
            addEventIfUnique({
              id: `examen_detail_${examen.id}`,
              type: 'prise_en_charge',
              description: `Examen médical - ${examen.type_examen || 'Examen'}`,
              timestamp: examen.updated_at || examen.created_at,
              montant: examen.cout ? `${examen.cout} FCFA` : undefined,
              statut: examen.statut === 1 ? 'Validé' : examen.statut === 0 ? 'En attente' : 'Rejeté'
            });
          });
        }

        // Ajouter les événements depuis les dérogations
        if ((dataToUse as any)?.profile?.derogations) {
          console.log('Processing derogations:', (dataToUse as any).profile.derogations.length);
          (dataToUse as any).profile.derogations.forEach((derogation: any) => {
            addEventIfUnique({
              id: `derogation_detail_${derogation.id}`,
              type: 'validation',
              description: `Dérogation - ${derogation.motif || 'Demande de dérogation'}`,
              timestamp: derogation.updated_at || derogation.created_at,
              statut: derogation.statut === 1 ? 'Approuvée' : derogation.statut === 0 ? 'En attente' : 'Rejetée'
            });
          });
        }

        // Ajouter les événements depuis les prises en charge
        if ((dataToUse as any)?.profile?.prisesEnCharge || (dataToUse as any)?.profile?.prises_en_charge) {
          const prisesEnCharge = (dataToUse as any).profile.prisesEnCharge || (dataToUse as any).profile.prises_en_charge;
          console.log('Processing prises_en_charge:', prisesEnCharge.length);
          prisesEnCharge.forEach((prise: any) => {
            addEventIfUnique({
              id: `prise_charge_detail_${prise.id}`,
              type: 'prise_en_charge',
              description: `Prise en charge - ${prise.numero_prise_en_charge || 'Prise en charge'}`,
              timestamp: prise.updated_at || prise.created_at,
              montant: prise.montant_prise_en_charge ? `${prise.montant_prise_en_charge} FCFA` : undefined,
              statut: prise.statut === 1 ? 'Approuvée' : prise.statut === 0 ? 'En attente' : 'Rejetée'
            });
          });
        }

        // Ajouter les événements depuis les feuilles de soins
        if ((dataToUse as any)?.profile?.feuillesDeSoins || (dataToUse as any)?.profile?.feuilles_de_soins) {
          const feuillesDeSoins = (dataToUse as any).profile.feuillesDeSoins || (dataToUse as any).profile.feuilles_de_soins;
          console.log('Processing feuilles_de_soins:', feuillesDeSoins.length);
          feuillesDeSoins.forEach((feuille: any) => {
            addEventIfUnique({
              id: `feuille_soins_detail_${feuille.id}`,
              type: 'feuille_soins',
              description: `Feuille de soins - ${feuille.numero_feuille || 'Feuille de soins'}`,
              timestamp: feuille.updated_at || feuille.created_at,
              montant: feuille.montant_total ? `${feuille.montant_total} FCFA` : undefined,
              statut: feuille.statut === 1 ? 'Validée' : feuille.statut === 0 ? 'En attente' : 'Rejetée'
            });
          });
        }

        // Debug des relations disponibles
        const profile = (dataToUse as any).profile;
        if (profile) {
          const availableRelations = Object.keys(profile).filter(key => Array.isArray(profile[key]));
          console.log('Available relations on profile:', availableRelations);
          availableRelations.forEach(relationName => {
            console.log(`- ${relationName}: ${profile[relationName].length} items`);
          });
        }
      }
      
      // Récupérer aussi les données de récapitulatifs IPM
      try {
        const ipmRecapData = await getIpmRecapByMonth();
        console.log('=== DEBUG IPM RECAP DATA ===');
        console.log('ipmRecapData:', JSON.stringify(ipmRecapData, null, 2));
        
        if (ipmRecapData && ipmRecapData.recap_ipm) {
          // Traiter chaque récapitulatif mensuel
          ipmRecapData.recap_ipm.forEach((recap: any) => {
            const moisNom = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][recap.mois] || `Mois ${recap.mois}`;
            
            // Ajouter événement pour les consultations
            if (recap.consultations > 0) {
              addEventIfUnique({
                id: `consultation_recap_${recap.id}`,
                type: 'prise_en_charge',
                description: `Consultations médicales - ${moisNom} ${recap.annee}`,
                timestamp: recap.updated_at || recap.created_at,
                montant: `${recap.consultations} FCFA`,
                statut: 'Traité',
                beneficiaire: recap.name
              });
            }
            
            // Ajouter événement pour les médicaments
            if (recap.medicaments > 0) {
              addEventIfUnique({
                id: `medicaments_recap_${recap.id}`,
                type: 'feuille_soins',
                description: `Médicaments - ${moisNom} ${recap.annee}`,
                timestamp: recap.updated_at || recap.created_at,
                montant: `${recap.medicaments} FCFA`,
                statut: 'Ligne Ordonnance',
                beneficiaire: recap.name
              });
            }
            
            // Ajouter événement pour les retenues
            if (recap.retenu > 0) {
              addEventIfUnique({
                id: `retenue_recap_${recap.id}`,
                type: 'validation',
                description: `Retenue IPM (${ipmRecapData.taux_retenu || '30%'}) - ${moisNom} ${recap.annee}`,
                timestamp: recap.updated_at || recap.created_at,
                montant: `${recap.retenu} FCFA`,
                statut: 'Prélevée',
                // location: `Société ID: ${recap.societe_id}`,
                beneficiaire: recap.name
              });
            }
            
            // Ajouter événement pour les remboursements
            if (recap.remboursement > 0) {
              addEventIfUnique({
                id: `remboursement_recap_${recap.id}`,
                type: 'validation',
                description: `Remboursement IPM (${ipmRecapData.taux_remboursse || '70%'}) - ${moisNom} ${recap.annee}`,
                timestamp: recap.updated_at || recap.created_at,
                montant: `${recap.remboursement} FCFA`,
                statut: 'Remboursé',
                beneficiaire: recap.name
              });
            }
            
            // Ajouter récapitulatif mensuel complet
            const totalFrais = recap.consultations + recap.soins + recap.medicaments + recap.protheses + recap.examens;
            if (totalFrais > 0) {
              addEventIfUnique({
                id: `recap_complet_${recap.id}`,
                type: 'validation',
                description: `Récapitulatif complet - ${moisNom} ${recap.annee}`,
                timestamp: recap.updated_at || recap.created_at,
                montant: `Total frais: ${totalFrais} FCFA`,
                statut: 'Calculé',
                location: `Retenu: ${recap.retenu} - Remboursé: ${recap.remboursement}`,
                beneficiaire: recap.name
              });
            }
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données IPM recap:', error);
      }
      
      // Trier par date décroissante
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      console.log('=== EVENTS LOADED ===', events.length, 'events found');
      setCardEvents(events);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      // En cas d'échec, laisser l'historique vide
      setCardEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fonctions de persistance du verrouillage
  const loadCardLockState = async () => {
    try {
      const lockState = await AsyncStorage.getItem(`card_lock_${user?.id}`);
      if (lockState === 'true') {
        setIsCardLocked(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état de verrouillage:', error);
    }
  };

  const saveCardLockState = async (isLocked: boolean) => {
    try {
      await AsyncStorage.setItem(`card_lock_${user?.id}`, isLocked.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'état de verrouillage:', error);
    }
  };

  // Fonction utilitaire pour les liens familiaux
  const getLienLabel = (lienCode: string | number) => {
    const code = parseInt(lienCode.toString());
    switch (code) {
      case 1: return 'Enfant';
      case 2: return 'Conjoint';
      case 3: return 'Père';
      case 4: return 'Mère';
      case 5: return 'Autre';
      case 6: return 'Personne Ressource';
      default: return 'Non spécifié';
    }
  };

  const toggleDataVisibility = () => {
    if (isCardLocked) {
      Alert.alert(
        'Carte verrouillée',
        'Vous devez d\'abord déverrouiller la carte pour voir les données sensibles.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Cycle simple: masqué → données sensibles + ayants droits → masqué
    if (!isDataVisible && !showAyantsDroit) {
      // Premier clic : montrer données sensibles ET ayants-droit
      setIsDataVisible(true);
      setShowAyantsDroit(true);
    } else {
      // Deuxième clic : masquer tout
      setIsDataVisible(false);
      setShowAyantsDroit(false);
    }
    
  };

  const toggleCardLock = () => {
    if (isCardLocked) {
      // Déverrouiller
      setIsCardLocked(false);
      setIsDataVisible(false);
      saveCardLockState(false); // Sauvegarder l'état
      
      const newEvent: CardUsageEvent = {
        id: Date.now().toString(),
        type: 'unlock',
        description: 'Carte déverrouillée',
        timestamp: new Date().toISOString(),
        ip_address: '192.168.1.100'
      };
      setCardEvents(prev => [newEvent, ...prev]);
      
      Alert.alert('Carte déverrouillée', 'Votre carte IPM est maintenant accessible.');
    } else {
      // Verrouiller - demander confirmation
      setShowLockModal(true);
    }
  };

  const confirmCardLock = () => {
    setIsCardLocked(true);
    setIsDataVisible(false);
    setShowLockModal(false);
    saveCardLockState(true); // Sauvegarder l'état
    
    const newEvent: CardUsageEvent = {
      id: Date.now().toString(),
      type: 'lock',
      description: 'Carte verrouillée pour sécurité',
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.100'
    };
    setCardEvents(prev => [newEvent, ...prev]);
    
    Alert.alert('Carte verrouillée', 'Votre carte IPM est maintenant sécurisée.');
  };

  const maskSensitiveData = (data: string | number | undefined | null, visibleChars: number = 2): string => {
    if (!data) return 'N/A';
    const dataStr = String(data);
    if (dataStr.length <= visibleChars) return dataStr;
    const visible = dataStr.substring(0, visibleChars);
    const masked = '*'.repeat(dataStr.length - visibleChars);
    return visible + masked;
  };

  const formatEventTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);
    
    if (diffInHours < 1) {
      return 'Il y a quelques minutes';
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)} heure(s)`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'access': return 'eye';
      case 'validation': return 'checkmark-circle';
      case 'modification': return 'create';
      case 'lock': return 'lock-closed';
      case 'unlock': return 'lock-open';
      case 'prise_en_charge': return 'medical';
      case 'feuille_soins': return 'document-text';
      case 'ayant_droit_ajout': return 'person-add';
      case 'carte_activation': return 'card';
      default: return 'information-circle';
    }
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'access': return colors.primary;
      case 'validation': return '#10B981';
      case 'modification': return '#F59E0B';
      case 'lock': return '#EF4444';
      case 'unlock': return '#10B981';
      case 'prise_en_charge': return '#0EA5E9';
      case 'feuille_soins': return '#8B5CF6';
      case 'ayant_droit_ajout': return '#10B981';
      case 'carte_activation': return '#F59E0B';
      default: return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader title="Carte IPM" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement de votre carte IPM...
          </Text>
        </View>
      </View>
    );
  }

  const cardIsInactive = contractExpiringSoon || isCardLocked;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title={ "Carte IPM"} showBackButton />
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Carte IPM Principal - Style Original */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          <LinearGradient
            colors={cardIsInactive ? ['#9CA3AF', '#6B7280'] : ['#091e60', '#0f8e35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ipmCard}
          >
            {/* Pattern wavy en arrière-plan */}
            <View style={styles.wavyPattern}>
              {/* Lignes diagonales ondulées */}
              {Array.from({ length: 20 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.wavyStripe,
                    {
                      top: i * 15 - 50,
                      transform: [{ rotate: '45deg' }],
                      opacity: 0.1,
                    },
                  ]}
                />
              ))}
              {/* Cercles décoratifs */}
              {Array.from({ length: 8 }, (_, i) => (
                <View
                  key={`circle-${i}`}
                  style={[
                    styles.wavyCircle,
                    {
                      top: (i * 40) % 180,
                      left: (i * 60) % 300,
                      opacity: 0.05,
                    },
                  ]}
                />
              ))}
            </View>

            {contractExpiringSoon && (
              <View style={styles.expirationWarning}>
                <Ionicons name="warning" size={16} color="#FFF" />
                <Text style={styles.expirationText}>Contrat expire bientôt</Text>
              </View>
            )}

            {/* Header avec logo, nom et cadenas */}
            <View style={styles.cardHeaderRow}>
              <Image 
                source={require('../../../assets/images/logo-gbg-white.png')} 
                style={styles.ipmCardLogo}
                resizeMode="contain"
              />
              <Text style={styles.ipmUserName}>
                {user?.name || 'Nom Utilisateur'}
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.settingsButton}>
                <Ionicons 
                  name="settings-outline" 
                  size={18} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>


            {/* Contenu principal */}
            <View style={styles.ipmCardContent}>
              {/* Données sensibles à gauche */}
              <View style={styles.sensitiveDataContainer}>
                {/* Société utilisatrice (non masquée) */}
                {(ipmData as any)?.entreprise_utilisatrice?.designation && (
                  <View style={styles.dataRow}>
                    <Text style={styles.companyText}>
                      {(ipmData as any)?.entreprise_utilisatrice?.designation || 'N/A'}
                    </Text>
                  </View>
                )}
                
                {/* Matricule (masquable) */}
                {(ipmData as any)?.profile?.matricule && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Mat:</Text>
                    <Text style={styles.dataValue}>
                      {isDataVisible 
                        ? (ipmData as any)?.profile?.matricule
                        : maskSensitiveData((ipmData as any)?.profile?.matricule, 0)
                      }
                    </Text>
                  </View>
                )}
                

                {/* Catégorie (non masquée) */}
                {(ipmData as any)?.contract?.libelle_categorie && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Cat:</Text>
                    <Text style={styles.dataValue}>
                      {isDataVisible 
                        ? (ipmData as any)?.contract?.libelle_categorie
                        : maskSensitiveData((ipmData as any)?.contract?.libelle_categorie, 0)
                      }
                     
                    </Text>
                  </View>
                )}

                {/* Salaire de base (masquable) */}
                {(ipmData as any)?.contract?.sal_base && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Salaire de base: </Text>
                    <Text style={styles.dataValue}>
                      {isDataVisible 
                        ? `${(ipmData as any)?.contract?.sal_base} FCFA`
                        : maskSensitiveData(`${(ipmData as any)?.contract?.sal_base} FCFA`, 0)
                      }
                    </Text>
                  </View>
                )}

              </View>

              {/* Photo de profil à droite */}
              <View style={styles.photoContainer}>
                {user?.photo_profil ? (() => {
                  // Construire l'URL finale pour l'affichage
                  let finalImageUrl: string | undefined;
                  if (user?.photo_profil) {
                    finalImageUrl = user.photo_profil.startsWith('http')
                      ? user.photo_profil
                      : `http://192.168.1.11:8000/storage/${user.photo_profil}`;
                  }
                  
                  console.log('=== IMAGE DISPLAY ===');
                  console.log('user.photo_profil:', user?.photo_profil);
                  console.log('finalImageUrl:', finalImageUrl);
                  
                  return (
                    <Image
                      source={{ uri: finalImageUrl }}
                      style={styles.userPhoto}
                      resizeMode="cover"
                      onError={() => {
                        console.warn('Erreur de chargement de la photo de profil:', finalImageUrl);
                      }}
                    />
                  );
                })() : (
                  <View style={styles.defaultPhotoContainer}>
                    <Ionicons name="person" size={40} color="#0f8e35" />
                  </View>
                )}
              </View>
            </View>

            {/* Pied de carte */}
            <View style={styles.ipmCardFooter}>
              <View style={styles.ipmCardId}>
                <Text style={styles.ipmCardIdText}>
                  Expire: {(ipmData as any)?.contract_end_date
                    ? isDataVisible 
                      ? new Date((ipmData as any).contract_end_date).toLocaleDateString('fr-FR')
                      : maskSensitiveData(new Date((ipmData as any).contract_end_date).toLocaleDateString('fr-FR'), 2)
                    : 'Date non définie'
                  }
                </Text>
              </View>
              
              <View style={styles.cardActionsContainer}>
                <TouchableOpacity 
                  onPress={toggleDataVisibility}
                  style={styles.eyeButton}
                  disabled={isCardLocked}
                >
                  <Ionicons 
                    name={isDataVisible ? 'eye-off' : 'eye'} 
                    size={18} 
                    color={isCardLocked ? 'rgba(255,255,255,0.5)' : '#FFFFFF'} 
                  />
                </TouchableOpacity>
                
                <View style={styles.ipmCardStatus}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>
                    {(ipmData as any)?.contract_status || 'Inactif'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Overlay si carte verrouillée */}
            {isCardLocked && (
              <View style={styles.lockedOverlay}>
                <Ionicons name="lock-closed" size={40} color="rgba(255,255,255,0.8)" />
                <Text style={styles.lockedText}>Carte Verrouillée</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Section Ayants-droit */}
        {showAyantsDroit && (ipmData as any)?.ayants_droit && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
              Ayants-droit ({(ipmData as any).ayants_droit.length})
            </Text>
            
            {(ipmData as any).ayants_droit.length === 0 ? (
              <View style={styles.noEventsContainer}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.noEventsText, { color: colors.textSecondary }]}>
                  Aucun ayant-droit enregistré
                </Text>
              </View>
            ) : (
              (ipmData as any).ayants_droit.map((ayant: any, index: number) => (
                <View key={index} style={[styles.eventItem, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.eventHeader}>
                    <View style={[styles.eventIcon, { backgroundColor: (ayant.lien === 1 ? '#10B981' : ayant.lien === 2 ? '#EF4444' : '#8B5CF6') + '20' }]}>
                      <Ionicons 
                        name={ayant.lien === 1 ? 'person' : ayant.lien === 2 ? 'heart' : ayant.lien === 3 || ayant.lien === 4 ? 'people' : 'person-circle'} 
                        size={16} 
                        color={ayant.lien === 1 ? '#10B981' : ayant.lien === 2 ? '#EF4444' : '#8B5CF6'} 
                      />
                    </View>
                    <View style={styles.eventDetails}>
                      <Text style={[styles.eventDescription, { color: colors.textPrimary }]}>
                        {ayant.nom} {ayant.prenom}
                      </Text>
                      <Text style={[styles.eventTimestamp, { color: colors.textSecondary }]}>
                        {ayant.lien === 1 ? 'Enfant' : ayant.lien === 2 ? 'Conjoint' : ayant.lien === 3 ? 'Père' : ayant.lien === 4 ? 'Mère' : ayant.lien === 5 ? 'Autre' : 'Personne Ressource'}
                      </Text>
                      {ayant.naissance && (
                        <Text style={[styles.eventTimestamp, { color: colors.textSecondary }]}>
                          Né(e) le {new Date(ayant.naissance).toLocaleDateString('fr-FR')}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Section Paramètres de la carte */}
        {showSettings && (
          <View style={[styles.settingsSection, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.settingsHeader}>
              <Ionicons name="settings" size={20} color={colors.primary} />
              <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                Paramètres de la carte
              </Text>
            </View>
            
            <View style={styles.settingsContent}>
              <TouchableOpacity 
                style={[styles.settingsOption, { borderBottomColor: colors.border }]}
                onPress={toggleCardLock}
              >
                <View style={styles.settingsOptionLeft}>
                  <Ionicons 
                    name={isCardLocked ? 'lock-closed' : 'lock-open'} 
                    size={20} 
                    color={isCardLocked ? colors.error : colors.success} 
                  />
                  <Text style={[styles.settingsOptionText, { color: colors.textPrimary }]}>
                    {isCardLocked ? 'Déverrouiller la carte' : 'Verrouiller la carte'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.settingsOption, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setIsDataVisible(false);
                  setShowAyantsDroit(false);
                  Alert.alert('Données masquées', 'Les données sensibles ont été masquées.');
                }}
              >
                <View style={styles.settingsOptionLeft}>
                  <Ionicons name="eye-off" size={20} color={colors.textSecondary} />
                  <Text style={[styles.settingsOptionText, { color: colors.textPrimary }]}>
                    Masquer les données sensibles
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Historique des événements */}
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
            Historique d'utilisation
          </Text>
          
          {loadingEvents ? (
            <View style={styles.noEventsContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.noEventsText, { color: colors.textSecondary }]}>
                Chargement de l'historique...
              </Text>
            </View>
          ) : cardEvents.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.noEventsText, { color: colors.textSecondary }]}>
                Aucun événement récent
              </Text>
            </View>
          ) : (
            cardEvents.map((event) => (
              <View 
                key={event.id} 
                style={[styles.eventItem, { backgroundColor: colors.cardBackground }]}
              >
                <View style={styles.eventHeader}>
                  <View style={[styles.eventIcon, { backgroundColor: getEventColor(event.type) + '20' }]}>
                    <Ionicons 
                      name={getEventIcon(event.type) as any} 
                      size={16} 
                      color={getEventColor(event.type)} 
                    />
                  </View>
                  <View style={styles.eventDetails}>
                    <Text style={[styles.eventDescription, { color: colors.textPrimary }]}>
                      {event.description}
                    </Text>
                    <Text style={[styles.eventTimestamp, { color: colors.textSecondary }]}>
                      {formatEventTimestamp(event.timestamp)}
                    </Text>
                    {event.statut && (
                      <View style={styles.eventStatusContainer}>
                        <View style={[styles.eventStatusBadge, { 
                          backgroundColor: event.statut === 'Non remboursable' 
                            ? '#EF4444' // Rouge pour non remboursable
                            : event.statut === 'Approuvée' || event.statut === 'Validée' || event.statut === 'Active' || event.statut === 'Remboursé'
                              ? '#10B981' // Vert pour approuvé/validé/actif/remboursable
                              : event.statut === 'Remboursable'
                              ? '#0f8e35' // Vert pour remboursable
                              : event.statut === 'En attente' 
                                ? '#F59E0B' // Orange pour en attente
                                : colors.textSecondary // Couleur par défaut
                        }]}>
                          <Text style={styles.eventStatusText}>{event.statut}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
                {/* {event.beneficiaire && (
                  <Text style={[styles.eventBeneficiaire, { color: colors.textSecondary }]}>
                    👥 {event.beneficiaire}
                  </Text>
                )} */}
                {event.montant && (
                  <Text style={[styles.eventMontant, { color: colors.primary }]}>
                    {event.montant}
                  </Text>
                )}
                {event.location && (
                  <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>
                    {event.location}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de confirmation de verrouillage */}
      <Modal
        visible={showLockModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalIcon}>
              <Ionicons name="lock-closed" size={48} color={colors.error} />
            </View>
            
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Verrouiller la carte ?
            </Text>
            
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Une fois verrouillée, vous ne pourrez plus consulter les données sensibles 
              de votre carte IPM jusqu'au déverrouillage.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowLockModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.error }]}
                onPress={confirmCardLock}
              >
                <Text style={styles.confirmButtonText}>
                  Verrouiller
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },

  // Styles de la carte IPM - Style Original
  ipmCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    ...createShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ipmCardLogo: {
    width: 75,
    height: 40,
    tintColor: '#FFFFFF',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Styles pour la section paramètres
  settingsSection: {
    marginHorizontal: 2,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  settingsContent: {
    borderRadius: 12,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingsOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },

  // Styles pour le pattern wavy
  wavyPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  wavyStripe: {
    position: 'absolute',
    width: 400,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    left: -100,
  },
  wavyCircle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  expirationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  expirationText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  ipmCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: 16,
  },
  photoContainer: {
    marginLeft: 16,
  },
  sensitiveDataContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  ipmUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  qrCodeContainer: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  userPhoto: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  defaultPhotoContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  companyText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  dataLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
    minWidth: 35,
  },
  dataValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  infoValue: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ipmCardInfo: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  ipmCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 10,
  },
  ipmCardId: {
    flex: 1,
  },
  ipmCardIdText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.8,
  },
  cardActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ipmCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },

  // Styles de l'historique
  historySection: {
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  eventItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...createShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventDescription: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTimestamp: {
    fontSize: 12,
  },
  eventLocation: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  eventIP: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },

  // Styles pour la section ayants-droit
  ayantsDroitSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...createShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  ayantCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...createShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    }),
  },
  ayantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ayantIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ayantInfo: {
    flex: 1,
  },
  ayantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  ayantLienText: {
    fontSize: 14,
    opacity: 0.8,
  },

  // Styles pour l'historique IPM
  eventStatusContainer: {
    marginTop: 4,
  },
  eventStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eventStatusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  eventBeneficiaire: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  eventMontant: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },

  // Styles du modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...createShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    }),
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});