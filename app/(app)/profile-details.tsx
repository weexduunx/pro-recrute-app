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
  Platform,
  Button,
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
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker'; // Expo-friendly
import DatePicker from 'react-native-date-picker'

const { width } = Dimensions.get('window');

// Interfaces pour les objets d'expérience et de formation
interface ExperienceItem {
  titre: string;
  entreprise: string;
  lieux?: string;
  date_debut: string;
  date_fin: string;
  missions?: string;
  type_contrat_id?: number;
  type_contrat_label?: string;
  competences?: { id: number; libelle_competence: string; pivot?: { niveau_competence?: number } }[]; // NOUVEAU : Compétences liées à l'expérience
}

interface EducationItem {
  name: string;
  dates: string;
}

// MODIFIÉ : Interface pour les formations
interface FormationItem {
  id?: number; // Ajout de l'ID pour la clé
  nomDiplome: string;
  universite: string;
  dateDebut?: string;
  dateFin?: string;
  niveau_etude_id?: number;
  niveau_etude_label?: string;
  description?: string;
  competences?: { id: number; libelle_competence: string }[]; // NOUVEAU : Compétences liées à la formation
}

// ParsedCvData ne contient plus skills et experience directement
interface ParsedCvData {
  full_name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  // education?: EducationItem[];
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
  status: number;
  disponibilite: string;
  competences?: { id: number; libelle_competence: string; pivot?: { niveau_competence?: number } }[];
  experiences?: ExperienceItem[]; // Utilise la nouvelle interface ExperienceItem
  formations?: FormationItem[]; // NOUVEAU : Formations
  parsed_cv?: ParsedCvData;
}


interface InterimProfileData {
  matricule?: string;
  sexe?: number;
  matrimoniale?: number;
  nationalite?: string;
  phone?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  cni?: string;
  adresse?: string;
  profile_photo_path?: string;
  statut_agent?: number;
  diplome?: string;
  taux_retenu?: number;
  taux_remboursse?: number;
  sexe_label?: string;
  statut_agent_label?: string;
  situation_matrimoniale_label?: string;
  taux_retenu_label?: string;
  taux_remboursse_label?: string;
  is_contract_active?: boolean; // NOUVEAU : Statut du contrat
}


export default function ProfileDetailsScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === 'interimaire') return 'interimaire';
    return 'personal';
  });


  // Etats Date Picker
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fonction pour convertir la date en string AAAA-MM-JJ
  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fonction pour convertir la string en Date
  const parseStringToDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

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
    matricule: '', sexe: 1, matrimoniale: 1, nationalite: '', phone: '', date_naissance: '', lieu_naissance: '', cni: '', adresse: '', profile_photo_path: '', statut_agent: 0, diplome: '', taux_retenu: 0, taux_remboursse: 0,
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

  // --- editableParsedCv reflète la nouvelle structure (pas de skills/experience directs)
  const [editableParsedCv, setEditableParsedCv] = useState<ParsedCvData>({
    full_name: '', email: '', phone: '', summary: '',
  });
  //  États pour les compétences, formations et expériences du candidat (séparées de parsedCv)
  // const [editableCompetences, setEditableCompetences] = useState<{ libelle_competence: string; niveau_competence?: number }[]>([]);
  const [editableExperiences, setEditableExperiences] = useState<ExperienceItem[]>([]);
  const [editableFormations, setEditableFormations] = useState<FormationItem[]>([]); // État pour les formations
  // const [niveauEtudes, setNiveauEtudes] = useState<{ id: number, libelle_niveau_etude: string }[]>([]);


  // --- États pour les compétences et expériences du candidat (séparées de parsedCv)
  const [editableSkills, setEditableSkills] = useState<{ libelle_competence: string; niveau_competence?: number }[]>([]);

  //--- Noms des champs pour les expériences
  const [newSkillText, setNewSkillText] = useState('');
  const [newExpCompetenceText, setNewExpCompetenceText] = useState(''); // Pour compétences liées à l'expérience
  const [newFormCompetenceText, setNewFormCompetenceText] = useState(''); // Pour compétences liées à la formation

  const [showPersonalInfo, setShowPersonalInfo] = useState(true);

  // Options pour le Picker du type de contrat
  const contractTypeOptions = [
    { label: t('Sélectionner un type'), value: null }, // Option par défaut
    { label: t('CDI'), value: 1 },
    { label: t('CDD'), value: 2 },
    { label: t('Stage'), value: 3 },
    { label: t('CTT'), value: 4 },
  ];

  // Fonction utilitaire pour obtenir le libellé du type de contrat
  const getContractTypeLabel = (id: number | null | undefined) => {
    const option = contractTypeOptions.find(opt => opt.value === id);
    return option ? option.label : t('Non spécifié');
  };

  const niveauEtudeOptions = [
    { label: t('Sélectionner un niveau'), value: null }, // Option par défaut
    { label: t('CFEE'), value: 1 },
    { label: t('BFEM'), value: 2 },
    { label: t('BAC'), value: 3 },
    { label: t('LICENCE'), value: 4 },
    { label: t('MASTER'), value: 5 },
    { label: t('DOCTORAT'), value: 6 },
    { label: t('BTS'), value: 7 },
    { label: t('DTS'), value: 8 },
    { label: t('DUT'), value: 9 },
    { label: t('CAP'), value: 10 },
    { label: t('BEP'), value: 11 },
  ];

  // Fonction utilitaire pour obtenir le libellé du type de contrat
  const getNiveauEtudeLabel = (id: number | null | undefined) => {
    const option = niveauEtudeOptions.find(opt => opt.value === id);
    return option ? option.label : t('Non spécifié');
  };
  // --- Callbacks de chargement de données ---
  const loadCandidatProfile = useCallback(async () => {
    if (user && (user.role === 'user' || user.role === 'interimaire')) {
      setLoadingCandidatProfile(true);
      try {
        // Charge le candidat AVEC ses relations competences, experiences, formations et parsed_cv
        const data: CandidatProfileData = await getCandidatProfile();
        setCandidatProfile(data);

        // Initialiser editableCandidatProfile avec les données de base du candidat
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

        // CORRECTION: Initialiser editableSkills avec gestion des niveaux
        const skillsWithLevels = data?.competences?.map((s: any) => {
          // Vérifier plusieurs sources possibles pour le niveau
          const niveau = s.pivot?.niveau_competence ||
            s.niveau_competence ||
            1; // Valeur par défaut

          console.log(`Compétence: ${s.libelle_competence}, Niveau: ${niveau}`); // Pour déboguer

          return {
            libelle_competence: s.libelle_competence,
            niveau_competence: niveau
          };
        }) || [];


        setEditableSkills(skillsWithLevels);
        // setEditableExperiences(data?.experiences || []);
        setEditableExperiences(data?.experiences?.map((exp: any) => ({
          ...exp,
          competences: exp.competences?.map((c: any) => ({ libelle_competence: c.libelle_competence, niveau_competence: c.pivot?.niveau_competence })) || [],
        })) || []);
        setEditableFormations(data?.formations?.map((form: any) => ({
          ...form,
          competences: form.competences?.map((c: any) => ({ libelle_competence: c.libelle_competence })) || [],
        })) || []);

        // Initialiser parsedCv et editableParsedCv à partir de la relation parsed_cv
        setParsedCv(data?.parsed_cv || null);
        setEditableParsedCv({
          full_name: data?.parsed_cv?.full_name || user?.name || '',
          email: data?.parsed_cv?.email || user?.email || '',
          phone: data?.parsed_cv?.phone || '',
          summary: data?.parsed_cv?.summary || '',
          // education: Array.isArray(data?.parsed_cv?.education) ? data?.parsed_cv?.education : [],
        });

        if (data?.parsed_cv?.last_parsed_file) {
          setCvFileName(data.parsed_cv.last_parsed_file);
        } else {
          setCvFileName(null);
        }

      } catch (error: any) {
        setCandidatProfile(null);
        setEditableCandidatProfile({
          date_naissance: '',
          lieu_naissance: '',
          genre: 'Homme',
          telephone: '',
          titreProfil: '',
          photo_profil: '',
          status: 1,
          disponibilite: '',
        });
        setEditableSkills([]);
        setEditableExperiences([]);
        setEditableFormations([]);
        setParsedCv(null);
        setCvFileName(null);
      } finally {
        setLoadingCandidatProfile(false);
      }
    } else {
      setCandidatProfile(null);
      setEditableCandidatProfile({
        date_naissance: '',
        lieu_naissance: '',
        genre: 'Homme',
        telephone: '',
        titreProfil: '',
        photo_profil: '',
        status: 1,
        disponibilite: '',
      });
      setEditableSkills([]);
      setEditableExperiences([]);
      setEditableFormations([]);
      setParsedCv(null);
      setCvFileName(null);
      setLoadingCandidatProfile(false);
    }
  }, [user]);

  const loadInterimProfile = useCallback(async () => {
    if (user && user.role === 'interimaire') {
      setLoadingInterimProfile(true);
      try {
        const data = await getInterimProfile();
        setInterimProfile(data);
        setEditableInterimProfile({
          matricule: data?.matricule || '',
          sexe: data?.sexe ?? 1,
          matrimoniale: data?.matrimoniale ?? 1,
          nationalite: data?.nationalite || '',
          phone: data?.phone || '',
          date_naissance: data?.date_naissance || '',
          lieu_naissance: data?.lieu_naissance || '',
          cni: data?.cni || '',
          adresse: data?.adresse || '',
          profile_photo_path: data?.profile_photo_path || '',
          statut_agent: data?.statut_agent ?? 0,
          diplome: data?.diplome || '',
          taux_retenu: data?.taux_retenu ?? 0,
          taux_remboursse: data?.taux_remboursse ?? 0,
        });
      } catch (error: any) {
        console.error("Erreur de chargement du profil intérimaire:", error);
        setInterimProfile(null);
        setEditableInterimProfile({ matricule: '', sexe: 1, matrimoniale: 1, nationalite: '', phone: '', date_naissance: '', lieu_naissance: '', cni: '', adresse: '', profile_photo_path: '', statut_agent: 0, diplome: '', taux_retenu: 0, taux_remboursse: 0, });
      } finally {
        setLoadingInterimProfile(false);
      }
    } else {
      setInterimProfile(null);
      setEditableInterimProfile({ matricule: '', sexe: 1, matrimoniale: 1, nationalite: '', phone: '', date_naissance: '', lieu_naissance: '', cni: '', adresse: '', profile_photo_path: '', statut_agent: 0, diplome: '', taux_retenu: 0, taux_remboursse: 0, });
      setLoadingInterimProfile(false);
    }
  }, [user]);

  const loadParsedCv = useCallback(async () => {
    if (user && user.role !== 'user') { // Seulement si pas candidat, sinon loadCandidatProfile le fait
      setLoadingParsedCv(true);
      try {
        const rawData = await getParsedCvData(); // Cette API retourne ParsedCv seul
        const data: ParsedCvData = rawData ?? {};
        setParsedCv(data);
        setEditableParsedCv({
          full_name: data?.full_name || user?.name || '',
          email: data?.email || user?.email || '',
          phone: data?.phone || '',
          summary: data?.summary || '',
          // education:  [],
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
    } else if (user?.role === 'user') {
      // Si c'est un candidat, parsedCv est déjà chargé par loadCandidatProfile
      setLoadingParsedCv(false);
    } else {
      setParsedCv(null);
      setCvFileName(null);
      setLoadingParsedCv(false);
    }
  }, [user]);

  // useEffect pour le chargement initial ---
  useEffect(() => {
    setEditableName(user?.name || '');
    loadCandidatProfile();
    loadInterimProfile();
  }, [user, loadCandidatProfile, loadInterimProfile]);

  // Gestionnaire d'événements pour la sauvegarde des informations personnelles
  const handlePersonalInfoSave = async () => {
    try {
      setProfileUpdateError(null);
      setCandidatUpdateError(null);

      // 1. Mise à jour du nom d'utilisateur (profil principal)
      if (user && user.name !== editableName) {
        await updateUserProfile({ name: editableName });
        Alert.alert(t("Succès"), t("Votre nom a été mis à jour avec succès !"));
      }

      // 2. Validation des champs requis (profil candidat)
      if (user?.role === 'user' || user?.role === 'interimaire') {
        const { titreProfil, telephone, disponibilite, date_naissance } = editableCandidatProfile;

        if (!titreProfil || !telephone || !disponibilite) {
          const msg = t("Veuillez remplir tous les champs obligatoires.");
          Alert.alert(t("Erreur"), msg);
          setCandidatUpdateError(msg);
          return;
        }

        if (date_naissance && isNaN(new Date(date_naissance).getTime())) {
          const msg = t("Format de date de naissance invalide (AAAA-MM-JJ).");
          Alert.alert(t("Erreur"), msg);
          setCandidatUpdateError(msg);
          return;
        }

        // 3. Conversion safe du champ 'status'
        const candidatDataToSave: CandidatProfileData = {
          ...editableCandidatProfile,
          status: typeof editableCandidatProfile.status === 'string'
            ? parseInt(editableCandidatProfile.status, 10) || 0
            : editableCandidatProfile.status,
        };
        console.log(editableCandidatProfile.status)
        await createOrUpdateCandidatProfile(candidatDataToSave);
        await loadCandidatProfile();

        Alert.alert(t("Succès"), t("Informations personnelles mises à jour !"));
      }

      setPersonalEditMode(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || t("Échec de la mise à jour.");
      setProfileUpdateError(msg);
      setCandidatUpdateError(msg);
      Alert.alert(t("Erreur"), msg);
    }
  };

  const handleCvSave = async () => {
    try {
      setCvUpdateError(null);
      setCandidatUpdateError(null);

      // 1. Préparer les données à sauvegarder
      const parsedCvDataToSave: ParsedCvData = {
        full_name: user?.name || '',
        email: user?.email || '',
        phone: candidatProfile?.telephone || '',
        summary: editableParsedCv.summary,
        // education: editableParsedCv.education,
      };

      const competencesToSave = editableSkills.map((s) => {
        if (!s.niveau_competence || s.niveau_competence < 1 || s.niveau_competence > 5) {
          throw new Error(t(`Veuillez définir un niveau de compétence valide pour "${s.libelle_competence}"`));
        }
        return {
          libelle_competence: s.libelle_competence,
          niveau_competence: s.niveau_competence,
        };
      });

      const experiencesToSave = editableExperiences.map(e => ({
        titre: e.titre,
        entreprise: e.entreprise,
        date_debut: e.date_debut,
        date_fin: e.date_fin,
        lieux: e.lieux,
        missions: e.missions,
        type_contrat_id: e.type_contrat_id,
        competences: e.competences?.map(c => ({ libelle_competence: c.libelle_competence, niveau_competence: c.pivot?.niveau_competence })),
      }));

      // Préparer les données pour formations
      const formationsToSave = editableFormations.map(f => ({
        nomDiplome: f.nomDiplome,
        universite: f.universite,
        dateDebut: f.dateDebut,
        dateFin: f.dateFin,
        niveau_etude_id: f.niveau_etude_id,
        description: f.description,
        // Compétences liées à la formation
        competences: f.competences?.map(c => ({ libelle_competence: c.libelle_competence })),
      }));

      // 2. Combine avec le profil existant (en forçant status à un entier)
      const candidatData: CandidatProfileData = {
        ...editableCandidatProfile,
        status: typeof editableCandidatProfile.status === 'string'
          ? parseInt(editableCandidatProfile.status, 10) || 0
          : editableCandidatProfile.status,
      };

      const combinedData = {
        ...candidatData,
        parsed_cv: parsedCvDataToSave,
        competences: competencesToSave,
        experiences: experiencesToSave,
        formations: formationsToSave,
      };

      await createOrUpdateCandidatProfile(combinedData);
      await loadCandidatProfile();

      Alert.alert(t("Succès"), t("Informations du CV mises à jour !"));
      setCvEditMode(false);
    } catch (error: any) {
      let msg = error.message || t("Échec de la mise à jour du CV.");

      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        msg = Object.values(backendErrors).flat().join('\n');
      }

      Alert.alert(t("Erreur"), msg);
      setCvUpdateError(msg);
      setCandidatUpdateError(msg);
    }
  };

  const handleInterimProfileSave = async () => {
    setInterimUpdateError(null);
    try {
      if (!editableInterimProfile) {
        setInterimUpdateError(t("Aucune donnée de profil intérimaire à sauvegarder."));
        return;
      }
      if (!editableInterimProfile.phone || !editableInterimProfile.cni || !editableInterimProfile.adresse) {
        Alert.alert(t("Erreur"), t("Veuillez remplir tous les champs obligatoires (Téléphone, CNI, Adresse)."));
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
        await loadCandidatProfile();
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
      if (!candidatProfile?.parsed_cv || !user || (
        !candidatProfile.parsed_cv.full_name && !candidatProfile.parsed_cv.email && !candidatProfile.parsed_cv.phone &&
        !candidatProfile.parsed_cv.summary && (!candidatProfile.competences || candidatProfile.competences.length === 0) &&
        (!candidatProfile.experiences || candidatProfile.experiences.length === 0) &&
        (!candidatProfile.formations || candidatProfile.formations.length === 0)
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
    if (newSkillText.trim() && !editableSkills.some(s => s.libelle_competence.toLowerCase() === newSkillText.trim().toLowerCase())) {
      setEditableSkills((prev) => [...prev, { libelle_competence: newSkillText.trim(), niveau_competence: 1 }]); // Niveau par défaut 1
      setNewSkillText('');
      Keyboard.dismiss();
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setEditableSkills((prev) => prev.filter((skill) => skill.libelle_competence.toLowerCase() !== skillToRemove.toLowerCase()));
  };

  // Gestion expérience
  const addExperience = () => {
    // Utilise les noms de champs français
    setEditableExperiences((prev) => [...prev, { titre: '', entreprise: '', date_debut: '', date_fin: '', lieux: '', missions: '', type_contrat_id: 1, competences: [] }]);
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, value: string) => {
    setEditableExperiences((prev) => {
      const updatedExperiences = [...prev];
      updatedExperiences[index] = { ...updatedExperiences[index], [field]: value };
      return updatedExperiences;
    });
  };

  const removeExperience = (index: number) => {
    setEditableExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  // Gestion des compétences liées à l'expérience
  const addExpCompetence = (expIndex: number) => {
    const competenceText = newExpCompetenceText.trim();
    if (competenceText) {
      setEditableExperiences(prevExperiences => {
        const updatedExperiences = [...prevExperiences];
        const currentExp = updatedExperiences[expIndex];
        if (currentExp && !currentExp.competences?.some(c => c.libelle_competence.toLowerCase() === competenceText.toLowerCase())) {
          currentExp.competences = [...(currentExp.competences || []), { id: 0, libelle_competence: competenceText, pivot: { niveau_competence: 1 } }];
        }
        return updatedExperiences;
      });
      setNewExpCompetenceText('');
      Keyboard.dismiss();
    }
  };

  const removeExpCompetence = (expIndex: number, compToRemove: string) => {
    setEditableExperiences(prevExperiences => {
      const updatedExperiences = [...prevExperiences];
      const currentExp = updatedExperiences[expIndex];
      if (currentExp?.competences) {
        currentExp.competences = currentExp.competences.filter(c => c.libelle_competence.toLowerCase() !== compToRemove.toLowerCase());
      }
      return updatedExperiences;
    });
  };

  // Gestion formation
  const addEducation = () => {
    setEditableFormations((prev) => [...prev, { nomDiplome: '', universite: '', dateDebut: '', dateFin: '', description: '', competences: [] }]); // NOUVEAU : Ajouter un tableau de compétences vides

  };

  const updateEducation = (index: number, field: keyof FormationItem, value: string) => {
    setEditableFormations((prev) => {
      const updatedFormations = [...prev];
      updatedFormations[index] = { ...updatedFormations[index], [field]: value };
      return updatedFormations;
    });
  };

  const removeEducation = (index: number) => {
    setEditableFormations((prev) => prev.filter((_, i) => i !== index));
  };

  //  Gestion des compétences liées à la formation
  const addFormCompetence = (formIndex: number) => {
    const competenceText = newFormCompetenceText.trim();
    if (competenceText) {
      setEditableFormations(prevFormations => {
        const updatedFormations = [...prevFormations];
        const currentForm = updatedFormations[formIndex];
        if (currentForm && !currentForm.competences?.some(c => c.libelle_competence.toLowerCase() === competenceText.toLowerCase())) {
          currentForm.competences = [...(currentForm.competences || []), { id: 0, libelle_competence: competenceText }];
        }
        return updatedFormations;
      });
      setNewFormCompetenceText('');
      Keyboard.dismiss();
    }
  };

  const removeFormCompetence = (formIndex: number, compToRemove: string) => {
    setEditableFormations(prevFormations => {
      const updatedFormations = [...prevFormations];
      const currentForm = updatedFormations[formIndex];
      if (currentForm?.competences) {
        currentForm.competences = currentForm.competences.filter(c => c.libelle_competence.toLowerCase() !== compToRemove.toLowerCase());
      }
      return updatedFormations;
    });
  };


  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu pressé !")); };
  const handleAvatarPress = () => { Alert.alert(t("Profil"), t("Avatar pressé !")); };

  const renderTabBar = () => {
    const interimaireTabs = [
      { key: 'cv', label: t('Candidat'), icon: 'person' },
      { key: 'interimaire', label: t('Intérimaire'), icon: 'business' },
    ];

    const userTabs = [
      { key: 'personal', label: t('Personnel'), icon: 'person' },
      { key: 'cv', label: t('Mon CV'), icon: 'document-text' },
    ];

    const tabs = user?.role === 'interimaire' ? interimaireTabs : userTabs; // Utilisez 'interim' en minuscule pour le rôle

    const handleTabChange = (tabKey: string) => {
      setActiveTab(tabKey);

      // Désactive tous les modes édition par défaut
      setPersonalEditMode(false);
      setCvEditMode(false);
      setCandidatEditMode(false);
      setInterimEditMode(false);
    };

    return (
      <View style={styles.tabBarContainer}>
        <View style={[styles.tabBar, { backgroundColor: colors.cardBackground }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
                {
                  backgroundColor:
                    activeTab === tab.key ? colors.secondary + '15' : 'transparent',
                },
              ]}
              onPress={() => handleTabChange(tab.key)}
            >
              <View
                style={[
                  styles.tabIconContainer,
                  activeTab === tab.key && styles.activeTabIconContainer,
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={24}
                  color={
                    activeTab === tab.key ? colors.secondary : colors.textSecondary
                  }
                />
              </View>
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === tab.key ? colors.secondary : colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const formatDateOfBirth = (dateString: string): string => {
    if (!dateString) return t('Non renseignée');

    try {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        return dateString;
      }

      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Erreur lors du formatage de la date:', error);
      return dateString;
    }
  };

  const renderPersonalInfo = () => (
    <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Détails Profil')}</Text>
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

      {loadingCandidatProfile && (user?.role === 'user' || user?.role === 'interimaire') ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement du profil candidat...')}</Text>
        </View>
      ) : personalEditMode ? (
        <View style={styles.editContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nom Complet')}</Text>
            <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>{user?.name}</Text>
              <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
            <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>{user?.email}</Text>
              <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
            </View>
          </View>

          {(user?.role === 'user' || user?.role === 'interimaire') && (
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
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t('Date de naissance (JJ MM AAAA)')}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      justifyContent: 'center',
                      paddingVertical: 12,
                    }
                  ]}
                  onPress={() => setDatePickerOpen(true)}
                >
                  <Text
                    style={{
                      color: editableCandidatProfile?.date_naissance
                        ? colors.textPrimary
                        : colors.textSecondary,
                      fontSize: 16,
                    }}
                  >
                    {formatDateOfBirth(editableCandidatProfile?.date_naissance) || t("JJ-MM-AAAA")}
                  </Text>
                </TouchableOpacity>

                <DatePicker
                  modal
                  open={datePickerOpen}
                  date={parseStringToDate(editableCandidatProfile?.date_naissance)}
                  mode="date"
                  onConfirm={(selectedDate) => {
                    setDatePickerOpen(false);
                    const formattedDate = formatDateToString(selectedDate);
                    setEditableCandidatProfile(prev => ({
                      ...prev!,
                      date_naissance: formattedDate
                    }));
                  }}
                  onCancel={() => {
                    setDatePickerOpen(false);
                  }}
                  title={t('Sélectionner la date de naissance')}
                  confirmText={t('Confirmer')}
                  cancelText={t('Annuler')}
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
              <Ionicons name="person" size={18} color={colors.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Nom complet')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name || t('Non renseigné')}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={18} color={colors.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.email}</Text>
            </View>
          </View>

          {(user?.role === 'user' || user?.role === 'interimaire') && candidatProfile && (
            <>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Téléphone')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.telephone || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="briefcase" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Titre professionnel')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.titreProfil || t('Non renseigné')}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Date de naissance')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatDateOfBirth(candidatProfile?.date_naissance) || t('Non renseignée')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="map" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Lieu de naissance')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.lieu_naissance || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="transgender" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Genre')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{candidatProfile?.genre || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="hourglass" size={18} color={colors.secondary} />
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
      {(user?.role === 'user' || user?.role === 'interimaire') && !candidatProfile && !loadingCandidatProfile && (
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
    <>
      {user?.role === 'interimaire' && (
        <>
          <TouchableOpacity
            style={[additionalStyles.dropdownButton, { backgroundColor: colors.cardBackground }]}
            onPress={() => setShowPersonalInfo(!showPersonalInfo)}
          >
            <View style={additionalStyles.dropdownContent}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.secondary}
                style={additionalStyles.dropdownIcon}
              />
              <Text style={[additionalStyles.dropdownTitle, { color: colors.secondary }]}>
                {t('Profil Candidat')}
              </Text>
            </View>
            <Ionicons
              name={showPersonalInfo ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.secondary}
              style={additionalStyles.dropdownArrow}
            />
          </TouchableOpacity>
          <View>
            {showPersonalInfo && renderPersonalInfo()}
          </View>
        </>

      )}
      <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
        {/* En-tête CV avec upload */}
        <View style={styles.sectionHeader}>
          <View style={styles.headerLeft}>
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
                  loadCandidatProfile(); // Recharger pour annuler les modifications
                  setCvUpdateError(null);
                }}
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* {cvFileName && (
          <View style={[styles.fileInfo, { backgroundColor: colors.success + '10' }]}>
            <Ionicons name="document" size={16} color={colors.success} />
            <Text style={[styles.fileName, { color: colors.success }]}>{cvFileName}</Text>
          </View>
        )} */}

        {cvUploadError && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{cvUploadError}</Text>
          </View>
        )}

        {loadingCandidatProfile && (user?.role === 'user' || user?.role === 'interimaire') ? ( // Utilisez loadingCandidatProfile pour le CV aussi
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.secondary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement des données...')}</Text>
          </View>
        ) : cvEditMode ? (
          renderCvEditForm()
        ) : candidatProfile?.parsed_cv || (candidatProfile?.competences && candidatProfile.competences.length > 0) || (candidatProfile?.experiences && candidatProfile.experiences.length > 0) ? ( // Check for parsed_cv OR skills OR experiences
          renderCvDisplay()
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('Aucune donnée CV')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('Saisissez manuellement vos informations ou téléchargez un CV.')}</Text>
          </View>
        )}
      </View>
    </>
  );

  const renderCvEditForm = () => (
    <View style={styles.editContainer}>
      {/* Informations de base */}
      <View style={styles.formSection}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Informations personnelles')}</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nom Complet')}</Text>
          <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.disabledText, { color: colors.textSecondary }]}>{user?.name}</Text>
            <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
          <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.disabledText, { color: colors.textSecondary }]}>{user?.email}</Text>
            <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Téléphone')}</Text>
          <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.disabledText, { color: colors.textSecondary }]}>{candidatProfile?.telephone}</Text>
            <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
          </View>
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
        <View style={styles.subSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Compétences')}</Text>
        </View>
        <View style={styles.skillsInputContainer}>
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
          {editableSkills.map((skill, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.skillChip, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]}
              onPress={() => removeSkill(skill.libelle_competence)}
            >
              {/* Nom de la compétence */}
              <Text style={[styles.skillText, { color: colors.secondary }]}>{skill.libelle_competence}</Text>

              {/* Étoiles pour le niveau */}
              <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={(e) => {
                      e.stopPropagation(); // Empêche la suppression de la compétence
                      const updated = [...editableSkills];
                      updated[index].niveau_competence = level;
                      setEditableSkills(updated);
                    }}
                  >
                    <Ionicons
                      name={
                        (skill.niveau_competence ?? 0) >= level
                          ? 'star'
                          : 'star-outline'
                      }
                      size={16}
                      color="#DAA520"  // Jaune doré
                      style={{ marginHorizontal: 1 }}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icône de suppression */}
              <Ionicons name="close-circle" size={16} color={colors.secondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>


      {/* Expérience Professionnelle */}
      <View style={styles.formSection}>
        <View style={styles.subSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Expériences')}</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]} onPress={addExperience}>
            <Ionicons name="add" size={16} color={colors.secondary} />
            <Text style={[styles.addButtonText, { color: colors.secondary }]}>{t('Ajouter')}</Text>
          </TouchableOpacity>
        </View>

        {editableExperiences.map((exp, expIndex) => ( // MODIFIÉ : Ajout de expIndex
          <View key={expIndex} style={[styles.experienceItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.experienceHeader}>
              <Text style={[styles.experienceIndex, { color: colors.secondary }]}>#{expIndex + 1}</Text>
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: colors.error + '15' }]}
                onPress={() => removeExperience(expIndex)}
              >
                <Ionicons name="trash" size={14} color={colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Poste')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.titre}
                onChangeText={(text) => updateExperience(expIndex, 'titre', text)}
                placeholder={t("Poste")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Entreprise')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.entreprise}
                onChangeText={(text) => updateExperience(expIndex, 'entreprise', text)}
                placeholder={t("Entreprise")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Date début')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.date_debut}
                onChangeText={(text) => updateExperience(expIndex, 'date_debut', text)}
                placeholder={t("AAAA-MM-JJ")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Date fin')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.date_fin}
                onChangeText={(text) => updateExperience(expIndex, 'date_fin', text)}
                placeholder={t("AAAA-MM-JJ")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Lieu')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.lieux || ''}
                onChangeText={(text) => updateExperience(expIndex, 'lieux', text)}
                placeholder={t("Lieu")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Missions')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={exp.missions || ''}
                onChangeText={(text) => updateExperience(expIndex, 'missions', text)}
                placeholder={t("Missions")}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Type de contrat')}</Text>
              <View style={[{
                borderWidth: 1,
                borderRadius: 8,
                marginVertical: 4,
                overflow: 'hidden',
              }, {
                backgroundColor: colors.background,
                borderColor: colors.border,
              }]}>
                <Picker
                  selectedValue={exp.type_contrat_id ?? null}
                  onValueChange={(itemValue: number | null) =>
                    updateExperience(expIndex, 'type_contrat_id', itemValue ? itemValue.toString() : '')
                  }
                  style={{ height: 50, width: '100%', color: colors.textPrimary }}
                  itemStyle={{ color: colors.textPrimary }}
                >
                  {contractTypeOptions.map(option => (
                    <Picker.Item key={option.value ?? 'default'} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Compétences liées à cette expérience */}
            <View style={styles.subSectionHeader}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Compétences de l\'expérience')}</Text>
            </View>
            <View style={styles.skillsInputContainer}>
              <TextInput
                style={[styles.input, styles.skillInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={newExpCompetenceText}
                onChangeText={setNewExpCompetenceText}
                placeholder={t("Ajouter une compétence à cette expérience")}
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={() => addExpCompetence(expIndex)}
                returnKeyType="done"
              />
              <TouchableOpacity style={[styles.addSkillButton, { backgroundColor: colors.secondary }]} onPress={() => addExpCompetence(expIndex)}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.skillsContainer}>
              {exp.competences?.map((comp, compIndex) => (
                <TouchableOpacity key={compIndex} style={[styles.skillChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]} onPress={() => removeExpCompetence(expIndex, comp.libelle_competence)}>
                  <Text style={[styles.skillText, { color: colors.primary }]}>{comp.libelle_competence}</Text>
                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>


      {/* Formation */}
      <View style={styles.formSection}>
        <View style={styles.subSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Formation')}</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]} onPress={addEducation}>
            <Ionicons name="add" size={16} color={colors.secondary} />
            <Text style={[styles.addButtonText, { color: colors.secondary }]}>{t('Ajouter')}</Text>
          </TouchableOpacity>
        </View>

        {editableFormations.map((edu, formIndex) => ( // Utilise editableFormations et formIndex
          <View key={formIndex} style={[styles.educationItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Formation')} #{formIndex + 1}</Text>
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: colors.error + '15' }]}
                onPress={() => removeEducation(formIndex)}
              >
                <Ionicons name="trash" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nom de l\'établissement/diplôme')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={edu.nomDiplome} // nomDiplome
                onChangeText={(text) => updateEducation(formIndex, 'nomDiplome', text)}
                placeholder={t("Nom de l'établissement/diplôme")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Université')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={edu.universite} //  universite
                onChangeText={(text) => updateEducation(formIndex, 'universite', text)}
                placeholder={t("Université")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Niveau d\'Etude')}</Text>
              <View style={[{
                borderWidth: 1,
                borderRadius: 8,
                marginVertical: 4,
                overflow: 'hidden',
              }, {
                backgroundColor: colors.background,
                borderColor: colors.border,
              }]}>
                <Picker
                  selectedValue={edu.niveau_etude_id ?? null}
                  onValueChange={(itemValue: number | null) =>
                    updateEducation(formIndex, 'niveau_etude_id', itemValue ? itemValue.toString() : '')
                  }
                  style={{ height: 50, width: '100%', color: colors.textPrimary }}
                  itemStyle={{ color: colors.textPrimary }}
                >
                  {niveauEtudeOptions.map(option => (
                    <Picker.Item key={option.value ?? 'default'} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Date début formation')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={edu.dateDebut || ''} // MODIFIÉ : dateDebut
                onChangeText={(text) => updateEducation(formIndex, 'dateDebut', text)}
                placeholder={t("AAAA-MM-JJ")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Date fin formation')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={edu.dateFin || ''} // MODIFIÉ : dateFin
                onChangeText={(text) => updateEducation(formIndex, 'dateFin', text)}
                placeholder={t("AAAA-MM-JJ")}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Description formation')}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={edu.description || ''} // MODIFIÉ : description
                onChangeText={(text) => updateEducation(formIndex, 'description', text)}
                placeholder={t("Description de la formation")}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
            {/* NOUVEAU : Compétences liées à cette formation */}
            <View style={styles.subSectionHeader}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Compétences de la formation')}</Text>
            </View>
            <View style={styles.skillsInputContainer}>
              <TextInput
                style={[styles.input, styles.skillInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={newFormCompetenceText}
                onChangeText={setNewFormCompetenceText}
                placeholder={t("Ajouter une compétence à cette formation")}
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={() => addFormCompetence(formIndex)}
                returnKeyType="done"
              />
              <TouchableOpacity style={[styles.addSkillButton, { backgroundColor: colors.secondary }]} onPress={() => addFormCompetence(formIndex)}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.skillsContainer}>
              {edu.competences?.map((comp, compIndex) => (
                <TouchableOpacity key={compIndex} style={[styles.skillChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]} onPress={() => removeFormCompetence(formIndex, comp.libelle_competence)}>
                  <Text style={[styles.skillText, { color: colors.primary }]}>{comp.libelle_competence}</Text>
                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                </TouchableOpacity>
              ))}
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
          style={[styles.secondaryButton, { backgroundColor: colors.settingIconBg, borderColor: colors.border }]}
          onPress={() => {
            setCvEditMode(false);
            setCandidatEditMode(false);
            loadCandidatProfile();
            setCvUpdateError(null);
            setCandidatUpdateError(null);
          }}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 16 }}>{t('Annuler')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.secondary }]}
          onPress={handleCvSave}
        >
          <Text style={styles.primaryButtonText}>{t('Sauvegarder')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  const renderCvDisplay = () => {
    // Fonction pour vérifier si le CV a du contenu
    const hasCvContent = () => {
      const hasPersonalInfo = candidatProfile?.parsed_cv?.full_name ||
        candidatProfile?.parsed_cv?.email ||
        candidatProfile?.parsed_cv?.phone ||
        candidatProfile?.parsed_cv?.summary;

      const hasCompetences = candidatProfile?.competences && candidatProfile.competences.length > 0;

      const hasExperiences = candidatProfile?.experiences && candidatProfile.experiences.length > 0;

      const hasEducation = candidatProfile?.formations && candidatProfile.formations.length > 0;

      const hasFile = candidatProfile?.parsed_cv?.last_parsed_file;

      // Retourne true s'il y a au moins une section avec du contenu
      return hasCompetences || hasExperiences || hasEducation;
    };

    return (
      <View style={styles.cvViewContainer}>
        {/* Informations personnelles CV */}
        {(candidatProfile?.parsed_cv?.full_name || candidatProfile?.parsed_cv?.email || candidatProfile?.parsed_cv?.phone || candidatProfile?.parsed_cv?.summary) && (
          <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Informations')}</Text>

            {candidatProfile?.parsed_cv?.full_name && (
              <View style={styles.cvViewItem}>
                <Ionicons name="person" size={16} color={colors.textSecondary} />
                <Text style={[styles.cvViewText, { color: colors.textPrimary }]}>{candidatProfile.parsed_cv.full_name}</Text>
              </View>
            )}

            {candidatProfile?.parsed_cv?.email && (
              <View style={styles.cvViewItem}>
                <Ionicons name="mail" size={16} color={colors.textSecondary} />
                <Text style={[styles.cvViewText, { color: colors.textPrimary }]}>{candidatProfile.parsed_cv.email}</Text>
              </View>
            )}

            {candidatProfile?.parsed_cv?.phone && (
              <View style={styles.cvViewItem}>
                <Ionicons name="call" size={16} color={colors.textSecondary} />
                <Text style={[styles.cvViewText, { color: colors.textPrimary }]}>{candidatProfile.parsed_cv.phone}</Text>
              </View>
            )}

            {candidatProfile?.parsed_cv?.summary && (
              <View style={styles.cvViewItem}>
                <Ionicons name="document-text" size={16} color={colors.textSecondary} />
                <Text style={[styles.cvViewText, { color: colors.textPrimary }]}>{candidatProfile.parsed_cv.summary}</Text>
              </View>
            )}
          </View>
        )}

        {/* Compétences */}
        {candidatProfile?.competences && candidatProfile.competences.length > 0 && (
          <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Compétences')}</Text>
            <View style={styles.skillsContainer}>
              {candidatProfile.competences.map((skill: any, index: number) => (
                <View key={skill.id || index} style={[styles.skillChipView, { backgroundColor: colors.secondary + '15' }]}>
                  {/* Nom de la compétence */}
                  <Text style={[styles.skillTextView, { color: colors.secondary }]}>{skill.libelle_competence}</Text>

                  {/* Étoiles pour le niveau */}
                  <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <Ionicons
                        key={level}
                        name={
                          (skill.niveau_competence ?? 0) >= level
                            ? 'star'
                            : 'star-outline'
                        }
                        size={14}
                        color="#FFD700"
                        style={{ marginHorizontal: 0.5 }}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expérience professionnelle */}
        {candidatProfile?.experiences && candidatProfile.experiences.length > 0 && (
          <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Expérience Professionnelle')}</Text>
            {candidatProfile.experiences.map((exp: ExperienceItem, index: number) => (
              <View key={exp.titre + index} style={[styles.experienceViewItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.experienceViewHeader}>
                  <Text style={[styles.experienceTitle, { color: colors.textPrimary }]}>{exp.titre}</Text>
                  <Text style={[styles.experienceDates, { color: colors.textSecondary }]}>{new Date(exp.date_debut).getFullYear()} - {new Date(exp.date_fin).getFullYear()}</Text>
                </View>
                <View style={styles.cvViewItem}>
                  <Ionicons name="business" size={16} color={colors.textSecondary} />
                  <Text style={[styles.cvViewText, { color: colors.secondary }]}>{exp.entreprise}</Text>
                </View>
                {exp.lieux && (
                  <View style={styles.cvViewItem}>
                    <Ionicons name="location" size={16} color={colors.textSecondary} />
                    <Text style={[styles.cvViewText, { color: colors.textSecondary }]}>{exp.lieux}</Text>
                  </View>
                )}

                {exp.missions && (
                  <Text style={[styles.experienceDescription, { color: colors.textPrimary }, { paddingBottom: 10 }]}>
                    <Text style={{ fontWeight: '600', color: colors.textSecondary }}>
                      {t('Missions:')}
                    </Text>
                    {exp.missions}
                  </Text>
                )}
                {exp.competences && exp.competences.length > 0 && (
                  <View style={styles.expContainer}>
                    <Text style={[styles.cvInfoLabel, { color: colors.textSecondary }]}>{t('Compétences :')}</Text>
                    {exp.competences.map((comp, compIndex) => (
                      <View key={comp.id || compIndex} style={styles.expTag}>
                        <Text style={styles.expText}>{comp.libelle_competence}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.contractTypeContainer}>
                  <Text style={[styles.cvInfoLabel, { color: colors.textSecondary }]}>
                    {t('Type de contrat:')}
                  </Text>
                  <View style={styles.contractTypeTag}>
                    <Text style={styles.contractTypeText}>
                      {exp.type_contrat_id ? getContractTypeLabel(exp.type_contrat_id) : t('Non spécifié')}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Formation */}
        {candidatProfile?.formations && candidatProfile.formations.length > 0 && ( // NOUVEAU : Affichage des formations
          <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Formation')}</Text>
            {candidatProfile.formations.map((edu: FormationItem, index: number) => (
              <View key={edu.id || index} style={[styles.educationViewItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.educationName, { color: colors.textPrimary }]}>{edu.nomDiplome}</Text>
                <Text style={[styles.educationDates, { color: colors.textSecondary }]}>{edu.universite}</Text>
                <Text style={[styles.educationDates, { color: colors.textSecondary }]}>{edu.dateDebut} - {edu.dateFin}</Text>
                {edu.description && (
                  <Text style={[styles.experienceDescription, { color: colors.textPrimary }]}>{edu.description}</Text>
                )}
                <View style={styles.contractTypeContainer}>
                  <Text style={[styles.cvInfoLabel, { color: colors.textSecondary }]}>
                    {t('Niveau d\'Etude:')}
                  </Text>
                  <View style={styles.contractTypeTag}>
                    <Text style={styles.contractTypeText}>
                      {edu.niveau_etude_id ? getNiveauEtudeLabel(edu.niveau_etude_id) : t('Non spécifié')}
                    </Text>
                  </View>
                </View>
                {/*  Affichage des compétences liées à la formation */}
                {edu.competences && edu.competences.length > 0 && (
                  <View style={styles.expContainer}>
                    <Text style={[styles.cvInfoLabel, { color: colors.textSecondary }]}>{t('Compétences :')}</Text>
                    {edu.competences.map((comp, compIndex) => (
                      <View key={comp.id || compIndex} style={styles.expTag}>
                        <Text style={styles.expText}>{comp.libelle_competence}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Nom du fichier CV téléchargé */}
        {candidatProfile?.parsed_cv?.last_parsed_file && (
          <View style={[styles.cvViewSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cvViewSectionTitle, { color: colors.textPrimary }]}>{t('Autres Ressources')}</Text>
            <View style={[styles.currentFileContainer, { backgroundColor: colors.success + '10' }]}>
              <Ionicons name="document" size={16} color={colors.success} />
              <Text style={[styles.fileName, { color: colors.success }]}>{candidatProfile.parsed_cv.last_parsed_file}</Text>
            </View>
          </View>
        )}

        {/* Bouton d'exportation du CV - affiché seulement s'il y a du contenu */}
        {hasCvContent() && (
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
        )}

        {exportError && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{exportError}</Text>
          </View>
        )}
      </View>
    );
  };

  const getSexeLabel = (sexe: number | null | undefined) => {
    if (sexe === 1) return 'Homme';
    if (sexe === 2) return 'Femme';
    return '';
  };

  const getSituationMat = (situation_matrimoniale: number | null | undefined) => {
    if (situation_matrimoniale === 1) return 'Célibataire';
    if (situation_matrimoniale === 2) return 'Divorcé(e)';
    if (situation_matrimoniale === 3) return 'Veuf(ve)';
    if (situation_matrimoniale === 0) return 'Marié(e)';
    return '';
  };

  //  Rendu de la section Intérimaire
  const renderInterimSection = () => (
    <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Profil Intérimaire')}</Text>
        </View>
        {/* <View style={styles.headerActions}>
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
        </View> */}
      </View>

      {loadingInterimProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Chargement du profil intérimaire...')}</Text>
        </View>
      ) : user?.role !== 'interimaire' || interimProfile?.is_contract_active === false ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('Accès restreint')}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('Votre contrat intérimaire est terminé ou inactif. Vous n\'avez plus accès à cet espace.')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('Veuillez contacter l\'administration pour plus d\'informations.')}
          </Text>
        </View>
      ) : interimEditMode ? (
        // Formulaire d'édition du profil Intérimaire
        <View style={styles.editContainer}>
          {/* Nom complet et Email de l'utilisateur principal (non modifiables ici) */}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Nom Complet')}</Text>
            <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>{user?.name}</Text>
              <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
            <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>{user?.email}</Text>
              <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
            </View>
          </View>

          {/* CHAMPS NON MODIFIABLES (Matricule, Statut agent, Diplôme, Taux retenue/remboursement) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Matricule')}</Text>
            <View style={[styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.disabledText, { color: colors.textSecondary }]}>EMP-{interimProfile?.matricule}</Text>
              <Ionicons name="lock-closed" size={18} color={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Diplôme')}</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.diplome || ''}
              placeholder={t("Ex: Licence en Informatique")}
              placeholderTextColor={colors.textSecondary}
              editable={false}
            />
          </View>


          {/* CHAMPS MODIFIABLES */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Sexe')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={getSexeLabel(parseInt(editableInterimProfile?.sexe))}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, sexe: text as any }))} // Cast temporaire
              placeholder={t("Homme, Femme")}
              placeholderTextColor={colors.textSecondary}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Situation matrimoniale')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={getSituationMat(parseInt(editableInterimProfile?.matrimoniale))} // Utilise le label
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, matrimoniale: text as any }))} // Cast temporaire
              placeholder={t("Célibataire, Marié(e)...")}
              placeholderTextColor={colors.textSecondary}
              editable={false}
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
              editable={false}
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

          {/* <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Date de naissance (Agent)')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.date_naissance || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, date_naissance: text }))}
              placeholder={t("AAAA-MM-JJ")}
              placeholderTextColor={colors.textSecondary}
            />
          </View> */}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('Date de naissance (AAAA-MM-JJ)')}
            </Text>

            <TouchableOpacity
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  justifyContent: 'center',
                  paddingVertical: 12,
                }
              ]}
              onPress={() => setDatePickerOpen(true)}
            >
              <Text
                style={{
                  color: editableInterimProfile?.date_naissance
                    ? colors.textPrimary
                    : colors.textSecondary,
                  fontSize: 16,
                }}
              >
                {editableInterimProfile?.date_naissance || t("AAAA-MM-JJ")}
              </Text>
            </TouchableOpacity>

            <DatePicker
              modal
              open={datePickerOpen}
              date={parseStringToDate(editableInterimProfile?.date_naissance)}
              mode="date"
              onConfirm={(selectedDate) => {
                setDatePickerOpen(false);
                const formattedDate = formatDateToString(selectedDate);
                setEditableInterimProfile(prev => ({
                  ...prev!,
                  date_naissance: formattedDate
                }));
              }}
              onCancel={() => {
                setDatePickerOpen(false);
              }}
              title={t('Sélectionner la date de naissance')}
              confirmText={t('Confirmer')}
              cancelText={t('Annuler')}
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

          {/* <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Chemin photo de profil')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={editableInterimProfile?.profile_photo_path || ''}
              onChangeText={(text) => setEditableInterimProfile(prev => ({ ...prev!, profile_photo_path: text }))}
              placeholder={t("URL ou chemin de la photo")}
              placeholderTextColor={colors.textSecondary}
            />
          </View> */}

          {interimUpdateError && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{interimUpdateError}</Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.settingIconBg, borderColor: colors.border }]}
              onPress={() => {
                setInterimEditMode(false);
                loadInterimProfile();
                setInterimUpdateError(null);
              }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 16 }}>{t('Annuler')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.secondary }]}
              onPress={handleInterimProfileSave}
            >
              <Text style={styles.primaryButtonText}>{t('Sauvegarder')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Mode affichage du profil Intérimaire
        <View style={styles.infoContainer}>
          {user?.role !== 'interimaire' || interimProfile?.is_contract_active !== true ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('Accès restreint')}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('Votre contrat intérimaire est terminé ou inactif. Vous n\'avez plus accès à cet espace.')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('Veuillez contacter l\'administration pour plus d\'informations.')}
              </Text>
            </View>
          ) : (
            <>
              {/* <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Nom complet')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="mail" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Email')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.email || t('Non renseigné')}</Text>
                </View>
              </View> */}
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="finger-print" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Matricule')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>EMP-{interimProfile?.matricule || t('Non renseigné')}</Text>
                </View>
              </View>
              {/* <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="transgender" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Sexe')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.sexe_label || t('Non renseigné')}</Text>
                </View>
              </View> */}
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="heart" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Situation matrimoniale')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.situation_matrimoniale_label || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="flag" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Nationalité')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.nationalite || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Téléphone')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.phone || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Date de naissance')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {interimProfile?.date_naissance
                      ? (() => {
                        const date = new Date(interimProfile.date_naissance);
                        if (isNaN(date.getTime())) return t('Non renseignée');
                        const day = date.getDate().toString().padStart(2, '0');
                        const month = date.toLocaleString('fr-FR', { month: 'short' });
                        const year = date.getFullYear();
                        return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)}. ${year}`;
                      })()
                      : t('Non renseignée')}
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="map" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Lieu de naissance')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.lieu_naissance || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="id-card" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Numéro CNI')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.cni || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="home" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Adresse ')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.adresse || t('Non renseigné')}</Text>
                </View>
              </View>
              {/* <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="image" size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Chemin photo de profil')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.profile_photo_path || t('Non renseigné')}</Text>
                </View>
              </View> */}
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="briefcase" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Statut de l\'agent')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.statut_agent_label || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="school" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Diplôme')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.diplome || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="wallet" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Taux de retenue (%)')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.taux_retenu_label || t('Non renseigné')}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="receipt" size={18} color={colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('Taux de remboursement (%)')}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{interimProfile?.taux_remboursse_label || t('Non renseigné')}</Text>
                </View>
              </View>
            </>
          )}
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

  const renderTabContent = () => {
    if (user?.role === 'user') {
      if (activeTab === 'personal') return renderPersonalInfo();
      if (activeTab === 'cv') return renderCvSection();
    }

    if (user?.role === 'interimaire') {
      if (activeTab === 'cv') return renderCvSection(); // L'onglet 'Candidat' pour l'intérimaire
      if (activeTab === 'interimaire') return renderInterimSection(); // L'onglet 'Intérimaire' pour l'intérimaire
    }

    return null;
  };

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
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoContainer: {
    marginBottom: 16,
    gap: 8,
  },
  formSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
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
    marginBottom: 10,
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
    justifyContent: 'space-between', // ou 'flex-start' selon votre préférence
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 10,
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
  missionStyle: {
    fontSize: 14,
    marginBottom: 12,
    paddingBottom: 12,
  },
  contratStyle: {
    fontSize: 14,
    marginBottom: 12,
    paddingBottom: 12,
  },
  experienceDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  educationViewItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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

  contractTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10
  },

  contractTypeTag: {
    backgroundColor: '#E8F5E8', // Vert soft
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9', // Vert légèrement plus foncé pour la bordure
  },

  contractTypeText: {
    color: '#2E7D32', // Vert foncé
    fontSize: 12,
    fontWeight: '500',
  },

  expContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },

  expTag: {
    backgroundColor: '#EBF3FF', // Light blue background
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE', // Light blue border
  },

  expText: {
    color: '#091e60',
    fontSize: 12,
    fontWeight: '500',
  },

  missionsContainer: {
    marginTop: 12,
  },

  missionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },

  missionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  missionsContent: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3', // Accent bleu à gauche
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
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    // borderRadius: 12,
    padding: 4,
    marginBottom: 6,
    // shadowColor: '#091e60',
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 0.08,
    // shadowRadius: 4,
    // elevation: 3,
    // borderLeftWidth: 4,
    // borderLeftColor: '#0f8e35',
  },
  infoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#effcf4',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    // borderWidth: 2,
    // borderColor: '#0f8e35',
  },
  infoContent: {
    flex: 1,
    paddingTop: 2,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#091e60',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: '#2c3e50',
  },
});
const additionalStyles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#091e60',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  dropdownArrow: {
    marginLeft: 8,
  },
  dropdownContentContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  labelText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Container pour les éléments avec icônes
  cvViewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },

  cvViewText: {
    fontSize: 14,
    flex: 1,
  },

  // Header pour les formations (cohérent avec expériences)
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },

  educationName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },

  educationDates: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Container pour type de contrat
  contractTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },

  contractTypeTag: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },

  contractTypeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '500',
  },

  // Styles pour les compétences
  skillChipView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },

  skillTextView: {
    fontSize: 12,
    fontWeight: '500',
  },
});




