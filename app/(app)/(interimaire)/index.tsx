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
} from "react-native";
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { useNotifications } from '../../../hooks/useNotifications';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getDashboardStats } from "../../../utils/analytics-api";
import { Ionicons, FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { format } from "date-fns";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      description: 'Documents et informations RH'
    },
    {
      id: 'ipm_file',
      title: t('Dossier IPM'),
      icon: 'medkit-outline',
      color: colors.secondary,
      route: '/(app)/(interimaire)/ipm_file',
      description: 'Remboursements santé'
    },
    {
      id: 'analytics',
      title: t('Analytics'),
      icon: 'analytics',
      color: '#8B5CF6',
      route: '/(app)/(interimaire)/analytics',
      description: 'Statistiques détaillées'
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

  // Charger les données du dashboard
  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setDashboardStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getDashboardStats('month');
      if (response.success && response.data) {
        setDashboardStats(response.data);
      }
    } catch (err: any) {
      console.error("Erreur chargement dashboard:", err);
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

  // --- Fonctions de rendu des nouvelles sections ---

  // Section header de bienvenue
  const renderWelcomeHeader = () => {
    const userName = user?.name || 'Utilisateur';
    const firstName = userName.split(' ')[0]; // Prendre le prénom
    
    return (
      <Animated.View
        style={[
          styles.welcomeContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.welcomeContent}>
          <Text style={[styles.welcomeTitle, { color: colors.secondary }]}>
            {t('Bienvenue')} {firstName}
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
            {t('Dans votre espace intérimaire, vous pouvez accéder à vos documents, vos notifications, et plus encore.')}

          </Text>
        </View>
        <View style={[styles.welcomeIcon, { backgroundColor: colors.secondary + '15' }]}>
          <Ionicons name="hand-right-outline" size={24} color={colors.secondary} />
        </View>
      </Animated.View>
    );
  };

  // Section de statut actuel
  const renderCurrentStatus = () => {
    return (
      <Animated.View
        style={[
          styles.statusContainer,
          { backgroundColor: colors.background || colors.background },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.statusHeader}>
          <View style={[styles.statusIcon, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: colors.primary }]}>
              {t('Statut actuel')}
            </Text>
            <Text style={[styles.statusText, { color: colors.success }]}>
              {user?.is_contract_active ? t('Contrat actif') : t('Contrat inactif')}
            </Text>
          </View>
        </View>
        
        {dashboardStats?.current_society && (
          <View style={styles.currentSociety}>
            <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.currentSocietyText, { color: colors.textSecondary }]}>
              {dashboardStats.current_society}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  // Section actions rapides améliorée
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
          {t('Menu Interimaire')}
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader
        title={t('Espace Intérimaire')}
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
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
        <View style={styles.content}>
          {renderWelcomeHeader()}
          {renderCurrentStatus()}
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
  
  statusText: {
    fontSize: 14,
    opacity: 0.7,
  },
  
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
});
