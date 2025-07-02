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
  createOrUpdateCandidatProfile,
  getInterimProfile,
  createOrUpdateInterimProfile,
} from '../../utils/api';
import { router } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import { useLanguage } from '../../components/LanguageContext';

const { width } = Dimensions.get('window');

// Interfaces pour les objets d'expérience et de formation
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
  cv_path?: string;
}

interface CandidatProfileData {
  date_naissance: string;
  lieu_naissance?: string;
  genre: string;
  telephone: string;
  titreProfil: string;
  photo_profil?: string;
  status: number | string; // Peut être un nombre (en DB) ou une string (via accesseur)
  disponibilite: string;
}

interface InterimProfileData {
  matricule?: string;
  sexe?: string;
  matrimoniale?: string;
  nationalite?: string;
  phone?: string; // Peut être différent du téléphone de l'utilisateur principal
  date_naissance?: string;
  lieu_naissance?: string;
  cni?: string;
  adresse?: string;
  profile_photo_path?: string; // Chemin de la photo de profil
  statut_agent?: number; // Ex: 1 (actif), 2 (en_conge), etc.
  diplome?: string;
  taux_retenu?: number;
  taux_remboursse?: number;
  // Les champs 'name' et 'email' sont supposés venir de l'objet User principal
}
export default function ProfileDetailsScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'cv', 'interim'

  // États profil personnel User
  const [personalEditMode, setPersonalEditMode] = useState(false);
  const [editableName, setEditableName] = useState(user?.name || '');
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);

  // États profil Candidat
  const [candidatProfile, setCandidatProfile] = useState<CandidatProfileData | null>(null);
  const [loadingCandidatProfile, setLoadingCandidatProfile] = useState(true);
  const [candidatEditMode, setCandidatEditMode] = useState(false);
  const [editableCandidatProfile, setEditableCandidatProfile] = useState<CandidatProfileData>({
    date_naissance: '', lieu_naissance: '', genre: 'Homme', telephone: '',
    titreProfil: '', photo_profil: '', status: 1, disponibilite: '',
  });
  const [candidatUpdateError, setCandidatUpdateError] = useState<string | null>(null);

  // États profil Intérimaire
  const [interimProfile, setInterimProfile] = useState<InterimProfileData | null>(null);
  const [loadingInterimProfile, setLoadingInterimProfile] = useState(true);
  const [interimEditMode, setInterimEditMode] = useState(false);
  const [editableInterimProfile, setEditableInterimProfile] = useState<InterimProfileData>({
    matricule: '', sexe: 'Homme', matrimoniale: '', nationalite: '', phone: '', date_naissance: '', lieu_naissance: '', cni: '', adresse: '', profile_photo_path: '', statut_agent: 1, diplome: '', taux_retenu: 0, taux_remboursse: 0,
  });
  const [interimUpdateError, setInterimUpdateError] = useState<string | null>(null);


  // États CV
  const [parsedCv, setParsedCv] = useState<ParsedCvData | null>(null);
  const [loadingParsedCv, setLoadingParsedCv] = useState(true);
  const [cvEditMode, setCvEditMode] = useState(false);
  const [cvUpdateError, setCvUpdateError] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [exportingCv, setExportingCv] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // États pour les champs éditables du CV
  const [editableParsedCv, setEditableParsedCv] = useState({
    full_name: '', email: '', phone: '', summary: '', skills: [] as string[],
    experience: [] as ExperienceItem[],
    education: [] as EducationItem[],
  });

  const [newSkillText, setNewSkillText] = useState('');


  // --- Callbacks de chargement de données ---
  const loadCandidatProfile = useCallback(async () => {
    if (user && user.role === 'user') {
      setLoadingCandidatProfile(true);
      try {
        const data = await getCandidatProfile();
        setCandidatProfile(data);
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
        setEditableCandidatProfile({ date_naissance: '', lieu_naissance: '', genre: 'Homme', telephone: '', titreProfil: '', photo_profil: '', status: 1, disponibilite: '', });
      } finally {
        setLoadingCandidatProfile(false);
      }
    } else {
      setCandidatProfile(null);
      setEditableCandidatProfile({ date_naissance: '', lieu_naissance: '', genre: 'Homme', telephone: '', titreProfil: '', photo_profil: '', status: 1, disponibilite: '', });
      setLoadingCandidatProfile(false);
    }
  }, [user]);

  const loadInterimProfile = useCallback(async () => {
    if (user && user.role === 'interim') {
      setLoadingInterimProfile(true);
      try {
        const data = await getInterimProfile() as InterimProfileData;
        setInterimProfile(data);
        setEditableInterimProfile({
          matricule: data?.matricule || '',
          sexe: data?.sexe || 'Homme',
          matrimoniale: data?.matrimoniale || '',
          nationalite: data?.nationalite || '',
          phone: data?.phone || '',
          date_naissance: data?.date_naissance || '',
          lieu_naissance: data?.lieu_naissance || '',
          cni: data?.cni || '',
          adresse: data?.adresse || '',
          profile_photo_path: data?.profile_photo_path || '',
          statut_agent: data?.statut_agent ||  1,
          diplome: data?.diplome || '',
          taux_retenu: data?.taux_retenu ?? 0,
          taux_remboursse: data?.taux_remboursse ?? 0,
        });
      } catch (error: any) {
        console.error("Erreur de chargement du profil intérimaire:", error);
        setInterimProfile(null);
        setEditableInterimProfile({ matricule: '', sexe: 'Homme', matrimoniale: '', nationalite: '', phone: '', date_naissance: '', lieu_naissance: '', cni: '', adresse: '', profile_photo_path: '', statut_agent: 'actif', diplome: '', taux_retenu: 0, taux_remboursse: 0, });
      } finally {
        setLoadingInterimProfile(false);
      }
    } else {
      setInterimProfile(null);
      setEditableInterimProfile({ matricule: '', sexe: 'Homme', matrimoniale: '', nationalite: '', phone: '', date_naissance: '', lieu_naissance: '', cni: '', adresse: '', profile_photo_path: '', statut_agent: 'actif', diplome: '', taux_retenu: 0, taux_remboursse: 0, });
      setLoadingInterimProfile(false);
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

  // --- useEffect pour le chargement initial ---
  useEffect(() => {
    setEditableName(user?.name || '');
    loadCandidatProfile();
    loadInterimProfile();
    loadParsedCv();
  }, [user, loadCandidatProfile, loadInterimProfile, loadParsedCv]);


  // --- Fonctions de sauvegarde ---
  const handlePersonalInfoSave = async () => {
    setProfileUpdateError(null);
    setCandidatUpdateError(null); // Clear candidat error too
    try {
      // Sauvegarder le nom d'utilisateur si modifié
      if (user && user.name !== editableName) {
        await updateUserProfile({ name: editableName });
      }

      // Sauvegarder le profil candidat si l'utilisateur est un candidat et des données existent
      if (user?.role === 'user' && editableCandidatProfile) {
        if (!editableCandidatProfile.titreProfil || !editableCandidatProfile.telephone || !editableCandidatProfile.disponibilite) {
          Alert.alert(t("Erreur"), t("Veuillez remplir tous les champs obligatoires (Titre professionnel, Téléphone, Disponibilité)."));
          setCandidatUpdateError(t("Veuillez remplir les champs obligatoires du profil candidat."));
          return;
        }
        if (editableCandidatProfile.date_naissance && isNaN(new Date(editableCandidatProfile.date_naissance).getTime())) {
          Alert.alert(t("Erreur"), t("Format de date de naissance invalide (AAAA-MM-JJ attendu)."));
          setCandidatUpdateError(t("Format de date de naissance invalide (AAAA-MM-JJ)."));
          return;
        }
        const candidatDataToSave = { ...editableCandidatProfile };
        if (typeof candidatDataToSave.status === 'string') {
          candidatDataToSave.status = candidatDataToSave.status === t('En Écoute') ? 1 : 0; // Convertir en nombre pour le backend
        }
        await createOrUpdateCandidatProfile(candidatDataToSave);
        await loadCandidatProfile(); // Recharger pour avoir les dernières données
      }

      Alert.alert(t("Succès"), t("Informations personnelles mises à jour !"));
      setPersonalEditMode(false);
    } catch (error: any) {
      console.error("Erreur de mise à jour des informations personnelles:", error);
      const errorMessage = error.response?.data?.message || t("Échec de la mise à jour.");
      setProfileUpdateError(errorMessage);
      setCandidatUpdateError(errorMessage);
    }
  };

  const handleInterimProfileSave = async () => {
    setInterimUpdateError(null);
    try {
      if (!editableInterimProfile) {
        setInterimUpdateError(t("Aucune donnée de profil intérimaire à sauvegarder."));
        return;
      }
      // Validation des champs obligatoires pour l'intérimaire
      if (!editableInterimProfile.matricule || !editableInterimProfile.phone || !editableInterimProfile.cni || !editableInterimProfile.adresse || !editableInterimProfile.statut_agent || !editableInterimProfile.diplome) {
        Alert.alert(t("Erreur"), t("Veuillez remplir tous les champs obligatoires (Matricule, Téléphone, CNI, Adresse, Statut Agent, Diplôme)."));
        setInterimUpdateError(t("Veuillez remplir les champs obligatoires du profil intérimaire."));
        return;
      }
      if (editableInterimProfile.date_naissance && isNaN(new Date(editableInterimProfile.date_naissance).getTime())) {
        Alert.alert(t("Erreur"), t("Format de date de naissance invalide (AAAA-MM-JJ attendu)."));
        setInterimUpdateError(t("Format de date de naissance invalide (AAAA-MM-JJ)."));
        return;
      }
      if (editableInterimProfile.taux_retenu !== undefined && isNaN(editableInterimProfile.taux_retenu)) {
        Alert.alert(t("Erreur"), t("Le taux de retenue doit être un nombre."));
        setInterimUpdateError(t("Le taux de retenue doit être un nombre."));
        return;
      }
      if (editableInterimProfile.taux_remboursse !== undefined && isNaN(editableInterimProfile.taux_remboursse)) {
        Alert.alert(t("Erreur"), t("Le taux de remboursement doit être un nombre."));
        setInterimUpdateError(t("Le taux de remboursement doit être un nombre."));
        return;
      }

      const dataToSave = { ...editableInterimProfile };
      // Les statuts sont déjà des chaînes ('active', 'inactive') donc pas de conversion ici
      await createOrUpdateInterimProfile(dataToSave);
      Alert.alert(t("Succès"), t("Profil intérimaire mis à jour !"));
      await loadInterimProfile();
      setInterimEditMode(false);
    } catch (error: any) {
      console.error("Erreur de sauvegarde du profil intérimaire:", error);
      setInterimUpdateError(error.response?.data?.message || t("Échec de la mise à jour du profil intérimaire."));
      Alert.alert(t("Erreur"), error.response?.data?.message || t("Échec de la mise à jour du profil intérimaire."));
    }
  };


  const handleCvSave = async () => {
    setCvUpdateError(null);
    try {
      let parsedSkills: string[] = [];
      if (editableParsedCv.skills) {
        parsedSkills = editableParsedCv.skills.filter(Boolean);
      }

      if (!Array.isArray(editableParsedCv.experience) || editableParsedCv.experience.some(item => typeof item !== 'object' || item === null)) {
        throw new Error(t("Le format des expériences est invalide. Attendu : tableau d'objets."));
      }
      if (!Array.isArray(editableParsedCv.education) || editableParsedCv.education.some(item => typeof item !== 'object' || item === null)) {
        throw new Error(t("Le format des formations est invalide. Attendu : tableau d'objets."));
      }

      const dataToSave = {
        full_name: editableParsedCv.full_name,
        email: editableParsedCv.email,
        phone: editableParsedCv.phone,
        summary: editableParsedCv.summary,
        skills: parsedSkills,
        experience: editableParsedCv.experience,
        education: editableParsedCv.education,
      };

      const response = await updateParsedCvData(dataToSave);
      Alert.alert(t("Succès"), response.message || t("Informations du CV mises à jour !"));
      await loadParsedCv();
      setCvEditMode(false);
    } catch (error: any) {
      console.error("Erreur de sauvegarde du CV:", error);
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        let errorMessage = t("Erreur de validation:") + "\n";
        for (const key in backendErrors) {
          errorMessage += `- ${backendErrors[key][0]}\n`;
        }
        setCvUpdateError(errorMessage);
      } else {
        setCvUpdateError(error.message || t("Échec de la mise à jour du CV."));
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
        Alert.alert(t("Succès"), t("CV \"") + pickedAsset.name + t("\" téléchargé !"));
      }
    } catch (err: any) {
      console.error("Erreur upload CV:", err);
      setCvUploadError(err.response?.data?.message || t("Échec de l'upload du CV."));
    } finally {
      setUploadingCv(false);
    }
  };

  const handleExportCv = async () => {
    setExportingCv(true);
    setExportError(null);
    try {
      if (!parsedCv || (
          !parsedCv.full_name && !parsedCv.email && !parsedCv.phone &&
          !parsedCv.summary && (!parsedCv.skills || parsedCv.skills.length === 0) &&
          (!parsedCv.experience || parsedCv.experience.length === 0) &&
          (!parsedCv.education || parsedCv.education.length === 0)
      )) {
        Alert.alert(t("Erreur"), t("Aucune donnée de CV à exporter. Veuillez d'abord saisir ou télécharger un CV."));
        return;
      }
      const response = await exportCvPdf();
      // Alert est déjà géré dans api.js pour le succès/erreur de l'exportation
    } catch (err: any) {
      console.error("Erreur lors de l'exportation du CV:", err);
      setExportError(err.message || t("Échec de l'exportation du CV."));
      // Alert est géré dans api.js
    } finally {
      setExportingCv(false);
    }
  };

  // Gestion des compétences
  const addSkill = () => {
    if (newSkillText.trim() && !editableParsedCv.skills.includes(newSkillText.trim())) {
      setEditableParsedCv((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkillText.trim()],
      }));
      setNewSkillText('');
      Keyboard.dismiss();
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setEditableParsedCv((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  // Gestion expérience
  const addExperience = () => {
    setEditableParsedCv((prev) => ({
      ...prev,
      experience: [...prev.experience, { title: '', organization: '', dates: '', location: '', description: '' }],
    }));
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, value: string) => {
    setEditableParsedCv((prev) => {
      const updatedExperience = [...prev.experience];
      updatedExperience[index] = { ...updatedExperience[index], [field]: value };
      return { ...prev, experience: updatedExperience };
    });
  };

  const removeExperience = (index: number) => {
    setEditableParsedCv((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  // Gestion formation
  const addEducation = () => {
    setEditableParsedCv((prev) => ({
      ...prev,
      education: [...prev.education, { name: '', dates: '' }],
    }));
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    setEditableParsedCv((prev) => {
      const updatedEducation = [...prev.education];
      updatedEducation[index] = { ...updatedEducation[index], [field]: value };
      return { ...prev, education: updatedEducation };
    });
  };

  const removeEducation = (index: number) => {
    setEditableParsedCv((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu pressé !")); };
  const handleAvatarPress = () => { Alert.alert(t("Profil"), t("Avatar pressé !")); };

    // NOUVEAU : Fonction pour gérer le mode édition combiné (CV et Candidat)
  const setCvAndCandidatEditMode = (value: boolean) => {
    setCvEditMode(value);
    setCandidatEditMode(value);
  };
  // NOUVEAU : Fonction de sauvegarde combinée pour CV et Candidat
  const handleCvAndCandidatSave = async () => {
    setCvUpdateError(null);
    setCandidatUpdateError(null);
    try {
      // Sauvegarde des données du CV
      let parsedSkills: string[] = [];
      if (editableParsedCv.skills) {
        parsedSkills = editableParsedCv.skills.filter(Boolean);
      }
      if (!Array.isArray(editableParsedCv.experience) || editableParsedCv.experience.some(item => typeof item !== 'object' || item === null)) {
        throw new Error(t("Le format des expériences est invalide. Attendu : tableau d'objets."));
      }
      if (!Array.isArray(editableParsedCv.education) || editableParsedCv.education.some(item => typeof item !== 'object' || item === null)) {
        throw new Error(t("Le format des formations est invalide. Attendu : tableau d'objets."));
      }
      const cvDataToSave = {
        full_name: editableParsedCv.full_name,
        email: editableParsedCv.email,
        phone: editableParsedCv.phone,
        summary: editableParsedCv.summary,
        skills: parsedSkills,
        experience: editableParsedCv.experience,
        education: editableParsedCv.education,
      };
      await updateParsedCvData(cvDataToSave); // Appel API CV

      // Sauvegarde des données du profil Candidat
      if (user?.role === 'candidate' && editableCandidatProfile) {
        if (!editableCandidatProfile.titreProfil || !editableCandidatProfile.telephone || !editableCandidatProfile.disponibilite) {
            throw new Error(t("Veuillez remplir les champs obligatoires du profil candidat."));
        }
        if (editableCandidatProfile.date_naissance && isNaN(new Date(editableCandidatProfile.date_naissance).getTime())) {
            throw new Error(t("Format de date de naissance invalide (AAAA-MM-JJ attendu)."));
        }
        const candidatDataToSave = { ...editableCandidatProfile };
        if (typeof candidatDataToSave.status === 'string') {
            candidatDataToSave.status = candidatDataToSave.status === t('En Écoute') ? 1 : 0;
        }
        await createOrUpdateCandidatProfile(candidatDataToSave); // Appel API Candidat
      }

      Alert.alert(t("Succès"), t("Informations de profil et CV mises à jour !"));
      await loadParsedCv();
      await loadCandidatProfile();
      setCvAndCandidatEditMode(false);
    } catch (error: any) {
      console.error("Erreur de sauvegarde combinée:", error);
      if (error.response?.data?.errors) {
        let errorMessage = t("Erreur de validation:") + "\n";
        for (const key in error.response.data.errors) {
          errorMessage += `- ${error.response.data.errors[key][0]}\n`;
        }
        Alert.alert(t("Erreur"), errorMessage);
        setCvUpdateError(errorMessage);
        setCandidatUpdateError(errorMessage);
      } else {
        Alert.alert(t("Erreur"), error.message || t("Échec de la mise à jour."));
        setCvUpdateError(error.message || t("Échec de la mise à jour."));
        setCandidatUpdateError(error.message || t("Échec de la mise à jour."));
      }
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBar, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personal' && styles.activeTab, { backgroundColor: activeTab === 'personal' ? colors.secondary + '15' : 'transparent' }]}
          onPress={() => { setActiveTab('personal'); setPersonalEditMode(false); setCvEditMode(false); setCandidatEditMode(false); setInterimEditMode(false); }}
        >
          <View style={[styles.tabIconContainer, activeTab === 'personal' && styles.activeTabIconContainer]}>
            <Ionicons name="person" size={24} color={activeTab === 'personal' ? colors.secondary : colors.textSecondary} />
          </View>
          <Text style={[styles.tabText, { color: activeTab === 'personal' ? colors.secondary : colors.textSecondary }]}>
            {t('Personnel')}
          </Text>
        </TouchableOpacity>

        {user?.role === 'user' && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'cv' && styles.activeTab, { backgroundColor: activeTab === 'cv' ? colors.secondary + '15' : 'transparent' }]}
            onPress={() => { setActiveTab('cv'); setPersonalEditMode(false); setCvEditMode(false); setCandidatEditMode(false); setInterimEditMode(false); }}
          >
            <View style={[styles.tabIconContainer, activeTab === 'cv' && styles.activeTabIconContainer]}>
              <Ionicons name="document-text" size={24} color={activeTab === 'cv' ? colors.secondary : colors.textSecondary} />
            </View>
            <Text style={[styles.tabText, { color: activeTab === 'cv' ? colors.secondary : colors.textSecondary }]}>
              {t('Mon CV')}
            </Text>
          </TouchableOpacity>
        )}

        {user?.role === 'interimaire' && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'interimaire' && styles.activeTab, { backgroundColor: activeTab === 'interim' ? colors.secondary + '15' : 'transparent' }]}
            onPress={() => { setActiveTab('interim'); setPersonalEditMode(false); setCvEditMode(false); setCandidatEditMode(false); }}
          >
            <View style={[styles.tabIconContainer, activeTab === 'interim' && styles.activeTabIconContainer]}>
              <Ionicons name="business" size={24} color={activeTab === 'interim' ? colors.secondary : colors.textSecondary} />
            </View>
            <Text style={[styles.tabText, { color: activeTab === 'interim' ? colors.secondary : colors.textSecondary }]}>
              {t('Intérimaire')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="person-circle" size={24} color={colors.secondary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Informations personnelles')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, personalEditMode && styles.actionButtonActive, { backgroundColor: personalEditMode ? colors.secondary : colors.settingIconBg }]}
            onPress={() => personalEditMode ? handlePersonalInfoSave() : setPersonalEditMode(true)}
          >
            <Ionicons
              name={personalEditMode ? "checkmark" : "pencil"}
              size={18}
              color={personalEditMode ? "#ffffff" : colors.secondary}
            />
          </TouchableOpacity>
          {personalEditMode && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonCancel, { backgroundColor: colors.error }]}
              onPress={() => {
                setPersonalEditMode(false);
                setEditableName(user?.name || '');
                setProfileUpdateError(null);
              }}
            >
              <Ionicons name="close" size={18} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loadingCandidatProfile && user?.role === 'user' ? ( // Charger le profil candidat si l'utilisateur est un candidat
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement du profil candidat...')}</Text>
        </View>
      ) : personalEditMode ? (
        <View style={styles.editContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nom complet')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableName}
              onChangeText={setEditableName}
              placeholder={t("Votre nom complet")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
            <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>{user?.email}</Text>
              <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
            </View>
          </View>

          {user?.role === 'user' && ( // Champs spécifiques au candidat dans l'onglet Personnel
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Titre professionnel')} <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editableCandidatProfile?.titreProfil || ''}
                  onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, titreProfil: text }))}
                  placeholder={t("Ex: Développeur Full Stack")}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Téléphone')} <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editableCandidatProfile?.telephone || ''}
                  onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, telephone: text }))}
                  placeholder={t("+221 77 123 45 67")}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Date de naissance (AAAA-MM-JJ)')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editableCandidatProfile?.date_naissance || ''}
                  onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, date_naissance: text }))}
                  placeholder={t("AAAA-MM-JJ")}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Lieu de naissance')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editableCandidatProfile?.lieu_naissance || ''}
                  onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, lieu_naissance: text }))}
                  placeholder={t("Votre lieu de naissance")}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Genre')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editableCandidatProfile?.genre || ''}
                  onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, genre: text }))}
                  placeholder={t("Homme, Femme, Autre")}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Disponibilité')} <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editableCandidatProfile?.disponibilite || ''}
                  onChangeText={(text) => setEditableCandidatProfile(prev => ({ ...prev!, disponibilite: text }))}
                  placeholder={t("Ex: Immédiate, Sous 1 mois")}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Statut')}</Text>
                <View style={styles.statusContainer}>
                  <TouchableOpacity
                    style={[styles.statusOption, editableCandidatProfile?.status === 1 && styles.statusOptionActive, { borderColor: colors.secondary, backgroundColor: editableCandidatProfile?.status === 1 ? colors.secondary : colors.cardBackground }]}
                    onPress={() => setEditableCandidatProfile(prev => ({ ...prev!, status: 1 }))}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={editableCandidatProfile?.status === 1 ? "#ffffff" : colors.secondary}
                    />
                    <Text style={[styles.statusText, editableCandidatProfile?.status === 1 && styles.statusTextActive, { color: editableCandidatProfile?.status === 1 ? "#ffffff" : colors.secondary }]}>
                      {t('En Écoute')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusOption, editableCandidatProfile?.status === 0 && styles.statusOptionInactive, { borderColor: colors.textSecondary, backgroundColor: editableCandidatProfile?.status === 0 ? colors.error : colors.cardBackground }]}
                    onPress={() => setEditableCandidatProfile(prev => ({ ...prev!, status: 0 }))}
                  >
                    <Ionicons
                      name="pause-circle"
                      size={18}
                      color={editableCandidatProfile?.status === 0 ? "#ffffff" : colors.textSecondary}
                    />
                    <Text style={[styles.statusText, editableCandidatProfile?.status === 0 && styles.statusTextInactive, { color: editableCandidatProfile?.status === 0 ? "#ffffff" : colors.textSecondary }]}>
                      {t('Indisponible')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {profileUpdateError && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{profileUpdateError}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="person" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Nom complet')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name || t('Non renseigné')}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.email}</Text>
            </View>
          </View>

          {user?.role === 'user' && candidatProfile && ( // Afficher les infos candidat si rôle candidat
            <>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="briefcase" size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Titre professionnel')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.titreProfil || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call" size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Téléphone')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.telephone || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar" size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Date de naissance')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.date_naissance || t('Non renseignée')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="map" size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Lieu de naissance')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.lieu_naissance || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="transgender" size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Genre')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.genre || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="hourglass" size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Disponibilité')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.disponibilite || t('Non renseignée')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <View style={[styles.statusIndicator, { backgroundColor: candidatProfile?.status === 'En Écoute' ? colors.secondary : colors.error }]} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Statut')}</Text>
                  <Text style={[styles.infoValue, { color: candidatProfile?.status === 'En Écoute' ? colors.secondary : colors.error }]}>
                    {candidatProfile?.status === 'En Écoute' ? t('En Écoute') : t('Indisponible')}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}
      {user?.role === 'user' && !candidatProfile && !loadingCandidatProfile && (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('Pas de profil candidat')}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('Créez votre profil candidat pour postuler à des offres.')}
          </Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.secondary }]} onPress={() => setPersonalEditMode(true)}>
            <Text style={styles.primaryButtonText}>{t('Créer mon profil candidat')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCvSection = () => (
    <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
      {/* En-tête CV avec upload */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={24} color={colors.secondary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Mon CV')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton, { backgroundColor: colors.primary + '15' }]}
            onPress={pickDocument}
            disabled={uploadingCv}
          >
            {uploadingCv ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, cvEditMode && styles.actionButtonActive, { backgroundColor: cvEditMode ? colors.secondary : colors.settingIconBg }]}
            onPress={() => cvEditMode ? handleCvSave() : setCvEditMode(true)}
          >
            <Ionicons
              name={cvEditMode ? "checkmark" : "pencil"}
              size={18}
              color={cvEditMode ? "#ffffff" : colors.secondary}
            />
          </TouchableOpacity>
          {cvEditMode && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonCancel, { backgroundColor: colors.error }]}
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
        <View style={[styles.fileInfo, { backgroundColor: colors.success + '10' }]}>
          <Ionicons name="document" size={16} color={colors.success} />
          <Text style={[styles.fileName, { color: colors.success }]}>{cvFileName}</Text>
        </View>
      )}

      {cvUploadError && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{cvUploadError}</Text>
        </View>
      )}

      {loadingParsedCv ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement des données...')}</Text>
        </View>
      ) : cvEditMode ? (
        renderCvEditForm()
      ) : parsedCv ? (
        renderCvDisplay()
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('Aucune donnée CV')}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('Saisissez manuellement vos informations ou téléchargez un CV.')}</Text>
        </View>
      )}
    </View>
  );

  const renderCvEditForm = () => (
    <View style={styles.editContainer}>
      {/* Informations de base */}
      <View style={styles.formSection}>
        <Text style={[styles.formSectionTitle, { color: colors.textPrimary }]}>{t('Informations personnelles')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nom complet')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={editableParsedCv.full_name}
            onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, full_name: text })}
            placeholder={t("Nom complet")}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={editableParsedCv.email}
            onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, email: text })}
            placeholder={t("Email")}
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Téléphone')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={editableParsedCv.phone}
            onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, phone: text })}
            placeholder={t("Téléphone")}
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Résumé professionnel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={editableParsedCv.summary}
            onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, summary: text })}
            placeholder={t("Décrivez votre profil professionnel...")}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Compétences */}
      <View style={styles.formSection}>
        <View style={styles.subsectionHeader}>
          <Text style={[styles.formSectionTitle, { color: colors.textPrimary }]}>{t('Compétences')}</Text>
        </View>
        
        <View style={styles.skillInputContainer}>
          <TextInput
            style={[styles.input, styles.skillInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={newSkillText}
            onChangeText={setNewSkillText}
            placeholder={t("Ajouter une compétence")}
            placeholderTextColor={colors.textSecondary}
            onSubmitEditing={addSkill}
            returnKeyType="done"
          />
          <TouchableOpacity style={[styles.addSkillButton, { backgroundColor: colors.secondary }]} onPress={addSkill}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.skillsContainer}>
          {editableParsedCv.skills.map((skill, index) => (
            <TouchableOpacity key={index} style={[styles.skillChip, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]} onPress={() => removeSkill(skill)}>
              <Text style={[styles.skillText, { color: colors.secondary }]}>{skill}</Text>
              <Ionicons name="close-circle" size={16} color={colors.secondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Expérience Professionnelle */}
      <View style={styles.formSection}>
        <View style={styles.subsectionHeader}>
          <Text style={[styles.formSectionTitle, { color: colors.textPrimary }]}>{t('Expérience Professionnelle')}</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]} onPress={addExperience}>
            <Ionicons name="add" size={16} color={colors.secondary} />
            <Text style={[styles.addButtonText, { color: colors.secondary }]}>{t('Ajouter')}</Text>
          </TouchableOpacity>
        </View>
        
        {editableParsedCv.experience.map((exp, index) => (
          <View key={index} style={[styles.experienceItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.experienceHeader}>
              <Text style={[styles.experienceIndex, { color: colors.secondary }]}>#{index + 1}</Text>
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: colors.error + '15' }]}
                onPress={() => removeExperience(index)}
              >
                <Ionicons name="trash" size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Poste')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.title}
                onChangeText={(text) => updateExperience(index, 'title', text)}
                placeholder={t("Poste")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Entreprise')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.organization}
                onChangeText={(text) => updateExperience(index, 'organization', text)}
                placeholder={t("Entreprise")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Période')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.dates}
                onChangeText={(text) => updateExperience(index, 'dates', text)}
                placeholder={t("Période")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Lieu')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.location || ''}
                onChangeText={(text) => updateExperience(index, 'location', text)}
                placeholder={t("Lieu")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.description || ''}
                onChangeText={(text) => updateExperience(index, 'description', text)}
                placeholder={t("Description")}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>
        ))}
      </View>

      {/* Formation */}
      <View style={styles.formSection}>
        <View style={styles.subsectionHeader}>
          <Text style={[styles.formSectionTitle, { color: colors.textPrimary }]}>{t('Formation')}</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]} onPress={addEducation}>
            <Ionicons name="add" size={16} color={colors.secondary} />
            <Text style={[styles.addButtonText, { color: colors.secondary }]}>{t('Ajouter')}</Text>
          </TouchableOpacity>
        </View>
        
        {editableParsedCv.education.map((edu, index) => (
          <View key={index} style={[styles.educationItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{t('Formation')} #{index + 1}</Text>
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: colors.error + '15' }]}
                onPress={() => removeEducation(index)}
              >
                <Ionicons name="trash" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nom de l\'établissement/diplôme')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={edu.name}
                onChangeText={(text) => updateEducation(index, 'name', text)}
                placeholder={t("Nom de l'établissement/diplôme")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Période')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={edu.dates}
                onChangeText={(text) => updateEducation(index, 'dates', text)}
                placeholder={t("Période")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        ))}
      </View>

      {(cvUpdateError || candidatUpdateError) && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{cvUpdateError || candidatUpdateError}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { backgroundColor: colors.settingIconBg, borderColor: colors.border }]}
          onPress={() => {
            setCvEditMode(false);
            setCandidatEditMode(false);
            loadParsedCv();
            loadCandidatProfile();
            setCvUpdateError(null);
            setCandidatUpdateError(null);
          }}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{t('Annuler')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.secondary }]}
          onPress={handleCvAndCandidatSave}
        >
          <Text style={styles.primaryButtonText}>{t('Sauvegarder')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCvDisplay = () => (
    <View style={styles.cvViewContainer}>
      {/* Informations personnelles CV */}
      {(parsedCv?.full_name || parsedCv?.email || parsedCv?.phone || parsedCv?.summary) && (
        <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Informations personnelles CV')}</Text>
          
          {parsedCv?.full_name && (
            <View style={styles.cvViewItem}>
              <Ionicons name="person" size={16} color={colors.textSecondary} />
              <Text style={[styles.cvViewText, { color: colors.textPrimary }]}>{parsedCv.full_name}</Text>
            </View>
          )}

          {parsedCv?.email && (
            <View style={styles.cvViewItem}>
              <Ionicons name="mail" size={16} color={colors.textSecondary} />
              <Text style={[styles.cvViewText, { color: colors.textPrimary }]}>{parsedCv.email}</Text>
            </View>
          )}

          {parsedCv?.phone && (
            <View style={styles.cvViewItem}>
              <Ionicons name="call" size={16} color={colors.textSecondary} />
              <Text style={[styles.cvViewText, { color: colors.textPrimary }]}>{parsedCv.phone}</Text>
            </View>
          )}

          {parsedCv?.summary && (
            <View style={styles.cvViewItem}>
              <Ionicons name="document-text" size={16} color={colors.textSecondary} />
              <Text style={[styles.cvViewText, { color: colors.textPrimary }]}>{parsedCv.summary}</Text>
            </View>
          )}
        </View>
      )}

      {/* Compétences */}
      {parsedCv?.skills && parsedCv.skills.length > 0 && (
        <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Compétences')}</Text>
          <View style={styles.skillsContainer}>
            {parsedCv.skills.map((skill: string, index: number) => (
              <View key={index} style={[styles.skillChipView, { backgroundColor: colors.secondary + '15' }]}>
                <Text style={[styles.skillTextView, { color: colors.secondary }]}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Expérience professionnelle */}
      {parsedCv?.experience && parsedCv.experience.length > 0 && (
        <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Expérience Professionnelle')}</Text>
          {parsedCv.experience.map((exp: ExperienceItem, index: number) => (
            <View key={index} style={[styles.experienceViewItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.experienceViewHeader}>
                <Text style={[styles.experienceTitle, { color: colors.textPrimary }]}>{exp.title}</Text>
                <Text style={[styles.experienceDates, { color: colors.textSecondary }]}>{exp.dates}</Text>
              </View>
              <Text style={[styles.experienceOrganization, { color: colors.secondary }]}>{exp.organization}</Text>
              {exp.location && (
                <Text style={[styles.experienceLocation, { color: colors.textSecondary }]}>{exp.location}</Text>
              )}
              {exp.description && (
                <Text style={[styles.experienceDescription, { color: colors.textPrimary }]}>{exp.description}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Formation */}
      {parsedCv?.education && parsedCv.education.length > 0 && (
        <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Formation')}</Text>
          {parsedCv.education.map((edu: EducationItem, index: number) => (
            <View key={index} style={[styles.educationViewItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.educationName, { color: colors.textPrimary }]}>{edu.name}</Text>
              <Text style={[styles.educationDates, { color: colors.textSecondary }]}>{edu.dates}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Nom du fichier CV téléchargé */}
      {cvFileName && (
        <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Fichier CV téléchargé')}</Text>
          <View style={[styles.currentFileContainer, { backgroundColor: colors.success + '10' }]}>
            <Ionicons name="document" size={16} color={colors.success} />
            <Text style={[styles.fileName, { color: colors.success }]}>{cvFileName}</Text>
          </View>
        </View>
      )}

      {/* Bouton d'exportation du CV */}
      <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.secondary }]} onPress={handleExportCv} disabled={exportingCv}>
        {exportingCv ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <FontAwesome5 name="file-download" size={18} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>{t('Exporter le CV (PDF)')}</Text>
          </>
        )}
      </TouchableOpacity>
      {exportError && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{exportError}</Text>
        </View>
      )}
    </View>
  );

  // NOUVEAU : Rendu de la section Intérimaire
  const renderInterimSection = () => (
    <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="business" size={24} color={colors.secondary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Profil Intérimaire')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, interimEditMode && styles.actionButtonActive, { backgroundColor: interimEditMode ? colors.secondary : colors.settingIconBg }]}
            onPress={() => interimEditMode ? handleInterimProfileSave() : setInterimEditMode(true)}
          >
            <Ionicons
              name={interimEditMode ? "checkmark" : "pencil"}
              size={18}
              color={interimEditMode ? "#ffffff" : colors.secondary}
            />
          </TouchableOpacity>
          {interimEditMode && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonCancel, { backgroundColor: colors.error }]}
              onPress={() => {
                setInterimEditMode(false);
                loadInterimProfile();
                setInterimUpdateError(null);
              }}
            >
              <Ionicons name="close" size={18} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loadingInterimProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement du profil intérimaire...')}</Text>
        </View>
      ) : interimEditMode ? (
        // Formulaire d'édition du profil Intérimaire
        <View style={styles.editContainer}>
          {/* Champs non modifiables */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nom complet')}</Text>
            <TextInput
              style={[styles.input, styles.disabledInputStyle, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={user?.name || ''}
              editable={false}
              placeholder={t("Nom complet de l'utilisateur")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
            <TextInput
              style={[styles.input, styles.disabledInputStyle, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={user?.email || ''}
              editable={false}
              placeholder={t("Email de l'utilisateur")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Matricule')}</Text>
            <TextInput
              style={[styles.input, styles.disabledInputStyle, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.matricule || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, matricule: text }))}
              placeholder={t("Matricule de l'agent")}
              placeholderTextColor={colors.textSecondary}
              editable={false} // Rendu non modifiable
            />
          </View>

          {/* Champs modifiables */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Sexe')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.sexe || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, sexe: text }))}
              placeholder={t("Homme, Femme")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Situation matrimoniale')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.matrimoniale || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, matrimoniale: text }))}
              placeholder={t("Célibataire, Marié(e)...")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nationalité')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.nationalite || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, nationalite: text }))}
              placeholder={t("Nationalité")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Téléphone (Agent)')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.phone || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, phone: text }))}
              placeholder={t("Numéro de téléphone de l'agent")}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Date de naissance (Agent)')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.date_naissance || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, date_naissance: text }))}
              placeholder={t("AAAA-MM-JJ")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Lieu de naissance (Agent)')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.lieu_naissance || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, lieu_naissance: text }))}
              placeholder={t("Lieu de naissance de l'agent")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Numéro CNI')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.cni || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, cni: text }))}
              placeholder={t("Numéro de carte d'identité")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Adresse (Agent)')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.adresse || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, adresse: text }))}
              placeholder={t("Adresse de l'agent")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Chemin photo de profil')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.profile_photo_path || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, profile_photo_path: text }))}
              placeholder={t("URL ou chemin de la photo")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Statut de l\'agent')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.statut_agent || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, statut_agent: text }))}
              placeholder={t("Actif, En congé, etc.")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Diplôme')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.diplome || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, diplome: text }))}
              placeholder={t("Ex: Licence en Informatique")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Taux de retenue (%)')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={String(editableInterimProfile?.taux_retenu ?? '')}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, taux_retenu: parseFloat(text) || 0 }))}
              placeholder={t("Ex: 10.5")}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Taux de remboursement (%)')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={String(editableInterimProfile?.taux_remboursse ?? '')}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, taux_remboursse: parseFloat(text) || 0 }))}
              placeholder={t("Ex: 5.0")}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {interimUpdateError && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{interimUpdateError}</Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { backgroundColor: colors.settingIconBg, borderColor: colors.border }]}
              onPress={() => {
                setInterimEditMode(false);
                loadInterimProfile();
                setInterimUpdateError(null);
              }}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{t('Annuler')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.secondary }]}
              onPress={handleInterimProfileSave}
            >
              <Text style={styles.primaryButtonText}>{t('Sauvegarder')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Mode affichage du profil Intérimaire
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="person" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Nom complet')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.email || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="finger-print" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Matricule')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.matricule || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="transgender" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Sexe')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.sexe || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="heart" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Situation matrimoniale')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.matrimoniale || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="flag" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Nationalité')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.nationalite || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="call" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Téléphone (Agent)')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.phone || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Date de naissance (Agent)')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.date_naissance || t('Non renseignée')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="map" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Lieu de naissance (Agent)')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.lieu_naissance || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="id-card" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Numéro CNI')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.cni || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="home" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Adresse (Agent)')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.adresse || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="image" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Chemin photo de profil')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.profile_photo_path || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="briefcase" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Statut de l\'agent')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.statut_agent || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="school" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Diplôme')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.diplome || t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="wallet" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Taux de retenue (%)')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.taux_retenu ?? t('Non renseigné')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="receipt" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Taux de remboursement (%)')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.taux_remboursse ?? t('Non renseigné')}</Text>
            </View>
          </View>
        </View>
      )}
      {!interimProfile && !loadingInterimProfile && (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('Pas de profil intérimaire')}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('Créez votre profil intérimaire pour gérer les offres et les candidats.')}
          </Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.secondary }]} onPress={() => setInterimEditMode(true)}>
            <Text style={styles.primaryButtonText}>{t('Créer mon profil intérimaire')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader
        title={t("Mon Profil")}
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {renderTabBar()}

      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'personal' ? renderPersonalInfo() : activeTab === 'cv' ? renderCvSection() : renderInterimSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderColor: '#eee',
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
  },
  tabBar: {
    flexDirection: 'row',
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
    gap: 8,
  },
  activeTab: {
    // backgroundColor est géré par le style inline
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
  },
  activeTabText: {
    // color est géré par le style inline
  },

  // Section Styles
  section: {
    margin: 16,
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
    borderWidth: 1,
  },
  actionButtonActive: {
    // backgroundColor et borderColor sont gérés par le style inline
  },
  actionButtonCancel: {
    // backgroundColor et borderColor sont gérés par le style inline
  },
  uploadButton: {
    // backgroundColor et borderColor sont gérés par le style inline
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
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
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabledText: {
    fontSize: 16,
    flex: 1,
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
  },
  statusOptionActive: {
    // backgroundColor et borderColor sont gérés par le style inline
  },
  statusOptionInactive: {
    // backgroundColor et borderColor sont gérés par le style inline
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  statusTextActive: {
    // color est géré par le style inline
  },
  statusTextInactive: {
    // color est géré par le style inline
  },

  // CV Styles
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  cvSubSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 14,
    marginRight: 8,
  },
  skillChipView: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillTextView: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Experience Styles
  experienceItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  experienceIndex: {
    fontSize: 14,
    fontWeight: '700',
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
  },

  // Education Styles
  educationItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  educationIndex: {
    fontSize: 14,
    fontWeight: '700',
  },

  // CV View Styles
  cvViewContainer: {
    gap: 20,
  },
  cvViewSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  cvViewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    flex: 1,
  },
  cvInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  cvInfoValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  cvContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  experienceViewItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
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
    flex: 1,
  },
  experienceDates: {
    fontSize: 12,
    fontWeight: '500',
  },
  experienceOrganization: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  experienceLocation: {
    fontSize: 12,
    marginBottom: 8,
  },
  experienceDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  educationViewItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  educationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  educationDates: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyCvContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCvText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyCvSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  currentFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});


