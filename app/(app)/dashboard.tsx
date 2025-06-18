import React, { useState, useEffect } from 'react'; // Ajout de useState et useEffect pour la gestion des données
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native'; // Ajout de TextInput pour le profil
import { useAuth } from '../../components/AuthProvider';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'; // Importation d'icônes
import * as DocumentPicker from 'expo-document-picker'; // Pour l'upload de CV
import { getUserApplications, updateUserProfile, uploadCv } from '../../utils/api'; // Fonctions API à créer ou mettre à jour

/**
 * Écran du Tableau de bord de l'utilisateur :
 * Affiche le contenu pertinent pour l'utilisateur authentifié avec une UI/UX moderne.
 * Sections pour les candidatures, le profil et la gestion du CV.
 */
export default function DashboardScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState([]); // Pour stocker les candidatures de l'utilisateur
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false); // Pour le mode édition du profil
  const [editableName, setEditableName] = useState(user?.name || ''); // Nom éditable
  const [cvFileName, setCvFileName] = useState<string | null>(null); // Nom du fichier CV
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);

  // Charger les candidatures de l'utilisateur au montage du composant
  useEffect(() => {
    async function loadApplications() {
      if (user) {
        setLoadingApplications(true);
        try {
          // Ceci est une fonction API à implémenter :
          // const fetchedApplications = await getUserApplications(user.id);
          // setApplications(fetchedApplications);
          // Données mock pour l'instant
          setApplications([
            { id: 'app1', offre_title: 'Développeur React Native Senior', status: 'En attente' },
            { id: 'app2', offre_title: 'Ingénieur Backend Laravel', status: 'Rejeté' },
            { id: 'app3', offre_title: 'Designer UI/UX Mobile', status: 'Approuvé' },
          ]);
        } catch (error: any) {
          console.error("Erreur de chargement des candidatures:", error);
          // Gérer l'erreur
        } finally {
          setLoadingApplications(false);
        }
      }
    }
    loadApplications();
  }, [user]);

  // Gérer l'upload de CV
  const pickDocument = async () => {
    try {
      setUploadingCv(true);
      setCvUploadError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf', // Limiter aux fichiers PDF
        copyToCacheDirectory: true, // Copier le fichier dans le cache pour accès
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        setCvFileName(pickedAsset.name);
        console.log('CV sélectionné:', pickedAsset);

        // Appeler la fonction API pour l'upload (à implémenter)
        // const uploadResponse = await uploadCv(user.id, pickedAsset);
        // console.log('Réponse upload CV:', uploadResponse);
        Alert.alert("Succès", "CV sélectionné et simulation d'upload."); // Simuler le succès
      } else {
        console.log('Sélection de CV annulée ou échouée.');
        setCvFileName(null);
      }
    } catch (err: any) {
      console.error("Erreur de sélection/upload CV:", err);
      setCvUploadError("Échec de l'upload du CV. Veuillez réessayer.");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileUpdateError(null);
    // Ceci est une fonction API à implémenter :
    // try {
    //   await updateUserProfile(user.id, { name: editableName });
    //   Alert.alert("Profil mis à jour", "Votre nom a été mis à jour.");
    //   setProfileEditMode(false);
    //   // Optionnel: Mettre à jour l'objet user dans AuthProvider si nécessaire
    // } catch (error: any) {
    //   console.error("Erreur de mise à jour du profil:", error);
    //   setProfileUpdateError("Échec de la mise à jour du profil.");
    // }
    Alert.alert("Profil mis à jour", `Simulation: Nom mis à jour en "${editableName}".`);
    setProfileEditMode(false); // Sortir du mode édition après simulation
    setProfileUpdateError(null);
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
                <Text style={styles.applicationTitle}>{app.offre_title}</Text>
                <Text style={styles.applicationStatus}>Statut:
                  <Text style={[
                    styles.statusText,
                    app.status === 'En attente' && styles.statusPending,
                    app.status === 'Approuvé' && styles.statusApproved,
                    app.status === 'Rejeté' && styles.statusRejected,
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Couleur de fond principale
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Padding pour la barre de statut Android
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#091e60', // Bleu foncé primaire
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
    color: '#FFFFFF', // Texte blanc
  },
  logoutButton: {
    backgroundColor: '#0f8e35', // Vert secondaire
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
    paddingBottom: 40, // Espace en bas pour le défilement
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
    borderBottomColor: '#E5E7EB', // Gris clair
    paddingBottom: 10,
  },
  cardIcon: {
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60', // Bleu foncé primaire
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#4B5563', // Gris foncé
    marginTop: 5,
    marginBottom: 15,
  },
  // Styles pour Mes Candidatures
  applicationItem: {
    backgroundColor: '#F9FAFB', // Très léger gris
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
    color: '#F59E0B', // Jaune
  },
  statusApproved: {
    color: '#10B981', // Émeraude
  },
  statusRejected: {
    color: '#EF4444', // Rouge
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 10,
  },
  viewAllButton: {
    marginTop: 15,
    backgroundColor: '#0f8e35', // Vert secondaire
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
    backgroundColor: '#0f8e35', // Vert secondaire
  },
  profileCancelButton: {
    backgroundColor: '#6B7280', // Gris moyen
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editProfileButton: {
    marginTop: 15,
    backgroundColor: '#091e60', // Bleu foncé primaire
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
    backgroundColor: '#091e60', // Bleu foncé primaire
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row', // Pour aligner l'icône et le texte
    justifyContent: 'center',
    marginTop: 10,
  },
  uploadCvButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10, // Espace entre icône et texte
  },
  buttonIcon: {
    // Style pour l'icône, si nécessaire
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
});
