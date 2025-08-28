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
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import CustomHeader from '../../../components/CustomHeader';
import { getInterimProfile, getIPMCardData } from '../../../utils/api';
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
  const [isDataVisible, setIsDataVisible] = useState(false);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [contractExpiringSoon, setContractExpiringSoon] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [cardEvents, setCardEvents] = useState<CardUsageEvent[]>([]);
  const [showAyantsDroit, setShowAyantsDroit] = useState(false);
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    loadProfile();
    loadIPMData();
    loadCardEvents();
    
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
      const response = await getIPMCardData();
      if (response) {
        setIpmData(response);
        
        // Vérifier si le contrat expire dans moins de 3 mois
        if (response.contract_end_date) {
          const endDate = new Date(response.contract_end_date);
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
          
          setContractExpiringSoon(endDate < threeMonthsFromNow);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données IPM:', error);
    }
  };

  const loadCardEvents = async () => {
    try {
      // Récupérer les données réelles depuis l'API
      const events: CardUsageEvent[] = [];
      
      // Récupérer l'historique des prises en charge
      try {
        const prisesEnChargeResponse = await fetch('http://192.168.1.11:8000/api/interim/prises-en-charge', {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });
        const prisesData = await prisesEnChargeResponse.json();
        
        if (prisesData.success && prisesData.data) {
          prisesData.data.forEach((prise: any) => {
            events.push({
              id: `pec_${prise.id}`,
              type: 'prise_en_charge',
              description: `Prise en charge - ${prise.objet || 'Demande médicale'}`,
              timestamp: prise.created_at || prise.date,
              beneficiaire: prise.famille ? `${prise.famille.prenom} ${prise.famille.nom} (${getLienLabel(prise.famille.lien)})` : 'Vous-même',
              statut: prise.statut === 1 ? 'Approuvée' : prise.statut === 0 ? 'En attente' : 'Rejetée',
              location: prise.structure?.nom || 'Structure non spécifiée'
            });
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des prises en charge:', error);
      }
      
      // Récupérer l'historique des feuilles de soins
      try {
        const feuillesResponse = await fetch('http://192.168.1.11:8000/api/interim/feuilles-de-soins', {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });
        const feuillesData = await feuillesResponse.json();
        
        if (feuillesData.success && feuillesData.data) {
          feuillesData.data.forEach((feuille: any) => {
            events.push({
              id: `fds_${feuille.id}`,
              type: 'feuille_soins',
              description: `Feuille de soins - ${feuille.type_consultation || 'Consultation'}`,
              timestamp: feuille.created_at || feuille.date_consultation,
              beneficiaire: feuille.famille ? `${feuille.famille.prenom} ${feuille.famille.nom} (${getLienLabel(feuille.famille.lien)})` : 'Vous-même',
              statut: feuille.statut === 1 ? 'Validée' : feuille.statut === 0 ? 'En cours' : 'Rejetée',
              montant: feuille.montant_total ? `${feuille.montant_total} FCFA` : undefined
            });
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des feuilles de soins:', error);
      }
      
      // Ajouter des événements de consultation de la carte
      events.push({
        id: 'card_access_' + Date.now(),
        type: 'access',
        description: 'Carte IPM consultée',
        timestamp: new Date().toISOString(),
        ip_address: '192.168.1.100'
      });
      
      // Trier par date décroissante
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setCardEvents(events);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      // En cas d'échec, utiliser des données par défaut
      setCardEvents([{
        id: 'default',
        type: 'access',
        description: 'Carte IPM consultée',
        timestamp: new Date().toISOString(),
        ip_address: '192.168.1.100'
      }]);
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
    
    // Basculer entre données sensibles et ayants-droit
    if (!isDataVisible && !showAyantsDroit) {
      // Montrer les données sensibles
      setIsDataVisible(true);
      setShowAyantsDroit(false);
    } else if (isDataVisible && !showAyantsDroit) {
      // Montrer les ayants-droit
      setIsDataVisible(false);
      setShowAyantsDroit(true);
    } else {
      // Masquer tout
      setIsDataVisible(false);
      setShowAyantsDroit(false);
    }
    
    // Ajouter l'événement à l'historique
    const newEvent: CardUsageEvent = {
      id: Date.now().toString(),
      type: 'access',
      description: !isDataVisible && !showAyantsDroit 
        ? 'Données sensibles consultées'
        : isDataVisible 
          ? 'Ayants-droit consultés'
          : 'Données masquées',
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.100'
    };
    setCardEvents(prev => [newEvent, ...prev]);
  };

  const toggleCardLock = () => {
    if (isCardLocked) {
      // Déverrouiller
      setIsCardLocked(false);
      setIsDataVisible(false);
      
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
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              <TouchableOpacity onPress={toggleCardLock} style={styles.lockButton}>
                <Ionicons 
                  name={isCardLocked ? 'lock-closed' : 'lock-open'} 
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
                
                {/* ID Intérimaire (masquable) */}
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>ID:</Text>
                  <Text style={styles.dataValue}>
                    {isDataVisible 
                      ? ((ipmData as any)?.profile?.id || 'N/A')
                      : maskSensitiveData((ipmData as any)?.profile?.id, 4)
                    }
                  </Text>
                </View>

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

                {/* Email (masquable) */}
                {/* {(ipmData as any)?.profile?.email && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Email:</Text>
                    <Text style={styles.dataValue}>
                      {isDataVisible 
                        ? (ipmData as any)?.profile?.email
                        : maskSensitiveData((ipmData as any)?.profile?.email, 3)
                      }
                    </Text>
                  </View>
                )} */}

                {/* Téléphone (masquable) */}
                {/* {(ipmData as any)?.profile?.phone && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Tél:</Text>
                    <Text style={styles.dataValue}>
                      {isDataVisible 
                        ? (ipmData as any)?.profile?.phone
                        : maskSensitiveData((ipmData as any)?.profile?.phone, 2)
                      }
                    </Text>
                  </View>
                )} */}
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
          <View style={[styles.ayantsDroitSection, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Ayants-droit ({(ipmData as any).ayants_droit.length})
            </Text>
            
            {(ipmData as any).ayants_droit.map((ayant: any, index: number) => (
              <View key={index} style={[styles.ayantCard, { backgroundColor: colors.background }]}>
                <View style={styles.ayantHeader}>
                  <View style={[styles.ayantIconLarge, { backgroundColor: ayant.lien === 1 ? '#10B981' : ayant.lien === 2 ? '#EF4444' : '#8B5CF6' }]}>
                    <Ionicons 
                      name={ayant.lien === 1 ? 'person' : ayant.lien === 2 ? 'heart' : ayant.lien === 3 || ayant.lien === 4 ? 'people' : 'person-circle'} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.ayantInfo}>
                    <Text style={[styles.ayantName, { color: colors.textPrimary }]}>
                      {ayant.nom} {ayant.prenom}
                    </Text>
                    <Text style={[styles.ayantLienText, { color: colors.textSecondary }]}>
                      {ayant.lien === 1 ? 'Enfant' : ayant.lien === 2 ? 'Conjoint' : ayant.lien === 3 ? 'Père' : ayant.lien === 4 ? 'Mère' : ayant.lien === 5 ? 'Autre' : 'Personne Ressource'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Historique des événements */}
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
            Historique d'utilisation
          </Text>
          
          {cardEvents.length === 0 ? (
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
                          backgroundColor: event.statut === 'Approuvée' || event.statut === 'Validée' || event.statut === 'Active' 
                            ? '#10B981' 
                            : event.statut === 'En attente' 
                              ? '#F59E0B' 
                              : colors.textSecondary 
                        }]}>
                          <Text style={styles.eventStatusText}>{event.statut}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
                {event.beneficiaire && (
                  <Text style={[styles.eventBeneficiaire, { color: colors.textSecondary }]}>
                    👥 {event.beneficiaire}
                  </Text>
                )}
                {event.montant && (
                  <Text style={[styles.eventMontant, { color: colors.primary }]}>
                    💰 {event.montant}
                  </Text>
                )}
                {event.location && (
                  <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>
                    📍 {event.location}
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
  lockButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
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