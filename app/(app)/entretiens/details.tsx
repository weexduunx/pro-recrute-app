import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar, Alert, Linking, Share } from 'react-native';
import { useAuth } from '../../../components/AuthProvider';
import { FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import CustomHeader from '../../../components/CustomHeader';
import { useTheme } from '../../../components/ThemeContext';
import { getCandidatEntretiens } from '../../../utils/api';

export default function EntretiensDetailsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  
  const [entretien, setEntretien] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntretienDetails();
  }, [id]);

  const loadEntretienDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const entretiens = await getCandidatEntretiens();
      const foundEntretien = entretiens.find((e: any) => e.id.toString() === id);
      setEntretien(foundEntretien || null);
    } catch (error) {
      console.error("Erreur de chargement des détails:", error);
      setEntretien(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDateComplete = (dateString: string, heureString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    let dateLabel;
    if (date.toDateString() === today.toDateString()) {
      dateLabel = "Aujourd'hui";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateLabel = "Demain";
    } else {
      dateLabel = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    
    return `${dateLabel} à ${heureString.substring(0, 5)}`;
  };

  const getTimeUntilEntretien = () => {
    if (!entretien) return null;
    
    const now = new Date();
    const entretienDate = new Date(`${entretien.date_entretien}T${entretien.heure_entretien}`);
    const diffMs = entretienDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { type: 'passed', text: 'Entretien terminé' };
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return { type: 'future', text: `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}` };
    } else if (diffHours > 0) {
      return { type: 'soon', text: `Dans ${diffHours} heure${diffHours > 1 ? 's' : ''}` };
    } else {
      return { type: 'imminent', text: 'Très bientôt' };
    }
  };

  const getDecisionColor = (decision: number) => {
    switch (decision) {
      case 0: return '#F59E0B'; // En attente - orange
      case 1: return '#3B82F6'; // Passe étape suivante - bleu
      case 2: return '#EF4444'; // Refusé - rouge
      case 3: return '#10B981'; // Accepté - vert
      default: return '#6B7280'; // Par défaut - gris
    }
  };

  const handleJoinMeeting = async () => {
    if (!entretien?.lien) {
      Alert.alert('Erreur', 'Aucun lien de connexion disponible');
      return;
    }
    
    try {
      await Linking.openURL(entretien.lien);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien de connexion');
    }
  };

  const handleShareEntretien = async () => {
    if (!entretien) return;
    
    try {
      const shareContent = `Entretien - ${entretien.offre?.titre || 'Poste'}\n` +
        `Entreprise: ${entretien.offre?.entreprise_nom || 'N/A'}\n` +
        `Date: ${formatDateComplete(entretien.date_entretien, entretien.heure_entretien)}\n` +
        `Type: ${entretien.type_entretien === 1 ? 'Entretien Final' : 'Entretien de sélection'}`;
      
      await Share.share({
        message: shareContent,
        title: 'Détails de l\'entretien'
      });
    } catch (error) {
      console.error('Erreur de partage:', error);
    }
  };

  const handleAddToCalendar = () => {
    Alert.alert(
      'Ajouter au calendrier',
      'Cette fonctionnalité sera bientôt disponible pour synchroniser automatiquement vos entretiens avec votre calendrier.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Détails de l'entretien"
          user={user}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={32} color="#0f8e35" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!entretien) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Détails de l'entretien"
          user={user}
          showBackButton={true}
        />
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-triangle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Entretien non trouvé</Text>
          <Text style={styles.errorText}>
            Cet entretien n'existe pas ou a été supprimé.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const timeInfo = getTimeUntilEntretien();
  const isExpired = timeInfo?.type === 'passed';

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <CustomHeader
          title="Détails de l'entretien"
          user={user}
          showBackButton={true}
          rightComponent={
            <TouchableOpacity onPress={handleShareEntretien} style={styles.headerButton}>
              <FontAwesome5 name="share-alt" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header de l'entretien */}
          <View style={styles.entretienHeader}>
            <Text style={styles.entretienTitre} numberOfLines={3}>
              {entretien.offre?.titre || 'Titre non disponible'}
            </Text>
            <Text style={styles.entretienEntreprise}>
              {entretien.offre?.entreprise_nom || 'Entreprise non spécifiée'}
            </Text>
            
            <View style={styles.dateTimeContainer}>
              <FontAwesome5 name="calendar-alt" size={16} color="#091e60" />
              <Text style={styles.dateTimeText}>
                {formatDateComplete(entretien.date_entretien, entretien.heure_entretien)}
              </Text>
            </View>

            {timeInfo && (
              <View style={[
                styles.countdownBadge,
                { backgroundColor: 
                  timeInfo.type === 'passed' ? '#FEE2E2' :
                  timeInfo.type === 'imminent' ? '#FEF3C7' :
                  timeInfo.type === 'soon' ? '#DBEAFE' :
                  '#F0FDF4'
                }
              ]}>
                <Text style={[
                  styles.countdownText,
                  { color: 
                    timeInfo.type === 'passed' ? '#DC2626' :
                    timeInfo.type === 'imminent' ? '#D97706' :
                    timeInfo.type === 'soon' ? '#2563EB' :
                    '#059669'
                  }
                ]}>
                  {timeInfo.text}
                </Text>
              </View>
            )}
          </View>

          {/* Actions principales */}
          {!isExpired && (
            <View style={styles.actionsContainer}>
              {entretien.lien && (
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={handleJoinMeeting}
                >
                  <FontAwesome5 name="video" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Rejoindre l'entretien</Text>
                </TouchableOpacity>
              )}

              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => router.push('/(app)/entretiens/preparation')}
                >
                  <FontAwesome5 name="book-open" size={16} color="#8B5CF6" />
                  <Text style={styles.secondaryActionText}>Se préparer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleAddToCalendar}
                >
                  <FontAwesome5 name="calendar-plus" size={16} color="#3B82F6" />
                  <Text style={styles.secondaryActionText}>Calendrier</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Informations de l'entretien */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informations</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <FontAwesome5 name="clipboard-list" size={16} color="#091e60" />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemLabel}>Type d'entretien</Text>
                  <Text style={styles.infoItemValue}>
                    {entretien.type_entretien === 1 ? 'Entretien Final' : 'Entretien de sélection'}
                  </Text>
                </View>
              </View>

              {entretien.lien && (
                <View style={styles.infoItem}>
                  <FontAwesome5 name="link" size={16} color="#091e60" />
                  <View style={styles.infoItemContent}>
                    <Text style={styles.infoItemLabel}>Lien de connexion</Text>
                    <TouchableOpacity onPress={handleJoinMeeting}>
                      <Text style={styles.linkText} numberOfLines={2}>
                        {entretien.lien}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.infoItem}>
                <FontAwesome5 name="map-marker-alt" size={16} color="#091e60" />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemLabel}>Lieu</Text>
                  <Text style={styles.infoItemValue}>
                    {entretien.offre?.lieux || 'À distance'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Informations sur l'offre */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Offre d'emploi</Text>
            
            <TouchableOpacity 
              style={styles.offreCard}
              onPress={() => router.push(`/(app)/job_board/job_details?id=${entretien.offre?.id}`)}
            >
              <View style={styles.offreHeader}>
                <FontAwesome5 name="briefcase" size={20} color="#091e60" />
                <Text style={styles.offreTitre}>{entretien.offre?.titre}</Text>
              </View>
              
              <Text style={styles.offreEntreprise}>{entretien.offre?.entreprise_nom}</Text>
              <Text style={styles.offreLieu}>{entretien.offre?.lieux}</Text>
              
              <View style={styles.offreFooter}>
                <Text style={styles.voirOffreText}>Voir l'offre complète</Text>
                <FontAwesome5 name="arrow-right" size={14} color="#091e60" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Statuts (si l'entretien a eu lieu) */}
          {entretien.presence === 1 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Résultat</Text>
              
              <View style={styles.statusCard}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Présence:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.statusBadgeText}>{entretien.presence_label}</Text>
                  </View>
                </View>
                
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Décision:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getDecisionColor(entretien.decision) }]}>
                    <Text style={styles.statusBadgeText}>{entretien.decision_label}</Text>
                  </View>
                </View>
              </View>

              {entretien.observations && (
                <View style={styles.observationsCard}>
                  <Text style={styles.observationsTitle}>Observations</Text>
                  <Text style={styles.observationsText}>{entretien.observations}</Text>
                </View>
              )}

              {entretien.commentaire && (
                <View style={styles.observationsCard}>
                  <Text style={styles.observationsTitle}>Commentaire</Text>
                  <Text style={styles.observationsText}>{entretien.commentaire}</Text>
                </View>
              )}

              {entretien.raison_rejet && (
                <View style={[styles.observationsCard, styles.rejetCard]}>
                  <Text style={styles.rejetTitle}>Raison du rejet</Text>
                  <Text style={styles.rejetText}>{entretien.raison_rejet}</Text>
                </View>
              )}
            </View>
          )}

          {/* Conseils de préparation */}
          {!isExpired && (
            <View style={styles.conseilsSection}>
              <View style={styles.conseilsHeader}>
                <FontAwesome5 name="lightbulb" size={16} color="#F59E0B" />
                <Text style={styles.conseilsTitle}>Conseils pour votre entretien</Text>
              </View>
              
              <View style={styles.conseilsList}>
                <Text style={styles.conseilItem}>
                  • Relisez l'offre d'emploi et vos motivations
                </Text>
                <Text style={styles.conseilItem}>
                  • Préparez des questions sur l'entreprise et le poste
                </Text>
                <Text style={styles.conseilItem}>
                  • Testez votre connexion Internet à l'avance
                </Text>
                <Text style={styles.conseilItem}>
                  • Préparez un environnement calme et professionnel
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.preparationButton}
                onPress={() => router.push('/(app)/entretiens/preparation')}
              >
                <Text style={styles.preparationButtonText}>
                  Accéder au guide de préparation
                </Text>
                <FontAwesome5 name="arrow-right" size={14} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
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
  headerButton: {
    padding: 8,
  },
  
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Header de l'entretien
  entretienHeader: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  entretienTitre: {
    fontSize: 24,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 8,
    lineHeight: 32,
  },
  entretienEntreprise: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  countdownBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Actions
  actionsContainer: {
    margin: 20,
  },
  primaryAction: {
    backgroundColor: '#0f8e35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#0f8e35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
  },

  // Sections d'information
  infoSection: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  infoItemValue: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },

  // Carte offre
  offreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#091e60',
  },
  offreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  offreTitre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginLeft: 12,
    flex: 1,
  },
  offreEntreprise: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  offreLieu: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  offreFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  voirOffreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#091e60',
  },

  // Statuts
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Observations
  observationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  observationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 8,
  },
  observationsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  rejetCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  rejetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  rejetText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },

  // Conseils
  conseilsSection: {
    backgroundColor: '#FFFBEB',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  conseilsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  conseilsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 8,
  },
  conseilsList: {
    marginBottom: 16,
  },
  conseilItem: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 4,
  },
  preparationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  preparationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
  },
});