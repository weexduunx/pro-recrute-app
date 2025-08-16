import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import CustomHeader from '../../../components/CustomHeader';
import {
  getDashboardStats,
  getFinancialStats,
  getIpmStats,
  getWorkTrends,
  getMonthlyPerformance,
  formatCurrency,
  formatNumber,
  formatPercentage,
  ANALYTICS_PERIODS
} from '../../../utils/analytics-api';

const { width } = Dimensions.get('window');

export default function ChartsScreen() {
  const { colors } = useTheme();
  
  // États principaux
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Données des graphiques
  const [dashboardData, setDashboardData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [ipmData, setIpmData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);

  const loadChartsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Pour l'écran charts, récupérer les heures pour l'année entière pour être cohérent
      const yearPeriod = 'year';
      
      const [dashboardRes, financialRes, ipmRes, trendsRes, performanceRes] = await Promise.all([
        getDashboardStats(yearPeriod, selectedYear).catch(() => ({ success: false })),
        getFinancialStats(selectedYear).catch(() => ({ success: false })),
        getIpmStats(selectedYear).catch(() => ({ success: false })),
        getWorkTrends('6months').catch(() => ({ success: false })),
        getMonthlyPerformance(selectedYear).catch(() => ({ success: false }))
      ]);

      if (dashboardRes.success) setDashboardData(dashboardRes.data);
      if (financialRes.success) setFinancialData(financialRes.data);
      if (ipmRes.success) setIpmData(ipmRes.data);
      if (trendsRes.success) setTrendsData(trendsRes.data);
      if (performanceRes.success) setPerformanceData(performanceRes.data);

    } catch (error) {
      console.error('Erreur chargement données graphiques:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadChartsData();
  }, [loadChartsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChartsData();
    setRefreshing(false);
  }, [loadChartsData]);

  const renderPeriodSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={[styles.selectorLabel, { color: colors.text }]}>Période</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContent}
      >
        {ANALYTICS_PERIODS.slice(0, 4).map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.selectorChip,
              {
                backgroundColor: selectedPeriod === period.value ? colors.primary : colors.background,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setSelectedPeriod(period.value)}
          >
            <Text
              style={[
                styles.selectorText,
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
    for (let i = currentYear; i >= currentYear - 3; i--) {
      years.push(i);
    }

    return (
      <View style={styles.selectorContainer}>
        <Text style={[styles.selectorLabel, { color: colors.text }]}>Année</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContent}
        >
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.selectorChip,
                {
                  backgroundColor: selectedYear === year ? colors.secondary : colors.background,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <Text
                style={[
                  styles.selectorText,
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
        </ScrollView>
      </View>
    );
  };

  const renderFinancialChart = () => {
    if (!financialData?.monthly_evolution) return null;

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.surface || colors.background }]}>
        <Text style={[styles.chartTitle, { color: colors.primary }]}>
          Évolution financière mensuelle ({selectedYear})
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.barChart}>
            {financialData.monthly_evolution.map((month, index) => {
              const maxValue = financialData.max_monthly || 1;
              const barHeight = Math.max(8, (month.amount / maxValue) * 120);
              
              return (
                <View key={index} style={styles.barContainer}>
                  <Text style={[styles.barValue, { color: colors.text }]}>
                    {formatCurrency(month.amount)}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: colors.secondary
                      }
                    ]}
                  />
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                    {month.month_short}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderIpmBreakdown = () => {
    if (!ipmData) return null;

    const ipmItems = [
      { label: 'Consultations', value: ipmData.total_consultations, color: colors.primary },
      { label: 'Soins', value: ipmData.total_soins, color: colors.secondary },
      { label: 'Médicaments', value: ipmData.total_medicaments, color: colors.success },
      { label: 'Prothèses', value: ipmData.total_protheses, color: '#8B5CF6' },
      { label: 'Examens', value: ipmData.total_examens, color: '#F59E0B' }
    ];

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.surface || colors.background }]}>
        <Text style={[styles.chartTitle, { color: colors.primary }]}>
          Répartition des dépenses IPM
        </Text>
        
        <View style={styles.pieChart}>
          {ipmItems.map((item, index) => (
            <View key={index} style={styles.pieItem}>
              <View style={[styles.pieColor, { backgroundColor: item.color }]} />
              <Text style={[styles.pieLabel, { color: colors.text }]}>
                {item.label}
              </Text>
              <Text style={[styles.pieValue, { color: colors.textSecondary }]}>
                {formatCurrency(item.value)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSummaryCards = () => (
    <View style={styles.summaryGrid}>
      <View style={[styles.summaryCard, { backgroundColor: colors.surface || colors.background }]}>
        <Ionicons name="time-outline" size={24} color={colors.secondary} />
        <Text style={[styles.summaryValue, { color: colors.primary }]}>
          {formatNumber(dashboardData?.total_hours || 0)}h
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          Heures travaillées
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface || colors.background }]}>
        <Ionicons name="cash-outline" size={24} color={colors.success} />
        <Text style={[styles.summaryValue, { color: colors.primary }]}>
          {formatCurrency(financialData?.total_gross || 0)}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          Total remboursements
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface || colors.background }]}>
        <Ionicons name="document-text-outline" size={24} color={colors.primary} />
        <Text style={[styles.summaryValue, { color: colors.primary }]}>
          {formatNumber(ipmData?.total_feuilles_soins || 0)}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          Feuilles de soins
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface || colors.background }]}>
        <Ionicons name="people-outline" size={24} color="#8B5CF6" />
        <Text style={[styles.summaryValue, { color: colors.primary }]}>
          {formatNumber(ipmData?.famille_members_count || 0)}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          Ayants droit
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader title="Graphiques détaillés" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des graphiques...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title="Graphiques détaillés" showBackButton={true} />
      
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
        {renderSummaryCards()}
        {renderFinancialChart()}
        {renderIpmBreakdown()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  scrollView: {
    flex: 1,
  },

  // Selectors
  selectorContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectorContent: {
    paddingVertical: 4,
  },
  selectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    fontSize: 12,
  },

  // Summary cards
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Chart cards
  chartCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },

  // Bar chart
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 12,
  },
  barContainer: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
  },
  barValue: {
    fontSize: 10,
    marginBottom: 4,
    transform: [{ rotate: '-45deg' }],
  },
  bar: {
    width: 24,
    borderRadius: 2,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
  },

  // Pie chart
  pieChart: {
    gap: 12,
  },
  pieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pieColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  pieLabel: {
    flex: 1,
    fontSize: 14,
  },
  pieValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});