import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // <-- CHANGEMENT ICI
import { useAuth } from '../../components/AuthProvider';

/**
 * Écran Actualités :
 * Affiche une liste d'actualités ou de mises à jour pour les utilisateurs connectés.
 * Accessible via la barre d'onglets.
 */
export default function ActualitesScreen() {
  const { user, logout, loading: authLoading } = useAuth();

  const newsItems = [
    { id: 'n1', title: 'Nouvelle fonctionnalité de suivi des candidatures', date: '15/06/2025', content: 'Nous avons lancé une nouvelle fonctionnalité permettant de suivre l\'état de vos candidatures en temps réel.' },
    { id: 'n2', title: 'Atelier en ligne : Optimiser votre CV', date: '10/06/2025', content: 'Participez à notre prochain atelier gratuit sur les meilleures pratiques pour rédiger un CV percutant.' },
    { id: 'n3', title: 'Top 10 des secteurs d\'emploi en croissance', date: '01/06/2025', content: 'Découvrez les secteurs qui recrutent le plus cette année et préparez votre carrière.' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Actualités</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          disabled={authLoading}
        >
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionTitle}>Dernières Actualités</Text>
        {newsItems.map(item => (
          <View key={item.id} style={styles.newsCard}>
            <Text style={styles.newsTitle}>{item.title}</Text>
            <Text style={styles.newsDate}>{item.date}</Text>
            <Text style={styles.newsContent}>{item.content}</Text>
            <TouchableOpacity style={styles.readMoreButton}>
              <Text style={styles.readMoreButtonText}>Lire la suite</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Text style={styles.footerText}>Restez informé avec JobBoard !</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    // RETIRÉ : paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#091e60', // Primary Dark Blue
    width: '100%',
    // RETIRÉ : paddingTop: Platform.OS === 'android' ? 25 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF', // White text
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB', // Light gray for welcome text
    flexShrink: 1,
    marginHorizontal: 10,
  },
  logoutButton: {
    backgroundColor: '#0f8e35', // Secondary Green
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContainer: {
    padding: 24,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 20,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 5,
  },
  newsDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  newsContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  readMoreButton: {
    marginTop: 15,
    alignSelf: 'flex-start',
  },
  readMoreButtonText: {
    color: '#0f8e35',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
});
