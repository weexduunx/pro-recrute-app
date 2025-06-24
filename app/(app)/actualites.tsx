import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import CustomHeader from '../../components/CustomHeader';

/**
 * Écran Actualités :
 * Affiche une liste d'actualités ou de mises à jour pour les utilisateurs connectés.
 * Utilise le composant CustomHeader.
 */
export default function ActualitesScreen() {
  const { user, logout, loading: authLoading } = useAuth();

  const newsItems = [
    { id: 'n1', title: 'Nouvelle fonctionnalité de suivi des candidatures', date: '15/06/2025', content: 'Nous avons lancé une nouvelle fonctionnalité permettant de suivre l\'état de vos candidatures en temps réel.' },
    { id: 'n2', title: 'Atelier en ligne : Optimiser votre CV', date: '10/06/2025', content: 'Participez à notre prochain atelier gratuit sur les meilleures pratiques pour rédiger un CV percutant.' },
    { id: 'n3', title: 'Top 10 des secteurs d\'emploi en croissance', date: '01/06/2025', content: 'Découvrez les secteurs qui recrutent le plus cette année et préparez votre carrière.' },
  ];

  // Fonctions de gestion des pressions sur le menu/avatar
  const handleMenuPress = () => {
    Alert.alert("Menu", "Menu Actualités pressé ! (À implémenter)");
  };

  const handleAvatarPress = () => {
    Alert.alert("Profil", "Avatar Actualités pressé ! (À implémenter, ex: naviguer vers le profil)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Remplacer l'en-tête par CustomHeader */}
      <CustomHeader
        title="Actualités"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

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
    // Le paddingTop pour Android est géré par SafeAreaView lui-même
  },
  // RETIRÉ L'EN-TÊTE D'ICI, il est maintenant dans CustomHeader.tsx
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
