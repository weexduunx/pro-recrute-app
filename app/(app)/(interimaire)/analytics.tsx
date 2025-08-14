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
import { useAuth } from '../../../components/AuthProvider';
import {
  getDashboardStats,
  getWorkTrends,
  getFinancialStats,
  getIpmStats,
  formatCurrency,
  formatNumber,
  formatPercentage,
  calculateGrowth,
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
    currency: 'EUR'
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

const safeCalculateGrowth = (current, previous) => {
  if (typeof calculateGrowth === 'function') {
    return calculateGrowth(current, previous);
  }
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};
import CustomHeader from '../../../components/CustomHeader';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  // États principaux
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  // Données analytics
  const [dashboardStats, setDashboardStats] = useState(null);
  const [workTrends, setWorkTrends] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [ipmStats, setIpmStats] = useState(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [dashboardRes, workRes, financialRes, ipmRes] = await Promise.all([
        getDashboardStats(selectedPeriod),
        getWorkTrends(selectedPeriod),
        getFinancialStats(),
        getIpmStats()
      ]);

      if (dashboardRes.success) setDashboardStats(dashboardRes.data);
      if (workRes.success) setWorkTrends(workRes.data);
      if (financialRes.success) setFinancialStats(financialRes.data);
      if (ipmRes.success) setIpmStats(ipmRes.data);

    } catch (error) {
      console.error('Erreur chargement analytics:', error);
      Alert.alert('Erreur', 'Impossible de charger les données d\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  }, [selectedPeriod]);

  const renderPeriodSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.periodContainer}
      contentContainerStyle={styles.periodContent}
    >
      {ANALYTICS_PERIODS.slice(0, 4).map((period) => (
        <TouchableOpacity
          key={period.value}
          style={[
            styles.periodChip,
            {
              backgroundColor: selectedPeriod === period.value ? colors.secondary : colors.background,
              borderColor: colors.border
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
  );

  const renderStatCard = (title, value, change = null, iconName, color = colors.primary) => (
    <View style={[styles.statCard, { backgroundColor: colors.background }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={iconName as any} size={20} color={color} />
        </View>
        {change !== null && (
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
          'Revenus bruts',
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
          'Structures différentes',
          safeFormatNumber(dashboardStats.unique_structures),
          null,
          'business-outline',
          '#8B5CF6'
        )}
      </View>
    );
  };

  const renderWorkAnalytics = () => {
    if (!workTrends) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Analyse du travail
        </Text>

        <View style={styles.workMetrics}>
          <View style={styles.workMetricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Heures moyenne/mois
            </Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {safeFormatNumber(workTrends.avg_hours_per_month)}h
            </Text>
          </View>

          <View style={styles.workMetricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Durée moy. contrat
            </Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {safeFormatNumber(workTrends.avg_contract_duration)} jours
            </Text>
          </View>

          <View style={styles.workMetricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Taux d'occupation
            </Text>
            <Text style={[styles.metricValue, { color: colors.secondary }]}>
              {safeFormatPercentage(workTrends.occupation_rate)}
            </Text>
          </View>
        </View>

        {workTrends.top_structures && workTrends.top_structures.length > 0 && (
          <View style={styles.topStructures}>
            <Text style={[styles.subSectionTitle, { color: colors.primary }]}>
              Structures principales
            </Text>
            {workTrends.top_structures.slice(0, 3).map((structure, index) => (
              <View key={index} style={styles.structureItem}>
                <View style={styles.structureInfo}>
                  <Text style={[styles.structureName, { color: colors.text }]}>
                    {structure.name}
                  </Text>
                  <Text style={[styles.structureStats, { color: colors.textSecondary }]}>
                    {safeFormatNumber(structure.total_hours)}h • {safeFormatNumber(structure.contracts_count)} contrats
                  </Text>
                </View>
                <View style={[styles.structureBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.structureBarFill,
                      {
                        backgroundColor: colors.secondary,
                        width: `${(structure.total_hours / workTrends.total_hours) * 100}%`
                      }
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderFinancialAnalytics = () => {
    if (!financialStats) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Analyse financière
        </Text>

        <View style={styles.financialGrid}>
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Revenus bruts
            </Text>
            <Text style={[styles.financialValue, { color: colors.success || '#10B981' }]}>
              {safeFormatCurrency(financialStats.total_gross)}
            </Text>
          </View>

          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Prélèvements
            </Text>
            <Text style={[styles.financialValue, { color: colors.error }]}>
              {safeFormatCurrency(financialStats.total_deductions)}
            </Text>
          </View>

          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Revenus nets
            </Text>
            <Text style={[styles.financialValue, { color: colors.primary }]}>
              {safeFormatCurrency(financialStats.total_net)}
            </Text>
          </View>

          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Taux horaire moyen
            </Text>
            <Text style={[styles.financialValue, { color: colors.secondary }]}>
              {safeFormatCurrency(financialStats.avg_hourly_rate)}/h
            </Text>
          </View>
        </View>

        {financialStats.monthly_evolution && financialStats.monthly_evolution.length > 0 && (
          <View style={styles.monthlyEvolution}>
            <Text style={[styles.subSectionTitle, { color: colors.primary }]}>
              Évolution mensuelle
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.evolutionChart}>
                {financialStats.monthly_evolution.map((month, index) => (
                  <View key={index} style={styles.monthColumn}>
                    <View
                      style={[
                        styles.monthBar,
                        {
                          height: Math.max(4, (month.amount / financialStats.max_monthly) * 80),
                          backgroundColor: colors.secondary
                        }
                      ]}
                    />
                    <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
                      {month.month_short}
                    </Text>
                    <Text style={[styles.monthAmount, { color: colors.text }]}>
                      {safeFormatCurrency(month.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
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
                {safeFormatNumber(ipmStats.total_prise_en_charge)}
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
                {safeFormatNumber(ipmStats.total_feuilles_soins)}
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
                {safeFormatCurrency(ipmStats.total_remboursements)}
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
                {safeFormatNumber(ipmStats.famille_members_count)}
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
          onPress={() => router.push('/interimaire/reports')}
        >
          <Ionicons name="document-text" size={20} color={colors.textTertiary} />
          <Text style={[styles.reportButtonText, { color: colors.textTertiary }]}>
            Générer rapport
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/interimaire/charts')}
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
        {renderWorkAnalytics()}
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  periodContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  periodText: {
    fontSize: 14,
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

  // Work analytics
  workMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  workMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  topStructures: {
    marginTop: 16,
  },
  structureItem: {
    marginBottom: 12,
  },
  structureInfo: {
    marginBottom: 6,
  },
  structureName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  structureStats: {
    fontSize: 12,
  },
  structureBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  structureBarFill: {
    height: '100%',
    borderRadius: 2,
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