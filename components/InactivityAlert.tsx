// components/InactivityAlert.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { useInactivityMonitoring } from '../hooks/useInactivityMonitoring';

interface InactivityAlertProps {
  onDismiss?: () => void;
}

export default function InactivityAlert({ onDismiss }: InactivityAlertProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { 
    inactivityDays, 
    hasActiveWarnings, 
    getDaysUntilDeletion,
    recordActivity,
    loading 
  } = useInactivityMonitoring();

  if (loading || !hasActiveWarnings()) {
    return null;
  }

  const daysUntilDeletion = getDaysUntilDeletion();
  
  const handleStayActive = async () => {
    await recordActivity();
    Alert.alert(
      t('Activité enregistrée'),
      t('Votre compte reste actif. Merci de continuer à utiliser l\'application.'),
      [{ text: 'OK', onPress: onDismiss }]
    );
  };

  const getAlertColor = () => {
    if (daysUntilDeletion <= 1) return '#DC2626'; // Rouge foncé
    if (daysUntilDeletion <= 5) return '#EF4444'; // Rouge
    if (daysUntilDeletion <= 10) return '#F59E0B'; // Orange
    return '#EAB308'; // Jaune
  };

  const getAlertIcon = () => {
    if (daysUntilDeletion <= 1) return 'alert-circle';
    if (daysUntilDeletion <= 5) return 'warning';
    return 'information-circle';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: getAlertColor() }]}>
      <View style={styles.header}>
        <Ionicons 
          name={getAlertIcon()} 
          size={24} 
          color={getAlertColor()} 
        />
        <Text style={[styles.title, { color: getAlertColor() }]}>
          {t('Alerte d\'inactivité')}
        </Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.message, { color: colors.textPrimary }]}>
          {daysUntilDeletion <= 1 
            ? t('Votre compte sera supprimé demain si vous ne vous connectez pas.')
            : t(`Votre compte sera supprimé dans ${daysUntilDeletion} jours d'inactivité.`)
          }
        </Text>
        
        <Text style={[styles.subMessage, { color: colors.textSecondary }]}>
          {t(`Vous n'avez pas utilisé l'application depuis ${inactivityDays} jours.`)}
        </Text>

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={handleStayActive}
        >
          <Ionicons name="refresh" size={16} color="#ffffff" />
          <Text style={styles.actionButtonText}>
            {t('Je reste actif')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
        <View 
          style={[
            styles.progressBar, 
            { 
              backgroundColor: getAlertColor(),
              width: `${Math.min(100, (inactivityDays / 90) * 100)}%`
            }
          ]} 
        />
      </View>
      
      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
        {t(`${inactivityDays}/90 jours d'inactivité`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    fontWeight: '500',
  },
  subMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'center',
  },
});