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
import { useTheme } from '../../components/ThemeContext'; 
import { useLanguage } from '../../components/LanguageContext'; // Importer useLanguage


// Configuration pour les notifications en arrière-plan (headless)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({ // MODIFIÉ: Passer notification pour accéder à son contenu
    shouldShowAlert: true, // Déprécié, mais laissé pour la rétrocompatibilité si pas de showBanner/showList
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // NOUVEAU: Pour afficher la bannière de notification sur Android
    shouldShowList: true, // NOUVEAU: Pour afficher la notification dans la liste
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
  const { colors } = useTheme();
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
    <Animated.View style={[
      styles.settingItem, 
      { 
        transform: [{ scale: scaleAnim }],
        backgroundColor: colors.cardBackground, 
        borderBottomColor: colors.border, 
      }
    ]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          {renderIcon()}
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {hasSwitch ? (
          <Switch
            trackColor={{ false: colors.switchTrackFalse, true: colors.secondary + '40' }}
            thumbColor={switchValue ? colors.secondary : colors.switchThumb}
            ios_backgroundColor={colors.switchTrackFalse}
            onValueChange={onSwitchChange}
            value={switchValue}
          />
        ) : showChevron ? (
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
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
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      {icon && <Ionicons name={icon as any} size={18} color={colors.textAccent} />}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );
};

export default function ParametresScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const { isDarkMode, toggleDarkMode, colors } = useTheme();
  const { language, setLanguage, t } = useLanguage(); // NOUVEAU : Utiliser useLanguage
  
  // États pour les différents switches
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [registeringToken, setRegisteringToken] = useState(false);

  useEffect(() => {
    async function getInitialNotificationStatus() {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationEnabled(status === 'granted');
    }
    getInitialNotificationStatus();

    let notificationListener: Notifications.Subscription | undefined;
    let responseListener: Notifications.Subscription | undefined;

    notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification reçue:", notification);
      Alert.alert(
        notification.request.content.title || "Notification",
        notification.request.content.body || "Vous avez une nouvelle notification."
      );
    });

    responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification tapée:", response);
    });

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
      if (responseListener) {
        responseListener.remove();
      }
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
        Alert.alert(t('Appareil physique requis'), t('Les notifications Push ne fonctionnent que sur les appareils physiques ou les émulateurs configurés pour Google Play Services !'));
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
        Alert.alert(t('Permission refusée'), t('Impossible d\'obtenir le push token pour la notification ! Vous pouvez l\'activer dans les paramètres de votre appareil.'));
        setNotificationEnabled(false);
        return;
      }
      
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
      
      await savePushToken(token);
      Alert.alert(t('Succès'), t('Notifications activées !'));
      setNotificationEnabled(true);

    } catch (error: any) {
      console.error("Erreur d'enregistrement des notifications:", error);
      Alert.alert(t('Erreur'), t('Impossible d\'activer les notifications. ') + (error.message || t('Veuillez réessayer.')));
      setNotificationEnabled(false);
    } finally {
      setRegisteringToken(false);
    }
  };

  const unregisterForPushNotificationsAsync = async () => {
    Alert.alert(t('Notifications désactivées'), t('Les notifications ont été désactivées.'));
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
      t('Confirmation'),
      t('Êtes-vous sûr de vouloir vous déconnecter ?'),
      [
        { text: t('Annuler'), style: "cancel" },
        { text: t('Déconnexion'), style: "destructive", onPress: logout }
      ]
    );
  };

  const handleMenuPress = () => { Alert.alert(t('Menu'), t('Menu Paramètres pressé !')); };
  const handleAvatarPress = () => { Alert.alert(t('Profil'), t('Avatar Paramètres pressé !')); };
  const handleSettingPress = (settingName: string) => { Alert.alert(t('Paramètre'), t('Vous avez cliqué sur "') + settingName + t('"')); };

  const handleSendTestNotification = async () => {
    try {
      await sendTestPushNotification();
      Alert.alert(t('Succès'), t('Notification test envoyée !'));
    } catch (error: any) {
      Alert.alert(t('Erreur'), t('Impossible d\'envoyer la notification test.'));
    }
  };

  return (
    <>
      {/* <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />  */}
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <CustomHeader
          title={t('Paramètres')} // Traduction du titre
          user={user}
          onMenuPress={handleMenuPress}
          onAvatarPress={handleAvatarPress}
        />

        <ScrollView 
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Section Préférences */}
          <SectionHeader title={t('Préférences')} icon="settings-outline" />
            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Langue')}
              subtitle={language === 'fr' ? 'Français' : language === 'en' ? 'English' : 'العربية'}
              icon="language"
              iconLibrary="Ionicons"
              iconColor="#6366F1"
              onPress={() =>
              Alert.alert(
                t('Langue'),
                t('Sélectionnez votre langue :'),
                [
                { text: '🇫🇷 Français', onPress: () => setLanguage('fr') },
                { text: '🇬🇧 English', onPress: () => setLanguage('en') },
                { text: '🇸🇦 العربية', onPress: () => setLanguage('ar') },
                ]
              )
              }
            />
            <SettingItem
              title={t('Mode sombre')}
              subtitle={t('Activer le thème sombre')}
              icon="moon"
              iconLibrary="Feather"
              iconColor="#8B5CF6"
              hasSwitch
              switchValue={isDarkMode}
              onSwitchChange={toggleDarkMode}
            />
            <SettingItem
              title={t('Synchronisation auto')}
              subtitle={t('Synchroniser automatiquement les données')}
              icon="refresh-cw"
              iconLibrary="Feather"
              iconColor="#10B981"
              hasSwitch
              switchValue={autoSyncEnabled}
              onSwitchChange={setAutoSyncEnabled}
            />
            </View>
          {/* Section Notifications */}
          <SectionHeader title={t('Notifications')} icon="notifications-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Notifications Push')}
              subtitle={t('Recevoir des notifications en temps réel')}
              icon="bell"
              iconLibrary="Feather"
              iconColor="#F59E0B"
              hasSwitch
              switchValue={notificationEnabled}
              onSwitchChange={toggleNotifications}
            />
            <SettingItem
              title={t('Notifications par email')}
              subtitle={t('Recevoir des résumés par email')}
              icon="mail"
              iconLibrary="Feather"
              iconColor="#EF4444"
              onPress={() => handleSettingPress(t("Notifications email"))}
            />
            <SettingItem
              title={t('Envoyer notification test')}
              subtitle={t('Envoyer une notification pour tester')}
              icon="notifications"
              iconLibrary="Ionicons"
              iconColor="#091e60"
              onPress={handleSendTestNotification}
              showChevron={false}
            />
          </View>

          {/* Section Sécurité */}
          <SectionHeader title={t('Sécurité')} icon="shield-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Authentification biométrique')}
              subtitle={t('Utiliser Face ID / Touch ID')}
              icon="fingerprint"
              iconLibrary="MaterialIcons"
              iconColor="#06B6D4"
              hasSwitch
              switchValue={biometricEnabled}
              onSwitchChange={setBiometricEnabled}
            />
            <SettingItem
              title={t('Changer le mot de passe')}
              subtitle={t('Modifier votre mot de passe')}
              icon="lock"
              iconLibrary="Feather"
              iconColor="#DC2626"
              onPress={() => handleSettingPress(t("Changer mot de passe"))}
            />
            <SettingItem
              title={t('Sessions actives')}
              subtitle={t('Gérer vos sessions connectées')}
              icon="smartphone"
              iconLibrary="Feather"
              iconColor="#7C3AED"
              onPress={() => handleSettingPress(t("Sessions actives"))}
            />
          </View>

          {/* Section Compte */}
          <SectionHeader title={t('Compte')} icon="person-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Informations personnelles')}
              subtitle={t('Modifier votre profil')}
              icon="user"
              iconLibrary="Feather"
              iconColor="#059669"
              onPress={() => handleSettingPress(t("Informations personnelles"))}
            />
            <SettingItem
              title={t('Confidentialité')}
              subtitle={t('Paramètres de confidentialité')}
              icon="eye-off"
              iconLibrary="Feather"
              iconColor="#7C2D12"
              onPress={() => handleSettingPress(t("Confidentialité"))}
            />
            <SettingItem
              title={t('Exporter mes données')}
              subtitle={t('Télécharger vos données')}
              icon="download"
              iconLibrary="Feather"
              iconColor="#0891B2"
              onPress={() => handleSettingPress(t("Export données"))}
            />
          </View>

          {/* Section Support */}
          <SectionHeader title={t('Support')} icon="help-circle-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Centre d\'aide')}
              subtitle={t('FAQ et guides d\'utilisation')}
              icon="help-circle"
              iconLibrary="Feather"
              iconColor="#F97316"
              onPress={() => handleSettingPress(t("Centre d'aide"))}
            />
            <SettingItem
              title={t('Nous contacter')}
              subtitle={t('Obtenir de l\'aide')}
              icon="message-circle"
              iconLibrary="Feather"
              iconColor="#8B5CF6"
              onPress={() => handleSettingPress(t("Contact"))}
            />
            <SettingItem
              title={t('À propos')}
              subtitle={t('Informations sur l\'application')}
              icon="info"
              iconLibrary="Feather"
              iconColor="#6B7280"
              onPress={() => handleSettingPress(t("À propos"))}
            />
          </View>

          {/* Bouton de déconnexion */}
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.error }]}
            onPress={confirmLogout} 
            disabled={authLoading}
          >
            <Feather name="log-out" size={18} color="#FFFFFF" style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>
              {authLoading ? t("Déconnexion...") : t("Se déconnecter")}
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
  },
  scrollView: {
    flex: 1,
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
    // color est géré par le style inline
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    // backgroundColor est géré par le style inline
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
    // borderBottomColor est géré par le style inline
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
    // backgroundColor est géré par le style inline
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    // color est géré par le style inline
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    // color est géré par le style inline
    lineHeight: 18,
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    // backgroundColor est géré par le style inline
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