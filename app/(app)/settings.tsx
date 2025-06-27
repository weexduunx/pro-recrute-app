import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Alert, 
  Platform, 
  Switch,
  ScrollView,
  Animated,
  StatusBar
} from 'react-native';
import { useAuth } from '../../components/AuthProvider';
import CustomHeader from '../../components/CustomHeader';
import { 
  FontAwesome5, 
  Ionicons, 
  MaterialIcons,
  Feather 
} from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { savePushToken, sendTestPushNotification } from '../../utils/api';


// Configuration pour les notifications en arrière-plan (headless)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});


/**
 * Interface pour les props des composants de SettingItem
 */
interface SettingItemProps {
  title: string;
  subtitle?: string;
  icon: string;
  iconLibrary: 'FontAwesome5' | 'Ionicons' | 'MaterialIcons' | 'Feather';
  iconColor: string;
  onPress?: () => void;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  showChevron?: boolean;
}

/**
 * Interface pour les props des en-têtes de section
 */
interface SectionHeaderProps {
  title: string;
  icon?: string;
}

// Composant réutilisable pour les éléments de paramètres
const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  icon,
  iconLibrary,
  iconColor,
  onPress,
  hasSwitch = false,
  switchValue = false,
  onSwitchChange,
  showChevron = true
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const renderIcon = () => {
    const iconProps = { name: icon, size: 20, color: iconColor };
    
    switch (iconLibrary) {
      case 'FontAwesome5':
        return <FontAwesome5 {...iconProps} />;
      case 'Ionicons':
        return <Ionicons {...iconProps} name={icon as React.ComponentProps<typeof Ionicons>['name']} />;
      case 'MaterialIcons':
        return <MaterialIcons {...iconProps} name={icon as React.ComponentProps<typeof MaterialIcons>['name']} />;
      case 'Feather':
        return <Feather {...iconProps} name={icon as React.ComponentProps<typeof Feather>['name']} />;
      default:
        return <FontAwesome5 {...iconProps} />;
    }
  };

  const content = (
    <Animated.View style={[styles.settingItem, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          {renderIcon()}
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {hasSwitch ? (
          <Switch
            trackColor={{ false: "#E5E7EB", true: iconColor + '40' }}
            thumbColor={switchValue ? iconColor : "#F9FAFB"}
            ios_backgroundColor="#E5E7EB"
            onValueChange={onSwitchChange}
            value={switchValue}
          />
        ) : showChevron ? (
          <Feather name="chevron-right" size={18} color="#9CA3AF" />
        ) : null}
      </View>
    </Animated.View>
  );

  if (hasSwitch) {
    return content;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
};

// Composant pour les en-têtes de section
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => (
  <View style={styles.sectionHeader}>
    {icon && <Ionicons name={icon as any} size={18} color="#6366F1" />}
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

export default function ParametresScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  
  // États pour les différents switches
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [registeringToken, setRegisteringToken] = useState(false);

  useEffect(() => {
    // Charger l'état initial des notifications
    async function getInitialNotificationStatus() {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationEnabled(status === 'granted');
    }
    getInitialNotificationStatus();

    // Écouteurs pour les notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification reçue:", notification);
      Alert.alert(
        notification.request.content.title || "Notification",
        notification.request.content.body || "Vous avez une nouvelle notification."
      );
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification tapée:", response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    setRegisteringToken(true);
    try {
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      if (!Device.isDevice) {
        Alert.alert('Appareil physique requis', 'Les notifications Push ne fonctionnent que sur les appareils physiques ou les émulateurs configurés pour Google Play Services !');
        setNotificationEnabled(false);
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission refusée', 'Impossible d\'obtenir le push token pour la notification ! Vous pouvez l\'activer dans les paramètres de votre appareil.');
        setNotificationEnabled(false);
        return;
      }
      
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
      
      await savePushToken(token); // Sauvegarde le token sur le backend
      Alert.alert("Succès", "Notifications activées !");
      setNotificationEnabled(true);

    } catch (error: any) {
      console.error("Erreur d'enregistrement des notifications:", error);
      Alert.alert("Erreur", "Impossible d'activer les notifications. " + (error.message || "Veuillez réessayer."));
      setNotificationEnabled(false);
    } finally {
      setRegisteringToken(false);
    }
  };

  const unregisterForPushNotificationsAsync = async () => {
    Alert.alert("Notifications désactivées", "Les notifications ont été désactivées.");
    setNotificationEnabled(false);
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      await registerForPushNotificationsAsync();
    } else {
      await unregisterForPushNotificationsAsync();
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "Confirmation",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Déconnexion", style: "destructive", onPress: logout }
      ]
    );
  };

  const handleMenuPress = () => { Alert.alert("Menu", "Menu Paramètres pressé !"); };
  const handleAvatarPress = () => { Alert.alert("Profil", "Avatar Paramètres pressé !"); };
  const handleSettingPress = (settingName: string) => { Alert.alert("Paramètre", `Vous avez cliqué sur "${settingName}"`); };

  // Fonction pour envoyer une notification de test (déjà présente, juste pour le contexte)
  const handleSendTestNotification = async () => {
    try {
      await sendTestPushNotification();
      Alert.alert("Test Envoyé", "Une notification de test a été envoyée. Vérifiez votre appareil !");
    } catch (error: any) {
      console.error("Échec de l'envoi de la notification de test:", error);
      Alert.alert("Erreur d'envoi", error.message || "Impossible d'envoyer la notification de test. Assurez-vous que le token est enregistré.");
    }
  };


  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.safeArea}>
        <CustomHeader
          title="Paramètres"
          user={user}
          onMenuPress={handleMenuPress}
          onAvatarPress={handleAvatarPress}
        />

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Section Préférences */}
          <SectionHeader title="Préférences" icon="settings-outline" />
          <View style={styles.section}>
            <SettingItem
              title="Langue"
              subtitle="Français"
              icon="language"
              iconLibrary="Ionicons"
              iconColor="#6366F1"
              onPress={() => handleSettingPress("Langue")}
            />
            <SettingItem
              title="Mode sombre"
              subtitle="Activer le thème sombre"
              icon="moon"
              iconLibrary="Feather"
              iconColor="#8B5CF6"
              hasSwitch
              switchValue={darkModeEnabled}
              onSwitchChange={setDarkModeEnabled}
            />
            <SettingItem
              title="Synchronisation auto"
              subtitle="Synchroniser automatiquement les données"
              icon="refresh-cw"
              iconLibrary="Feather"
              iconColor="#10B981"
              hasSwitch
              switchValue={autoSyncEnabled}
              onSwitchChange={setAutoSyncEnabled}
            />
          </View>

          {/* Section Notifications */}
          <SectionHeader title="Notifications" icon="notifications-outline" />
          <View style={styles.section}>
            <SettingItem
              title="Notifications Push"
              subtitle="Recevoir des notifications en temps réel"
              icon="bell"
              iconLibrary="Feather"
              iconColor="#F59E0B"
              hasSwitch
              switchValue={notificationEnabled}
              onSwitchChange={toggleNotifications}
            />
            <SettingItem
              title="Notifications par email"
              subtitle="Recevoir des résumés par email"
              icon="mail"
              iconLibrary="Feather"
              iconColor="#EF4444"
              onPress={() => handleSettingPress("Notifications email")}
            />
            {/* Bouton pour envoyer une notification de test */}
            <SettingItem
              title="Envoyer notification test"
              subtitle="Envoyer une notification pour tester"
              icon="notifications"
              iconLibrary="Ionicons"
              iconColor="#091e60"
              onPress={handleSendTestNotification} // Appel de la fonction de test
              showChevron={false} // Pas de chevron pour le bouton de test
            />
          </View>

          {/* Section Sécurité */}
          <SectionHeader title="Sécurité" icon="shield-outline" />
          <View style={styles.section}>
            <SettingItem
              title="Authentification biométrique"
              subtitle="Utiliser Face ID / Touch ID"
              icon="fingerprint"
              iconLibrary="MaterialIcons"
              iconColor="#06B6D4"
              hasSwitch
              switchValue={biometricEnabled}
              onSwitchChange={setBiometricEnabled}
            />
            <SettingItem
              title="Changer le mot de passe"
              subtitle="Modifier votre mot de passe"
              icon="lock"
              iconLibrary="Feather"
              iconColor="#DC2626"
              onPress={() => handleSettingPress("Changer mot de passe")}
            />
            <SettingItem
              title="Sessions actives"
              subtitle="Gérer vos sessions connectées"
              icon="smartphone"
              iconLibrary="Feather"
              iconColor="#7C3AED"
              onPress={() => handleSettingPress("Sessions actives")}
            />
          </View>

          {/* Section Compte */}
          <SectionHeader title="Compte" icon="person-outline" />
          <View style={styles.section}>
            <SettingItem
              title="Informations personnelles"
              subtitle="Modifier votre profil"
              icon="user"
              iconLibrary="Feather"
              iconColor="#059669"
              onPress={() => handleSettingPress("Informations personnelles")}
            />
            <SettingItem
              title="Confidentialité"
              subtitle="Paramètres de confidentialité"
              icon="eye-off"
              iconLibrary="Feather"
              iconColor="#7C2D12"
              onPress={() => handleSettingPress("Confidentialité")}
            />
            <SettingItem
              title="Exporter mes données"
              subtitle="Télécharger vos données"
              icon="download"
              iconLibrary="Feather"
              iconColor="#0891B2"
              onPress={() => handleSettingPress("Export données")}
            />
          </View>

          {/* Section Support */}
          <SectionHeader title="Support" icon="help-circle-outline" />
          <View style={styles.section}>
            <SettingItem
              title="Centre d'aide"
              subtitle="FAQ et guides d'utilisation"
              icon="help-circle"
              iconLibrary="Feather"
              iconColor="#F97316"
              onPress={() => handleSettingPress("Centre d'aide")}
            />
            <SettingItem
              title="Nous contacter"
              subtitle="Obtenir de l'aide"
              icon="message-circle"
              iconLibrary="Feather"
              iconColor="#8B5CF6"
              onPress={() => handleSettingPress("Contact")}
            />
            <SettingItem
              title="À propos"
              subtitle="Informations sur l'application"
              icon="info"
              iconLibrary="Feather"
              iconColor="#6B7280"
              onPress={() => handleSettingPress("À propos")}
            />
          </View>

          {/* Bouton de déconnexion */}
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={confirmLogout} 
            disabled={authLoading}
          >
            <Feather name="log-out" size={18} color="#FFFFFF" style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>
              {authLoading ? "Déconnexion..." : "Se déconnecter"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});