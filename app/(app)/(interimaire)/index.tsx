import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import CustomHeader from '../../../components/CustomHeader'; 
import { useAuth } from '../../../components/AuthProvider'; 
import { useTheme } from '../../../components/ThemeContext'; 
import { useLanguage } from '../../../components/LanguageContext';

export default function InterimDashboardScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Intérimaire pressé !")); };
  const handleAvatarPress = () => { Alert.alert(t("Profil"), t("Avatar Intérimaire pressé !")); };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader
        title={t("Espace Intérimaire")}
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.welcomeText, { color: colors.textPrimary }]}>
            {t("Bienvenue")}, {user?.name || t("Intérimaire")}!
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            {t("Gérez ici vos activités de recrutement.")}
          </Text>
        </View>

        {/* Ajoutez ici des sections spécifiques à l'intérimaire */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t("Statistiques Rapides")}</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{t("Statistiques sur les offres créées, les candidats consultés, etc.")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
  },
});