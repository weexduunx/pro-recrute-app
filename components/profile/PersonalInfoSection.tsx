
// File: components/profile/PersonalInfoSection.tsx

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLanguage } from '../../components/LanguageContext';
import { useAuth } from '../../components/AuthProvider';

export default function PersonalInfoSection({
  user,
  personalEditMode,
  setPersonalEditMode,
  editableName,
  setEditableName,
  profileUpdateError,
  handlePersonalInfoSave,
  candidatProfile,
  editableCandidatProfile,
  setEditableCandidatProfile,
  loadingCandidatProfile
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const ReadOnlyView = () => (
    <View style={[styles.infoContainer, { backgroundColor: colors.cardBackground }]}>
      <InfoItem icon="person" label={t('Nom complet')} value={user?.name} />
      <InfoItem icon="mail" label={t('Email')} value={user?.email} />
      {user?.role === 'user' && candidatProfile && (
        <>
          <InfoItem icon="briefcase" label={t('Titre professionnel')} value={candidatProfile?.titreProfil} />
          <InfoItem icon="call" label={t('Téléphone')} value={candidatProfile?.telephone} />
          <InfoItem icon="calendar" label={t('Date de naissance')} value={candidatProfile?.date_naissance} />
          <InfoItem icon="map" label={t('Lieu de naissance')} value={candidatProfile?.lieu_naissance} />
          <InfoItem icon="transgender" label={t('Genre')} value={candidatProfile?.genre} />
          <InfoItem icon="hourglass" label={t('Disponibilité')} value={candidatProfile?.disponibilite} />
        </>
      )}
    </View>
  );

  const InfoItem = ({ icon, label, value }) => (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value || t('Non renseigné')}</Text>
      </View>
    </View>
  );

  const EditFormView = () => (
    <View style={styles.editContainer}>
      <TextInputGroup
        label={t('Nom complet')}
        value={editableName}
        onChangeText={setEditableName}
        placeholder={t('Votre nom complet')}
      />
      <Text style={styles.disabledText}>{user?.email}</Text>
      {profileUpdateError && (
        <Text style={{ color: colors.error }}>{profileUpdateError}</Text>
      )}
    </View>
  );

  const TextInputGroup = ({ label, value, onChangeText, placeholder }) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );

  const LoaderView = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={colors.secondary} />
      <Text style={{ color: colors.textSecondary }}>{t('Chargement du profil...')}</Text>
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Informations personnelles')}</Text>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: personalEditMode ? colors.secondary : colors.settingIconBg }]}
          onPress={() => personalEditMode ? handlePersonalInfoSave() : setPersonalEditMode(true)}
        >
          <Ionicons name={personalEditMode ? "checkmark" : "create-outline"} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      {loadingCandidatProfile ? <LoaderView /> : personalEditMode ? <EditFormView /> : <ReadOnlyView />}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20, borderRadius: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  editButton: { padding: 8, borderRadius: 20 },
  infoContainer: { padding: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoIcon: { marginRight: 10 },
  infoContent: {},
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 14, marginBottom: 4 },
  input: { padding: 10, borderRadius: 8, borderWidth: 1 },
  disabledText: { fontSize: 14, color: 'gray' },
  loadingContainer: { padding: 16, alignItems: 'center' },
});
