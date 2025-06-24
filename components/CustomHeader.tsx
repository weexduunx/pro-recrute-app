import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Modal, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAuth } from '../components/AuthProvider';
import { StatusBar } from 'expo-status-bar';
import AntDesign from '@expo/vector-icons/AntDesign';
import UserAvatar from 'react-native-user-avatar'; 

/**
 * Composant CustomHeader:
 * Un en-tête d'application réutilisable avec un bouton de menu, un titre,
 * et un avatar de profil (géré par `react-native-user-avatar`) et un menu déroulant.
 */
export interface CustomHeaderProps {
  title: string;
  user: any;
  onAvatarPress: () => void;
  onMenuPress: () => void;
}


export default function CustomHeader({ title, user }: CustomHeaderProps) {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [isAvatarDropdownVisible, setAvatarDropdownVisible] = useState(false);


  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleAvatarPress = () => {
    setAvatarDropdownVisible(true);
  };

  const closeAvatarDropdown = () => {
    setAvatarDropdownVisible(false);
  };

  const handleDropdownProfile = () => {
    closeAvatarDropdown();
    router.push('/(app)/profile-details'); // Naviguer vers l'écran du tableau de bord
  };

  const handleDropdownLogout = async () => {
    closeAvatarDropdown();
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Oui", onPress: async () => { await logout(); } }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#091e60" translucent={false} />

      <View style={styles.headerContainer}>
        {/* Bouton du menu Hamburger */}
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
          <FontAwesome5 name="bars" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Titre de l'en-tête */}
        <Text style={styles.headerTitle}>{title}</Text>

        {/* Avatar du profil utilisateur (avec UserAvatar) */}
        <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarButton}>
          <UserAvatar
            size={40} 
            name={user?.name || ''} 
            src={user?.profile_photo_path || undefined} 
            bgColor="#0f8e35"
            textColor="#FFFFFF" 
            borderRadius={20} 

          />
        </TouchableOpacity>

        {/* Menu déroulant de l'avatar (Modal) */}
        <Modal
          visible={isAvatarDropdownVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeAvatarDropdown}
        >
          <Pressable style={styles.modalOverlay} onPress={closeAvatarDropdown}>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleDropdownProfile}>
                <View style={styles.dropdownItemContent}>
                  <AntDesign name="user" size={22} color="#091e60" />
                  <Text style={styles.dropdownItemText}>Voir le profil</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem} onPress={handleDropdownLogout}>
                <View style={styles.dropdownItemContent}>
                  <AntDesign name="logout" size={22} color="#091e60" />
                  <Text style={styles.dropdownItemText}>Déconnexion</Text>
                </View>
              </TouchableOpacity>

            </View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#091e60',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#091e60',
    paddingHorizontal: 15,
    paddingVertical: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  avatarButton: {
    padding: 5,
    width: 50, // Taille pour inclure la bordure
    height: 50, // Taille pour inclure la bordure
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF', // Bordure blanche
    justifyContent: 'center', // Centrer l'avatar à l'intérieur
    alignItems: 'center', // Centrer l'avatar à l'intérieur
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'absolute',
    top: Platform.OS === 'android' ? 60 : 80,
    right: 10,
  },

  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#091e60',
    marginLeft: 8, 
  },
});
