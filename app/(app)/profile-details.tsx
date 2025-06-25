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
  Platform, 
  Keyboard,
  StatusBar 
} from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import CustomHeader from '../../components/CustomHeader';
import { FontAwesome5, AntDesign, Feather, FontAwesome,MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { updateUserProfile, uploadCv, getParsedCvData, updateParsedCvData } from '../../utils/api';
import { router } from 'expo-router';

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


export default function ProfileDetailsScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [cvEditMode, setCvEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'cv'

  const [editableName, setEditableName] = useState(user?.name || '');
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);

  // États pour le CV
  const [parsedCv, setParsedCv] = useState<any>(null); // Les données affichées (chargées de la DB)
  const [loadingParsedCv, setLoadingParsedCv] = useState(true);
  const [cvUpdateError, setCvUpdateError] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null); // Nom du fichier uploadé
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);

  // États pour les champs éditables du CV (ceux qui sont liés aux TextInputs)
  const [editableParsedCv, setEditableParsedCv] = useState({
    full_name: '', email: '', phone: '', summary: '', skills: [] as string[],
    experience: [] as ExperienceItem[],
    education: [] as EducationItem[],
  });

    // État pour la nouvelle compétence saisie
  const [newSkillText, setNewSkillText] = useState('');

 
  // Pour les nouvelles entrées d'expérience/formation (utilisés dans les formulaires d'ajout)
  const [newExperience, setNewExperience] = useState<ExperienceItem>({ title: '', organization: '', dates: '', location: '', description: '' });
  const [newEducation, setNewEducation] = useState<EducationItem>({ name: '', dates: '' });


  const loadParsedCv = useCallback(async () => {
    if (user) {
      setLoadingParsedCv(true);
      try {
        const data = await getParsedCvData();
        setParsedCv(data);
        // Initialiser les champs éditables pour la saisie manuelle
        setEditableParsedCv({
          full_name: data?.full_name || '',
          email: data?.email || '',
          phone: data?.phone || '',
          summary: data?.summary || '',
          skills: Array.isArray(data?.skills) ? data.skills : [],
          experience: Array.isArray(data?.experience) ? data.experience : [], // Assurer que c'est un tableau
          education: Array.isArray(data?.education) ? data.education : [],   // Assurer que c'est un tableau
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

  useEffect(() => {
    setEditableName(user?.name || '');
    loadParsedCv();
  }, [user, loadParsedCv]);


  const handleProfileSave = async () => {
    setProfileUpdateError(null);
    try {
      if (user && user.name !== editableName) {
        const updatedUser = await updateUserProfile({ name: editableName });
        Alert.alert("✅ Succès", "Votre profil a été mis à jour avec succès !");
      }
      setProfileEditMode(false);
    } catch (error: any) {
      console.error("Erreur de mise à jour du profil simple:", error);
      setProfileUpdateError(error.response?.data?.message || "Échec de la mise à jour du profil.");
    }
  };

  const handleCvSave = async () => {
    setCvUpdateError(null);
    try {
      // Les compétences sont déjà un tableau
      // L'expérience et la formation sont déjà des tableaux d'objets grâce à l'édition dynamique
      
      const dataToSave = {
        full_name: editableParsedCv.full_name,
        email: editableParsedCv.email,
        phone: editableParsedCv.phone,
        summary: editableParsedCv.summary,
        skills: editableParsedCv.skills, // Envoyer le tableau directement
        experience: editableParsedCv.experience,
        education: editableParsedCv.education,
      };

      const response = await updateParsedCvData(dataToSave);
      Alert.alert("✅ Succès", response.message || "Informations du CV mises à jour !");
      await loadParsedCv();
      setCvEditMode(false);
    } catch (error: any) {
      console.error("Erreur de sauvegarde du CV:", error);
      // Afficher l'erreur si elle vient de la validation du backend
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        let errorMessage = "Erreur de validation:\n";
        for (const key in backendErrors) {
          errorMessage += `- ${backendErrors[key][0]}\n`;
        }
        setCvUpdateError(errorMessage);
      } else {
        setCvUpdateError(error.message || error.response?.data?.message || "Échec de la mise à jour du CV.");
      }
    }
  };

  const pickDocument = async () => { // Upload du fichier CV (sans parsing auto)
    try {
      setUploadingCv(true);
      setCvUploadError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        setCvFileName(pickedAsset.name); // Mettre à jour le nom du fichier affiché
        
        const uploadResponse = await uploadCv(pickedAsset); // Appel API réel
        Alert.alert("✅ Succès", `CV "${pickedAsset.name}" téléchargé avec succès !`);
        // loadParsedCv(); // Pas besoin de recharger les données parsées ici, car pas de parsing auto
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

  const handleMenuPress = () => { /* Géré par CustomHeader */ };
  const handleAvatarPress = () => { /* Géré par CustomHeader */ };

    // NOUVEAU : Fonctions de gestion des compétences (tags)
  const addSkill = () => {
    if (newSkillText.trim() && !editableParsedCv.skills.includes(newSkillText.trim())) {
      setEditableParsedCv({
        ...editableParsedCv,
        skills: [...editableParsedCv.skills, newSkillText.trim()],
      });
      setNewSkillText('');
      Keyboard.dismiss(); // Ferme le clavier
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setEditableParsedCv({
      ...editableParsedCv,
      skills: editableParsedCv.skills.filter((skill) => skill !== skillToRemove),
    });
  };

  // NOUVEAU : Fonctions d'ajout/suppression pour l'expérience et la formation
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
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
        onPress={() => { setActiveTab('personal'); setProfileEditMode(false); setCvEditMode(false); }} // Réinitialiser le mode édition CV
      >
        <FontAwesome name="user-circle" size={24} color={activeTab === 'personal' ? '#091e60' : '#9CA3AF'} />
        <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
          Personnel
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'cv' && styles.activeTab]}
        onPress={() => { setActiveTab('cv'); setProfileEditMode(false); setCvEditMode(false); }} // Réinitialiser le mode édition profil
      >
        <FontAwesome5 name="file-alt" size={24} color={activeTab === 'cv' ? '#091e60' : '#9CA3AF'} />
        <Text style={[styles.tabText, activeTab === 'cv' && styles.activeTabText]}>
          Mon CV
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <FontAwesome name="user-circle" size={28} color="#091e60" />
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        {!profileEditMode && (
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={() => setProfileEditMode(true)}
          >
            <Feather name="edit-2" size={16} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {profileEditMode ? (
        <View style={styles.editContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom complet</Text>
            <TextInput
              style={styles.modernInput}
              value={editableName}
              onChangeText={setEditableName}
              placeholder="Votre nom complet"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledInputText}>{user?.email}</Text>
              <AntDesign name="lock" size={14} color="#9CA3AF" />
            </View>
          </View>

          {profileUpdateError && (
            <View style={styles.errorContainer}>
              <AntDesign name="exclamationcircle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{profileUpdateError}</Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                setProfileEditMode(false);
                setEditableName(user?.name || '');
                setProfileUpdateError(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleProfileSave}
            >
              <Text style={styles.primaryButtonText}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <AntDesign name="user" size={16} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{user?.name || 'Non renseigné'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <AntDesign name="mail" size={16} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderCvSection = () => (
    <View style={styles.section}>
      {/* Téléchargement de CV */}
      <View style={styles.uploadSection}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="file-upload" size={28} color="#091e60" />
          <Text style={styles.sectionTitle}>Télécharger/Mettre à jour le CV</Text>
        </View>
        
        {cvFileName && (
          <View style={styles.currentFileContainer}>
            <AntDesign name="filetext1" size={20} color="#10B981" />
            <Text style={styles.currentFileName}>{cvFileName}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.uploadButton, uploadingCv && styles.buttonDisabled]}
          onPress={pickDocument}
          disabled={uploadingCv}
        >
          {uploadingCv ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <FontAwesome5 name="cloud-upload-alt" size={18} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>
                {cvFileName ? 'Mettre à jour le CV' : 'Télécharger un CV'} 
              </Text>
            </>
          )}
        </TouchableOpacity>

        {cvUploadError && (
          <View style={styles.errorContainer}>
            <AntDesign name="exclamationcircle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{cvUploadError}</Text>
          </View>
        )}
      </View>

      {/* Données du CV (Affichage ou Édition) */}
      <View style={styles.cvDataSection}>
        <View style={styles.sectionHeader}>
          <FontAwesome5 name="file-alt" size={28} color="#091e60" />
          <Text style={styles.sectionTitle}>Mes informations de CV</Text>
          {!cvEditMode && (
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={() => setCvEditMode(true)}
            >
              <Feather name="edit-2" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {loadingParsedCv ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0f8e35" />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        ) : parsedCv || cvEditMode ? (
          cvEditMode ? renderCvEditForm() : renderCvDisplay()
        ) : (
          <View style={styles.emptyState}>
            <AntDesign name="inbox" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>Aucune donnée de CV</Text>
            <Text style={styles.emptyStateText}>
              Saisissez manuellement vos informations de CV ou téléchargez un CV.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderCvEditForm = () => (
    <View style={styles.editContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nom complet</Text>
        <TextInput
          style={styles.modernInput}
          value={editableParsedCv.full_name}
          onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, full_name: text })}
          placeholder="Nom complet du CV"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.modernInput}
          value={editableParsedCv.email}
          onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, email: text })}
          placeholder="email@exemple.com"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Téléphone</Text>
        <TextInput
          style={styles.modernInput}
          value={editableParsedCv.phone}
          onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, phone: text })}
          placeholder="+221 77 123 45 67"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Résumé professionnel</Text>
        <TextInput
          style={[styles.modernInput, styles.textArea]}
          value={editableParsedCv.summary}
          onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, summary: text })}
          placeholder="Décrivez votre profil professionnel..."
          multiline
          numberOfLines={4}
        />
      </View>

      {/* NOUVEAU : Section Saisie des Compétences sous forme de tags */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Compétences (Ajouter un tag à la fois)</Text>
        <View style={styles.skillsInputContainer}>
          <TextInput
            style={[styles.modernInput, styles.skillTextInput]}
            value={newSkillText}
            onChangeText={setNewSkillText}
            placeholder="Ajouter une compétence..."
            onSubmitEditing={addSkill} // Ajoute la compétence quand on appuie sur Entrée
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addSkillButton} onPress={addSkill}>
            <AntDesign name="pluscircleo" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.skillsContainer}>
          {editableParsedCv.skills.map((skill: string, index: number) => (
            <TouchableOpacity key={index} style={styles.skillTag} onPress={() => removeSkill(skill)}>
              <Text style={styles.skillText}>{skill} <AntDesign name="closecircleo" size={10} color="#047857" /></Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Rendu dynamique des entrées d'expérience */}
      <Text style={styles.sectionTitle}>Expérience Professionnelle</Text> 
      {editableParsedCv.experience.map((exp: ExperienceItem, index: number) => (
        <View key={index} style={styles.editableItem}>
          <Text style={styles.itemTitle}>Expérience #{index + 1}</Text> 
          <TextInput
            style={styles.modernInput}
            value={exp.title}
            onChangeText={(text) => updateExperience(index, 'title', text)}
            placeholder="Poste (ex: Développeur Full Stack)"
          />
          <TextInput
            style={styles.modernInput}
            value={exp.organization}
            onChangeText={(text) => updateExperience(index, 'organization', text)}
            placeholder="Entreprise"
          />
          <TextInput
            style={styles.modernInput}
            value={exp.dates}
            onChangeText={(text) => updateExperience(index, 'dates', text)}
            placeholder="Période (ex: 2020 - Présent)"
          />
          <TextInput
            style={styles.modernInput}
            value={exp.location}
            onChangeText={(text) => updateExperience(index, 'location', text)}
            placeholder="Lieu (ex: Dakar)"
          />
          <TextInput
            style={[styles.modernInput, styles.textAreaSmall]}
            value={exp.description}
            onChangeText={(text) => updateExperience(index, 'description', text)}
            placeholder="Description des tâches..."
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={styles.removeEntryButton} onPress={() => removeExperience(index)}>
            <AntDesign name="minuscircleo" size={20} color="#EF4444" />
            <Text style={styles.removeButtonText}>Supprimer cette expérience</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addEntryButtonBig} onPress={addExperience}>
        <AntDesign name="pluscircleo" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Ajouter une expérience</Text>
      </TouchableOpacity>

      {/* Rendu dynamique des entrées de formation */}
      <Text style={styles.sectionTitle}>Formation</Text> 
      {editableParsedCv.education.map((edu: EducationItem, index: number) => (
        <View key={index} style={styles.editableItem}>
          <Text style={styles.itemTitle}>Formation #{index + 1}</Text> 
          <TextInput
            style={styles.modernInput}
            value={edu.name}
            onChangeText={(text) => updateEducation(index, 'name', text)}
            placeholder="Nom de l'établissement ou diplôme"
          />
          <TextInput
            style={styles.modernInput}
            value={edu.dates}
            onChangeText={(text) => updateEducation(index, 'dates', text)}
            placeholder="Période (ex: 2018-2020)"
          />
          <TouchableOpacity style={styles.removeEntryButton} onPress={() => removeEducation(index)}>
            <AntDesign name="minuscircleo" size={20} color="#EF4444" />
            <Text style={styles.removeButtonText}>Supprimer cette formation</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addEntryButtonBig} onPress={addEducation}>
        <AntDesign name="pluscircleo" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Ajouter une formation</Text>
      </TouchableOpacity>


      {cvUpdateError && (
        <View style={styles.errorContainer}>
          <AntDesign name="exclamationcircle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{cvUpdateError}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => {
            setCvEditMode(false);
            loadParsedCv(); // Recharger pour annuler les modifications
            setCvUpdateError(null);
          }}
        >
          <Text style={styles.secondaryButtonText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCvSave}
        >
          <Text style={styles.primaryButtonText}>Sauvegarder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCvDisplay = () => (
    <View style={styles.cvDisplayContainer}>
      {/* Affichage des champs parsés */}
      {parsedCv?.full_name && (
        <View style={styles.cvInfoItem}>
          <AntDesign name="user" size={16} color="#6B7280" />
          <View style={styles.cvInfoContent}>
            <Text style={styles.cvInfoLabel}>Nom complet</Text>
            <Text style={styles.cvInfoValue}>{parsedCv.full_name}</Text>
          </View>
        </View>
      )}

      {parsedCv?.email && (
        <View style={styles.cvInfoItem}>
          <AntDesign name="mail" size={16} color="#6B7280" />
          <View style={styles.cvInfoContent}>
            <Text style={styles.cvInfoLabel}>Email</Text>
            <Text style={styles.cvInfoValue}>{parsedCv.email}</Text>
          </View>
        </View>
      )}

      {parsedCv?.phone && (
        <View style={styles.cvInfoItem}>
          <AntDesign name="phone" size={16} color="#6B7280" />
          <View style={styles.cvInfoContent}>
            <Text style={styles.cvInfoLabel}>Téléphone</Text>
            <Text style={styles.cvInfoValue}>{parsedCv.phone}</Text>
          </View>
        </View>
      )}

      {parsedCv?.summary && (
        <View style={styles.cvSection}>
          <Text style={styles.cvSectionTitle}>Résumé professionnel</Text>
          <Text style={styles.cvSectionContent}>{parsedCv.summary}</Text>
        </View>
      )}

      {parsedCv?.skills && parsedCv.skills.length > 0 && (
        <View style={styles.cvSection}>
          <Text style={styles.cvSectionTitle}>Compétences</Text>
          <View style={styles.skillsContainer}>
            {parsedCv.skills.map((skill: string, index: number) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {parsedCv?.experience && parsedCv.experience.length > 0 && (
        <View style={styles.cvSection}>
          <Text style={styles.cvSectionTitle}>Expérience Professionnelle</Text>
          {parsedCv.experience.map((exp: any, index: number) => (
            <View key={index} style={styles.cvExperienceItem}>
              <Text style={styles.cvInfoValue}>{exp.title}</Text>
              <Text style={styles.cvInfoLabel}>{exp.organization} - {exp.dates}</Text>
              {exp.location && <Text style={styles.cvInfoLabel}>{exp.location}</Text>}
              {exp.description && <Text style={styles.cvSectionContent}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {parsedCv?.education && parsedCv.education.length > 0 && (
        <View style={styles.cvSection}>
          <Text style={styles.cvSectionTitle}>Formation</Text>
          {parsedCv.education.map((edu: any, index: number) => (
            <View key={index} style={styles.cvEducationItem}>
              <Text style={styles.cvInfoValue}>{edu.name}</Text>
              <Text style={styles.cvInfoLabel}>{edu.dates}</Text>
            </View>
          ))}
        </View>
      )}

    <View style={styles.cvButtonsRow}>
  
      {parsedCv && (
        <TouchableOpacity 
          style={[styles.button, styles.exportCvButton]} 
          onPress={() => Alert.alert("Export CV", "Fonctionnalité d'exportation à implémenter.")}
        >
          <FontAwesome5 name="file-download" size={18} color="#FFFFFF" />
          <Text style={styles.exportCvButtonText}>Exporter le CV</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={[styles.button, styles.editCvButton]} 
        onPress={() => setCvEditMode(true)}
      >
        <Text style={styles.editCvButtonText}>
          {parsedCv ? 'Modifier le CV' : 'Saisir le CV'}
        </Text>
      </TouchableOpacity>
    </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        title="Mon Profil"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      {renderTabBar()}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'personal' ? renderPersonalInfo() : renderCvSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: '#dee4f7', // Couleur active pour l'onglet
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF', // Texte inactif
    marginLeft: 6,
  },
  activeTabText: {
    color: '#091e60', // Texte actif
    fontWeight: '600',
  },
  // Section générale (pour Personal Info et CV Data)
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 10,
    flex: 1, // Permet au titre de prendre de l'espace
  },
  editIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  // Info Display
  infoContainer: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginTop: 2,
  },
  // Edit Form Inputs
  editContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  modernInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textAreaSmall: { // Nouveau style pour les zones de texte plus petites
    minHeight: 60,
  },
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabledInputText: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
  },
  // Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
 
  primaryButton: {
    backgroundColor: '#0f8e35',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  // Upload Section
  uploadSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  currentFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  currentFileName: {
    flex: 1,
    fontSize: 14,
    color: '#047857',
    fontWeight: '500',
  },
  uploadButton: {
    backgroundColor: '#091e60',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // CV Data Section
  cvDataSection: {
    // Styles already defined above
  },
  cvDisplayContainer: {
    gap: 16,
  },
  cvInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cvInfoContent: {
    marginLeft: 12,
    flex: 1,
  },
  cvInfoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cvInfoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginTop: 2,
  },
  cvSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cvSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  cvSectionContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10, // Ajouter un peu d'espace
  },
  skillTag: {
    backgroundColor: '#ECFDF5', // Fond vert clair
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row', // Pour l'icône de suppression
    alignItems: 'center',
    gap: 4,
  },
  skillText: {
    fontSize: 12,
    color: '#047857', // Texte vert foncé
    fontWeight: '500',
  },
  cvExperienceItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cvEducationItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Styles pour les boutons d'ajout/suppression d'entrées (expérience/formation)
  addEntryButton: {
    // Ce style est maintenant fusionné dans addEntryButtonBig si le bouton est gros
  },
  addEntryButtonBig: { // Style pour le gros bouton d'ajout en bas de section
    backgroundColor: '#0f8e35', // Vert pour l'ajout
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 15,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeEntryButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2', // Rouge clair pour suppression
    marginTop: 8,
    alignSelf: 'flex-end', // Aligner le bouton à droite de l'entrée
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  editableItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8, // Espacement entre les TextInput dans un item éditable
  },

  // Conteneur pour aligner les boutons
  cvButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  // Style de base partagé par les deux boutons
  button: {
    flex: 1, // Prendre la même largeur
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  // Bouton Export (vert)
  exportCvButton: {
    backgroundColor: '#0f8e35',
  },
  exportCvButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Bouton Modifier/Saisir (bleu)
  editCvButton: {
    backgroundColor: '#091e60',
  },
  editCvButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  itemTitle:{
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorContainer: {
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
  },
  skillsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  skillTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  addSkillButton: {
    backgroundColor: '#0f8e35',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

});