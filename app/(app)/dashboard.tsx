import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getUserApplications, updateUserProfile, uploadCv, getParsedCvData, getRecommendedOffres } from '../../utils/api'; // Importer getRecommendedOffres
import { router } from 'expo-router'; // Pour la navigation vers les détails d'une offre recommandée
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Écran du Tableau de bord de l'utilisateur :
 * Affiche le contenu pertinent pour l'utilisateur authentifié avec une UI/UX moderne.
 * Gère les candidatures, le profil, la gestion du CV et affiche les données du CV parsé.
 * Inclut maintenant une section pour les offres recommandées.
 */
export default function DashboardScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [editableName, setEditableName] = useState(user?.name || '');
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  const [parsedCv, setParsedCv] = useState<any>(null);
  const [loadingParsedCv, setLoadingParsedCv] = useState(true);
  const [recommendedOffres, setRecommendedOffres] = useState([]); // NOUVEAU : Pour les offres recommandées
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  const loadApplications = useCallback(async () => {
    if (user) {
      setLoadingApplications(true);
      try {
        const fetchedApplications = await getUserApplications();
        setApplications(fetchedApplications);
      } catch (error: any) {
        console.error("Erreur de chargement des candidatures:", error);
      } finally {
        setLoadingApplications(false);
      }
    } else {
      setApplications([]);
      setLoadingApplications(false);
    }
  }, [user]);

  const loadParsedCv = useCallback(async () => {
    if (user) {
      setLoadingParsedCv(true);
      try {
        const data = await getParsedCvData();
        setParsedCv(data);
        if (data && data.last_parsed_file) {
          setCvFileName(data.last_parsed_file);
        } else {
          setCvFileName(null);
        }
      } catch (error: any) {
        console.error("Erreur de chargement du CV parsé:", error);
      } finally {
        setLoadingParsedCv(false);
      }
    } else {
      setParsedCv(null);
      setCvFileName(null);
      setLoadingParsedCv(false);
    }
  }, [user]);

  // NOUVEAU : Fonction pour charger les offres recommandées
  const loadRecommendations = useCallback(async () => {
    if (user) {
      setLoadingRecommendations(true);
      try {
        const fetchedRecommendations = await getRecommendedOffres();
        setRecommendedOffres(fetchedRecommendations);
      } catch (error: any) {
        console.error("Erreur de chargement des recommandations:", error);
      } finally {
        setLoadingRecommendations(false);
      }
    } else {
      setRecommendedOffres([]);
      setLoadingRecommendations(false);
    }
  }, [user]);


  // Chargement initial des candidatures, du CV parsé et des recommandations
  useEffect(() => {
    loadApplications();
    loadParsedCv();
    loadRecommendations(); // NOUVEAU : Charger les recommandations au montage
  }, [user, loadApplications, loadParsedCv, loadRecommendations]);


  const pickDocument = async () => {
    try {
      setUploadingCv(true);
      setCvUploadError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        setCvFileName(pickedAsset.name);
        
        const uploadResponse = await uploadCv(pickedAsset);
        Alert.alert("Succès", `CV "${pickedAsset.name}" téléchargé avec succès !`);
        await loadParsedCv(); // Recharger les données du CV parsé après l'upload
        await loadRecommendations(); // NOUVEAU : Recharger les recommandations après l'upload du CV
      } else {
        console.log('Sélection de CV annulée ou échouée.');
        setCvFileName(null);
      }
    } catch (err: any) {
      console.error("Erreur de sélection/upload CV:", err);
      setCvUploadError(err.response?.data?.message || "Échec de l'upload du CV. Veuillez réessayer.");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileUpdateError(null);
    try {
      if (user && user.name !== editableName) {
        const updatedUser = await updateUserProfile({ name: editableName });
        Alert.alert("Profil mis à jour", "Votre nom a été mis à jour avec succès !");
      }
      setProfileEditMode(false);
    } catch (error: any) {
      console.error("Erreur de mise à jour du profil:", error);
      setProfileUpdateError(error.response?.data?.message || "Échec de la mise à jour du profil.");
    }
  };

  const handleRecommendedOffrePress = (offreId: string) => {
    router.push(`/(app)/job_board/job_details?id=${offreId}`);
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tableau de bord</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          disabled={authLoading}
        >
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Section de Bienvenue */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenue, {user?.name || 'Utilisateur'}!</Text>
          <Text style={styles.cardSubtitle}>Gérez votre carrière ici.</Text>
        </View>

        {/* Section Mes Candidatures */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="file-contract" size={20} color="#091e60" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Mes Candidatures</Text>
          </View>
          {loadingApplications ? (
            <ActivityIndicator size="small" color="#0f8e35" />
          ) : applications.length > 0 ? (
            applications.map(app => (
              <View key={app.id} style={styles.applicationItem}>
                <Text style={styles.applicationTitle}>{app.offre?.poste?.titre_poste || 'Titre de l\'offre inconnu'}</Text>
                <Text style={styles.applicationStatus}>Statut:
                  <Text style={[
                    styles.statusText,
                    app.status === 'pending' && styles.statusPending,
                    app.status === 'approved' && styles.statusApproved,
                    app.status === 'rejected' && styles.statusRejected,
                  ]}> {app.status}</Text>
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyStateText}>Aucune candidature trouvée.</Text>
          )}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllButtonText}>Voir toutes mes candidatures</Text>
          </TouchableOpacity>
        </View>

        {/* Section Mon Profil */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="user-circle" size={20} color="#091e60" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Mon Profil</Text>
          </View>
          {profileEditMode ? (
            <>
              <Text style={styles.label}>Nom complet:</Text>
              <TextInput
                style={styles.input}
                value={editableName}
                onChangeText={setEditableName}
              />
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.profileText}>{user?.email}</Text>
              {profileUpdateError && <Text style={styles.errorText}>{profileUpdateError}</Text>}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.profileButton, styles.profileSaveButton]} onPress={handleProfileSave}>
                  <Text style={styles.profileButtonText}>Sauvegarder</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.profileButton, styles.profileCancelButton]} onPress={() => { setProfileEditMode(false); setEditableName(user?.name || ''); setProfileUpdateError(null); }}>
                  <Text style={styles.profileButtonText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.profileText}><Text style={styles.label}>Nom:</Text> {user?.name}</Text>
              <Text style={styles.profileText}><Text style={styles.label}>Email:</Text> {user?.email}</Text>
              <TouchableOpacity style={styles.editProfileButton} onPress={() => setProfileEditMode(true)}>
                <Text style={styles.editProfileButtonText}>Modifier le profil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Section Gestion du CV */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="file-upload" size={24} color="#091e60" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Gestion du CV</Text>
          </View>
          {cvFileName && (
            <Text style={styles.cvStatusText}>
              CV actuel: <Text style={styles.cvFileName}>{cvFileName}</Text>
            </Text>
          )}
          <TouchableOpacity
            style={[styles.uploadCvButton, uploadingCv && styles.buttonDisabled]}
            onPress={pickDocument}
            disabled={uploadingCv}
          >
            {uploadingCv ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome5 name="cloud-upload-alt" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.uploadCvButtonText}>Télécharger un CV (PDF)</Text>
              </>
            )}
          </TouchableOpacity>
          {cvUploadError && <Text style={styles.errorText}>{cvUploadError}</Text>}
          <Text style={styles.cvHelpText}>
            Votre CV sera utilisé pour vous recommander des offres.
          </Text>
        </View>

        {/* Section Mon CV Parsé */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="file-alt" size={20} color="#091e60" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Mon CV Parsé</Text>
          </View>
          {loadingParsedCv ? (
            <ActivityIndicator size="small" color="#0f8e35" />
          ) : parsedCv ? (
            <View>
              <Text style={styles.parsedCvLabel}>Nom complet: <Text style={styles.parsedCvText}>{parsedCv.full_name}</Text></Text>
              <Text style={styles.parsedCvLabel}>Email: <Text style={styles.parsedCvText}>{parsedCv.email}</Text></Text>
              {parsedCv.phone && <Text style={styles.parsedCvLabel}>Téléphone: <Text style={styles.parsedCvText}>{parsedCv.phone}</Text></Text>}
              {parsedCv.summary && (
                <>
                  <Text style={styles.parsedCvSectionTitle}>Résumé</Text>
                  <Text style={styles.parsedCvText}>{parsedCv.summary}</Text>
                </>
              )}
              {parsedCv.skills && parsedCv.skills.length > 0 && (
                <>
                  <Text style={styles.parsedCvSectionTitle}>Compétences</Text>
                  <Text style={styles.parsedCvText}>{parsedCv.skills.join(', ')}</Text>
                </>
              )}
              {parsedCv.experience && parsedCv.experience.length > 0 && (
                <>
                  <Text style={styles.parsedCvSectionTitle}>Expérience Professionnelle</Text>
                  {parsedCv.experience.map((exp: any, index: number) => (
                    <View key={index} style={styles.parsedCvItem}>
                      <Text style={styles.parsedCvText}><Text style={styles.parsedCvLabel}>Poste:</Text> {exp.title}</Text>
                      <Text style={styles.parsedCvText}><Text style={styles.parsedCvLabel}>Entreprise:</Text> {exp.company}</Text>
                      <Text style={styles.parsedCvText}><Text style={styles.parsedCvLabel}>Période:</Text> {exp.years}</Text>
                      {exp.description && <Text style={styles.parsedCvText}><Text style={styles.parsedCvLabel}>Description:</Text> {exp.description}</Text>}
                    </View>
                  ))}
                </>
              )}
              {parsedCv.education && parsedCv.education.length > 0 && (
                <>
                  <Text style={styles.parsedCvSectionTitle}>Formation</Text>
                  {parsedCv.education.map((edu: any, index: number) => (
                    <View key={index} style={styles.parsedCvItem}>
                      <Text style={styles.parsedCvText}><Text style={styles.parsedCvLabel}>Diplôme:</Text> {edu.degree}</Text>
                      <Text style={styles.parsedCvText}><Text style={styles.parsedCvLabel}>Institution:</Text> {edu.institution}</Text>
                      <Text style={styles.parsedCvText}><Text style={styles.parsedCvLabel}>Année:</Text> {edu.year}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          ) : (
            <Text style={styles.emptyStateText}>Aucune donnée de CV parsée trouvée. Veuillez télécharger un CV.</Text>
          )}
        </View>

        {/* NOUVEAU : Section Offres Recommandées */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="lightbulb" size={20} color="#091e60" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Offres Recommandées</Text>
          </View>
          {loadingRecommendations ? (
            <ActivityIndicator size="small" color="#0f8e35" />
          ) : recommendedOffres.length > 0 ? (
            recommendedOffres.map((offre: any) => (
              <TouchableOpacity key={offre.id} style={styles.recommendedOffreItem} onPress={() => handleRecommendedOffrePress(offre.id)}>
                <Text style={styles.recommendedOffreTitle}>{offre.poste?.titre_poste || 'Poste non spécifié'}</Text>
                <Text style={styles.recommendedOffreCompany}>{offre.demande?.entreprise?.nom_entreprise || 'Entreprise non spécifiée'} - {offre.lieux}</Text>
                <Text style={styles.recommendedOffreMatch}>Score de correspondance: {offre.match_score}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyStateText}>Pas de recommandations pour le moment. Téléchargez votre CV pour en obtenir !</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#091e60',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: '#0f8e35',
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
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  cardIcon: {
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 5,
    marginBottom: 15,
  },
  // Styles pour Mes Candidatures
  applicationItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  applicationStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#F59E0B',
  },
  statusApproved: {
    color: '#10B981',
  },
  statusRejected: {
    color: '#EF4444',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 10,
  },
  viewAllButton: {
    marginTop: 15,
    backgroundColor: '#0f8e35',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Styles pour Mon Profil
  label: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  profileText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },
  profileButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  profileSaveButton: {
    backgroundColor: '#0f8e35',
  },
  profileCancelButton: {
    backgroundColor: '#6B7280',
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editProfileButton: {
    marginTop: 15,
    backgroundColor: '#091e60',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Styles pour Gestion du CV
  cvStatusText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 10,
    textAlign: 'center',
  },
  cvFileName: {
    fontWeight: 'bold',
    color: '#091e60',
  },
  uploadCvButton: {
    backgroundColor: '#091e60',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  uploadCvButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  buttonIcon: {
    // Style pour l'icône
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cvHelpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  // Styles pour Mon CV Parsé
  parsedCvLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
    marginTop: 8,
  },
  parsedCvText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 5,
    lineHeight: 22,
  },
  parsedCvSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingBottom: 5,
  },
  parsedCvItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // NOUVEAU : Styles pour Offres Recommandées
  recommendedOffreItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5', // Vert très clair pour les recommandations
    shadowColor: '#0f8e35', // Ombre verte subtile
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recommendedOffreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginBottom: 5,
  },
  recommendedOffreCompany: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 5,
  },
  recommendedOffreMatch: {
    fontSize: 12,
    color: '#0f8e35',
    fontWeight: 'bold',
    marginTop: 5,
  },
});
