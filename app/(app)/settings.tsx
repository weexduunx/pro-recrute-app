import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import CustomHeader from '../../components/CustomHeader'; // Importer CustomHeader
import { FontAwesome5 } from '@expo/vector-icons'; // Pour les icônes

/**
 * Écran Paramètres :
 * Permet à l'utilisateur de gérer les réglages de l'application.
 * Utilise le composant CustomHeader.
 */
export default function ParametresScreen() {
  const { user, logout, loading: authLoading } = useAuth();

  const handleMenuPress = () => {
    Alert.alert("Menu", "Menu Paramètres pressé !");
  };

  const handleAvatarPress = () => {
    Alert.alert("Profil", "Avatar Paramètres pressé !");
  };

  const handleSettingPress = (settingName: string) => {
    Alert.alert("Paramètre", `Vous avez cliqué sur "${settingName}"`);
    // Ici, vous navigeriez vers une page de détail du paramètre ou ouvririez un modal.
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        title="Paramètres"
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
      />

      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Général</Text>
        <TouchableOpacity style={styles.settingItem} onPress={() => handleSettingPress("Notifications")}>
          <Text style={styles.settingText}>Notifications</Text>
          <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => handleSettingPress("Langue")}>
          <Text style={styles.settingText}>Langue</Text>
          <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Compte</Text>
        <TouchableOpacity style={styles.settingItem} onPress={() => handleSettingPress("Changer mot de passe")}>
          <Text style={styles.settingText}>Changer le mot de passe</Text>
          <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => handleSettingPress("Confidentialité")}>
          <Text style={styles.settingText}>Confidentialité</Text>
          <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout} disabled={authLoading}>
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    // Le paddingTop est géré par SafeAreaView
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#091e60',
    marginTop: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#1F2937',
  },
  logoutButton: {
    backgroundColor: '#DC2626', // Rouge pour la déconnexion
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
