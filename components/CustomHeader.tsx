import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { StatusBar } from 'expo-status-bar';
// @ts-ignore
import UserAvatar from 'react-native-user-avatar';

// Configuration de l'URL de base (doit correspondre à utils/api.js)
const API_BASE_URL = 'http://192.168.1.47:8000';

/**
 * Composant CustomHeader:
 * Un en-tête d'application réutilisable avec un bouton de menu, un titre,
 * et un avatar de profil (géré par `react-native-user-avatar`) et un menu déroulant.
 */
export interface CustomHeaderProps {
  title: string;
  user?: any | null; // L'utilisateur connecté, peut être null si non connecté
  onAvatarPress?: () => void;
  onMenuPress?: () => void;
  showBackButton?: boolean; // Afficher le bouton retour au lieu du menu
  onBackPress?: () => void; // Action personnalisée pour le bouton retour
  rightComponent?: React.ReactNode; // Composant personnalisé à droite
  showNotificationIcon?: boolean; // Afficher l'icône de notification pour les intérimaires
  hideMenuButton?: boolean; // Masquer complètement le bouton menu/retour
}


export default function CustomHeader({ title, user: propUser, showBackButton = false, onBackPress, rightComponent, showNotificationIcon = false, hideMenuButton = false }: CustomHeaderProps) {
  const navigation = useNavigation();
  const { logout, user: contextUser } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const [isAvatarDropdownVisible, setAvatarDropdownVisible] = useState(false);
  
  // Utiliser le user passé en prop ou celui du contexte Auth
  const user = propUser || contextUser;
  
  // Debug pour la photo de profil
  React.useEffect(() => {
    if (user?.photo_profil) {
      const photoUrl = user.photo_profil.startsWith('http') 
        ? user.photo_profil 
        : `${API_BASE_URL}/storage/${user.photo_profil}`;
      console.log('Photo de profil URL:', photoUrl);
      console.log('User photo_profil raw:', user.photo_profil);
    } else {
      console.log('Pas de photo de profil trouvée pour:', user?.name || 'Utilisateur inconnu');
    }
  }, [user]);


  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
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

const handleDropdownLogout = () => {
  closeAvatarDropdown();
  Alert.alert(
    t("Confirmation"),
    t("Êtes-vous sûr de vouloir vous déconnecter ?"),
    [
      { text: t("Annuler"), style: "cancel" },
      { text: t("Confirmer"), onPress: () => {
        setTimeout(() => {
          logout();
        }, 200); // petit délai aussi ici
      }}
    ]
  );
};


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.headerContainer}>
        {/* Bouton du menu Hamburger ou Retour */}
        {!hideMenuButton && (
          showBackButton ? (
            <TouchableOpacity onPress={handleBackPress} style={styles.menuButton}>
              <FontAwesome5 name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
              <FontAwesome5 name="bars" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )
        )}

        {/* Section titre avec icône notification optionnelle */}
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          
          {/* Icône de notification pour les intérimaires et candidats */}
          {showNotificationIcon && (user?.role === 'interimaire' || user?.role === 'user') && (
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => {
                if (user?.role === 'interimaire') {
                  router.push('/(app)/(interimaire)/notifications');
                } else if (user?.role === 'user') {
                  router.push('/(app)/notifications');
                }
              }}
            >
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount.toString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Composant personnalisé à droite ou avatar par défaut */}
        {rightComponent ? (
          rightComponent
        ) : (
          <TouchableOpacity onPress={handleAvatarPress} >
            <UserAvatar
              size={38}
              name={user?.name || ''}
              src={user?.photo_profil ? 
                (user.photo_profil.startsWith('http') 
                  ? user.photo_profil 
                  : `${API_BASE_URL}/storage/${user.photo_profil}`) 
                : undefined}
              bgColor="#0f8e35"
              bgColors={['#0f8e35', '#0f8e35', '#0f8e35']}
              initials={user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : ''}
              style={{ borderWidth: 1.5, borderColor: '#FFFFFF' }}
              textColor="#FFFFFF"
              borderRadius={19}
            />
          </TouchableOpacity>
        )}

        {/* Menu déroulant de l'avatar (Modal) - seulement si pas de rightComponent */}
        {!rightComponent && (
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
                  <Ionicons name="person-outline" size={22} color="#091e60" />
                  <Text style={styles.dropdownItemText}>{t("Mon Profil")}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem} onPress={handleDropdownLogout}>
                <View style={styles.dropdownItemContent}>
                  <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                  <Text style={styles.dropdownItemTextDecon}>{t("Déconnexion")}</Text>
                </View>
              </TouchableOpacity>

            </View>
          </Pressable>
          </Modal>
        )}
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
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  notificationButton: {
    marginLeft: 12,
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarButton: {
    padding: 5,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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

  dropdownItemTextDecon: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 8,
  },
});
