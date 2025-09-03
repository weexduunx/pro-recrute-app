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
  getConsultationsList,
  getExamensList,
  getSoinsList,
  getMedicamentsList,
  getProthesesList,
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
  
  // Données détaillées
  const [consultationsList, setConsultationsList] = useState([]);
  const [examensList, setExamensList] = useState([]);
  const [soinsList, setSoinsList] = useState([]);
  const [medicamentsList, setMedicamentsList] = useState([]);
  const [prothesesList, setProthesesList] = useState([]);
  const [showDetailedView, setShowDetailedView] = useState(false);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger les statistiques principales
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
      
      // Charger les données détaillées en parallèle
      const [consultationsRes, examensRes, soinsRes, medicamentsRes, prothesesRes] = await Promise.all([
        getConsultationsList(selectedYear).catch(err => {
          console.warn('Erreur consultations list:', err);
          return { success: false, data: [] };
        }),
        getExamensList(selectedYear).catch(err => {
          console.warn('Erreur examens list:', err);
          return { success: false, data: [] };
        }),
        getSoinsList(selectedYear).catch(err => {
          console.warn('Erreur soins list:', err);
          return { success: false, data: [] };
        }),
        getMedicamentsList(selectedYear).catch(err => {
          console.warn('Erreur medicaments list:', err);
          return { success: false, data: [] };
        }),
        getProthesesList(selectedYear).catch(err => {
          console.warn('Erreur protheses list:', err);
          return { success: false, data: [] };
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
      
      // Traiter les données détaillées
      if (consultationsRes.success && consultationsRes.data) {
        setConsultationsList(consultationsRes.data);
      }
      if (examensRes.success && examensRes.data) {
        setExamensList(examensRes.data);
      }
      if (soinsRes.success && soinsRes.data) {
        setSoinsList(soinsRes.data);
      }
      if (medicamentsRes.success && medicamentsRes.data) {
        setMedicamentsList(medicamentsRes.data);
      }
      if (prothesesRes.success && prothesesRes.data) {
        setProthesesList(prothesesRes.data);
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

    // Calcul des métriques à partir des données détaillées
    const totalConsultations = consultationsList.length + examensList.length + soinsList.length;
    const totalOrdonnances = medicamentsList.length + prothesesList.length;
    const totalExamens = examensList.length;
    
    // Calcul du nombre de dérogations (éléments exclus)
    const allMedicalData = [...consultationsList, ...examensList, ...soinsList, ...medicamentsList, ...prothesesList];
    const nombreDerogations = allMedicalData.filter(item => {
      // Vérifier si l'élément est exclu (dérogation)
      return item.exclu && (item.exclu === '1' || item.exclu === 1 || item.exclu === true);
    }).length;

    return (
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Consultations',
          safeFormatNumber(totalConsultations),
          null,
          'medical-outline',
          colors.primary
        )}
        
        {renderStatCard(
          'Ordonnances',
          safeFormatNumber(totalOrdonnances),
          null,
          'receipt-outline',
          colors.secondary
        )}
        
        {renderStatCard(
          'Examens',
          safeFormatNumber(totalExamens),
          null,
          'search-outline',
          '#8B5CF6'
        )}
        
        {renderStatCard(
          'Dérogations',
          safeFormatNumber(nombreDerogations),
          null,
          'warning-outline',
          colors.error || '#EF4444'
        )}
      </View>
    );
  };


  const renderCurrentSociety = () => {
    if (!dashboardStats) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.background || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Structure de soin
        </Text>
        <View style={styles.societyInfo}>
          <View style={[styles.societyIcon, { backgroundColor: colors.secondary + '20' }]}>
            <Ionicons name="business" size={24} color={colors.secondary} />
          </View>
          <View style={styles.societyDetails}>
            <Text style={[styles.societyName, { color: colors.primary }]}>
              {dashboardStats.current_society || 'Aucune structure assignée'}
            </Text>
            <Text style={[styles.societyStats, { color: colors.textSecondary }]}>
              {safeFormatNumber(dashboardStats.active_contracts)} prises en charge - {safeFormatNumber(dashboardStats.unique_societies)} structures au total
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFinancialAnalytics = () => {
    // Calculer les totaux corrects à partir des données réelles
    const allMedicalData = [...consultationsList, ...soinsList, ...medicamentsList, ...prothesesList, ...examensList];
    
    if (allMedicalData.length === 0) {
      return (
        <View style={[styles.section, { backgroundColor: colors.background || colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Analyse financière des soins
          </Text>
          <Text style={[styles.financialLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
            Aucune donnée financière disponible
          </Text>
        </View>
      );
    }

    // Calcul du total des remboursements (somme de tous les remboursements)
    const totalRemboursements = allMedicalData.reduce((sum, item) => {
      return sum + (parseFloat(item.remboursement) || 0);
    }, 0);

    // Calcul du total des retenus (somme de tous les montants * taux_retenu)  
    const totalRetenus = allMedicalData.reduce((sum, item) => {
      const montant = parseFloat(item.montant) || 0;
      const tauxRetenu = parseFloat(item.retenue) || 0; // Le taux de retenue depuis l'API
      return sum + tauxRetenu; // retenue est déjà calculée côté serveur
    }, 0);

    return (
      <View style={[styles.section, { backgroundColor: colors.surface || colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Analyse financière des soins
        </Text>

        <View style={styles.financialGrid}>
          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Total remboursements
            </Text>
            <Text style={[styles.financialValue, { color: colors.success || '#10B981' }]}>
              {safeFormatCurrency(totalRemboursements)}
            </Text>
          </View>

          <View style={styles.financialItem}>
            <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>
              Total retenus
            </Text>
            <Text style={[styles.financialValue, { color: colors.error || '#EF4444' }]}>
              {safeFormatCurrency(totalRetenus)}
            </Text>
          </View>
        </View>

{(() => {
          // Calculer les données mensuelles à partir des données réelles
          const monthlyData = {};
          const currentYear = selectedYear;
          
          allMedicalData.forEach(item => {
            if (item.date) {
              const date = new Date(item.date);
              if (date.getFullYear() === currentYear) {
                const monthKey = date.getMonth();
                if (!monthlyData[monthKey]) {
                  monthlyData[monthKey] = {
                    month: monthKey,
                    month_short: date.toLocaleDateString('fr-FR', { month: 'short' }),
                    remboursements: 0,
                    retenues: 0
                  };
                }
                monthlyData[monthKey].remboursements += parseFloat(item.remboursement) || 0;
                monthlyData[monthKey].retenues += parseFloat(item.retenue) || 0;
              }
            }
          });
          
          const monthlyArray = Object.values(monthlyData).sort((a, b) => a.month - b.month);
          const maxRemboursements = Math.max(...monthlyArray.map(m => m.remboursements), 1);
          const maxRetenues = Math.max(...monthlyArray.map(m => m.retenues), 1);
          const maxValue = Math.max(maxRemboursements, maxRetenues);
          
          if (monthlyArray.length > 0) {
            return (
              <View style={styles.monthlyEvolution}>
                <Text style={[styles.subSectionTitle, { color: colors.primary }]}>
                  Évolution mensuelle ({currentYear})
                </Text>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.success || '#10B981' }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Remboursements</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.error || '#EF4444' }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Retenues</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.evolutionChart}>
                    {monthlyArray.map((month, index) => {
                      const rembHeight = Math.max(4, (month.remboursements / maxValue) * 80);
                      const retenueHeight = Math.max(4, (month.retenues / maxValue) * 80);
                      
                      return (
                        <View key={index} style={styles.monthColumn}>
                          {/* Barre remboursements (vers le haut, vert) */}
                          <View
                            style={[
                              styles.monthBar,
                              styles.monthBarUp,
                              {
                                height: rembHeight,
                                backgroundColor: colors.success || '#10B981'
                              }
                            ]}
                          />
                          
                          {/* Label du mois */}
                          <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
                            {month.month_short}
                          </Text>
                          
                          {/* Barre retenues (vers le bas, rouge) */}
                          <View
                            style={[
                              styles.monthBar,
                              styles.monthBarDown,
                              {
                                height: retenueHeight,
                                backgroundColor: colors.error || '#EF4444'
                              }
                            ]}
                          />
                          
                          {/* Montants */}
                          <Text style={[styles.monthAmount, { color: colors.success || '#10B981', fontSize: 9 }]}>
                            +{safeFormatCurrency(month.remboursements)}
                          </Text>
                          <Text style={[styles.monthAmount, { color: colors.error || '#EF4444', fontSize: 9 }]}>
                            -{safeFormatCurrency(month.retenues)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            );
          }
          return null;
        })()}
      </View>
    );
  };

  const renderIpmAnalytics = () => {
    // Calculer les métriques à partir des données réelles
    const allMedicalData = [...consultationsList, ...examensList, ...soinsList, ...medicamentsList, ...prothesesList];
    
    // Calculs des nouvelles métriques
    const totalActes = allMedicalData.length;
    const actesRefuses = allMedicalData.filter(item => 
      item.exclu && (item.exclu === '1' || item.exclu === 1 || item.exclu === true)
    ).length;
    const actesCouvert = totalActes - actesRefuses;
    const tauxCouverture = totalActes > 0 ? Math.round((actesCouvert / totalActes) * 100) : 0;
    
    // Structures partenaires uniques
    const structuresUniques = new Set();
    [...consultationsList, ...examensList, ...soinsList].forEach(item => {
      if (item.structure && item.structure !== 'Non spécifiée') {
        structuresUniques.add(item.structure);
      }
    });
    const nbStructures = structuresUniques.size;
    const structuresArray = Array.from(structuresUniques);
    
    // Spécialités consultées uniques (à partir du type de consultation)
    const specialitesUniques = new Set();
    [...consultationsList, ...examensList, ...soinsList].forEach(item => {
      if (item.type && item.type !== 'Non spécifié') {
        specialitesUniques.add(item.type);
      }
    });
    const nbSpecialites = specialitesUniques.size;

    return (
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Couverture médicale IPM
        </Text>

        <View style={styles.ipmGrid}>
          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {safeFormatNumber(actesCouvert)}
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Actes couverts
              </Text>
            </View>
          </View>

          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Ionicons name="stats-chart" size={20} color={colors.secondary} />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {tauxCouverture}%
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Taux de couverture
              </Text>
            </View>
          </View>

          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
              <Ionicons name="medical" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {safeFormatNumber(nbSpecialites)}
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Spécialités consultées
              </Text>
            </View>
          </View>

          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="close-circle" size={20} color={colors.error || '#EF4444'} />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {safeFormatNumber(actesRefuses)}
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Actes refusés
              </Text>
            </View>
          </View>

          <View style={styles.ipmItem}>
            <View style={[styles.ipmIcon, { backgroundColor: '#F59E0B' + '20' }]}>
              <Ionicons name="document-text" size={20} color="#F59E0B" />
            </View>
            <View style={styles.ipmContent}>
              <Text style={[styles.ipmValue, { color: colors.primary }]}>
                {safeFormatNumber(ipmStats?.total_feuilles_soins || 0)}
              </Text>
              <Text style={[styles.ipmLabel, { color: colors.textSecondary }]}>
                Feuilles de soins
              </Text>
            </View>
          </View>
        </View>

        {/* Liste des structures partenaires */}
        {structuresArray.length > 0 && (
          <View style={[styles.structuresListContainer, { marginTop: 16 }]}>
            <Text style={[styles.subSectionTitle, { color: colors.primary }]}>
              Structures partenaires ({structuresArray.length})
            </Text>
            <View style={styles.structuresGrid}>
              {structuresArray.map((structure, index) => (
                <View 
                  key={index}
                  style={[styles.structureChip, { 
                    backgroundColor: colors.background || colors.background,
                    borderColor: colors.border 
                  }]}
                >
                  <View  style={[styles.ipmIcon, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="business" size={12} color={colors.success} />
                  </View>
                  <Text style={[styles.structureText, { color: colors.textSecondary }]}>
                    {structure as string}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDetailedDataCard = (title: string, data: any[], iconName: string, color: string) => {
    if (!data || data.length === 0) return null;

    return (
      <View style={styles.detailedDataCard}>
        <View style={styles.detailedDataHeader}>
          <View style={[styles.detailedDataIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={iconName as any} size={16} color={color} />
          </View>
          <Text style={[styles.detailedDataTitle, { color: colors.textPrimary }]}>
            {title} ({data.length})
          </Text>
        </View>
        
        <View style={styles.detailedDataSummary}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Total
            </Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              {safeFormatCurrency(data.reduce((sum, item) => sum + (item.montant || 0), 0))}
            </Text>
          </View>
          
          <View style={[styles.summaryDivider, { backgroundColor: colors.border || '#e0e0e0' }]} />
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Remboursé
            </Text>
            <Text style={[styles.summaryValue, { color: colors.success || '#10B981' }]}>
              {safeFormatCurrency(data.reduce((sum, item) => sum + (item.remboursement || 0), 0))}
            </Text>
          </View>
          
          <View style={[styles.summaryDivider, { backgroundColor: colors.border || '#e0e0e0' }]} />
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Retenu
            </Text>
            <Text style={[styles.summaryValue, { color: colors.error || '#EF4444' }]}>
              {safeFormatCurrency(data.reduce((sum, item) => sum + (item.retenue || 0), 0))}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  

  const renderDetailedData = () => {
    return (
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <View style={styles.detailedDataTitleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Activité médicale ({selectedYear})
          </Text>
          <TouchableOpacity
            style={[styles.toggleButton, { 
              backgroundColor: showDetailedView ? colors.primary : colors.background,
              borderColor: colors.primary,
              borderWidth: 1
            }]}
            onPress={() => setShowDetailedView(!showDetailedView)}
          >
            <Text style={[styles.toggleButtonText, { 
              color: showDetailedView ? colors.textTertiary : colors.primary 
            }]}>
              {showDetailedView ? 'Masquer' : 'Afficher'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cartes de résumé */}
        <View style={styles.detailedDataGrid}>
          {renderDetailedDataCard('Consultations', consultationsList, 'medical', colors.primary)}
          {renderDetailedDataCard('Examens', examensList, 'flask', colors.secondary)}
          {renderDetailedDataCard('Soins', soinsList, 'bed', '#8B5CF6')}
          {renderDetailedDataCard('Médicaments', medicamentsList, 'medical', colors.success || '#10B981')}
          {renderDetailedDataCard('Prothèses', prothesesList, 'hardware-chip', '#F59E0B')}
        </View>

        {showDetailedView && (
          <View style={styles.detailedDataList}>
            <Text style={[styles.detailedDataSubtitle, { color: colors.primary }]}>
              Liste complète
            </Text>
            
            {/* Combine toutes les données pour affichage */}
            {[
              ...consultationsList.map(item => ({ ...item, category: 'Consultation', color: colors.primary })),
              ...examensList.map(item => ({ ...item, category: 'Examen', color: colors.secondary })),
              ...soinsList.map(item => ({ ...item, category: 'Soin', color: '#8B5CF6' })),
              ...medicamentsList.map(item => ({ ...item, category: 'Médicament', color: colors.success || '#10B981' })),
              ...prothesesList.map(item => ({ ...item, category: 'Prothèse', color: '#F59E0B' }))
            ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 20) // Limiter à 20 éléments pour la performance
            .map((item, index) => (
              <View key={`${item.category}-${item.id}`} style={[styles.detailedDataItem, { 
                backgroundColor: colors.background,
                borderLeftColor: item.color,
                borderLeftWidth: 3
              }]}>
                <View style={styles.detailedDataItemHeader}>
                  <Text style={[styles.detailedDataItemDate, { color: colors.textSecondary }]}>
                    {item.date}
                  </Text>
                  <View style={[styles.detailedDataItemCategory, { backgroundColor: item.color + '20' }]}>
                    <Text style={[styles.detailedDataItemCategoryText, { color: item.color }]}>
                      {item.category}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.detailedDataItemType, { color: colors.textPrimary }]}>
                  {item.type}
                </Text>
                
                <View style={styles.detailedDataItemFooter}>
                  <View style={styles.detailedDataItemAmounts}>
                    <Text style={[styles.detailedDataItemAmount, { color: colors.textPrimary }]}>
                      Montant: {safeFormatCurrency(item.montant)}
                    </Text>
                    {!item.exclu && (
                      <>
                        <Text style={[styles.detailedDataItemAmount, { color: colors.success || '#10B981' }]}>
                          Remb.: {safeFormatCurrency(item.remboursement)}
                        </Text>
                        <Text style={[styles.detailedDataItemAmount, { color: colors.error || '#EF4444' }]}>
                          Ret.: {safeFormatCurrency(item.retenue)}
                        </Text>
                      </>
                    )}
                    {item.exclu && (
                      <Text style={[styles.detailedDataItemAmount, { color: colors.error || '#EF4444' }]}>
                        Exclu
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.detailedDataItemBenef, { color: colors.textSecondary }]}>
                    {item.beneficiaire}
                  </Text>
                </View>
              </View>
            ))}
            
            <Text style={[styles.detailedDataNote, { color: colors.textSecondary }]}>
              Affichage limité aux 20 entrées les plus récentes
            </Text>
          </View>
        )}
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
      <CustomHeader title="Suivi Facturation" showBackButton={true} />
      
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
        {renderFinancialAnalytics()}
        {renderDetailedData()}
        {renderIpmAnalytics()}
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
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  evolutionChart: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 200,
  },
  monthColumn: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 50,
    height: 180,
    justifyContent: 'center',
  },
  monthBar: {
    width: 24,
    borderRadius: 2,
  },
  monthBarUp: {
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  monthBarDown: {
    alignSelf: 'flex-start',
    marginTop: 4,
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

  // Detailed data styles
  detailedDataCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  detailedDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailedDataIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  detailedDataTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailedDataAmount: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  detailedDataTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailedDataGrid: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  detailedListContainer: {
    maxHeight: 400,
  },
  detailedListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginBottom: 4,
    borderLeftWidth: 3,
  },
  detailedListLeft: {
    flex: 1,
  },
  detailedListDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailedListType: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailedListRight: {
    alignItems: 'flex-end',
  },
  detailedListAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailedListRemb: {
    fontSize: 12,
  },

  // Structures partenaires styles
  structuresListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  structuresGrid: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 8,
  },
  structureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 40,
    flex: 1,
    maxWidth: '100%',
  },
  structureIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  structureText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
    textAlign: 'left',
  },

  // Detailed data summary styles
  detailedDataSummary: {
    flexDirection: 'row',
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
    marginHorizontal: 8,
  },

  // Detailed data list styles
  detailedDataList: {
    marginTop: 16,
  },
  detailedDataSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailedDataItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  detailedDataItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailedDataItemDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailedDataItemCategory: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  detailedDataItemCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailedDataItemType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailedDataItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  detailedDataItemAmounts: {
    flex: 1,
  },
  detailedDataItemAmount: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailedDataItemBenef: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'right',
    maxWidth: '40%',
  },
  detailedDataNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});