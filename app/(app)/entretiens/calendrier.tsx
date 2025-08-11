import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar, RefreshControl, Dimensions } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { getCandidatEntretiensCalendrier } from '../../../utils/api';
import { router } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader';
import { useTheme } from '../../../components/ThemeContext';

const { width } = Dimensions.get('window');
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function EntretiensCalendrierScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [entretiens, setEntretiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadEntretiens = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const fetchedEntretiens = await getCandidatEntretiensCalendrier();
        setEntretiens(fetchedEntretiens);
      } catch (error: any) {
        console.error("Erreur de chargement des entretiens:", error);
        setEntretiens([]);
      } finally {
        setLoading(false);
      }
    } else {
      setEntretiens([]);
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEntretiens();
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadEntretiens]);

  useEffect(() => {
    loadEntretiens();
  }, [loadEntretiens]);

  // Fonctions du calendrier
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEntretiensForDate = (date: Date) => {
    // Utiliser une fonction qui évite les problèmes de fuseau horaire
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Support des deux formats d'API
    const matches = entretiens.filter(e => (e.date_entretien || e.date) === dateStr);
    return matches;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const formatTimeOnly = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Génération du calendrier
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Jours vides du mois précédent
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      days.push(date);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const selectedDateEntretiens = getEntretiensForDate(selectedDate);

  const renderCalendarDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const dayEntretiens = getEntretiensForDate(date);
    const hasEntretiens = dayEntretiens.length > 0;
    const isSelected = isSameDate(date, selectedDate);
    const isToday_ = isToday(date);

    return (
      <TouchableOpacity
        key={date.getTime()}
        style={[
          styles.calendarDay,
          isSelected && styles.selectedDay,
          isToday_ && styles.todayDay,
          hasEntretiens && styles.dayWithEntretiens
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text style={[
          styles.dayText,
          isSelected && styles.selectedDayText,
          isToday_ && styles.todayDayText,
          hasEntretiens && styles.dayWithEntretiensText
        ]}>
          {date.getDate()}
        </Text>
        {hasEntretiens && (
          <View style={styles.entretienIndicator}>
            <Text style={styles.entretienCount}>{dayEntretiens.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEntretienItem = (entretien: any) => {
    // Support des deux formats d'API
    const dateEntretien = entretien.date_entretien || entretien.date;
    const heureEntretien = entretien.heure_entretien || entretien.heure;
    const isExpired = new Date(`${dateEntretien}T${heureEntretien}`) < new Date();
    
    return (
      <TouchableOpacity
        key={entretien.id}
        style={[
          styles.entretienListItem,
          isExpired && styles.entretienListItemExpired
        ]}
        onPress={() => router.push(`/(app)/entretiens/details?id=${entretien.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.entretienTimeContainer}>
          <Text style={[
            styles.entretienTime,
            isExpired && styles.expiredText
          ]}>
            {formatTimeOnly(heureEntretien)}
          </Text>
          <View style={[
            styles.entretienTypeBadge,
            { backgroundColor: entretien.type_entretien === 1 ? '#10B981' : '#3B82F6' }
          ]}>
            <Text style={styles.entretienTypeBadgeText}>
              {entretien.type_entretien === 1 ? 'Final' : 'Sélection'}
            </Text>
          </View>
        </View>
        
        <View style={styles.entretienInfoContainer}>
          <Text style={[
            styles.entretienTitle,
            isExpired && styles.expiredText
          ]} numberOfLines={2}>
            {entretien.titre_offre || entretien.offre?.titre || 'Titre non disponible'}
          </Text>
          <Text style={[
            styles.entretienCompany,
            isExpired && styles.expiredText
          ]}>
            {entretien.entreprise_nom || entretien.offre?.entreprise_nom || 'Entreprise'}
          </Text>
        </View>

        <View style={styles.entretienActionContainer}>
          <FontAwesome5 
            name="chevron-right" 
            size={16} 
            color={isExpired ? '#D1D5DB' : '#9CA3AF'} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Calendrier des Entretiens"
          user={user}
          showBackButton={true}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0f8e35" />
              <Text style={styles.loadingText}>Chargement du calendrier...</Text>
            </View>
          ) : (
            <>
              {/* Header du calendrier */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={() => navigateMonth('prev')}
                >
                  <FontAwesome5 name="chevron-left" size={18} color="#091e60" />
                </TouchableOpacity>
                
                <View style={styles.monthYearContainer}>
                  <Text style={styles.monthYearText}>
                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </Text>
                  <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
                    <Text style={styles.todayButtonText}>Aujourd'hui</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={() => navigateMonth('next')}
                >
                  <FontAwesome5 name="chevron-right" size={18} color="#091e60" />
                </TouchableOpacity>
              </View>

              {/* Calendrier */}
              <View style={styles.calendarContainer}>
                {/* En-têtes des jours */}
                <View style={styles.weekHeader}>
                  {DAY_NAMES.map(dayName => (
                    <View key={dayName} style={styles.weekDayHeader}>
                      <Text style={styles.weekDayText}>{dayName}</Text>
                    </View>
                  ))}
                </View>

                {/* Grille du calendrier */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((date, index) => renderCalendarDay(date, index))}
                </View>
              </View>


              {/* Entretiens du jour sélectionné */}
              <View style={styles.selectedDateContainer}>
                <Text style={styles.selectedDateTitle}>
                  {formatDateForDisplay(selectedDate)}
                </Text>
                
                {selectedDateEntretiens.length === 0 ? (
                  <View style={styles.noEntretiensContainer}>
                    <FontAwesome5 name="calendar-alt" size={32} color="#9CA3AF" />
                    <Text style={styles.noEntretiensText}>
                      Aucun entretien prévu ce jour
                    </Text>
                  </View>
                ) : (
                  <View style={styles.entretiensListContainer}>
                    <Text style={styles.entretiensListTitle}>
                      {selectedDateEntretiens.length} entretien{selectedDateEntretiens.length > 1 ? 's' : ''} prévu{selectedDateEntretiens.length > 1 ? 's' : ''}
                    </Text>
                    {selectedDateEntretiens.map(entretien => renderEntretienItem(entretien))}
                  </View>
                )}
              </View>

              {/* Légende */}
              <View style={styles.legendeContainer}>
                <Text style={styles.legendeTitle}>Légende</Text>
                <View style={styles.legendeItems}>
                  <View style={styles.legendeItem}>
                    <View style={[styles.legendeDot, { backgroundColor: '#0f8e35' }]} />
                    <Text style={styles.legendeText}>Jour avec entretien(s)</Text>
                  </View>
                  <View style={styles.legendeItem}>
                    <View style={[styles.legendeDot, { backgroundColor: '#091e60' }]} />
                    <Text style={styles.legendeText}>Jour sélectionné</Text>
                  </View>
                  <View style={styles.legendeItem}>
                    <View style={[styles.legendeDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.legendeText}>Aujourd'hui</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    margin: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Header du calendrier
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthYearContainer: {
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 4,
  },
  todayButton: {
    backgroundColor: '#091e60',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Calendrier
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: width / 7 - 16,
    height: 48,
    marginBottom: 4,
  },
  calendarDay: {
    width: (width - 72) / 7, // 72 = margins + padding
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 8,
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: '#091e60',
  },
  todayDay: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  dayWithEntretiens: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#0f8e35',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  todayDayText: {
    color: '#D97706',
    fontWeight: '700',
  },
  dayWithEntretiensText: {
    color: '#047857',
    fontWeight: '600',
  },
  entretienIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entretienCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Date sélectionnée
  selectedDateContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  noEntretiensContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noEntretiensText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  entretiensListContainer: {
    marginTop: 8,
  },
  entretiensListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },

  // Items d'entretien
  entretienListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0f8e35',
  },
  entretienListItemExpired: {
    opacity: 0.6,
    borderLeftColor: '#9CA3AF',
  },
  entretienTimeContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  entretienTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 4,
  },
  entretienTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  entretienTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  entretienInfoContainer: {
    flex: 1,
  },
  entretienTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  entretienCompany: {
    fontSize: 12,
    color: '#6B7280',
  },
  entretienActionContainer: {
    marginLeft: 12,
  },
  expiredText: {
    color: '#9CA3AF',
  },

  // Légende
  legendeContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  legendeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  legendeItems: {
    gap: 8,
  },
  legendeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendeText: {
    fontSize: 12,
    color: '#6B7280',
  },

});