import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
  RefreshControl,
  Image,
} from "react-native";
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { useNotifications } from '../../../hooks/useNotifications';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getDashboardStats } from "../../../utils/analytics-api";
import { getIPMCardData, checkBirthday } from "../../../utils/api";
import { Ionicons, FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { format } from "date-fns";
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get("window");

// Interface pour les statistiques du dashboard
interface DashboardStats {
  total_hours: number;
  total_revenue: number;
  active_contracts: number;
  unique_societies: number;
  current_society: string;
}

// Interface pour les actions rapides
interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  description?: string;
}


export default function InterimDashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { unreadCount } = useNotifications();

  // États pour les données du dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [ipmData, setIpmData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // État pour l'anniversaire
  const [birthdayInfo, setBirthdayInfo] = useState<any>(null);
  const [birthdayLoading, setBirthdayLoading] = useState(true);

  // Animation d'entrée des sections
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Actions rapides disponibles
  const quickActions: QuickAction[] = [
    {
      id: 'hr_file',
      title: t('Dossier RH'),
      icon: 'folder-outline',
      color: colors.primary,
      route: '/(app)/(interimaire)/hr_file',
      description: 'Informations administratives'
    },
    {
      id: 'ipm_file',
      title: t('Prestations IPM'),
      icon: 'medkit-outline',
      color: colors.secondary,
      route: '/(app)/(interimaire)/ipm_file',
      description: 'Echéanciers, Historique Prises en charge et Feuille de Soins'
    },
    {
      id: 'analytics',
      title: t('Suivi Facturation'),
      icon: 'analytics',
      color: '#8B5CF6',
      route: '/(app)/(interimaire)/analytics',
      description: 'Suivi de la facturation'
    },
    {
      id: 'reports',
      title: t('Rapports'),
      icon: 'document-attach-outline',
      color: '#F59E0B',
      route: '/(app)/(interimaire)/reports',
      description: 'Générer des rapports'
    },
    {
      id: 'structures',
      title: t('Structures de Soins'),
      icon: 'business-outline',
      color: colors.error,
      route: '/(app)/(interimaire)/structures',
      description: 'Centres de santé'
    },
    {
      id: 'notifications',
      title: t('Notifications'),
      icon: 'notifications-outline',
      color: '#10B981',
      route: '/(app)/(interimaire)/notifications',
      description: 'Messages et alertes'
    }
  ];

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

  // Chargement des données du dashboard
  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setDashboardStats(null);
      setIpmData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Charger les statistiques du dashboard
      const statsResponse = await getDashboardStats('month');
      if (statsResponse.success && statsResponse.data) {
        setDashboardStats(statsResponse.data);
      }

      // Charger les données IPM complètes
      const ipmResponse = await getIPMCardData();
      if (ipmResponse) {
        setIpmData(ipmResponse);
      }

      // Vérifier l'anniversaire
      setBirthdayLoading(true);
      try {
        const birthdayResponse = await checkBirthday();
        setBirthdayInfo(birthdayResponse);
      } catch (birthdayError) {
        console.log('Erreur anniversaire:', birthdayError);
        setBirthdayInfo(null);
      } finally {
        setBirthdayLoading(false);
      }
    } catch (err: any) {
      console.error("Erreur chargement données:", err);
      setError(err.message || t("Impossible de charger les données"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  // Fonction de rafraîchissement
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);


  // Fonctions de navigation
  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Intérimaire pressé !")); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  // Formatage des données
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount).replace('XOF', 'FCFA');
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };


  // Icône Carte IPM
  const renderIPMCard = () => {
    if (!ipmData || !ipmData.qr_data) {
      return (
        <View style={styles.ipmCardIconContainer}>
          <View style={[styles.loadingCard, { backgroundColor: colors.cardBackground }]}>
            <ActivityIndicator size="large" color="#0f8e35" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement de la carte IPM...
            </Text>
          </View>
        </View>
      );
    }

    const profile = ipmData.profile;
    const contractStatus = ipmData.contract_status || 'Inactif';
    const contractEndDate = ipmData.contract_end_date;
    
    return (
      <Animated.View
        style={[
          styles.ipmCardIconContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.ipmCardIcon, { backgroundColor: colors.cardBackground }]}
          onPress={() => router.push('/(app)/(interimaire)/carte-ipm')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.secondary + '15' }]}>
            <Image 
              source={require('../../../assets/images/game-icons--key-card.png')} 
              style={styles.cardIconImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.cardIconInfo}>
            <Text style={[styles.cardIconTitle, { color: colors.textPrimary }]}>
              Carte IPM
            </Text>
            <Text style={[styles.cardIconSubtitle, { color: colors.textSecondary }]}>
              ID: {profile?.id || 'N/A'} • {contractStatus}
            </Text>
            <View style={styles.cardIconFooter}>
              <View style={[styles.statusIndicator, { 
                backgroundColor: contractStatus === 'Actif' ? '#10B981' : 
                               contractStatus === 'À venir' ? '#F59E0B' : 
                               contractStatus === 'Expiré' ? '#EF4444' : '#6B7280' 
              }]} />
              <Text style={[styles.cardIconAction, { color: colors.secondary }]}>
                Toucher pour voir la carte complète
              </Text>
            </View>
          </View>
          
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={colors.textSecondary} 
            style={styles.cardIconChevron}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Section de statut actuel
  // const renderCurrentStatus = () => {
  //   return (
  //     <Animated.View
  //       style={[
  //         styles.statusContainer,
  //         { backgroundColor: colors.background || colors.background },
  //         {
  //           opacity: fadeAnim,
  //           transform: [{ translateY: slideAnim }]
  //         }
  //       ]}
  //     >
  //       <View style={styles.statusHeader}>
  //         <View style={[styles.statusIcon, { backgroundColor: colors.success + '15' }]}>
  //           <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
  //         </View>
  //         <View style={styles.statusInfo}>
  //           <Text style={[styles.statusTitle, { color: colors.primary }]}>
  //             {t('Statut actuel')}
  //           </Text>
  //           <Text style={[styles.statusText, { color: colors.success }]}>
  //             {user?.is_contract_active ? t('Contrat actif') : t('Contrat inactif')}
  //           </Text>
  //         </View>
  //       </View>
        
  //       {dashboardStats?.current_society && (
  //         <View style={styles.currentSociety}>
  //           <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
  //           <Text style={[styles.currentSocietyText, { color: colors.textSecondary }]}>
  //             {dashboardStats.current_society}
  //           </Text>
  //         </View>
  //       )}
  //     </Animated.View>
  //   );
  // };

  // Fonction de rendu de la bannière d'anniversaire
  const renderBirthdayBanner = () => {
    if (birthdayLoading || !birthdayInfo?.is_birthday) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.birthdayBanner,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#ec4899', '#f97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.birthdayGradient}
        >
          <View style={styles.birthdayContent}>
            <View style={styles.birthdayIcon}>
              <Text style={styles.birthdayEmoji}>🎉</Text>
            </View>
            <View style={styles.birthdayText}>
              <Text style={styles.birthdayTitle}>
                Joyeux Anniversaire !
              </Text>
              <Text style={styles.birthdayMessage}>
                {birthdayInfo.message}
              </Text>
            </View>
            <View style={styles.birthdayDecoration}>
              <Text style={styles.decorationEmoji}>🎈</Text>
              <Text style={styles.decorationEmoji}>🎁</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Section actions rapides
  const renderQuickActions = () => {
    const primaryActions = quickActions.slice(0, 4);
    const secondaryActions = quickActions.slice(4);

    return (
      <Animated.View
        style={[
          styles.actionsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          {t('Accés rapide')}
        </Text>
        
        {/* Actions principales */}
        <View style={styles.primaryActionsGrid}>
          {primaryActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.primaryActionCard, { backgroundColor: colors.background || colors.background }]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.primary }]}>
                {action.title}
              </Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {action.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions secondaires */}
        <View style={styles.secondaryActionsRow}>
          {secondaryActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.secondaryActionCard, { backgroundColor: colors.background || colors.background }]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.secondaryActionIcon, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={[styles.secondaryActionTitle, { color: colors.primary }]}>
                {action.title}
              </Text>
              {action.id === 'notifications' && unreadCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.notificationBadgeText, { color: colors.textTertiary }]}>
                    {unreadCount > 99 ? '99+' : unreadCount.toString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  // Vérification du contrat actif
  if (user?.is_contract_active === false) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <CustomHeader
          title={t('Espace Intérimaire')}
          user={user}
          onMenuPress={handleMenuPress}
          onAvatarPress={handleAvatarPress}
          showNotificationIcon={true}
        />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.restrictedContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
            <Text style={[styles.restrictedTitle, { color: colors.textPrimary }]}>
              {t('Accès restreint')}
            </Text>
            <Text style={[styles.restrictedText, { color: colors.textSecondary }]}>
              {t('Votre contrat intérimaire est terminé ou inactif. Vous n\'avez plus accès à cet espace.')}
            </Text>
            <Text style={[styles.restrictedText, { color: colors.textSecondary }]}>
              {t('Veuillez contacter l\'administration pour plus d\'informations.')}
            </Text>
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(app)/home')}
            >
              <Ionicons name="home-outline" size={18} color="#ffffff" />
              <Text style={styles.contactButtonText}>
                {t('Retour à l\'accueil')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader
        title={t('Espace Intérimaire')}
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
        showNotificationIcon={true}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
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
        <View style={styles.content}>
          {renderIPMCard()}
          {renderBirthdayBanner()}
          {renderQuickActions()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  
  // Welcome Header Styles
  welcomeContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  
  welcomeContent: {
    flex: 1,
  },
  
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  
  welcomeSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Styles pour la carte IPM
  ipmCardContainer: {
    marginBottom: 20,
  },
  ipmCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  ipmCardHeader: {
    marginBottom: 0,
  },
  ipmCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ipmCardTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ipmCardLogo: {
    width: 75,
    height: 40,
    tintColor: '#FFFFFF',
  },
  ipmCardSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  ipmCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ipmUserInfo: {
    flex: 1,
  },
  ipmUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  ipmUserEmail: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
  },
  ipmContractInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ipmContractText: {
    fontSize: 12,
    color: '#FFFFFF',
    // marginLeft: 6,
    opacity: 0.9,
  },
  qrCodeContainer: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
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
  
  // Quick Metrics Styles (supprimés)
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  
  metricTitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
  
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
  
  // Status Styles
  statusContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  
  statusInfo: {
    flex: 1,
  },
  
  currentSociety: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  
  currentSocietyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  statusContent: {
    flex: 1,
  },
  
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  // statusText: {
  //   fontSize: 14,
  //   opacity: 0.7,
  // },
  
  // Actions Container Styles
  actionsContainer: {
    paddingVertical: 8,
  },
  
  // Primary Actions Grid
  primaryActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  
  primaryActionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  
  // Secondary Actions Row
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  
  secondaryActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  
  secondaryActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  
  secondaryActionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Quick Actions Styles
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  actionIcon: {
    width: 70,
    height: 70,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  
  cardIconImage: {
    width: 60,
    height: 60,
  },
  
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  
  actionDescription: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 16,
  },
  
  // Notification Badge Styles
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },

  // Restricted Access Styles
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  
  restrictedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  
  restrictedText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Nouveaux styles pour la carte IPM améliorée
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  ipmMatricule: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  
  ipmEntrepriseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  
  ipmEntrepriseText: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
    // marginLeft: 4,
    flex: 1,
  },
  
  ipmCardInfo: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
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

  // Styles pour la bannière d'anniversaire
  birthdayBanner: {
    marginBottom: 16,
  },
  
  birthdayGradient: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  birthdayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  birthdayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  birthdayEmoji: {
    fontSize: 28,
  },
  
  birthdayText: {
    flex: 1,
  },
  
  birthdayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  birthdayMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  
  birthdayDecoration: {
    alignItems: 'center',
    gap: 4,
  },
  
  decorationEmoji: {
    fontSize: 20,
  },

  // IPM Card Icon Styles
  ipmCardIconContainer: {
    marginBottom: 20,
  },

  ipmCardIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  cardIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  cardIconInfo: {
    flex: 1,
    marginLeft: 8,
  },

  cardIconTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },

  cardIconSubtitle: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },

  cardIconFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  cardIconAction: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  cardIconChevron: {
    marginLeft: 8,
  },
});
