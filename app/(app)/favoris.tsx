import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  StatusBar 
} from 'react-native';
import { router } from 'expo-router';
import { getFavoris, removeFromFavoris } from '../../utils/api';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeContext';
import AntDesign from '@expo/vector-icons/AntDesign';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { LinearGradient } from 'expo-linear-gradient';

interface FavoriItem {
  id: number;
  offre_id: number;
  titre: string;
  entreprise: string;
  lieu: string;
  type_contrat: string;
  date_fin: string;
  created_at: string;
}

export default function FavorisScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [favoris, setFavoris] = useState<FavoriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingFavori, setRemovingFavori] = useState<number | null>(null);

  const fetchFavoris = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getFavoris();
      if (response.success) {
        setFavoris(response.data);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des favoris:', error);
      Alert.alert('Erreur', 'Impossible de charger vos favoris');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFavoris();
    setRefreshing(false);
  }, [fetchFavoris]);

  useEffect(() => {
    fetchFavoris();
  }, [fetchFavoris]);

  const handleRemoveFavori = async (offreId: number) => {
    Alert.alert(
      "Supprimer des favoris",
      "Êtes-vous sûr de vouloir supprimer cette offre de vos favoris ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              setRemovingFavori(offreId);
              await removeFromFavoris(offreId);
              setFavoris(favoris.filter(f => f.offre_id !== offreId));
              Alert.alert("Succès", "Offre supprimée des favoris");
            } catch (error: any) {
              Alert.alert("Erreur", "Impossible de supprimer des favoris");
            } finally {
              setRemovingFavori(null);
            }
          }
        }
      ]
    );
  };

  const handleJobPress = (offreId: number) => {
    router.push(`/(app)/job_board/job_details?id=${offreId}`);
  };

  const renderFavoriItem = ({ item }: { item: FavoriItem }) => (
    <TouchableOpacity
      style={[styles.favoriCard, { backgroundColor: colors.background }]}
      onPress={() => handleJobPress(item.offre_id)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={[styles.jobTitle, { color: colors.primary }]}>{item.titre}</Text>
          <Text style={[styles.companyName, { color: colors.textSecondary }]}>{item.entreprise}</Text>
        </View>
        
        <TouchableOpacity
          onPress={() => handleRemoveFavori(item.offre_id)}
          style={styles.removeButton}
          disabled={removingFavori === item.offre_id}
        >
          {removingFavori === item.offre_id ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <AntDesign name="heart" size={20} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.infoRow}>
          <EvilIcons name="location" size={18} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.lieu}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <AntDesign name="file1" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.type_contrat}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          Ajouté le {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </Text>
        
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: colors.secondary }]}
          onPress={() => handleJobPress(item.offre_id)}
        >
          <Text style={[styles.viewButtonText, { color: colors.textTertiary }]}>Voir détails</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <AntDesign name="hearto" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.primary }]}>Aucun favori</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Vous n'avez pas encore ajouté d'offres à vos favoris.{'\n'}
        Explorez les offres d'emploi pour commencer !
      </Text>
      <TouchableOpacity
        style={[styles.exploreButton, { backgroundColor: colors.secondary }]}
        onPress={() => router.push('/(app)/job_board')}
      >
        <Text style={[styles.exploreButtonText, { color: colors.textTertiary }]}>
          Explorer les offres
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && favoris.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <CustomHeader title="Mes Favoris" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement de vos favoris...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader title="Mes Favoris" showBackButton={true} />
      
      <FlatList
        data={favoris}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderFavoriItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={EmptyState}
        contentContainerStyle={favoris.length === 0 ? styles.emptyListContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  favoriCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
  },
  cardInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});