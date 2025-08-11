import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface CalendrierEntretiensProps {
  entretiens: any[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function CalendrierEntretiens({
  entretiens,
  selectedDate,
  onDateSelect,
  onMonthChange
}: CalendrierEntretiensProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  // Fonctions utilitaires
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
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

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  // Génération des jours du calendrier
  const calendarDays = useMemo(() => {
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
  }, [currentMonth]);

  const renderCalendarDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const dayEntretiens = getEntretiensForDate(date);
    const hasEntretiens = dayEntretiens.length > 0;
    const isSelected = isSameDate(date, selectedDate);
    const isToday_ = isToday(date);
    const isPast = date < new Date() && !isToday_;

    // Déterminer le type d'entretien dominant pour la couleur
    let dominantType = 'default';
    if (hasEntretiens) {
      const hasUrgent = dayEntretiens.some(e => {
        const dateEntretien = e.date_entretien || e.date;
        const heureEntretien = e.heure_entretien || e.heure;
        const entretienDate = new Date(`${dateEntretien}T${heureEntretien}`);
        const now = new Date();
        const diffHours = (entretienDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours <= 24 && diffHours > 0;
      });
      
      if (hasUrgent) {
        dominantType = 'urgent';
      } else if (dayEntretiens.some(e => e.type_entretien === 1)) {
        dominantType = 'final';
      } else {
        dominantType = 'selection';
      }
    }

    return (
      <TouchableOpacity
        key={date.getTime()}
        style={[
          styles.calendarDay,
          isSelected && styles.selectedDay,
          isToday_ && styles.todayDay,
          hasEntretiens && styles.dayWithEntretiens,
          hasEntretiens && dominantType === 'urgent' && styles.dayUrgent,
          hasEntretiens && dominantType === 'final' && styles.dayFinal,
          isPast && styles.pastDay
        ]}
        onPress={() => onDateSelect(date)}
        disabled={isPast && !hasEntretiens}
      >
        <Text style={[
          styles.dayText,
          isSelected && styles.selectedDayText,
          isToday_ && styles.todayDayText,
          hasEntretiens && styles.dayWithEntretiensText,
          isPast && !hasEntretiens && styles.pastDayText
        ]}>
          {date.getDate()}
        </Text>
        
        {hasEntretiens && (
          <View style={[
            styles.entretienIndicator,
            dominantType === 'urgent' && styles.urgentIndicator,
            dominantType === 'final' && styles.finalIndicator,
            dominantType === 'selection' && styles.selectionIndicator
          ]}>
            <Text style={styles.entretienCount}>
              {dayEntretiens.length}
            </Text>
          </View>
        )}

        {hasEntretiens && dayEntretiens.length > 3 && (
          <View style={styles.moreIndicator}>
            <Text style={styles.moreIndicatorText}>+</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header du calendrier */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateMonth('prev')}
        >
          <FontAwesome5 name="chevron-left" size={16} color="#091e60" />
        </TouchableOpacity>
        
        <View style={styles.monthYearContainer}>
          <Text style={styles.monthYearText}>
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateMonth('next')}
        >
          <FontAwesome5 name="chevron-right" size={16} color="#091e60" />
        </TouchableOpacity>
      </View>

      {/* En-têtes des jours de la semaine */}
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

      {/* Légende */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0f8e35' }]} />
            <Text style={styles.legendText}>Sélection</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Final</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Urgent (&lt; 24h)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#091e60' }]} />
            <Text style={styles.legendText}>Sélectionné</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  },

  // En-têtes des jours
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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

  // Grille du calendrier
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: (width - 72) / 7,
    height: 48,
    marginBottom: 4,
  },
  calendarDay: {
    width: (width - 72) / 7,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 8,
    position: 'relative',
  },
  
  // États des jours
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
  dayUrgent: {
    backgroundColor: '#FED7AA',
    borderColor: '#F59E0B',
  },
  dayFinal: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  pastDay: {
    opacity: 0.4,
  },

  // Textes des jours
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
  pastDayText: {
    color: '#9CA3AF',
  },

  // Indicateurs d'entretiens
  entretienIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#0f8e35',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentIndicator: {
    backgroundColor: '#F59E0B',
  },
  finalIndicator: {
    backgroundColor: '#3B82F6',
  },
  selectionIndicator: {
    backgroundColor: '#0f8e35',
  },
  entretienCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  moreIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#6B7280',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIndicatorText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },

  // Légende
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
});