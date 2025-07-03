import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { getInterimCertificates } from '../../../utils/api'; // Nouvelle fonction API
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Interface pour un certificat (adaptez selon les champs réels de votre table 'attestations')
interface Certificate {
  id: number;
  libelle_attestation?: string; // Exemple de champ, à remplacer par le vrai libellé
  date_emission?: string; // Exemple de champ
  // ... autres champs pertinents comme numero_attestation, type_certificat, etc.
}

export default function HrFileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCertificates = useCallback(async () => {
    if (!user) {
      setCertificates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedCertificates = await getInterimCertificates();
      setCertificates(fetchedCertificates);
    } catch (err: any) {
      console.error("Erreur de chargement des certificats:", err);
      setError(err.message || t("Impossible de charger les certificats."));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Dossier RH pressé !")); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  const renderCertificateItem = ({ item }: { item: Certificate }) => (
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Ionicons name="document-text-outline" size={24} color={colors.secondary} style={styles.itemIcon} />
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.libelle_attestation || t("Certificat sans titre")}</Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Date d'émission:")} {item.date_emission ? new Date(item.date_emission).toLocaleDateString() : t("Non disponible")}
        </Text>
        {/* Ajoutez d'autres détails du certificat ici */}
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader title={t("Mon Dossier RH")} user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="documents-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Mes Certificats')}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement des certificats...')}</Text>
            </View>
          ) : error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadCertificates}>
                <Text style={styles.retryButtonText}>{t('Réessayer')}</Text>
              </TouchableOpacity>
            </View>
          ) : certificates.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="file-tray-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('Aucun certificat trouvé')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('Vos certificats apparaîtront ici.')}</Text>
            </View>
          ) : (
            <FlatList
              data={certificates}
              renderItem={renderCertificateItem}
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
  // NOUVEAU: Styles pour le texte en pourcentages dans les détails
  percentageText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
