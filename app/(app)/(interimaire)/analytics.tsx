import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import CustomHeader from '../../../components/CustomHeader';
import {
  getDashboardStats,
  getFinancialStats,
  getIpmStats,
  formatCurrency,
  formatNumber,
  formatPercentage,
  getGrowthColor,
  ANALYTICS_PERIODS
} from '../../../utils/analytics-api';

// Fonctions temporaires si manquantes
const safeFormatCurrency = (amount) => {
  if (typeof formatCurrency === 'function') {
    return formatCurrency(amount);
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF'
  }).format(amount || 0);
};

const safeFormatNumber = (number) => {
  if (typeof formatNumber === 'function') {
    return formatNumber(number);
  }
  return new Intl.NumberFormat('fr-FR').format(number || 0);
};

const safeFormatPercentage = (value, decimals = 1) => {
  if (typeof formatPercentage === 'function') {
    return formatPercentage(value, decimals);
  }
  return `${(value || 0).toFixed(decimals)}%`;
};

const safeGetGrowthColor = (growth, colors) => {
  if (typeof getGrowthColor === 'function') {
    return getGrowthColor(growth, colors);
  }
  if (growth > 0) return colors.success || '#10B981';
  if (growth < 0) return colors.error || '#EF4444';
  return colors.textSecondary || '#6B7280';
};

// const safeCalculateGrowth = (current, previous) => {
//   if (typeof calculateGrowth === 'function') {
//     return calculateGrowth(current, previous);
//   }
//   if (!previous || previous === 0) return current > 0 ? 100 : 0;
//   return ((current - previous) / previous) * 100;
// };

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  
  // États principaux
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Données analytics
  const [dashboardStats, setDashboardStats] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [ipmStats, setIpmStats] = useState(null);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [dashboardRes, financialRes, ipmRes] = await Promise.all([
        getDashboardStats(selectedPeriod).catch(err => {
          console.warn('Erreur dashboard stats:', err);
          return { success: false, error: err };
        }),
        getFinancialStats(selectedYear).catch(err => {
          console.warn('Erreur financial stats:', err);
          return { success: false, error: err };
        }),
        getIpmStats(selectedYear).catch(err => {
          console.warn('Erreur IPM stats:', err);
          return { success: false, error: err };
        })
      ]);

      // Debug: Afficher les réponses en développement
      if (__DEV__) {
        console.log('Dashboard Response:', dashboardRes);
        console.log('Financial Response:', financialRes);
        console.log('IPM Response:', ipmRes);
      }

      if (dashboardRes.success && dashboardRes.data) {
        setDashboardStats(dashboardRes.data);
      }
      if (financialRes.success && financialRes.data) {
        setFinancialStats(financialRes.data);
      }
      if (ipmRes.success && ipmRes.data) {
        setIpmStats(ipmRes.data);
      }

    } catch (error) {
      console.error('Erreur chargement analytics:', error);
      Alert.alert(
        'Erreur', 
        'Impossible de charger certaines données d\'analyse. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedYear]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  }, [loadAnalyticsData]);

  const renderPeriodSelector = () => (
    <View style={styles.periodContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodContent}
      >
        {ANALYTICS_PERIODS.slice(0, 4).map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodChip,
              {
                backgroundColor: selectedPeriod === period.value ? colors.secondary : colors.background,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setSelectedPeriod(period.value)}
          >
            <Text
              style={[
                styles.periodText,
                { 
                  color: selectedPeriod === period.value ? colors.textTertiary : colors.textSecondary,
                  fontWeight: selectedPeriod === period.value ? '600' : '400'
                }
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderYearSelector = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 2; i--) {
      years.push(i);
    }

    return (
      <View style={styles.yearContainer}>
        <View style={styles.yearContent}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearChip,
                {
                  backgroundColor: selectedYear === year ? colors.primary : colors.background,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <Text
                style={[
                  styles.yearText,
                  { 
                    color: selectedYear === year ? colors.textTertiary : colors.textSecondary,
                    fontWeight: selectedYear === year ? '600' : '400'
                  }
                ]}
              >
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderStatCard = (title, value, change = null, iconName, color = colors.primary) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface || colors.background }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={iconName as any} size={20} color={color} />
        </View>
        {change !== null && change !== 0 && (
          <View style={styles.changeContainer}>
            <Ionicons
              name={change >= 0 ? 'trending-up' : 'trending-down'}
              size={12}
              color={safeGetGrowthColor(change, colors)}
            />
            <Text style={[styles.changeText, { color: safeGetGrowthColor(change, colors) }]}>
              {safeFormatPercentage(Math.abs(change))}
            </Text>
          </View>
        )}
      </View>
      
      <Text style={[styles.statValue, { color: colors.primary }]}>
        {value}
      </Text>
      
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );

  const renderQuickStats = () => {
    if (!dashboardStats) return null;

    return (
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Heures travaillées',
          safeFormatNumber(dashboardStats.total_hours),
          dashboardStats.hours_growth,
          'time-outline',
          colors.secondary
        )}
        
        {renderStatCard(
          'Remboursements bruts',
          safeFormatCurrency(dashboardStats.total_revenue),
          dashboardStats.revenue_growth,
          'cash-outline',
          colors.success || '#10B981'
        )}
        
        {renderStatCard(
          'Contrats actifs',
          safeFormatNumber(dashboardStats.active_contracts),
          dashboardStats.contracts_growth,
          'document-text-outline',
          colors.primary
        )}
        
        {renderStatCard(
          'Sociétés travaillées',
          safeFormatNumber(dashboardStats.unique_societies),
          null,
          'business-outline',
          '#8B5CF6'
        )}
      </View>
    );
  };


  const renderCurrentSociety = () => {
    if (!dashboardStats) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.surface || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Société actuelle
        </Text>
        <View style={styles.societyInfo}>
          <View style={[styles.societyIcon, { backgroundColor: colors.secondary + '20' }]}>
            <Ionicons name="business" size={24} color={colors.secondary} />
          </View>
          <View style={styles.societyDetails}>
            <Text style={[styles.societyName, { color: colors.text }]}>
              {dashboardStats.current_society || 'Aucune société assignée'}
            </Text>
            <Text style={[styles.societyStats, { color: colors.textSecondary }]}>
              {safeFormatNumber(dashboardStats.active_contracts)} contrats actifs - {safeFormatNumber(dashboardStats.unique_societies)} sociétés au total
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFinancialAnalytics = () => {
    if (!financialStats) {
      return (
        <View style={[styles.section, { backgroundColor: colors.surface || colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Analyse des remboursements IPM
          </Text>
          <Text style={[styles.financialLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
            Aucune donnée financière disponible
          </Text>
        </View>
      );
    }

    // Debug: Afficher la structure des données en développement
    if (__DEV__) {
      console.log('Financial Stats:', financialStats);
    }

    return (
      <View style={[styles.section, { backgroundColor: colors.surface || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Analyse des remboursements IPM
        </Text>

        <View style={styles.financialGrid}>
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Total remboursements
            </Text>
            <Text style={[styles.financialValue, { color: colors.success || '#10B981' }]}>
              {safeFormatCurrency(financialStats.total_gross)}
            </Text>
          </View>

          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Total retenus
            </Text>
            <Text style={[styles.financialValue, { color: colors.error || '#EF4444' }]}>
              {safeFormatCurrency(financialStats.total_deductions)}
            </Text>
          </View>

          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Moyenne mensuelle
            </Text>
            <Text style={[styles.financialValue, { color: colors.secondary }]}>
              {safeFormatCurrency(financialStats.avg_monthly)}
            </Text>
          </View>

          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Mois traités
            </Text>
            <Text style={[styles.financialValue, { color: colors.primary }]}>
              {safeFormatNumber(financialStats.monthly_evolution?.length || 0)}
            </Text>
          </View>
        </View>

        {financialStats.societies_worked ? (
          <View style={styles.societiesInfo}>
            <Text style={[styles.subSectionTitle, { color: colors.primary }]}>
              Informations supplémentaires
            </Text>
            <View style={styles.societiesDetails}>
              <Text style={[styles.societiesText, { color: colors.text }]}>
                Sociétés travaillées: {safeFormatNumber(financialStats.societies_worked)}
              </Text>
              {financialStats.current_society ? (
                <Text style={[styles.societiesText, { color: colors.textSecondary }]}>
                  Société actuelle: {financialStats.current_society}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {financialStats.monthly_evolution && financialStats.monthly_evolution.length > 0 ? (
          <View style={styles.monthlyEvolution}>
            <Text style={[styles.subSectionTitle, { color: colors.primary }]}>
              Évolution mensuelle ({financialStats.year || new Date().getFullYear()})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.evolutionChart}>
                {financialStats.monthly_evolution.map((month, index) => (
                  <View key={index} style={styles.monthColumn}>
                    <View
                      style={[
                        styles.monthBar,
                        {
                          height: Math.max(4, (month.amount / (financialStats.max_monthly || 1)) * 80),
                          backgroundColor: colors.secondary
                        }
                      ]}
                    />
                    <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
                      {month.month_short || ''}
                    </Text>
                    <Text style={[styles.monthAmount, { color: colors.text }]}>
                      {safeFormatCurrency(month.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  };

  const renderIpmAnalytics = () => {
    if (!ipmStats) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Couverture IPM
        </Text>

        <View style={styles.ipmGrid}>
          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {safeFormatNumber(ipmStats.total_prise_en_charge || 0)}
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Prises en charge
              </Text>
            </View>
          </View>

          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Ionicons name="document-text" size={20} color={colors.secondary} />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {safeFormatNumber(ipmStats.total_feuilles_soins || 0)}
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Feuilles de soins
              </Text>
            </View>
          </View>

          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="cash" size={20} color={colors.success || '#10B981'} />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {safeFormatCurrency(ipmStats.total_remboursements || 0)}
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Remboursements
              </Text>
            </View>
          </View>

          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
              <Ionicons name="people" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {safeFormatNumber(ipmStats.famille_members_count || 0)}
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Ayants droit
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderReportActions = () => (
    <View style={[styles.section, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        Rapports
      </Text>
      
      <View style={styles.reportActions}>
        <TouchableOpacity
          style={[styles.reportButton, { backgroundColor: colors.secondary }]}
          onPress={() => router.push('/(app)/(interimaire)/reports')}
        >
          <Ionicons name="document-text" size={20} color={colors.textTertiary} />
          <Text style={[styles.reportButtonText, { color: colors.textTertiary }]}>
            Générer rapport
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/(interimaire)/charts')}
        >
          <Ionicons name="analytics" size={20} color={colors.textTertiary} />
          <Text style={[styles.reportButtonText, { color: colors.textTertiary }]}>
            Graphiques détaillés
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader title="Analytics" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des données...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title="Analytics" showBackButton={true} />
      
      {renderPeriodSelector()}
      {renderYearSelector()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.secondary]}
          />
        }
      >
        {renderQuickStats()}
        {renderCurrentSociety()}
        {renderFinancialAnalytics()}
        {renderIpmAnalytics()}
        {renderReportActions()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  // Period selector
  periodContainer: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
  },
  periodContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  periodText: {
    fontSize: 12,
  },

  // Year selector
  yearContainer: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
  },
  yearText: {
    fontSize: 12,
  },

  // Scroll view
  scrollView: {
    flex: 1,
  },

  // Quick stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Society info
  societyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  societyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  societyDetails: {
    flex: 1,
  },
  societyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  societyStats: {
    fontSize: 14,
  },


  // Financial analytics
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  financialItem: {
    width: '50%',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  financialLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  societiesInfo: {
    marginBottom: 20,
  },
  societiesDetails: {
    gap: 8,
  },
  societiesText: {
    fontSize: 14,
  },
  monthlyEvolution: {
    marginTop: 16,
  },
  evolutionChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 12,
  },
  monthColumn: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 50,
  },
  monthBar: {
    width: 24,
    borderRadius: 2,
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  monthAmount: {
    fontSize: 10,
    fontWeight: '500',
  },

  // IPM analytics
  ipmGrid: {
    gap: 12,
  },
  ipmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  ipmIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ipmContent: {
    flex: 1,
  },
  ipmValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  ipmLabel: {
    fontSize: 12,
  },

  // Report actions
  reportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  reportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});