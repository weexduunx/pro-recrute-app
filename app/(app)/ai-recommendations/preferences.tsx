import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import { getJobPreferences, updateJobPreferences } from '../../../utils/ai-api';
import CustomHeader from '../../../components/CustomHeader';
import { Picker } from '@react-native-picker/picker';

interface JobPreferences {
  preferredSectors: string[];
  preferredLocations: string[];
  salaryExpectation: {
    min: number;
    max: number;
    currency: string;
  };
  contractTypes: string[];
  experienceLevel: string;
  remoteWork: boolean;
  travelWillingness: number; // 0-100%
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  minimumMatchScore: number;
  careerGoals: string[];
  skillsToImprove: string[];
  workSchedule: 'flexible' | 'fixed' | 'no_preference';
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'no_preference';
}

const SECTORS = [
  'Technologie', 'Finance', 'Santé', 'Éducation', 'Commerce', 
  'Agriculture', 'Tourisme', 'Industrie', 'Télécommunications', 
  'Transport', 'Construction', 'Énergie'
];

const LOCATIONS = [
  'Dakar', 'Thiès', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 
  'Diourbel', 'Tambacounda', 'Fatick', 'Kolda', 'Matam', 
  'Kaffrine', 'Kédougou', 'Louga', 'Sédhiou'
];

const CONTRACT_TYPES = [
  'CDI', 'CDD', 'Stage', 'Freelance', 'Temps partiel', 'Consultation'
];

const CAREER_GOALS = [
  'Évolution managériale', 'Expertise technique', 'Entrepreneuriat', 
  'Stabilité professionnelle', 'Équilibre vie pro/perso', 
  'Rémunération élevée', 'Impact social', 'Innovation'
];

const SKILLS_TO_IMPROVE = [
  'Leadership', 'Communication', 'Informatique', 'Langues étrangères',
  'Gestion de projet', 'Analyse de données', 'Marketing digital',
  'Finance', 'Négociation', 'Créativité'
];

export default function AIPreferencesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<JobPreferences>({
    preferredSectors: [],
    preferredLocations: [],
    salaryExpectation: {
      min: 300000,
      max: 1000000,
      currency: 'XOF'
    },
    contractTypes: [],
    experienceLevel: 'intermediate',
    remoteWork: false,
    travelWillingness: 50,
    notificationFrequency: 'daily',
    minimumMatchScore: 60,
    careerGoals: [],
    skillsToImprove: [],
    workSchedule: 'no_preference',
    companySize: 'no_preference',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await getJobPreferences();
      if (response.data) {
        setPreferences({ ...preferences, ...response.data });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      await updateJobPreferences(preferences);
      Alert.alert('Succès', 'Vos préférences ont été sauvegardées');
      router.back();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder vos préférences');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string, setter: (newArray: string[]) => void) => {
    const newArray = array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
    setter(newArray);
  };

  const renderMultiSelect = (
    title: string,
    items: string[],
    selectedItems: string[],
    onToggle: (item: string) => void
  ) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 12,
      }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {items.map((item) => {
          const isSelected = selectedItems.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={{
                backgroundColor: isSelected ? colors.secondary : colors.background,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: isSelected ? colors.secondary : colors.border,
              }}
              onPress={() => onToggle(item)}
            >
              <Text style={{
                color: isSelected ? colors.textTertiary : colors.textSecondary,

                fontWeight: isSelected ? '600' : 'normal',
              }}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderSlider = (
    title: string,
    value: number,
    onValueChange: (value: number) => void,
    min = 0,
    max = 100,
    unit = '%'
  ) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={{
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 8,
      }}>
        {title}: {value}{unit}
      </Text>
      <View style={{
        backgroundColor: colors.background,
        padding: 16,
        borderRadius: 12,
        
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 15,
            }}
            onPress={() => onValueChange(Math.max(min, value - 10))}
          >
            <Ionicons name="remove" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.textSecondary,
            alignSelf: 'center',
          }}>
            {value}{unit}
          </Text>
          
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 15,
            }}
            onPress={() => onValueChange(Math.min(max, value + 10))}
          >
            <Ionicons name="add" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CustomHeader
        title="Préférences IA"
        showBackButton={true}
        rightComponent={
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginRight: 15,
            }}
            onPress={savePreferences}
            disabled={saving}
          >
            <Text style={{
              color: colors.textTertiary,
              fontWeight: '600',
              fontSize: 14,
            }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Secteurs préférés */}
        {renderMultiSelect(
          'Secteurs d\'activité préférés',
          SECTORS,
          preferences.preferredSectors,
          (sector) => toggleArrayItem(
            preferences.preferredSectors,
            sector,
            (newSectors) => setPreferences({ ...preferences, preferredSectors: newSectors })
          )
        )}

        {/* Localisations */}
        {renderMultiSelect(
          'Localisations préférées',
          LOCATIONS,
          preferences.preferredLocations,
          (location) => toggleArrayItem(
            preferences.preferredLocations,
            location,
            (newLocations) => setPreferences({ ...preferences, preferredLocations: newLocations })
          )
        )}

        {/* Types de contrat */}
        {renderMultiSelect(
          'Types de contrat acceptés',
          CONTRACT_TYPES,
          preferences.contractTypes,
          (contractType) => toggleArrayItem(
            preferences.contractTypes,
            contractType,
            (newTypes) => setPreferences({ ...preferences, contractTypes: newTypes })
          )
        )}

        {/* Salaire */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.primary,
            marginBottom: 12,
          }}>
            Fourchette salariale (XOF)
          </Text>
          <View style={{
            backgroundColor: colors.background,
            padding: 16,
            borderRadius: 12,
          }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                Salaire minimum: {preferences.salaryExpectation.min.toLocaleString()} XOF
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setPreferences({
                    ...preferences,
                    salaryExpectation: {
                      ...preferences.salaryExpectation,
                      min: Math.max(100000, preferences.salaryExpectation.min - 50000)
                    }
                  })}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="remove-circle" size={24} color={colors.secondary} />
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 16 }}>
                  {preferences.salaryExpectation.min.toLocaleString()}
                </Text>
                <TouchableOpacity
                  onPress={() => setPreferences({
                    ...preferences,
                    salaryExpectation: {
                      ...preferences.salaryExpectation,
                      min: Math.min(2000000, preferences.salaryExpectation.min + 50000)
                    }
                  })}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="add-circle" size={24} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                Salaire maximum: {preferences.salaryExpectation.max.toLocaleString()} XOF
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setPreferences({
                    ...preferences,
                    salaryExpectation: {
                      ...preferences.salaryExpectation,
                      max: Math.max(preferences.salaryExpectation.min, preferences.salaryExpectation.max - 50000)
                    }
                  })}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="remove-circle" size={24} color={colors.secondary} />
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 16 }}>
                  {preferences.salaryExpectation.max.toLocaleString()}
                </Text>
                <TouchableOpacity
                  onPress={() => setPreferences({
                    ...preferences,
                    salaryExpectation: {
                      ...preferences.salaryExpectation,
                      max: Math.min(5000000, preferences.salaryExpectation.max + 50000)
                    }
                  })}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="add-circle" size={24} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Télétravail */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.background,
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.primary,
            flex: 1,
          }}>
            Télétravail accepté
          </Text>
          <Switch
            value={preferences.remoteWork}
            onValueChange={(value) => setPreferences({ ...preferences, remoteWork: value })}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={preferences.remoteWork ? colors.textPrimary : colors.textSecondary}
          />
        </View>

        {/* Score de correspondance minimum */}
        {renderSlider(
          'Score de correspondance minimum',
          preferences.minimumMatchScore,
          (value) => setPreferences({ ...preferences, minimumMatchScore: value }),
          30,
          100
        )}

        {/* Disposition aux déplacements */}
        {renderSlider(
          'Disposition aux déplacements',
          preferences.travelWillingness,
          (value) => setPreferences({ ...preferences, travelWillingness: value }),
          0,
          100
        )}

        {/* Objectifs de carrière */}
        {renderMultiSelect(
          'Objectifs de carrière',
          CAREER_GOALS,
          preferences.careerGoals,
          (goal) => toggleArrayItem(
            preferences.careerGoals,
            goal,
            (newGoals) => setPreferences({ ...preferences, careerGoals: newGoals })
          )
        )}

        {/* Compétences à améliorer */}
        {renderMultiSelect(
          'Compétences à améliorer',
          SKILLS_TO_IMPROVE,
          preferences.skillsToImprove,
          (skill) => toggleArrayItem(
            preferences.skillsToImprove,
            skill,
            (newSkills) => setPreferences({ ...preferences, skillsToImprove: newSkills })
          )
        )}

        {/* Niveau d'expérience */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.primary,
            marginBottom: 12,
          }}>
            Niveau d'expérience
          </Text>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <Picker
              selectedValue={preferences.experienceLevel}
              onValueChange={(value) => setPreferences({ ...preferences, experienceLevel: value })}
              style={{ color: colors.textSecondary }}

            >
              <Picker.Item label="Débutant (0-2 ans)" value="beginner" />
              <Picker.Item label="Intermédiaire (2-5 ans)" value="intermediate" />
              <Picker.Item label="Expérimenté (5-10 ans)" value="experienced" />
              <Picker.Item label="Expert (10+ ans)" value="expert" />
            </Picker>
          </View>
        </View>

        {/* Fréquence des notifications */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.primary,
            marginBottom: 12,
          }}>
            Fréquence des notifications
          </Text>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <Picker
              selectedValue={preferences.notificationFrequency}
              onValueChange={(value) => setPreferences({ ...preferences, notificationFrequency: value })}
              style={{ color: colors.textSecondary }}
            >
              <Picker.Item label="Immédiate" value="immediate" />
              <Picker.Item label="Quotidienne" value="daily" />
              <Picker.Item label="Hebdomadaire" value="weekly" />
            </Picker>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}