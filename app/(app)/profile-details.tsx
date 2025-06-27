import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
  Keyboard,
  StatusBar,
  Image,
} from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import CustomHeader from '../../components/CustomHeader';
import { FontAwesome5, AntDesign, Feather, FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  updateUserProfile,
  uploadCv,
  getParsedCvData,
  updateParsedCvData,
  exportCvPdf,
  getCandidatProfile,
  createOrUpdateCandidatProfile
} from '../../utils/api';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface ExperienceItem {
  title: string;
  organization: string;
  dates: string;
  location?: string;
  description?: string;
}

interface EducationItem {
  name: string;
  dates: string;
}

interface ParsedCvData {
  full_name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  skills?: string[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
  last_parsed_file?: string;
  [key: string]: any;
}

interface CandidatProfileData {
  date_naissance: string;
  lieu_naissance?: string;
  genre: string;
  telephone: string;
  titreProfil: string;
  photo_profil?: string;
  status: number;
  disponibilite: string;
}

export default function ProfileDetailsScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');

  // États profil personnel User + Candidat (fusionnés)
  const [editableName, setEditableName] = useState(user?.name || '');
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  const [personalEditMode, setPersonalEditMode] = useState(false);

  // États profil Candidat
  const [candidatProfile, setCandidatProfile] = useState<CandidatProfileData | null>(null);
  const [loadingCandidatProfile, setLoadingCandidatProfile] = useState(true);
  const [editableCandidatProfile, setEditableCandidatProfile] = useState<CandidatProfileData | null>(null);
  const [candidatUpdateError, setCandidatUpdateError] = useState<string | null>(null);

  // États CV
  const [parsedCv, setParsedCv] = useState<any>(null);
  const [loadingParsedCv, setLoadingParsedCv] = useState(true);
  const [cvUpdateError, setCvUpdateError] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [cvEditMode, setCvEditMode] = useState(false);
  const [exportingCv, setExportingCv] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // États pour les champs éditables du CV
  const [editableParsedCv, setEditableParsedCv] = useState({
    full_name: '', email: '', phone: '', summary: '', skills: [] as string[],
    experience: [] as ExperienceItem[],
    education: [] as EducationItem[],
  });

  const [newSkillText, setNewSkillText] = useState('');

  // Chargement du profil Candidat
  const loadCandidatProfile = useCallback(async () => {
    if (user) {
      setLoadingCandidatProfile(true);
      try {
        const data = await getCandidatProfile();
        setCandidatProfile(data);
        console.log('loadCandidatProfile: Profil Candidat récupéré:', data);
        console.log('loadCandidatProfile: Statut du candidat:', data?.status);

        setEditableCandidatProfile({
          date_naissance: data?.date_naissance || '',
          lieu_naissance: data?.lieu_naissance || '',
          genre: data?.genre || 'Homme',
          telephone: data?.telephone || '',
          titreProfil: data?.titreProfil || '',
          photo_profil: data?.photo_profil || '',
          status: data?.status ?? 1,
          disponibilite: data?.disponibilite || '',
        });
      } catch (error: any) {
        console.error("Erreur de chargement du profil candidat:", error);
        setCandidatProfile(null);
        setEditableCandidatProfile({
          date_naissance: '', lieu_naissance: '', genre: 'Homme', telephone: '',
          titreProfil: '', photo_profil: '', status: 1, disponibilite: '',
        });
      } finally {
        setLoadingCandidatProfile(false);
      }
    } else {
      setCandidatProfile(null);
      setEditableCandidatProfile({
        date_naissance: '', lieu_naissance: '', genre: 'Homme', telephone: '',
        titreProfil: '', photo_profil: '', status: 1, disponibilite: '',
      });
      setLoadingCandidatProfile(false);
    }
  }, [user]);

  const loadParsedCv = useCallback(async () => {
    if (user) {
      setLoadingParsedCv(true);
      try {
        const rawData = await getParsedCvData();
        const data: ParsedCvData = rawData ?? {};
        setParsedCv(data);
        setEditableParsedCv({
          full_name: data?.full_name || '',
          email: data?.email || '',
          phone: data?.phone || '',
          summary: data?.summary || '',
          skills: Array.isArray(data?.skills) ? data.skills : [],
          experience: Array.isArray(data?.experience) ? data.experience : [],
          education: Array.isArray(data?.education) ? data.education : [],
        });
        if (data && data.last_parsed_file) {
          setCvFileName(data.last_parsed_file);
        } else {
          setCvFileName(null);
        }
      } catch (error) {
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

  const handleMenuPress = () => { Alert.alert("Menu", "Menu pressé !"); };
  const handleAvatarPress = () => { Alert.alert("Profil", "Avatar pressé !"); };
  
  useEffect(() => {
    setEditableName(user?.name || '');
    loadCandidatProfile();
    loadParsedCv();
  }, [user, loadCandidatProfile, loadParsedCv]);

  // Gestion sauvegarde des informations personnelles (User + Candidat fusionnés)
  const handlePersonalInfoSave = async () => {
    setProfileUpdateError(null);
    setCandidatUpdateError(null);
    try {
      // Sauvegarder le nom d'utilisateur si modifié
      if (user && user.name !== editableName) {
        await updateUserProfile({ name: editableName });
      }

      // Sauvegarder le profil candidat si des données existent
      if (editableCandidatProfile) {
        // Valider les champs avant d'envoyer
        if (!editableCandidatProfile.titreProfil || !editableCandidatProfile.telephone || !editableCandidatProfile.disponibilite) {
          setCandidatUpdateError("Veuillez remplir tous les champs obligatoires (Titre professionnel, Téléphone, Disponibilité).");
          return;
        }
        if (editableCandidatProfile.date_naissance && isNaN(new Date(editableCandidatProfile.date_naissance).getTime())) {
          setCandidatUpdateError("Format de date de naissance invalide.");
          return;
        }

        await createOrUpdateCandidatProfile(editableCandidatProfile);
        await loadCandidatProfile();
      }

      Alert.alert("✅ Succès", "Informations personnelles mises à jour !");
      setPersonalEditMode(false);
    } catch (error: any) {
      console.error("Erreur de mise à jour des informations personnelles:", error);
      const errorMessage = error.response?.data?.message || "Échec de la mise à jour.";
      setProfileUpdateError(errorMessage);
      setCandidatUpdateError(errorMessage);
    }
  };

  const handleCvSave = async () => {
    setCvUpdateError(null);
    try {
      const dataToSave = {
        full_name: editableParsedCv.full_name,
        email: editableParsedCv.email,
        phone: editableParsedCv.phone,
        summary: editableParsedCv.summary,
        skills: editableParsedCv.skills,
        experience: editableParsedCv.experience,
        education: editableParsedCv.education,
      };

      const response = await updateParsedCvData(dataToSave);
      Alert.alert("✅ Succès", "CV mis à jour !");
      await loadParsedCv();
      setCvEditMode(false);
    } catch (error: any) {
      console.error("Erreur de sauvegarde du CV:", error);
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        let errorMessage = "Erreur de validation:\n";
        for (const key in backendErrors) {
          errorMessage += `- ${backendErrors[key][0]}\n`;
        }
        setCvUpdateError(errorMessage);
      } else {
        setCvUpdateError(error.message || "Échec de la mise à jour du CV.");
      }
    }
  };

  const pickDocument = async () => {
    try {
      setUploadingCv(true);
      setCvUploadError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        setCvFileName(pickedAsset.name);
        await uploadCv(pickedAsset);
        Alert.alert("✅ Succès", `CV "${pickedAsset.name}" téléchargé !`);
      }
    } catch (err: any) {
      console.error("Erreur upload CV:", err);
      setCvUploadError(err.response?.data?.message || "Échec de l'upload du CV.");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleExportCv = async () => {
    setExportingCv(true);
    setExportError(null);
    try {
      if (!parsedCv) {
        Alert.alert("Erreur", "Aucune donnée de CV à exporter. Veuillez d'abord saisir ou télécharger un CV.");
        return;
      }
      const response = await exportCvPdf();
      Alert.alert("Succès", `CV exporté et sauvegardé localement: ${response.uri}`);
    } catch (err: any) {
      console.error("Erreur lors de l'exportation du CV:", err);
      setExportError(err.message || "Échec de l'exportation du CV.");
      Alert.alert("Erreur d'exportation", err.message || "Impossible d'exporter le CV.");
    } finally {
      setExportingCv(false);
    }
  };

  // Gestion des compétences
  const addSkill = () => {
    if (newSkillText.trim() && !editableParsedCv.skills.includes(newSkillText.trim())) {
      setEditableParsedCv({
        ...editableParsedCv,
        skills: [...editableParsedCv.skills, newSkillText.trim()],
      });
      setNewSkillText('');
      Keyboard.dismiss();
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setEditableParsedCv({
      ...editableParsedCv,
      skills: editableParsedCv.skills.filter((skill) => skill !== skillToRemove),
    });
  };

  // Gestion expérience
  const addExperience = () => {
    setEditableParsedCv({
      ...editableParsedCv,
      experience: [...editableParsedCv.experience, { title: '', organization: '', dates: '', location: '', description: '' }],
    });
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, value: string) => {
    const updatedExperience = [...editableParsedCv.experience];
    updatedExperience[index] = { ...updatedExperience[index], [field]: value };
    setEditableParsedCv({ ...editableParsedCv, experience: updatedExperience });
  };

  const removeExperience = (index: number) => {
    const updatedExperience = editableParsedCv.experience.filter((_, i) => i !== index);
    setEditableParsedCv({ ...editableParsedCv, experience: updatedExperience });
  };

  // Gestion formation
  const addEducation = () => {
    setEditableParsedCv({
      ...editableParsedCv,
      education: [...editableParsedCv.education, { name: '', dates: '' }],
    });
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    const updatedEducation = [...editableParsedCv.education];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    setEditableParsedCv({ ...editableParsedCv, education: updatedEducation });
  };

  const removeEducation = (index: number) => {
    const updatedEducation = editableParsedCv.education.filter((_, i) => i !== index);
    setEditableParsedCv({ ...editableParsedCv, education: updatedEducation });
  };

  const renderTabBar = () => (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
          onPress={() => {
            setActiveTab('personal');
            setPersonalEditMode(false);
            setCvEditMode(false);
          }}
        >
          <View style={[styles.tabIconContainer, activeTab === 'personal' && styles.activeTabIconContainer]}>
            <Ionicons name="person" size={24} color={activeTab === 'personal' ? '#0f8e35' : '#64748b'} />
          </View>
          <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
            Personnel
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cv' && styles.activeTab]}
          onPress={() => {
            setActiveTab('cv');
            setPersonalEditMode(false);
            setCvEditMode(false);
          }}
        >
          <View style={[styles.tabIconContainer, activeTab === 'cv' && styles.activeTabIconContainer]}>
            <Ionicons name="document-text" size={24} color={activeTab === 'cv' ? '#0f8e35' : '#64748b'} />
          </View>
          <Text style={[styles.tabText, activeTab === 'cv' && styles.activeTabText]}>
            Candidat
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          {/* <View style={styles.sectionIconContainer}>
            <Ionicons name="person-circle" size={22} color="#16A34A" />
          </View> */}
          <Text style={styles.sectionTitle}>Infos personnelles</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, personalEditMode && styles.actionButtonActive]}
            onPress={() => personalEditMode ? handlePersonalInfoSave() : setPersonalEditMode(true)}
          >
            <Ionicons
              name={personalEditMode ? "checkmark" : "pencil"}
              size={18}
              color={personalEditMode ? "#ffffff" : "#16A34A"}
            />
          </TouchableOpacity>
          {personalEditMode && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonCancel]}
              onPress={() => {
                setPersonalEditMode(false);
                setEditableName(user?.name || '');
                loadCandidatProfile();
                setProfileUpdateError(null);
                setCandidatUpdateError(null);
              }}
            >
              <Ionicons name="close" size={18} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loadingCandidatProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#16A34A" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : personalEditMode ? (
        <View style={styles.editContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={editableName}
              onChangeText={setEditableName}
              placeholder="Votre nom complet"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledText}>{user?.email}</Text>
              <Ionicons name="lock-closed" size={18} color="#94a3b8" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Titre professionnel <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={editableCandidatProfile?.titreProfil || ''}
              onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, titreProfil: text }))}
              placeholder="Ex: Développeur Full Stack"
              placeholderTextColor="#94a3b8"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Téléphone <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={editableCandidatProfile?.telephone || ''}
              onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, telephone: text }))}
              placeholder="+221 77 123 45 67"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date de naissance</Text>
            <TextInput
              style={styles.input}
              value={editableCandidatProfile?.date_naissance || ''}
              onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, date_naissance: text }))}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lieu de naissance</Text>
            <TextInput
              style={styles.input}
              value={editableCandidatProfile?.lieu_naissance || ''}
              onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, lieu_naissance: text }))}
              placeholder="Votre lieu de naissance"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Genre</Text>
            <TextInput
              style={styles.input}
              value={editableCandidatProfile?.genre || ''}
              onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, genre: text }))}
              placeholder="Homme, Femme, Autre"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Disponibilité <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={editableCandidatProfile?.disponibilite || ''}
              onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, disponibilite: text }))}
              placeholder="Ex: Immédiate, Sous 1 mois"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Statut</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[styles.statusOption, editableCandidatProfile?.status === 1 && styles.statusOptionActive]}
                onPress={() => setEditableCandidatProfile(prev => ({ ...prev!, status: 1 }))}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={18} 
                  color={editableCandidatProfile?.status === 1 ? "#ffffff" : "#16A34A"} 
                />
                <Text style={[styles.statusText, editableCandidatProfile?.status === 1 && styles.statusTextActive]}>
                  En Écoute
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusOption, editableCandidatProfile?.status === 0 && styles.statusOptionInactive]}
                onPress={() => setEditableCandidatProfile(prev => ({ ...prev!, status: 0 }))}
              >
                <Ionicons 
                  name="pause-circle" 
                  size={18} 
                  color={editableCandidatProfile?.status === 0 ? "#ffffff" : "#64748b"} 
                />
                <Text style={[styles.statusText, editableCandidatProfile?.status === 0 && styles.statusTextInactive]}>
                  Indisponible
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {(profileUpdateError || candidatUpdateError) && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{profileUpdateError || candidatUpdateError}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="person" size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>{user?.name || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="briefcase" size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Titre professionnel</Text>
              <Text style={styles.infoValue}>{candidatProfile?.titreProfil || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="call" size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{candidatProfile?.telephone || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar" size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date de naissance</Text>
              <Text style={styles.infoValue}>{candidatProfile?.date_naissance || 'Non renseignée'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="map" size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Lieu de naissance</Text>
              <Text style={styles.infoValue}>{candidatProfile?.lieu_naissance || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="transgender" size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Genre</Text>
              <Text style={styles.infoValue}>{candidatProfile?.genre || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="hourglass" size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Disponibilité</Text>
              <Text style={styles.infoValue}>{candidatProfile?.disponibilite || 'Non renseignée'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <View style={[styles.statusIndicator, { backgroundColor: candidatProfile?.status === 'En Écoute' ? '#22c55e' : '#ef4444' }]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Statut</Text>
              <Text style={[styles.infoValue, { color: candidatProfile?.status === 'En Écoute'? '#22c55e' : '#ef4444' }]}>
                {candidatProfile?.status === 'En Écoute' ? 'En Écoute' : 'Indisponible'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderCvSection = () => (
    <View style={styles.section}>
      {/* En-tête CV avec upload */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          {/* <View style={styles.sectionIconContainer}>
            <Ionicons name="document-text" size={24} color="#16A34A" />
          </View> */}
          <Text style={styles.sectionTitle}>Infos professionnelles</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={pickDocument}
            disabled={uploadingCv}
          >
            {uploadingCv ? (
              <ActivityIndicator size="small" color="#16A34A" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color="#16A34A" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, cvEditMode && styles.actionButtonActive]}
            onPress={() => cvEditMode ? handleCvSave() : setCvEditMode(true)}
          >
            <Ionicons
              name={cvEditMode ? "checkmark" : "pencil"}
              size={18}
              color={cvEditMode ? "#ffffff" : "#16A34A"}
            />
          </TouchableOpacity>
          {cvEditMode && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonCancel]}
              onPress={() => {
                setCvEditMode(false);
                loadParsedCv();
                setCvUpdateError(null);
              }}
            >
              <Ionicons name="close" size={18} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {cvFileName && (
        <View style={styles.fileInfo}>
          <Ionicons name="document" size={16} color="#16A34A" />
          <Text style={styles.fileName}>{cvFileName}</Text></View>
      )}

      {/* Bouton d'exportation */}
      {/* Bouton d'exportation (affiché seulement si toutes les conditions sont remplies) */}
      {parsedCv &&
        parsedCv.full_name &&
        parsedCv.email &&
        parsedCv.phone &&
        parsedCv.summary &&
        typeof parsedCv.summary === 'string' &&
        parsedCv.summary.trim().length >= 100 &&
        Array.isArray(parsedCv.skills) && parsedCv.skills.length >= 4 &&
        Array.isArray(parsedCv.experience) && parsedCv.experience.length >= 1 &&
        Array.isArray(parsedCv.education) && parsedCv.education.length >= 1 && (
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportCv}
          disabled={exportingCv}
        >
          {exportingCv ? (
        <ActivityIndicator size="small" color="#ffffff" />
          ) : (
        <Ionicons name="cloud-download-outline" size={18} color="#ffffff" />
          )}
          <Text style={styles.exportButtonText}>
        {exportingCv ? 'Exportation...' : 'Exporter le CV (PDF)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Erreurs d'upload/export */}
      {cvUploadError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{cvUploadError}</Text>
        </View>
      )}

      {exportError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{exportError}</Text>
        </View>
      )}

      {loadingParsedCv ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#16A34A" />
          <Text style={styles.loadingText}>Chargement du CV...</Text>
        </View>
      ) : cvEditMode ? (
        <View style={styles.editContainer}>
          {/* Informations de base */}
          <View style={styles.cvSubSection}>
            <Text style={styles.cvSubSectionTitle}>Informations de base</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom complet</Text>
              <TextInput
                style={styles.input}
                value={editableParsedCv.full_name}
                onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, full_name: text })}
                placeholder="Votre nom complet"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={editableParsedCv.email}
                onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, email: text })}
                placeholder="votre.email@exemple.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={editableParsedCv.phone}
                onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, phone: text })}
                placeholder="+221 77 123 45 67"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Résumé professionnel</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editableParsedCv.summary}
                onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, summary: text })}
                placeholder="Décrivez votre profil professionnel..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Compétences */}
          <View style={styles.cvSubSection}>
            <Text style={styles.cvSubSectionTitle}>Compétences</Text>
            
            <View style={styles.skillsInputContainer}>
              <TextInput
                style={[styles.input, styles.skillInput]}
                value={newSkillText}
                onChangeText={setNewSkillText}
                placeholder="Ajouter une compétence"
                placeholderTextColor="#94a3b8"
                onSubmitEditing={addSkill}
              />
              <TouchableOpacity style={styles.addSkillButton} onPress={addSkill}>
                <Ionicons name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.skillsContainer}>
              {editableParsedCv.skills.map((skill, index) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                  <TouchableOpacity onPress={() => removeSkill(skill)}>
                    <Ionicons name="close" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Expérience professionnelle */}
          <View style={styles.cvSubSection}>
            <View style={styles.subSectionHeader}>
              <Text style={styles.cvSubSectionTitle}>Expérience professionnelle</Text>
              <TouchableOpacity style={styles.addButton} onPress={addExperience}>
                <Ionicons name="add" size={16} color="#22c55e" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {editableParsedCv.experience.map((exp, index) => (
              <View key={index} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <Text style={styles.experienceIndex}>#{index + 1}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeExperience(index)}
                  >
                    <Ionicons name="trash" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Poste</Text>
                  <TextInput
                    style={styles.input}
                    value={exp.title}
                    onChangeText={(text) => updateExperience(index, 'title', text)}
                    placeholder="Titre du poste"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Entreprise</Text>
                  <TextInput
                    style={styles.input}
                    value={exp.organization}
                    onChangeText={(text) => updateExperience(index, 'organization', text)}
                    placeholder="Nom de l'entreprise"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Période</Text>
                  <TextInput
                    style={styles.input}
                    value={exp.dates}
                    onChangeText={(text) => updateExperience(index, 'dates', text)}
                    placeholder="Ex: Jan 2020 - Déc 2022"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Lieu</Text>
                  <TextInput
                    style={styles.input}
                    value={exp.location || ''}
                    onChangeText={(text) => updateExperience(index, 'location', text)}
                    placeholder="Ville, Pays"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={exp.description || ''}
                    onChangeText={(text) => updateExperience(index, 'description', text)}
                    placeholder="Décrivez vos missions et réalisations..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Formation */}
          <View style={styles.cvSubSection}>
            <View style={styles.subSectionHeader}>
              <Text style={styles.cvSubSectionTitle}>Formation</Text>
              <TouchableOpacity style={styles.addButton} onPress={addEducation}>
                <Ionicons name="add" size={16} color="#22c55e" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {editableParsedCv.education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <View style={styles.educationHeader}>
                  <Text style={styles.educationIndex}>#{index + 1}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeEducation(index)}
                  >
                    <Ionicons name="trash" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Diplôme / Formation</Text>
                  <TextInput
                    style={styles.input}
                    value={edu.name}
                    onChangeText={(text) => updateEducation(index, 'name', text)}
                    placeholder="Nom du diplôme ou formation"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Période</Text>
                  <TextInput
                    style={styles.input}
                    value={edu.dates}
                    onChangeText={(text) => updateEducation(index, 'dates', text)}
                    placeholder="Ex: 2018 - 2020"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            ))}
          </View>

          {cvUpdateError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{cvUpdateError}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.cvViewContainer}>
          {parsedCv ? (
            <>
              {/* Informations de base */}
              {(parsedCv.full_name || parsedCv.email || parsedCv.phone || parsedCv.summary) && (
                <View style={styles.cvViewSection}>
                  <Text style={styles.cvViewSectionTitle}>Informations de base</Text>
                  
                  {parsedCv.full_name && (
                    <View style={styles.cvViewItem}>
                      <Ionicons name="person" size={16} color="#64748b" />
                      <Text style={styles.cvViewText}>{parsedCv.full_name}</Text>
                    </View>
                  )}

                  {parsedCv.email && (
                    <View style={styles.cvViewItem}>
                      <Ionicons name="mail" size={16} color="#64748b" />
                      <Text style={styles.cvViewText}>{parsedCv.email}</Text>
                    </View>
                  )}

                  {parsedCv.phone && (
                    <View style={styles.cvViewItem}>
                      <Ionicons name="call" size={16} color="#64748b" />
                      <Text style={styles.cvViewText}>{parsedCv.phone}</Text>
                    </View>
                  )}

                  {parsedCv.summary && (
                    <View style={styles.cvViewItem}>
                      <Ionicons name="document-text" size={16} color="#64748b" />
                      <Text style={styles.cvViewText}>{parsedCv.summary}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Compétences */}
              {parsedCv.skills && parsedCv.skills.length > 0 && (
                <View style={styles.cvViewSection}>
                  <Text style={styles.cvViewSectionTitle}>Compétences</Text>
                  <View style={styles.skillsContainer}>
                    {parsedCv.skills.map((skill: string, index: number) => (
                      <View key={index} style={styles.skillChipView}>
                        <Text style={styles.skillTextView}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Expérience professionnelle */}
              {parsedCv.experience && parsedCv.experience.length > 0 && (
                <View style={styles.cvViewSection}>
                  <Text style={styles.cvViewSectionTitle}>Expérience professionnelle</Text>
                  {parsedCv.experience.map((exp: ExperienceItem, index: number) => (
                    <View key={index} style={styles.experienceViewItem}>
                      <View style={styles.experienceViewHeader}>
                        <Text style={styles.experienceTitle}>{exp.title}</Text>
                        <Text style={styles.experienceDates}>{exp.dates}</Text>
                      </View>
                      <Text style={styles.experienceOrganization}>{exp.organization}</Text>
                      {exp.location && (
                        <Text style={styles.experienceLocation}>{exp.location}</Text>
                      )}
                      {exp.description && (
                        <Text style={styles.experienceDescription}>{exp.description}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Formation */}
              {parsedCv.education && parsedCv.education.length > 0 && (
                <View style={styles.cvViewSection}>
                  <Text style={styles.cvViewSectionTitle}>Formation</Text>
                  {parsedCv.education.map((edu: EducationItem, index: number) => (
                    <View key={index} style={styles.educationViewItem}>
                      <Text style={styles.educationName}>{edu.name}</Text>
                      <Text style={styles.educationDates}>{edu.dates}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyCvContainer}>
              <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyCvText}>Aucun CV trouvé</Text>
              <Text style={styles.emptyCvSubtext}>
                Téléchargez votre CV ou saisissez vos informations manuellement
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <SafeAreaView style={styles.container}>
      <CustomHeader
        title="Mon Profil"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {renderTabBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'personal' ? renderPersonalInfo() : renderCvSection()}
      </ScrollView>
    </SafeAreaView>
    </>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  
  // Tab Bar Styles
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#dbf9e4',
  },
  tabIconContainer: {
    marginRight: 8,
  },
  activeTabIconContainer: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#0f8e35',
  },

  // Section Styles
  section: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconContainer: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  actionButtonCancel: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  uploadButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },

  // Info Display Styles
  infoContainer: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  statusIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 2,
  },

  // Edit Mode Styles
  editContainer: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  disabledText: {
    fontSize: 16,
    color: '#6b7280',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#16A34A',
    backgroundColor: '#ffffff',
  },
  statusOptionActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  statusOptionInactive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
  },
  statusTextActive: {
    color: '#ffffff',
  },
  statusTextInactive: {
    color: '#ffffff',
  },

  // CV Styles
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c6003',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  exportButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  cvSubSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cvSubSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#16A34A',
    backgroundColor: '#f0fdf4',
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },

  // Skills Styles
  skillsInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  skillInput: {
    flex: 1,
    marginRight: 8,
  },
  addSkillButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  skillText: {
    fontSize: 14,
    color: '#475569',
    marginRight: 8,
  },
  skillChipView: {
    backgroundColor: '#d6f9c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillTextView: {
    fontSize: 14,
    color: '#1c6003',
    fontWeight: '500',
  },

  // Experience Styles
  experienceItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  experienceIndex: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },

  // Education Styles
  educationItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  educationIndex: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },

  // CV View Styles
  cvViewContainer: {
    gap: 20,
  },
  cvViewSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cvViewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  cvViewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cvViewText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  experienceViewItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  experienceViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  experienceDates: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  experienceOrganization: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
    marginBottom: 4,
  },
  experienceLocation: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  experienceDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  educationViewItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  educationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  educationDates: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyCvContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCvText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyCvSubtext: { 
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
 
});