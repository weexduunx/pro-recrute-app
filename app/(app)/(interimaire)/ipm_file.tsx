import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { getInterimLoans } from '../../../utils/api'; // Nouvelle fonction API
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Interface pour un échéancier parent (Echelonnement)
interface Loan {
  id: number;
  montant_total?: number; // Montant total du prêt
  date_debut_echelonnement?: string;
  // ... autres champs pertinents du parent échéancier
  details?: LoanDetail[]; // Relations vers les détails de l'échéancier
}

// Interface pour un détail d'échéancier (EchelonnemenDetails)
interface LoanDetail {
  id: number;
  echelonnement_id: number;
  montant: number; // Montant de la tranche
  mois: string; // Mois de la tranche
  // ... autres champs
}

export default function IpmFileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLoans = useCallback(async () => {
    if (!user) {
      setLoans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedLoans = await getInterimLoans();
      setLoans(fetchedLoans);
    } catch (err: any) {
      console.error("Erreur de chargement des prêts:", err);
      setError(err.message || t("Impossible de charger les détails des prêts."));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Dossier IPM pressé !")); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  const renderLoanItem = ({ item }: { item: Loan }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Ionicons name="wallet-outline" size={24} color={colors.secondary} style={styles.itemIcon} />
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{t('Prêt')} #{item.id} - {item.montant_total ?? t('Non spécifié')} FCFA</Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Début:")} {item.date_debut_echelonnement ? new Date(item.date_debut_echelonnement).toLocaleDateString() : t("N/A")}
        </Text>
        {item.details && item.details.length > 0 && (
          <View style={styles.detailsList}>
            <Text style={[styles.detailsListTitle, { color: colors.textPrimary }]}>{t('Détails des mensualités :')}</Text>
            {item.details.map(detail => (
              <Text key={detail.id} style={[styles.detailsListItem, { color: colors.textSecondary }]}>
                - {detail.mois}: {detail.montant} FCFA
              </Text>
            ))}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader title={t("Mon Dossier IPM")} user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Mes Prêts et Échéanciers')}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement des prêts...')}</Text>
            </View>
          ) : error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadLoans}>
                <Text style={styles.retryButtonText}>{t('Réessayer')}</Text>
              </TouchableOpacity>
            </View>
          ) : loans.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('Aucun prêt trouvé')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('Aucun détail de prêt disponible pour le moment.')}</Text>
            </View>
          ) : (
            <FlatList
              data={loans}
              renderItem={renderLoanItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false} // Géré par la ScrollView parente
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 12,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    // Styles pour le conteneur de FlatList si nécessaire
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemIcon: {
    marginRight: 15,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
  },
  detailsList: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  detailsListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailsListItem: {
    fontSize: 13,
    marginBottom: 2,
  },
});
