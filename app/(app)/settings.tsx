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
  StatusBar,
  Modal,
  TextInput,
  Linking
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
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { savePushToken, sendTestPushNotification } from '../../utils/api';
import { useTheme } from '../../components/ThemeContext';
import { useLanguage } from '../../components/LanguageContext';

// Configuration pour les notifications en arrière-plan (headless)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
  disabled?: boolean;
}

/**
 * Interface pour les props des en-têtes de section
 */
interface SectionHeaderProps {
  title: string;
  icon?: string;
}

/**
 * Interface pour les sessions actives
 */
interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActivity: string;
  current: boolean;
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
  showChevron = true,
  disabled = false
}) => {
  const { colors } = useTheme();
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const renderIcon = () => {
    const iconProps = {
      name: icon,
      size: 20,
      color: disabled ? colors.textSecondary : iconColor
    };

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
        opacity: disabled ? 0.6 : 1
      }
    ]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: (disabled ? colors.textSecondary : iconColor) + '15' }]}>
          {renderIcon()}
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: disabled ? colors.textSecondary : colors.textPrimary }]}>{title}</Text>
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
            disabled={disabled}
          />
        ) : showChevron ? (
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        ) : null}
      </View>
    </Animated.View>
  );

  if (hasSwitch || disabled) {
    return content;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      disabled={disabled}
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

// Modal pour changer le mot de passe
const ChangePasswordModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: (oldPassword: string, newPassword: string) => void;
}> = ({ visible, onClose, onConfirm }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleConfirm = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('Erreur'), t('Veuillez remplir tous les champs'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('Erreur'), t('Les nouveaux mots de passe ne correspondent pas'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('Erreur'), t('Le mot de passe doit contenir au moins 6 caractères'));
      return;
    }
    onConfirm(oldPassword, newPassword);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {t('Changer le mot de passe')}
          </Text>

          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t('Mot de passe actuel')}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
          />

          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t('Nouveau mot de passe')}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t('Confirmer le nouveau mot de passe')}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                {t('Annuler')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.secondary }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                {t('Confirmer')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Modal pour les sessions actives
const ActiveSessionsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Données fictives pour les sessions actives
  const [sessions, setSessions] = useState<ActiveSession[]>([
    {
      id: '1',
      device: 'iPhone 14 Pro',
      location: 'Dakar, Sénégal',
      lastActivity: 'Maintenant',
      current: true
    },
    {
      id: '2',
      device: 'iPad Air',
      location: 'Dakar, Sénégal',
      lastActivity: 'Il y a 2 heures',
      current: false
    },
    {
      id: '3',
      device: 'MacBook Pro',
      location: 'Dakar, Sénégal',
      lastActivity: 'Il y a 1 jour',
      current: false
    }
  ]);

  const terminateSession = (sessionId: string) => {
    Alert.alert(
      t('Terminer la session'),
      t('Êtes-vous sûr de vouloir terminer cette session ?'),
      [
        { text: t('Annuler'), style: 'cancel' },
        {
          text: t('Terminer'),
          style: 'destructive',
          onPress: () => {
            setSessions(sessions.filter(s => s.id !== sessionId));
            Alert.alert(t('Succès'), t('Session terminée avec succès'));
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.largeModal, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('Sessions actives')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sessionsList}>
            {sessions.map((session) => (
              <View key={session.id} style={[styles.sessionItem, { borderBottomColor: colors.border }]}>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionHeader}>
                    <Text style={[styles.sessionDevice, { color: colors.textPrimary }]}>
                      {session.device}
                    </Text>
                    {session.current && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={styles.currentBadgeText}>{t('Actuel')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.sessionLocation, { color: colors.textSecondary }]}>
                    {session.location}
                  </Text>
                  <Text style={[styles.sessionActivity, { color: colors.textSecondary }]}>
                    {t('Dernière activité')}: {session.lastActivity}
                  </Text>
                </View>
                {!session.current && (
                  <TouchableOpacity
                    style={[styles.terminateButton, { backgroundColor: colors.error }]}
                    onPress={() => terminateSession(session.id)}
                  >
                    <Text style={styles.terminateButtonText}>{t('Terminer')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function ParametresScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const { isDarkMode, toggleDarkMode, colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // États pour les différents switches et modals
  const [notificationEnabled, setNotificationEnabled] = useState(false); // Désactivé par défaut
  const [emailNotificationEnabled, setEmailNotificationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [registeringToken, setRegisteringToken] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [activeSessionsModalVisible, setActiveSessionsModalVisible] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    async function getInitialNotificationStatus() {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationEnabled(status === 'granted');
    }
    getInitialNotificationStatus();

    // Vérifier la disponibilité de l'authentification biométrique
    async function checkBiometricAvailability() {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    }
    checkBiometricAvailability();

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

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('Authentifiez-vous pour activer l\'authentification biométrique'),
          fallbackLabel: t('Utiliser le mot de passe'),
        });

        if (result.success) {
          setBiometricEnabled(true);
          Alert.alert(t('Succès'), t('Authentification biométrique activée'));
        } else {
          setBiometricEnabled(false);
        }
      } catch (error) {
        console.error('Erreur authentification biométrique:', error);
        setBiometricEnabled(false);
        Alert.alert(t('Erreur'), t('Impossible d\'activer l\'authentification biométrique'));
      }
    } else {
      setBiometricEnabled(false);
      Alert.alert(t('Désactivé'), t('Authentification biométrique désactivée'));
    }
  };

  const handleChangePassword = (oldPassword: string, newPassword: string) => {
    // Simulation de changement de mot de passe
    setTimeout(() => {
      Alert.alert(t('Succès'), t('Mot de passe modifié avec succès'));
      setChangePasswordModalVisible(false);
    }, 1000);
  };

  const handleExportData = async () => {
    try {
      // Simulation de l'export des données
      const userData = {
        user: user,
        settings: {
          darkMode: isDarkMode,
          language: language,
          notifications: notificationEnabled,
          biometric: biometricEnabled,
          autoSync: autoSyncEnabled
        },
        exportDate: new Date().toISOString()
      };

      const dataString = JSON.stringify(userData, null, 2);
      const fileName = `user_data_export_${new Date().getTime()}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, dataString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t('Exporter mes données')
        });
      } else {
        Alert.alert(t('Succès'), t('Données exportées vers: ') + fileUri);
      }
    } catch (error) {
      console.error('Erreur export:', error);
      Alert.alert(t('Erreur'), t('Impossible d\'exporter les données'));
    }
  };

  const handlePrivacySettings = () => {
    Alert.alert(
      t('Paramètres de confidentialité'),
      t('Configurez vos préférences de confidentialité'),
      [
        {
          text: t('Données de localisation'),
          onPress: () => Alert.alert(t('Localisation'), t('Gérer l\'accès aux données de localisation'))
        },
        {
          text: t('Données d\'utilisation'),
          onPress: () => Alert.alert(t('Utilisation'), t('Gérer le partage des données d\'utilisation'))
        },
        {
          text: t('Cookies et trackers'),
          onPress: () => Alert.alert(t('Cookies'), t('Gérer les cookies et trackers'))
        },
        { text: t('Annuler'), style: 'cancel' }
      ]
    );
  };

  const handlePersonalInfo = () => {
    Alert.alert(
      t('Informations personnelles'),
      t('Modifier vos informations personnelles'),
      [
        {
          text: t('Nom et prénom'),
          onPress: () => Alert.alert(t('Nom'), t('Modifier votre nom et prénom'))
        },
        {
          text: t('Email'),
          onPress: () => Alert.alert(t('Email'), t('Modifier votre adresse email'))
        },
        {
          text: t('Téléphone'),
          onPress: () => Alert.alert(t('Téléphone'), t('Modifier votre numéro de téléphone'))
        },
        { text: t('Annuler'), style: 'cancel' }
      ]
    );
  };

  const handleHelpCenter = () => {
    Alert.alert(
      t('Centre d\'aide'),
      t('Que souhaitez-vous faire ?'),
      [
        {
          text: t('FAQ'),
          onPress: () => Alert.alert(t('FAQ'), t('Questions fréquemment posées'))
        },
        {
          text: t('Guides d\'utilisation'),
          onPress: () => Alert.alert(t('Guides'), t('Tutoriels et guides d\'utilisation'))
        },
        {
          text: t('Signaler un problème'),
          onPress: () => Alert.alert(t('Problème'), t('Signaler un bug ou un problème'))
        },
        { text: t('Annuler'), style: 'cancel' }
      ]
    );
  };

  const handleContact = () => {
    Alert.alert(
      t('Nous contacter'),
      t('Comment souhaitez-vous nous contacter ?'),
      [
        {
          text: t('Email'),
          onPress: () => Linking.openURL('mailto:support@example.com')
        },
        {
          text: t('Téléphone'),
          onPress: () => Linking.openURL('tel:+221123456789')
        },
        {
          text: t('Chat en direct'),
          onPress: () => Alert.alert(t('Chat'), t('Fonctionnalité à venir'))
        },
        { text: t('Annuler'), style: 'cancel' }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      t('À propos'),
      `${t('Version')}: 1.0.0\n${t('Développé par')}: Votre Équipe\n${t('Copyright')} © 2024`,
      [
        {
          text: t('Conditions d\'utilisation'),
          onPress: () => Alert.alert(t('Conditions'), t('Voir les conditions d\'utilisation'))
        },
        {
          text: t('Politique de confidentialité'),
          onPress: () => Alert.alert(t('Confidentialité'), t('Voir la politique de confidentialité'))
        },
        { text: t('OK') }
      ]
    );
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <CustomHeader
          title={t('Paramètres')}
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
              hasSwitch
              switchValue={emailNotificationEnabled}
              onSwitchChange={setEmailNotificationEnabled}
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
              subtitle={biometricAvailable ? t('Utiliser Face ID / Touch ID') : t('Non disponible sur cet appareil')}
              icon="fingerprint"
              iconLibrary="MaterialIcons"
              iconColor="#06B6D4"
              hasSwitch
              switchValue={biometricEnabled}
              onSwitchChange={toggleBiometric}
              disabled={!biometricAvailable}
            />
            <SettingItem
              title={t('Changer le mot de passe')}
              subtitle={t('Modifier votre mot de passe')}
              icon="lock"
              iconLibrary="Feather"
              iconColor="#DC2626"
              onPress={() => setChangePasswordModalVisible(true)}
            />
            <SettingItem
              title={t('Sessions actives')}
              subtitle={t('Gérer vos sessions connectées')}
              icon="smartphone"
              iconLibrary="Feather"
              iconColor="#7C3AED"
              onPress={() => setActiveSessionsModalVisible(true)}
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
              onPress={handlePersonalInfo}
            />
            <SettingItem
              title={t('Confidentialité')}
              subtitle={t('Paramètres de confidentialité')}
              icon="eye-off"
              iconLibrary="Feather"
              iconColor="#7C2D12"
              onPress={handlePrivacySettings}
            />
            <SettingItem
              title={t('Exporter mes données')}
              subtitle={t('Télécharger vos données')}
              icon="download"
              iconLibrary="Feather"
              iconColor="#0891B2"
              onPress={handleExportData}
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
              onPress={handleHelpCenter}
            />
            <SettingItem
              title={t('Nous contacter')}
              subtitle={t('Obtenir de l\'aide')}
              icon="message-circle"
              iconLibrary="Feather"
              iconColor="#8B5CF6"
              onPress={handleContact}
            />
            <SettingItem
              title={t('À propos')}
              subtitle={t('Informations sur l\'application')}
              icon="info"
              iconLibrary="Feather"
              iconColor="#6B7280"
              onPress={handleAbout}
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

        {/* Modals */}
        <ChangePasswordModal
          visible={changePasswordModalVisible}
          onClose={() => setChangePasswordModalVisible(false)}
          onConfirm={handleChangePassword}
        />

        <ActiveSessionsModal
          visible={activeSessionsModalVisible}
          onClose={() => setActiveSessionsModalVisible(false)}
        />
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
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
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
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
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
  // Styles pour les modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  largeModal: {
    maxWidth: '90%',
    maxHeight: '80%',
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Styles pour les sessions actives
  sessionsList: {
    flex: 1,
    padding: 24,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionDevice: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionLocation: {
    fontSize: 14,
    marginBottom: 2,
  },
  sessionActivity: {
    fontSize: 12,
  },
  terminateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  terminateButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});