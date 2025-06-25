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
} from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import CustomHeader from '../../components/CustomHeader';
import { FontAwesome5, AntDesign, Feather, FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { updateUserProfile, uploadCv, getParsedCvData, updateParsedCvData, exportCvPdf } from '../../utils/api';
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

export default function ProfileDetailsScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [cvEditMode, setCvEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // États profil personnel
  const [editableName, setEditableName] = useState(user?.name || '');
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);

  // États CV
  const [parsedCv, setParsedCv] = useState<any>(null);
  const [loadingParsedCv, setLoadingParsedCv] = useState(true);
  const [cvUpdateError, setCvUpdateError] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [exportingCv, setExportingCv] = useState(false); 
  const [exportError, setExportError] = useState<string | null>(null);

  const [editableParsedCv, setEditableParsedCv] = useState({
    full_name: '', email: '', phone: '', summary: '', skills: [] as string[],
    experience: [] as ExperienceItem[],
    education: [] as EducationItem[],
  });

  const [newSkillText, setNewSkillText] = useState('');

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

  useEffect(() => {
    setEditableName(user?.name || '');
    loadParsedCv();
  }, [user, loadParsedCv]);

  const handleProfileSave = async () => {
    setProfileUpdateError(null);
    try {
      if (user && user.name !== editableName) {
        await updateUserProfile({ name: editableName });
        Alert.alert("✅ Succès", "Profil mis à jour !");
      }
      setProfileEditMode(false);
    } catch (error: any) {
      console.error("Erreur de mise à jour du profil:", error);
      setProfileUpdateError(error.response?.data?.message || "Échec de la mise à jour.");
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

  //Fonction pour gérer l'exportation du CV
  const handleExportCv = async () => {
    setExportingCv(true);
    setExportError(null);
    try {
      if (!parsedCv) {
        Alert.alert("Erreur", "Aucune donnée de CV à exporter. Veuillez d'abord saisir ou télécharger un CV.");
        return;
      }
      const response = await exportCvPdf(); // Appel à la fonction d'exportation
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
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
        onPress={() => {
          setActiveTab('personal');
          setProfileEditMode(false);
          setCvEditMode(false);
        }}
      >
        <Ionicons name="person" size={20} color={activeTab === 'personal' ? '#0f8e35' : '#9CA3AF'} />
        <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
          Personnel
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'cv' && styles.activeTab]}
        onPress={() => {
          setActiveTab('cv');
          setProfileEditMode(false);
          setCvEditMode(false);
        }}
      >
        <Ionicons name="document-text" size={20} color={activeTab === 'cv' ? '#0f8e35' : '#9CA3AF'} />
        <Text style={[styles.tabText, activeTab === 'cv' && styles.activeTabText]}>
          Mon CV
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="person-circle" size={24} color="#0f8e35" />
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
        </View>
        <TouchableOpacity
          style={styles.actionIcon}
          onPress={() => profileEditMode ? handleProfileSave() : setProfileEditMode(true)}
        >
          <Ionicons 
            name={profileEditMode ? "checkmark" : "pencil"} 
            size={20} 
            color={profileEditMode ? "#0f8e35" : "#6B7280"} 
          />
        </TouchableOpacity>
        {profileEditMode && (
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => {
              setProfileEditMode(false);
              setEditableName(user?.name || '');
              setProfileUpdateError(null);
            }}
          >
            <Ionicons name="close" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {profileEditMode ? (
        <View style={styles.editContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={editableName}
              onChangeText={setEditableName}
              placeholder="Votre nom complet"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledText}>{user?.email}</Text>
              <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
            </View>
          </View>

          {profileUpdateError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{profileUpdateError}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="person" size={18} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{user?.name || 'Non renseigné'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={18} color="#6B7280" />
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
      {/* En-tête CV avec upload */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={24} color="#0f8e35" />
          <Text style={styles.sectionTitle}>Mon CV</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={pickDocument}
            disabled={uploadingCv}
          >
            {uploadingCv ? (
              <ActivityIndicator size="small" color="#0f8e35" />
            ) : (
              <Ionicons name="cloud-upload" size={20} color="#0f8e35" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => cvEditMode ? handleCvSave() : setCvEditMode(true)}
          >
            <Ionicons 
              name={cvEditMode ? "checkmark" : "pencil"} 
              size={20} 
              color={cvEditMode ? "#0f8e35" : "#6B7280"} 
            />
          </TouchableOpacity>
          {cvEditMode && (
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => {
                setCvEditMode(false);
                loadParsedCv();
                setCvUpdateError(null);
              }}
            >
              <Ionicons name="close" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {cvFileName && (
        <View style={styles.fileInfo}>
          <Ionicons name="document" size={16} color="#0f8e35" />
          <Text style={styles.fileName}>{cvFileName}</Text>
        </View>
      )}

      {cvUploadError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{cvUploadError}</Text>
        </View>
      )}

      {loadingParsedCv ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0f8e35" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : cvEditMode ? (
        renderCvEditForm()
      ) : parsedCv ? (
        renderCvDisplay()
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Aucune donnée CV</Text>
          <Text style={styles.emptyText}>Téléchargez un CV ou saisissez vos informations</Text>
        </View>
      )}
    </View>
  );

  const renderCvEditForm = () => (
    <View style={styles.editContainer}>
      {/* Informations de base */}
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Informations personnelles</Text>
        
        <TextInput
          style={styles.input}
          value={editableParsedCv.full_name}
          onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, full_name: text })}
          placeholder="Nom complet"
        />
        
        <TextInput
          style={styles.input}
          value={editableParsedCv.email}
          onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, email: text })}
          placeholder="Email"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          value={editableParsedCv.phone}
          onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, phone: text })}
          placeholder="Téléphone"
          keyboardType="phone-pad"
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          value={editableParsedCv.summary}
          onChangeText={(text) => setEditableParsedCv({ ...editableParsedCv, summary: text })}
          placeholder="Résumé professionnel"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Compétences */}
      <View style={styles.formSection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.formSectionTitle}>Compétences</Text>
        </View>
        
        <View style={styles.skillInputContainer}>
          <TextInput
            style={[styles.input, styles.skillInput]}
            value={newSkillText}
            onChangeText={setNewSkillText}
            placeholder="Ajouter une compétence"
            onSubmitEditing={addSkill}
          />
          <TouchableOpacity style={styles.addButton} onPress={addSkill}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.skillsContainer}>
          {editableParsedCv.skills.map((skill: string, index: number) => (
            <TouchableOpacity key={index} style={styles.skillTag} onPress={() => removeSkill(skill)}>
              <Text style={styles.skillText}>{skill}</Text>
              <Ionicons name="close-circle" size={16} color="#047857" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Expérience */}
      <View style={styles.formSection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.formSectionTitle}>Expérience</Text>
          <TouchableOpacity style={styles.addButton} onPress={addExperience}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {editableParsedCv.experience.map((exp: ExperienceItem, index: number) => (
          <View key={index} style={styles.experienceItem}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>Expérience {index + 1}</Text>
              <TouchableOpacity onPress={() => removeExperience(index)}>
                <Ionicons name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              value={exp.title}
              onChangeText={(text) => updateExperience(index, 'title', text)}
              placeholder="Poste"
            />
            <TextInput
              style={styles.input}
              value={exp.organization}
              onChangeText={(text) => updateExperience(index, 'organization', text)}
              placeholder="Entreprise"
            />
            <TextInput
              style={styles.input}
              value={exp.dates}
              onChangeText={(text) => updateExperience(index, 'dates', text)}
              placeholder="Période"
            />
            <TextInput
              style={styles.input}
              value={exp.location || ''}
              onChangeText={(text) => updateExperience(index, 'location', text)}
              placeholder="Lieu"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={exp.description || ''}
              onChangeText={(text) => updateExperience(index, 'description', text)}
              placeholder="Description"
              multiline
              numberOfLines={2}
            />
          </View>
        ))}
      </View>

      {/* Formation */}
      <View style={styles.formSection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.formSectionTitle}>Formation</Text>
          <TouchableOpacity style={styles.addButton} onPress={addEducation}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {editableParsedCv.education.map((edu: EducationItem, index: number) => (
          <View key={index} style={styles.educationItem}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>Formation {index + 1}</Text>
              <TouchableOpacity onPress={() => removeEducation(index)}>
                <Ionicons name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              value={edu.name}
              onChangeText={(text) => updateEducation(index, 'name', text)}
              placeholder="Nom de l'établissement/diplôme"
            />
            <TextInput
              style={styles.input}
              value={edu.dates}
              onChangeText={(text) => updateEducation(index, 'dates', text)}
              placeholder="Période"
            />
          </View>
        ))}
      </View>

      {cvUpdateError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{cvUpdateError}</Text>
        </View>
      )}
    </View>
  );

  const renderCvDisplay = () => (
    <View style={styles.cvDisplay}>
      {/* Informations personnelles */}
      {(parsedCv?.full_name || parsedCv?.email || parsedCv?.phone) && (
        <View style={styles.cvSection}>
          <Text style={styles.cvSectionTitle}>Informations personnelles</Text>
          
          {parsedCv?.full_name && (
            <View style={styles.cvInfoItem}>
              <Ionicons name="person" size={16} color="#6B7280" />
              <Text style={styles.cvInfoText}>{parsedCv.full_name}</Text>
            </View>
          )}
          
          {parsedCv?.email && (
            <View style={styles.cvInfoItem}>
              <Ionicons name="mail" size={16} color="#6B7280" />
              <Text style={styles.cvInfoText}>{parsedCv.email}</Text>
            </View>
          )}
          
          {parsedCv?.phone && (
            <View style={styles.cvInfoItem}>
              <Ionicons name="call" size={16} color="#6B7280" />
              <Text style={styles.cvInfoText}>{parsedCv.phone}</Text>
            </View>
          )}
        </View>
      )}

      {/* Résumé */}
      {parsedCv?.summary && (
        <View style={styles.cvSection}>
          <Text style={styles.cvSectionTitle}>Résumé professionnel</Text>
          <Text style={styles.cvContent}>{parsedCv.summary}</Text>
        </View>
      )}

      {/* Compétences */}
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

      {/* Expérience */}
      {parsedCv?.experience && parsedCv.experience.length > 0 && (
        <View style={styles.cvSection}>
          <Text style={styles.cvSectionTitle}>Expérience professionnelle</Text>
          {parsedCv.experience.map((exp: any, index: number) => (
            <View key={index} style={styles.cvExperienceItem}>
              <Text style={styles.cvJobTitle}>{exp.title}</Text>
              <Text style={styles.cvCompany}>{exp.organization}</Text>
              <Text style={styles.cvDates}>{exp.dates}</Text>
              {exp.location && <Text style={styles.cvLocation}>{exp.location}</Text>}
              {exp.description && <Text style={styles.cvContent}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Formation */}
      {parsedCv?.education && parsedCv.education.length > 0 && (
        <View style={styles.cvSection}>
          <Text style={styles.cvSectionTitle}>Formation</Text>
          {parsedCv.education.map((edu: any, index: number) => (
            <View key={index} style={styles.cvEducationItem}>
              <Text style={styles.cvJobTitle}>{edu.name}</Text>
              <Text style={styles.cvDates}>{edu.dates}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.cvActions}>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={handleExportCv}
        >
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Exporter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title="Mon Profil"
        user={user}
        onMenuPress={() => {}}
        onAvatarPress={() => {}}
      />

      {renderTabBar()}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'personal' ? renderPersonalInfo() : renderCvSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#E8F5E8',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#0f8e35',
    fontWeight: '600',
  },

  // Section
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
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection
    : 'row',
      alignItems: 'center',
      gap: 8,
      },

      // Action Icon
      actionIcon: {
      marginLeft: 8,
      padding: 6,
      borderRadius: 20,
      },

      // Section Title
      sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#22223B',
      },

      // Edit Container
      editContainer: {
      gap: 16,
      },

      // Info Container
      infoContainer: {
      gap: 16,
      },
      infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      },
      infoIcon: {
      width: 32,
      alignItems: 'center',
      },
      infoContent: {
      flex: 1,
      },
      infoLabel: {
      fontSize: 13,
      color: '#6B7280',
      },
      infoValue: {
      fontSize: 15,
      color: '#22223B',
      fontWeight: '500',
      },

      // Input Group
      inputGroup: {
      marginBottom: 12,
      },
      inputLabel: {
      fontSize: 13,
      color: '#6B7280',
      marginBottom: 4,
      },
      input: {
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: '#22223B',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      },
      textArea: {
      minHeight: 60,
      textAlignVertical: 'top',
      },
      disabledInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      gap: 8,
      },
      disabledText: {
      color: '#9CA3AF',
      fontSize: 15,
      flex: 1,
      },

      // Error
      errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FEE2E2',
      borderRadius: 8,
      padding: 8,
      marginTop: 8,
      },
      errorText: {
      color: '#B91C1C',
      fontSize: 14,
      flex: 1,
      },

      // Loading
      loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      },
      loadingText: {
      color: '#6B7280',
      fontSize: 15,
      },

      // File Info
      fileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
      },
      fileName: {
      color: '#0f8e35',
      fontSize: 15,
      fontWeight: '500',
      },

      // Empty State
      emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 8,
      },
      emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#9CA3AF',
      },
      emptyText: {
      fontSize: 14,
      color: '#9CA3AF',
      textAlign: 'center',
      },

      // Form Section
      formSection: {
      marginBottom: 20,
      gap: 8,
      },
      formSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#22223B',
      marginBottom: 8,
      },
      subsectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      },

      // Skills
      skillInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
      },
      skillInput: {
      flex: 1,
      },
      addButton: {
      backgroundColor: '#0f8e35',
      borderRadius: 20,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
      },
      skillsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
      },
      skillTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E8F5E8',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 4,
      marginBottom: 4,
      },
      skillText: {
      color: '#047857',
      fontSize: 14,
      fontWeight: '500',
      },

      // Experience & Education
      experienceItem: {
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      gap: 8,
      },
      educationItem: {
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      gap: 8,
      },
      itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
      },
      itemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#22223B',
      },

      // CV Display
      cvDisplay: {
      gap: 20,
      },
      cvSection: {
      marginBottom: 12,
      gap: 6,
      },
      cvSectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#22223B',
      marginBottom: 4,
      },
      cvInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
      },
      cvInfoText: {
      fontSize: 14,
      color: '#22223B',
      },
      cvContent: {
      fontSize: 14,
      color: '#374151',
      marginTop: 2,
      },
      cvExperienceItem: {
      marginBottom: 10,
      gap: 2,
      },
      cvJobTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#22223B',
      },
      cvCompany: {
      fontSize: 13,
      color: '#047857',
      },
      cvDates: {
      fontSize: 13,
      color: '#6B7280',
      },
      cvLocation: {
      fontSize: 13,
      color: '#6B7280',
      },
      cvEducationItem: {
      marginBottom: 8,
      gap: 2,
      },

      // CV Actions
      cvActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
      gap: 8,
      },
      exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0f8e35',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
      },
      exportButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
      },
    });