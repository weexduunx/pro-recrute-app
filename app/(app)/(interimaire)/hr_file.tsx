import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList, Linking } from 'react-native';
import CustomHeader from '../../../components/CustomHeader';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { getInterimAttestations, getDetailsUserGbg, getPdf } from '../../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Animated } from 'react-native';
import { useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';


// Interface pour un certificat (adaptez selon les champs réels de votre table 'attestations')
interface Attestation {
  contrat_id_encrypted: string;
  pdf_url?: string;
  id: number;
  attestation_id: number;
  contrat_id: number;
  user_id: number;
  start_date?: string;
  end_date?: string;
  label_masc?: string;
  label_fem?: string;
  contract_status?: string;
  user_name?: string;
  society_designation?: string;
  category_label?: string;
  category_class?: string;
  convention_label?: string;
  created_at?: string;
  updated_at?: string;
}

interface DetailsUser {
  attestation_id: number;
  gbg_user_name: string;
  attestation_created_at: string;
  attestation_updated_at: string;
}

export default function HrFileScreen() {
  // Hooks pour l'authentification, le thème et la langue
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  // États pour gérer les certificats, le chargement, les erreurs et la sélection
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [detailsUser, setDetailsUser] = useState<DetailsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Attestation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Références pour les animations
  // Utilisation de useRef pour éviter les re-renders inutiles
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Fonction pour ouvrir le modal avec animation
  const openModal = async (item: Attestation) => {
    setSelectedCertificate(item);
    setModalVisible(true);

    // Charger les détails utilisateur pour cette attestation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Fonction pour fermer le modal avec animation
  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedCertificate(null);
    });
  };

  // Fonction pour charger les certificats depuis l'API
  const loadAttestations = useCallback(async () => {
    if (!user) {
      setAttestations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedAttestations = await getInterimAttestations();
      setAttestations(fetchedAttestations);
    } catch (err: any) {
      console.error("Erreur de chargement des attestations:", err);
      setError(err.message || t("Impossible de charger les attestations."));
    } finally {
      setLoading(false);
    }
  }, [user, t]);



  // Chargement initial des certificats
  // Utilisation de useCallback pour éviter les re-renders inutiles
  useEffect(() => {
    loadAttestations();
  }, [loadAttestations]);

  useEffect(() => {
    const fetchDetailsUser = async () => {
      try {
        const response = await getDetailsUserGbg();
        setDetailsUser(response);
      } catch (error) {
        console.error("Erreur chargement des détails utilisateur :", error);
        setDetailsUser([]);
      }
    };

    fetchDetailsUser();
  }, []);


  // Gestion des actions du menu et de l'avatar
  // Ces fonctions peuvent être adaptées pour ouvrir des modals ou naviguer vers d'autres écr
  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Dossier RH pressé !")); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  const sendLocalNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "✅ Attestation prête",
        body: "Votre attestation a été téléchargée avec succès.",
      },
      trigger: null, // immédiat
    });
  };


const handleExportPdf = async () => {
  setExportingPdf(true);
  setExportError(null);
  try {
    await sendLocalNotification();
    
    // Vérifier que l'attestation est sélectionnée
    if (!selectedAttestation) {
      setExportError("Aucune attestation sélectionnée");
      return;
    }
    
    const response = await getPdf(selectedAttestation.contrat_id);
    
  } catch (err: any) {
    console.error("Erreur lors de l'exportation de l'attestation:", err);
    setExportError(err.message || t("Échec de l'exportation du CV."));
  } finally {
    setExportingPdf(false);
  }
};

  // Fonction pour rendre chaque item de certificat
  const renderCertificateItem = ({ item }: { item: Attestation }) => (

    
    <View style={[styles.cardItem, { backgroundColor: colors.cardBackground, borderColor: colors.border, overflow: 'hidden' }]}>
      {/* Icône de fichier en background */}
      <Ionicons
        name="document-outline"
        size={190}
        color={colors.textSecondary + '12'}
        style={{
          position: 'absolute',
          right: -30,
          top: -10,
          zIndex: 0,
        }}
      />
      <View style={[styles.itemContent, { zIndex: 1 }]}>
        <View
          style={{
            backgroundColor: item.updated_at
              ? '#d4edda'
              : '#fff3cd',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 8,
            alignSelf: 'flex-start',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: item.updated_at
                ? '#155724'
                : '#856404',
              fontWeight: 'bold',
              fontSize: 13,
            }}
          >
            {item.updated_at ? t('Récupéré') : t('Non récupéré')}
          </Text>
        </View>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
          {t("Date Attestée :")}  {item.start_date ? new Date(item.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '...'}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
          {t("Période :")} {item.start_date ? new Date(item.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '...'} - {item.end_date ? new Date(item.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '...'}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{t("Convention :")} {item.convention_label}</Text>

        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary, marginRight: 10 }]}
            onPress={() => openModal(item)}
          >
            <Ionicons name="eye-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionButtonText}>{t("Voir détails")}</Text>
          </TouchableOpacity>

      
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
              onPress={handleExportPdf} disabled={exportingPdf}
            >
              {exportingPdf ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>{t("Télécharger")}</Text>
                </>
              )}
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );


  // Rendu principal du composant
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CustomHeader title={t("Mon Dossier RH")} user={user} onMenuPress={handleMenuPress} onAvatarPress={handleAvatarPress} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="documents-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Mes Attestations')}</Text>
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
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadAttestations}>
                <Text style={styles.retryButtonText}>{t('Réessayer')}</Text>
              </TouchableOpacity>
            </View>
          ) : attestations.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground, position: 'relative', overflow: 'hidden' }]}>
              {/* Icône de fichier en background */}
              <Ionicons
                name="file-tray-outline"
                size={120}
                color={colors.textSecondary + '22'}
                style={{
                  position: 'absolute',
                  top: '20%',
                  left: '50%',
                  transform: [{ translateX: -60 }],
                  zIndex: 0,
                }}
              />
              {/* Icône principale au premier plan */}
              <Ionicons name="file-tray-outline" size={48} color={colors.textSecondary} style={{ zIndex: 1 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, zIndex: 1 }]}>{t('Aucun certificat trouvé')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary, zIndex: 1 }]}>{t('Vos certificats apparaîtront ici.')}</Text>
            </View>
          ) : (
            <FlatList
              data={attestations}
              renderItem={renderCertificateItem}
              keyExtractor={item => item?.id?.toString() ?? `item-${Math.random()}`}
              scrollEnabled={false} // Géré par la ScrollView parente
              contentContainerStyle={styles.listContainer}
            />
          )}

        </View>
      </ScrollView>
      {/* NOUVEAU: Animation pour le modal */}
      {
        modalVisible && selectedCertificate && (
          <Animated.View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            zIndex: 99,
            opacity: fadeAnim,
          }}>
            <Animated.View style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxHeight: '90%',
              transform: [{ translateY: slideAnim }],
            }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.itemTitle, { fontSize: 18, marginBottom: 10, color: colors.textPrimary }]}>
                  <Ionicons name="briefcase-outline" size={18} color={colors.textPrimary} /> {selectedCertificate.label_masc || selectedCertificate.label_fem || t("Poste")}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="person-outline" size={16} /> {t("Employé :")} {selectedCertificate.user_name}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="business-outline" size={16} /> {t("Société :")} {selectedCertificate.society_designation}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="document-outline" size={16} /> {t("Statut :")} {selectedCertificate.contract_status}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="calendar-outline" size={16} /> {t("Période :")}
                  {selectedCertificate.start_date
                    ? new Date(selectedCertificate.start_date).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                    : '...'
                  } - {selectedCertificate.end_date ? new Date(selectedCertificate.end_date).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  }) : '...'}
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="podium-outline" size={16} /> {t("Catégorie :")} {selectedCertificate.category_label} ({selectedCertificate.category_class})
                </Text>

                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  <Ionicons name="book-outline" size={16} /> {t("Convention :")} {selectedCertificate.convention_label}
                </Text>
                {selectedCertificate?.contrat_id_encrypted && (
                  <TouchableOpacity
                    onPress={() => handleExportPdf()}
                    style={{ marginTop: 15 }}
                  >
                    <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>
                      <Ionicons name="download-outline" size={16} /> {t("Télécharger le PDF")}
                    </Text>
                  </TouchableOpacity>
                )}

              </ScrollView>

              {/* Détails utilisateur */}
              {selectedCertificate && detailsUser.length > 0 && (() => {
                const match = detailsUser.find(d => d.attestation_id === selectedCertificate.attestation_id);
                if (!match) return null;

                return (
                  <View style={{ marginTop: 20 }}>
                    <Text style={[styles.itemTitle, { fontSize: 16, color: colors.textPrimary }]}>
                      {t("Attestation créée par :")}
                    </Text>

                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                      <Ionicons name="person-outline" size={16} /> {t("Nom :")} {match.gbg_user_name}
                    </Text>

                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                      <Ionicons name="time-outline" size={16} /> {t("Créé le :")} {new Date(match.attestation_created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                );
              })()}

              {/* Bouton de fermeture */}

              <TouchableOpacity onPress={closeModal} style={{
                marginTop: 15,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: colors.primary,
                borderRadius: 10,
              }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>{t("Fermer")}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )
      }
    </SafeAreaView>

  );
}

// Styles pour le composant HrFileScreen
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

});
