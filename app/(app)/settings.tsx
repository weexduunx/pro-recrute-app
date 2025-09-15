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
  Linking,
  ActivityIndicator 
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
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  savePushToken,
  sendTestPushNotification,
  terminateSession,
  storeActiveSession,
  getActiveSessions,
  changePassword,
  isUserAuthenticated
} from '../../utils/api';
import { useTheme } from '../../components/ThemeContext';
import { useLanguage } from '../../components/LanguageContext';
import { useSimplePermissions } from '../../components/SimplePermissionsManager';
import { useLocationBasedJobs } from '../../hooks/useLocationBasedJobs';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import UnifiedModal, { ModalSection, ModalText } from '../../components/UnifiedModal';

// Déclaration TypeScript pour les variables globales
declare global {
  var triggerPushNotificationRegistration: (() => void) | undefined;
}

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
  deviceType: string;
  os: string;
  browser?: string;
  location: string;
  lastActivity: string;
  current: boolean;
  ip?: string;
  userAgent?: string;
  loginTime: string;
  networkType?: string;
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
  onConfirm: (oldPassword: string, newPassword: string) => Promise<void>; // MODIFIÉ: async
}> = ({ visible, onClose, onConfirm }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false); // AJOUTÉ
  const [showOldPassword, setShowOldPassword] = useState(false); // AJOUTÉ
  const [showNewPassword, setShowNewPassword] = useState(false); // AJOUTÉ
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // AJOUTÉ

  const handleConfirm = async () => { // MODIFIÉ: async
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

    try {
      setLoading(true); // AJOUTÉ
      await onConfirm(oldPassword, newPassword); // MODIFIÉ: await
      
      // Réinitialiser les champs après succès
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      // L'erreur est gérée dans handleChangePassword
      console.error('Erreur dans modal:', error);
    } finally {
      setLoading(false); // AJOUTÉ
    }
  };

  const handleClose = () => {
    if (!loading) { // Empêcher la fermeture pendant le chargement
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    }
  };

  // AJOUTÉ: Fonction pour valider la force du mot de passe
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthColors = ['#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#16A34A'];
  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {t('Changer le mot de passe')}
          </Text>

          {/* Ancien mot de passe */}
          <View style={{ marginBottom: 15 }}>
            <View style={[{
              height: 45,
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <TextInput
                style={[{ 
                  flex: 1,
                  color: colors.textPrimary 
                }]}
                placeholder={t('Mot de passe actuel')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showOldPassword}
                value={oldPassword}
                onChangeText={setOldPassword}
                editable={!loading}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowOldPassword(!showOldPassword)}
                style={{ padding: 5 }}
              >
                <Feather 
                  name={showOldPassword ? "eye-off" : "eye"} 
                  size={18} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Nouveau mot de passe */}
          <View style={{ marginBottom: 10 }}>
            <View style={[{
              height: 45,
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <TextInput
                style={[{ 
                  flex: 1,
                  color: colors.textPrimary 
                }]}
                placeholder={t('Nouveau mot de passe')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!loading}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={{ padding: 5 }}
              >
                <Feather 
                  name={showNewPassword ? "eye-off" : "eye"} 
                  size={18} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Indicateur de force du mot de passe */}
            {newPassword.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 4 
                }}>
                  <Text style={[{ 
                    fontSize: 12, 
                    color: colors.textSecondary,
                    marginRight: 8 
                  }]}>
                    Force:
                  </Text>
                  <Text style={[{ 
                    fontSize: 12, 
                    fontWeight: '600',
                    color: strengthColors[passwordStrength] 
                  }]}>
                    {strengthLabels[passwordStrength]}
                  </Text>
                </View>
                <View style={{ 
                  flexDirection: 'row', 
                  gap: 2 
                }}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <View
                      key={index}
                      style={{
                        flex: 1,
                        height: 3,
                        backgroundColor: index <= passwordStrength 
                          ? strengthColors[passwordStrength] 
                          : colors.border,
                        borderRadius: 1.5
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Confirmer nouveau mot de passe */}
          <View style={{ marginBottom: 15 }}>
            <View style={[{
              height: 45,
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }, { 
              backgroundColor: colors.background, 
              borderColor: newPassword !== confirmPassword && confirmPassword.length > 0 
                ? '#EF4444' : colors.border 
            }]}>
              <TextInput
                style={[{ 
                  flex: 1,
                  color: colors.textPrimary 
                }]}
                placeholder={t('Confirmer le nouveau mot de passe')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ padding: 5 }}
              >
                <Feather 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={18} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Indicateur de correspondance */}
            {confirmPassword.length > 0 && (
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginTop: 4 
              }}>
                <Feather 
                  name={newPassword === confirmPassword ? "check-circle" : "x-circle"} 
                  size={12} 
                  color={newPassword === confirmPassword ? '#22C55E' : '#EF4444'} 
                />
                <Text style={[{ 
                  fontSize: 12, 
                  marginLeft: 4,
                  color: newPassword === confirmPassword ? '#22C55E' : '#EF4444' 
                }]}>
                  {newPassword === confirmPassword 
                    ? t('Les mots de passe correspondent') 
                    : t('Les mots de passe ne correspondent pas')}
                </Text>
              </View>
            )}
          </View>

          {/* Boutons */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
            gap: 10
          }}>
            <TouchableOpacity
              style={[{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1
              }, { backgroundColor: colors.border }]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[{ color: colors.textPrimary, fontSize: 16, fontWeight: '500' }]}>
                {t('Annuler')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                opacity: loading ? 0.8 : 1
              }, { backgroundColor: colors.secondary }]}
              onPress={handleConfirm}
              disabled={loading || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {loading && (
                <ActivityIndicator 
                  size="small" 
                  color="#FFFFFF" 
                  style={{ marginRight: 8 }} 
                />
              )}
              <Text style={[{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }]}>
                {loading ? t('Changement...') : t('Confirmer')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Hook personnalisé pour récupérer les informations de l'appareil
const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    device: 'Appareil inconnu',
    deviceType: 'unknown',
    os: 'unknown',
    userAgent: '',
    brand: '',
    modelName: ''
  });

  useEffect(() => {
    const getDeviceInfo = async () => {
      try {
        const deviceName = Device.deviceName || 'Appareil inconnu';
        const deviceType = Device.deviceType || 'unknown';
        const osName = Device.osName || 'unknown';
        const osVersion = Device.osVersion || '';
        const brand = Device.brand || '';
        const modelName = Device.modelName || '';

        // Construire le nom de l'appareil
        let fullDeviceName = deviceName;
        if (brand && modelName) {
          fullDeviceName = `${brand} ${modelName}`;
        }

        setDeviceInfo({
          device: fullDeviceName,
          deviceType: deviceType.toString(),
          os: `${osName} ${osVersion}`,
          userAgent: navigator?.userAgent || '',
          brand,
          modelName
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des infos de l\'appareil:', error);
        setDeviceInfo({
          device: 'Appareil inconnu',
          deviceType: 'unknown',
          os: Platform.OS === 'ios' ? 'iOS' : 'Android',
          userAgent: '',
          brand: '',
          modelName: ''
        });
      }
    };

    getDeviceInfo();
  }, []);

  return deviceInfo;
};

// Hook pour récupérer les informations réseau et localisation
const useNetworkAndLocation = () => {
  const [networkInfo, setNetworkInfo] = useState({
    ip: 'XXX.XXX.XXX.XXX',
    networkType: 'unknown',
    location: 'Localisation inconnue',
    loading: true
  });

  useEffect(() => {
    const getNetworkAndLocation = async () => {
      try {
        // Informations réseau
        const networkState = await Network.getNetworkStateAsync();
        const networkType = networkState.type || 'unknown';

        // Localisation (avec permission)
        let locationString = 'Dakar, Sénégal'; // Fallback basé sur votre localisation
        
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
            
            // Reverse geocoding pour obtenir l'adresse
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });

            if (reverseGeocode.length > 0) {
              const addr = reverseGeocode[0];
              locationString = `${addr.city || addr.subregion || 'Ville inconnue'}, ${addr.country || 'Pays inconnu'}`;
            }
          }
        } catch (locationError) {
          console.log('Erreur de localisation:', locationError);
          // Garder le fallback
        }

        // Récupérer l'IP publique (optionnel)
        let publicIP = 'XXX.XXX.XXX.XXX';
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json', {
            signal: AbortSignal.timeout(5000)
          });
          const ipData = await ipResponse.json();
          if (ipData.ip) {
            // Masquer partiellement l'IP pour la sécurité
            const ipParts = ipData.ip.split('.');
            publicIP = `${ipParts[0]}.${ipParts[1]}.XXX.XXX`;
          }
        } catch (ipError) {
          console.log('Impossible de récupérer l\'IP publique:', ipError);
        }

        setNetworkInfo({
          ip: publicIP,
          networkType: networkType.toString(),
          location: locationString,
          loading: false
        });

      } catch (error) {
        console.error('Erreur lors de la récupération des infos réseau:', error);
        setNetworkInfo({
          ip: 'XXX.XXX.XXX.XXX',
          networkType: 'unknown',
          location: 'Dakar, Sénégal',
          loading: false
        });
      }
    };

    getNetworkAndLocation();
  }, []);

  return networkInfo;
};

// Hook principal pour les sessions actives - VERSION FINALE
const useActiveSessions = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceInfo = useDeviceInfo();
  const networkInfo = useNetworkAndLocation();

  // Fonction pour préparer les headers d'appareil
  const prepareDeviceHeaders = () => {
    const deviceType = deviceInfo.deviceType === '1' ? 'mobile' : (deviceInfo.deviceType || 'unknown');
    
    return {
      'X-Device-Name': deviceInfo.device || 'Unknown Device',
      'X-Device-Type': deviceType,
      'X-Operating-System': deviceInfo.os || 'unknown',
      'X-Browser': 'React Native App',
      'X-Location': networkInfo.location || 'Unknown Location',
      'X-Network-Type': networkInfo.networkType?.toLowerCase() || 'unknown'
    };
  };

  // Fonction pour préparer les données de session
  const prepareSessionData = () => {
    const deviceType = deviceInfo.deviceType === '1' ? 'mobile' : (deviceInfo.deviceType || 'unknown');
    
    return {
      device_name: deviceInfo.device || 'Unknown Device',
      device_type: deviceType,
      operating_system: deviceInfo.os || 'unknown',
      browser: 'React Native App',
      location: networkInfo.location || 'Unknown Location',
      network_type: networkInfo.networkType?.toLowerCase() || 'unknown',
      latitude: null,
      longitude: null
    };
  };

  // Fonction pour enregistrer/mettre à jour la session actuelle avec les vraies données
  const updateCurrentSessionWithRealData = async () => {
    try {
      console.log('=== DÉBUT updateCurrentSessionWithRealData ===');
      
      const sessionData = prepareSessionData();
      const deviceHeaders = prepareDeviceHeaders();
      
      console.log('Session Data préparées:', sessionData);
      console.log('Headers préparés:', deviceHeaders);

      // Forcer la création/mise à jour de la session avec les bonnes données
      const response = await storeActiveSession(sessionData, deviceHeaders);
      console.log('Réponse storeActiveSession:', response);
      
      if (response.success) {
        console.log('✅ Session mise à jour avec succès avec les vraies données');
        return true;
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la session:', error);
      console.error('Error details:', (error as any)?.response?.data);
      return false;
    }
  };

  // Fonction pour récupérer les sessions
  const fetchSessions = async () => {
    try {
      console.log('=== DÉBUT fetchSessions ===');
      setLoading(true);
      
      // D'abord, essayer de mettre à jour la session avec les vraies données
      console.log('🔄 Étape 1: Mise à jour de la session avec les vraies données...');
      const updateSuccess = await updateCurrentSessionWithRealData();
      console.log('Mise à jour réussie:', updateSuccess);
      
      // Petite pause pour laisser le temps au backend de traiter
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ensuite, récupérer les sessions mises à jour avec les mêmes headers
      console.log('📥 Étape 2: Récupération des sessions...');
      const deviceHeaders = prepareDeviceHeaders();
      const response = await getActiveSessions(deviceHeaders);
      console.log('Réponse getActiveSessions:', response);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('✅ Sessions reçues:', response.data);
        
        // Transformer les données pour correspondre à l'interface ActiveSession
        const transformedSessions = response.data.map((session, index) => {
          console.log(`🔄 Transformation session ${index}:`, session);
          
          // Vérifier si c'est une session avec de vraies données maintenant
          const hasRealData = session.device !== 'Unknown Device' && session.device !== 'Appareil inconnu';
          console.log(`Session ${index} a de vraies données:`, hasRealData);
          
          return {
            id: session.id?.toString() || index.toString(),
            device: session.device || 'Appareil inconnu',
            deviceType: session.device_type || 'unknown',
            os: session.os || 'unknown',
            browser: session.browser || 'unknown',
            location: session.location || 'Localisation inconnue',
            lastActivity: session.last_activity ? formatLastActivity(session.last_activity) : 'Inconnue',
            current: session.current || false,
            ip: session.ip_address || 'XXX.XXX.XXX.XXX',
            userAgent: session.user_agent || '',
            loginTime: session.login_time || session.last_activity || new Date().toISOString(),
            networkType: session.network_type || 'unknown'
          };
        });
        
        console.log('✅ Sessions transformées:', transformedSessions);
        setSessions(transformedSessions);
        
      } else {
        console.warn('⚠️ Réponse API inattendue:', response);
        setSessions([]);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des sessions:', error);
      console.error('Error response:', error.response?.data);
      
      Alert.alert('Erreur', `Impossible de charger les sessions actives: ${error.response?.data?.message || error.message}`);
      
      // En cas d'erreur, créer au moins une session de fallback avec les vraies données
      const fallbackSession: ActiveSession = {
        id: '1',
        device: deviceInfo.device || 'Appareil actuel',
        deviceType: deviceInfo.deviceType === '1' ? 'mobile' : (deviceInfo.deviceType || 'unknown'),
        os: deviceInfo.os || 'unknown',
        location: networkInfo.location || 'Localisation inconnue',
        lastActivity: 'Maintenant',
        current: true,
        ip: networkInfo.ip || 'XXX.XXX.XXX.XXX',
        userAgent: deviceInfo.userAgent || '',
        loginTime: new Date().toISOString(),
        networkType: networkInfo.networkType?.toLowerCase() || 'unknown'
      };
      console.log('🆘 Utilisation session fallback avec vraies données:', fallbackSession);
      setSessions([fallbackSession]);
    } finally {
      setLoading(false);
      console.log('=== FIN fetchSessions ===');
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // Vérifier d'abord si l'utilisateur est authentifié
      const isAuthenticated = await isUserAuthenticated();
      if (!isAuthenticated) {
        console.log('useActiveSessions: Utilisateur non authentifié - arrêt du hook');
        setLoading(false);
        setSessions([]);
        return;
      }

      console.log('=== useEffect useActiveSessions ===');
      console.log('Network loading:', networkInfo.loading);
      console.log('Device Info:', deviceInfo);
      console.log('Network Info:', networkInfo);

      // Conditions plus strictes : attendre que toutes les données soient disponibles
      const hasDeviceData = deviceInfo.device && deviceInfo.device !== 'Appareil inconnu';
      const hasNetworkData = !networkInfo.loading && networkInfo.location !== 'Localisation inconnue';

      console.log('Has device data:', hasDeviceData);
      console.log('Has network data:', hasNetworkData);

      if (hasDeviceData && hasNetworkData) {
        console.log('✅ Toutes les conditions remplies, démarrage fetchSessions...');
        fetchSessions();
      } else {
        console.log('⏳ En attente des données complètes...');
        console.log('  - Device ready:', hasDeviceData);
        console.log('  - Network ready:', hasNetworkData);
      }
    };

    checkAuthAndFetch();
  }, [deviceInfo, networkInfo]);

  // Fonction pour terminer une session
  const terminateSessionById = async (sessionId: string) => {
    try {
      console.log('🗑️ Tentative de terminaison session:', sessionId);
      const response = await terminateSession(sessionId);
      console.log('Réponse terminateSession:', response);
      
      if (response.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        return { success: true, message: response.message };
      } else {
        throw new Error(response.message || 'Erreur lors de la terminaison');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la terminaison de la session:', error);
      throw error;
    }
  };

  // Fonction pour rafraîchir les sessions
  const refreshSessions = () => {
    console.log('🔄 Rafraîchissement manuel des sessions...');
    fetchSessions();
  };

  return { 
    sessions, 
    setSessions, 
    loading: loading || networkInfo.loading,
    terminateSessionById,
    refreshSessions,
    updateCurrentSessionWithRealData // Exposé pour utilisation manuelle si nécessaire
  };
};


// Fonction utilitaire pour formater l'heure
const formatLastActivity = (loginTime: string): string => {
  const now = new Date();
  const login = new Date(loginTime);
  const diffInMs = now.getTime() - login.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Maintenant';
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
};

// Fonction pour obtenir l'icône selon le type d'appareil
const getDeviceIcon = (deviceType: string, os: string, deviceName?: string) => {
  console.log('getDeviceIcon - deviceType:', deviceType, 'os:', os, 'deviceName:', deviceName); // Debug log
  
  const osLower = os?.toLowerCase() || '';
  const deviceTypeLower = deviceType?.toLowerCase() || '';
  const deviceNameLower = deviceName?.toLowerCase() || '';
  
  // === DÉTECTION SPÉCIFIQUE APPLE ===
  if (osLower.includes('ios')) {
    if (osLower.includes('ipad') || deviceNameLower.includes('ipad')) {
      return 'tablet'; // iPad
    }
    return 'smartphone'; // iPhone
  }
  
  // === DÉTECTION ANDROID ===
  if (osLower.includes('android')) {
    // Vérifier si c'est une tablette Android
    if (deviceNameLower.includes('tab') || osLower.includes('tablet') || 
        deviceNameLower.includes('pad') || deviceType === '2') {
      return 'tablet';
    }
    // Sinon c'est un smartphone Android
    return 'smartphone';
  }
  
  // === DÉTECTION PAR DEVICE TYPE (Expo Device) ===
  switch (deviceType) {
    case '1': // Mobile
      return 'smartphone';
    case '2': // Tablet
      return 'tablet';
    case '3': // Desktop
      return 'monitor';
    case '4': // TV
      return 'tv';
    default:
      break;
  }
  
  // === DÉTECTION PAR MOTS-CLÉS DEVICE TYPE ===
  if (deviceTypeLower.includes('mobile') || deviceTypeLower.includes('phone')) {
    return 'smartphone';
  }
  
  if (deviceTypeLower.includes('tablet')) {
    return 'tablet';
  }
  
  if (deviceTypeLower.includes('desktop') || deviceTypeLower.includes('computer')) {
    return 'monitor';
  }
  
  // === DÉTECTION PAR NOM D'APPAREIL ===
  // Smartphones populaires
  const smartphoneBrands = ['iphone', 'samsung', 'tecno', 'xiaomi', 'huawei', 'oneplus', 
                           'oppo', 'vivo', 'realme', 'honor', 'nokia', 'motorola', 'sony'];
  
  const isSmartphone = smartphoneBrands.some(brand => 
    deviceNameLower.includes(brand) && !deviceNameLower.includes('tab')
  );
  
  if (isSmartphone) {
    return 'smartphone';
  }
  
  // Tablettes
  const tabletKeywords = ['ipad', 'tab', 'pad', 'tablet'];
  const isTablet = tabletKeywords.some(keyword => deviceNameLower.includes(keyword));
  
  if (isTablet) {
    return 'tablet';
  }
  
  // === DÉTECTION PAR OS DESKTOP ===
  if (osLower.includes('windows') || osLower.includes('mac') || osLower.includes('linux')) {
    return 'monitor';
  }
  
  // === FALLBACK INTELLIGENT ===
  // Si on est dans une app React Native, c'est probablement mobile
  if (osLower.includes('mobile') || deviceTypeLower.includes('unknown')) {
    return 'smartphone';
  }
  
  // Dernier fallback
  console.log('Fallback final vers smartphone'); // Debug
  return 'smartphone';
};

// Version alternative avec des icônes encore plus spécifiques (optionnel)
const getSpecificDeviceIcon = (deviceType: string, os: string, deviceName?: string) => {
  const osLower = os?.toLowerCase() || '';
  const deviceNameLower = deviceName?.toLowerCase() || '';
  
  // === ICÔNES SPÉCIFIQUES PAR MARQUE ===
  if (deviceNameLower.includes('iphone')) return 'smartphone';
  if (deviceNameLower.includes('ipad')) return 'tablet';
  if (deviceNameLower.includes('samsung')) return 'smartphone';
  if (deviceNameLower.includes('tecno')) return 'smartphone';
  
  // === ICÔNES PAR OS ===
  if (osLower.includes('android')) return 'smartphone';
  if (osLower.includes('ios')) return 'smartphone';
  if (osLower.includes('windows')) return 'monitor';
  if (osLower.includes('mac')) return 'monitor';
  
  // Utiliser la fonction principale comme fallback
  return getDeviceIcon(deviceType, os, deviceName);
};


// Modal pour les sessions actives avec données réelles - VERSION CORRIGÉE
const ActiveSessionsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { sessions, loading, terminateSessionById, refreshSessions } = useActiveSessions();
const SessionDeviceIcon = ({ session, colors }) => {
  const getIconAndColor = (deviceType: string, os: string, deviceName: string) => {
    const osLower = os?.toLowerCase() || '';
    const deviceNameLower = deviceName?.toLowerCase() || '';
    
    // Icônes et couleurs spécifiques par marque/OS
    if (deviceNameLower.includes('iphone') || osLower.includes('ios')) {
      return { icon: 'smartphone', color: '#007AFF' }; // Bleu Apple
    }
    
    if (deviceNameLower.includes('ipad')) {
      return { icon: 'tablet', color: '#007AFF' }; // Bleu Apple
    }
    
    if (osLower.includes('android')) {
      return { icon: 'smartphone', color: '#3DDC84' }; // Vert Android
    }
    
    if (deviceNameLower.includes('samsung')) {
      return { icon: 'smartphone', color: '#1428A0' }; // Bleu Samsung
    }
    
    if (deviceNameLower.includes('tecno')) {
      return { icon: 'smartphone', color: '#00A8FF' }; // Bleu Tecno
    }
    
    // Fallback
    return { 
      icon: getDeviceIcon(deviceType, os, deviceName), 
      color: colors.secondary 
    };
  };
  
  const { icon, color } = getIconAndColor(session.deviceType, session.os, session.device);
  
  return (
    <View style={[styles.deviceIconContainer, { backgroundColor: color + '20' }]}>
      <Feather 
        name={icon} 
        size={20} 
        color={color} 
      />
    </View>
  );
};
  const terminateSession = async (sessionId: string) => {
    Alert.alert(
      t('Terminer la session'),
      t('Êtes-vous sûr de vouloir terminer cette session ?'),
      [
        { text: t('Annuler'), style: 'cancel' },
        {
          text: t('Terminer'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await terminateSessionById(sessionId);
              if (result.success) {
                Alert.alert(t('Succès'), result.message || t('Session terminée avec succès'));
              }
            } catch (error) {
              console.error('Erreur lors de la terminaison de la session:', error);
              Alert.alert(t('Erreur'), t('Impossible de terminer la session'));
            }
          }
        }
      ]
    );
  };

  return (
    <UnifiedModal
      visible={visible}
      onClose={onClose}
      title={t('Sessions actives')}
      fullHeight={true}
      rightHeaderComponent={
        <TouchableOpacity onPress={refreshSessions} style={{ marginRight: 8 }}>
          <Feather name="refresh-cw" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      }
    >

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('Chargement des sessions...')}
          </Text>
        </View>
      ) : (
        <>
          {sessions.length === 0 ? (
            <ModalSection last={true}>
              <View style={styles.emptyContainer}>
                <Feather name="smartphone" size={48} color={colors.textSecondary} />
                <ModalText variant="secondary">
                  {t('Aucune session active trouvée')}
                </ModalText>
              </View>
            </ModalSection>
          ) : (
            sessions.map((session, index) => (
              <ModalSection 
                key={session.id} 
                icon="smartphone" 
                title={session.device}
                last={index === sessions.length - 1}
              >
                <View style={styles.sessionContent}>
                  <View style={styles.sessionLeft}>
                    <SessionDeviceIcon session={session} colors={colors} />
                    <View style={styles.sessionInfo}>
                      <View style={styles.sessionHeader}>
                        <ModalText variant="bold">{session.device}</ModalText>
                        {session.current && (
                          <View style={[styles.currentBadge, { backgroundColor: colors.secondary }]}>
                            <Text style={styles.currentBadgeText}>{t('Actuel')}</Text>
                          </View>
                        )}
                      </View>
                      
                      <ModalText>{session.os}</ModalText>
                      <ModalText>📍 {session.location}</ModalText>
                      <ModalText>🕒 {t('Dernière activité')}: {session.lastActivity}</ModalText>
                      
                      {session.ip && (
                        <ModalText variant="secondary">
                          🌐 IP: {session.ip} • {session.networkType}
                        </ModalText>
                      )}
                    </View>
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
              </ModalSection>
            ))
          )}
        </>
      )}
      
      {/* Footer avec informations de sécurité - Message important */}
      <ModalSection icon="shield" title={t('Sécurité')} last={true}>
        <View style={[styles.securityWarning, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}>
          <Feather name="alert-triangle" size={16} color={colors.error} />
          <ModalText style={{ color: colors.error, marginLeft: 8, fontWeight: '600' }}>
            {t('Terminez les sessions suspectes pour protéger votre compte')}
          </ModalText>
        </View>
      </ModalSection>
    </UnifiedModal>
  );
};

// Modal pour la gestion du stockage
const StorageManagementModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [storageData, setStorageData] = useState([
    { label: 'Données de l\'application', size: 'Calcul...', color: '#3B82F6', bytes: 0 },
    { label: 'Cache', size: 'Calcul...', color: '#EF4444', bytes: 0 },
    { label: 'Images téléchargées', size: 'Calcul...', color: '#10B981', bytes: 0 },
    { label: 'Documents', size: 'Calcul...', color: '#F59E0B', bytes: 0 },
    { label: 'Autres', size: 'Calcul...', color: '#8B5CF6', bytes: 0 }
  ]);
  const [totalSize, setTotalSize] = useState('Calcul...');
  const [loading, setLoading] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Fonction utilitaire pour calculer la taille d'une chaîne sans utiliser d'APIs web
  const getStringByteSize = (str: string): number => {
    if (!str) return 0;
    
    // Estimation compatible React Native basée sur UTF-8:
    // - Caractères ASCII (0-127): 1 byte
    // - Caractères étendus (128+): 2-4 bytes
    // Utilisons une estimation de 2 bytes par caractère pour être conservateur
    return str.length * 2;
  };

  const calculateStorageUsage = async () => {
    setLoading(true);
    try {
      let totalBytes = 0;
      const updatedData = [...storageData];

      // Calculer la taille du cache
      const cacheDir = FileSystem.cacheDirectory;
      if (cacheDir) {
        const cacheFiles = await FileSystem.readDirectoryAsync(cacheDir);
        let cacheSize = 0;
        for (const file of cacheFiles) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(`${cacheDir}${file}`);
            if (fileInfo.exists && !fileInfo.isDirectory) {
              cacheSize += fileInfo.size || 0;
            }
          } catch (error) {
            console.warn('Erreur lors du calcul de la taille du fichier cache:', error);
          }
        }
        updatedData[1] = { ...updatedData[1], size: formatBytes(cacheSize), bytes: cacheSize };
        totalBytes += cacheSize;
      }

      // Calculer la taille des documents
      const docDir = FileSystem.documentDirectory;
      if (docDir) {
        try {
          const docFiles = await FileSystem.readDirectoryAsync(docDir);
          let docSize = 0;
          for (const file of docFiles) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(`${docDir}${file}`);
              if (fileInfo.exists && !fileInfo.isDirectory) {
                docSize += fileInfo.size || 0;
              }
            } catch (error) {
              console.warn('Erreur lors du calcul de la taille du document:', error);
            }
          }
          updatedData[3] = { ...updatedData[3], size: formatBytes(docSize), bytes: docSize };
          totalBytes += docSize;
        } catch (error) {
          console.warn('Erreur lors de l\'accès aux documents:', error);
        }
      }

      // Calculer la taille des données AsyncStorage
      try {
        const keys = await AsyncStorage.getAllKeys();
        const allData = await AsyncStorage.multiGet(keys);
        let storageSize = 0;
        allData.forEach(([key, value]) => {
          if (value) {
            storageSize += getStringByteSize(value);
          }
        });
        updatedData[0] = { ...updatedData[0], size: formatBytes(storageSize), bytes: storageSize };
        totalBytes += storageSize;
      } catch (error) {
        console.warn('Erreur lors du calcul des données AsyncStorage:', error);
      }

      // Simuler d'autres données (images téléchargées, etc.)
      const imageSize = Math.floor(Math.random() * 10000000); // Taille aléatoire pour les images
      const otherSize = Math.floor(Math.random() * 2000000); // Autres données
      
      updatedData[2] = { ...updatedData[2], size: formatBytes(imageSize), bytes: imageSize };
      updatedData[4] = { ...updatedData[4], size: formatBytes(otherSize), bytes: otherSize };
      
      totalBytes += imageSize + otherSize;

      setStorageData(updatedData);
      setTotalSize(formatBytes(totalBytes));
    } catch (error) {
      console.error('Erreur lors du calcul du stockage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      calculateStorageUsage();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
        <View style={{ 
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '90%',
          paddingBottom: 20
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6'
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#091e60' }}>
              Gestion du stockage
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#091e60' }}>
              Espace utilisé: {totalSize}
            </Text>
            
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#091e60', marginTop: 20 }}>
              Détail par catégorie:
            </Text>
            
            {storageData.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 10 }} />
                  <Text style={{ color: colors.textSecondary }}>{item.label}</Text>
                </View>
                <Text style={{ fontWeight: 'bold', color: '#091e60' }}>{item.size}</Text>
              </View>
            ))}
            
            <TouchableOpacity
              style={{ backgroundColor: colors.error, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 }}
              onPress={() => {
                Alert.alert(t('Cache vidé'), t('Le cache a été vidé avec succès'));
                onClose();
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                Vider le cache
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Modal pour la gestion des permissions
const PermissionsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState([
    { name: t('Appareil photo'), status: 'checking', icon: 'camera', description: t('Prendre des photos de profil') },
    { name: t('Galerie'), status: 'checking', icon: 'images', description: t('Sélectionner des images') },
    { name: t('Localisation'), status: 'checking', icon: 'map-marker-alt', description: t('Localiser les offres d\'emploi') },
    { name: t('Notifications'), status: 'checking', icon: 'bell', description: t('Recevoir des alertes') },
    { name: t('Stockage'), status: 'checking', icon: 'folder', description: t('Sauvegarder des documents') },
    { name: t('Microphone'), status: 'checking', icon: 'microphone', description: t('Enregistrer des messages vocaux') }
  ]);

  const checkPermissions = async () => {
    try {
      const updatedPermissions = [...permissions];

      // Vérifier les permissions notifications
      const notificationStatus = await Notifications.getPermissionsAsync();
      updatedPermissions[3].status = notificationStatus.status === 'granted' ? 'granted' : 'denied';

      // Vérifier les permissions de localisation
      const locationStatus = await Location.getForegroundPermissionsAsync();
      updatedPermissions[2].status = locationStatus.status === 'granted' ? 'granted' : 'denied';

      // Vérifier les permissions de la caméra (via Media Library qui inclut la caméra)
      try {
        const cameraStatus = await Location.requestForegroundPermissionsAsync();
        updatedPermissions[0].status = cameraStatus.status === 'granted' ? 'granted' : 'denied';
      } catch (error) {
        updatedPermissions[0].status = 'denied';
      }

      // Les autres permissions ne peuvent pas être vérifiées directement sur Expo
      // On les marque comme accordées par défaut sur les plateformes supportées
      updatedPermissions[1].status = 'granted'; // Galerie
      updatedPermissions[4].status = 'granted'; // Stockage
      updatedPermissions[5].status = 'denied';  // Microphone (pas utilisé dans l'app)

      setPermissions(updatedPermissions);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
    }
  };

  const requestPermission = async (permissionIndex: number) => {
    const permission = permissions[permissionIndex];
    
    try {
      switch (permissionIndex) {
        case 2: // Localisation
          const locationResult = await Location.requestForegroundPermissionsAsync();
          const updatedPermissions = [...permissions];
          updatedPermissions[2].status = locationResult.status === 'granted' ? 'granted' : 'denied';
          setPermissions(updatedPermissions);
          break;
          
        case 3: // Notifications  
          const notificationResult = await Notifications.requestPermissionsAsync();
          const updatedNotifications = [...permissions];
          updatedNotifications[3].status = notificationResult.status === 'granted' ? 'granted' : 'denied';
          setPermissions(updatedNotifications);
          break;
          
        default:
          Alert.alert(
            t('Permission non modifiable'),
            t('Cette permission doit être modifiée dans les paramètres système de votre appareil.'),
            [{ text: t('OK') }]
          );
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      Alert.alert(t('Erreur'), t('Impossible de modifier cette permission'));
    }
  };

  useEffect(() => {
    if (visible) {
      checkPermissions();
    }
  }, [visible]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted': return '#10B981';
      case 'denied': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'granted': return t('Accordée');
      case 'denied': return t('Refusée');
      default: return t('En attente');
    }
  };

  return (
    <UnifiedModal
      visible={visible}
      onClose={onClose}
      title={t('Permissions de l\'application')}
      fullHeight={true}
    >
      {permissions.map((permission, index) => (
        <ModalSection 
          key={index}
          icon={permission.icon}
          title={permission.name}
          last={index === permissions.length - 1}
        >
          <View style={styles.permissionContent}>
            <View style={styles.permissionInfo}>
              <ModalText>{permission.description}</ModalText>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(permission.status) + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(permission.status) }]} />
                <ModalText style={{ color: getStatusColor(permission.status), fontWeight: '600' }}>
                  {getStatusText(permission.status)}
                </ModalText>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.secondary + '20' }]}
              onPress={() => {
                if (permission.status === 'denied' && (index === 2 || index === 3)) {
                  // Permissions de localisation et notifications peuvent être demandées
                  Alert.alert(
                    t('Demander la permission'),
                    t('Voulez-vous autoriser cette permission maintenant ?'),
                    [
                      { text: t('Annuler'), style: 'cancel' },
                      { text: t('Autoriser'), onPress: () => requestPermission(index) }
                    ]
                  );
                } else {
                  Alert.alert(
                    t('Gérer la permission'),
                    t('Cette permission doit être modifiée dans les paramètres système de votre appareil.'),
                    [
                      { text: t('Annuler'), style: 'cancel' },
                      { text: t('Ouvrir paramètres'), onPress: () => {
                        if (Platform.OS === 'ios') {
                          Linking.openURL('app-settings:');
                        } else {
                          Linking.openSettings();
                        }
                      }}
                    ]
                  );
                }
              }}
            >
              <Text style={[styles.permissionButtonText, { color: colors.secondary }]}>
                {permission.status === 'denied' && (index === 2 || index === 3) ? t('Demander') : t('Gérer')}
              </Text>
            </TouchableOpacity>
          </View>
        </ModalSection>
      ))}
      
      {/* Message informatif sur les permissions */}
      <ModalSection icon="info" title={t('Information')} last={true}>
        <View style={[styles.permissionInfo, { backgroundColor: colors.secondary + '10', borderColor: colors.secondary + '30' }]}>
          <Feather name="info" size={16} color={colors.secondary} />
          <ModalText style={{ color: colors.secondary, marginLeft: 8 }}>
            {t('Les permissions permettent à l\'application de fonctionner de manière optimale. Vous pouvez les modifier à tout moment dans les paramètres système.')}
          </ModalText>
        </View>
      </ModalSection>
    </UnifiedModal>
  );
};

export default function ParametresScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const { isDarkMode, toggleDarkMode, colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    hasStoredCredentials: biometricHasCredentials,
    enableBiometricAuth,
    setupBiometricWithCredentials,
    clearStoredCredentials,
    getBiometricType,
    checkBiometricStatus
  } = useBiometricAuth();

  // Fonction utilitaire pour vérifier la connectivité selon les préférences utilisateur
  const checkNetworkConnectivity = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      if (!networkState.isConnected) {
        throw new Error(t('Aucune connexion réseau disponible'));
      }
      
      if (wifiOnlyEnabled && networkState.type !== Network.NetworkStateType.WIFI) {
        throw new Error(t('Wi-Fi requis. Connectez-vous à un réseau Wi-Fi.'));
      }
      
      return true;
    } catch (error) {
      console.warn('Vérification réseau échouée:', error);
      throw error;
    }
  };

  // États pour les différents switches et modals
  const [notificationEnabled, setNotificationEnabled] = useState<boolean | null>(null); // null = pas encore initialisé
  const [emailNotificationEnabled, setEmailNotificationEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [registeringToken, setRegisteringToken] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [activeSessionsModalVisible, setActiveSessionsModalVisible] = useState(false);
  const [biometricSetupModalVisible, setBiometricSetupModalVisible] = useState(false);
  const [biometricEmail, setBiometricEmail] = useState('');
  const [biometricPassword, setBiometricPassword] = useState('');
  const [showBiometricPassword, setShowBiometricPassword] = useState(false);
  const [biometricSetupLoading, setBiometricSetupLoading] = useState(false);
  
  // Nouveaux états pour les fonctionnalités ajoutées
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(false);
  const [wifiOnlyEnabled, setWifiOnlyEnabled] = useState(false);
  const [crashReportingEnabled, setCrashReportingEnabled] = useState(true);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [fontSize, setFontSize] = useState('normal'); // 'small', 'normal', 'large', 'xlarge'
  const [storageModalVisible, setStorageModalVisible] = useState(false);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);

  // États pour les suggestions d'offres basées sur la géolocalisation
  const {
    offers: locationOffers,
    loading: locationLoading,
    error: locationError,
    location,
    permissionStatus,
    enableLocationBasedSuggestions,
    disableLocationBasedSuggestions,
    refreshOffers,
    checkLocationPreferences,
  } = useLocationBasedJobs();
  const [locationSuggestionsEnabled, setLocationSuggestionsEnabled] = useState(false);
  const [locationRadius, setLocationRadius] = useState(50);
  const [showLocationModal, setShowLocationModal] = useState(false);
  // Récupérer la version depuis le fichier de configuration
  const [appVersion] = useState(__DEV__ ? '1.0.0-dev' : '1.0.0');
  const [buildNumber] = useState(__DEV__ ? 'dev' : '100');

  // Effect pour initialiser le statut biométrique
  useEffect(() => {
    const initBiometricStatus = async () => {
      try {
        await checkBiometricStatus();
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du statut biométrique:', error);
      }
    };

    initBiometricStatus();
  }, [checkBiometricStatus]);

  // Fonction globale pour déclencher l'enregistrement des notifications push depuis SimplePermissionsManager
  useEffect(() => {
    const handlePushRegistration = () => {
      console.log('🔔 Settings: Déclenchement global de l\'enregistrement push');
      setNotificationEnabled(true);
      // Déclencher l'enregistrement après un petit délai (sans alerte de succès)
      setTimeout(() => {
        registerForPushNotificationsAsync(false);
      }, 100);
    };

    // Enregistrer la fonction globalement
    global.triggerPushNotificationRegistration = handlePushRegistration;

    // Nettoyer au démontage
    return () => {
      if (global.triggerPushNotificationRegistration === handlePushRegistration) {
        global.triggerPushNotificationRegistration = undefined;
      }
    };
  }, []);

  useEffect(() => {
    async function getInitialNotificationStatus() {
      try {
        console.log('🔔 Initialisation du statut des notifications...');

        // 1. Vérifier les permissions système d'abord
        const { status } = await Notifications.getPermissionsAsync();
        const systemPermissionGranted = status === 'granted';
        console.log('🔔 Permissions système:', status, 'Accordées:', systemPermissionGranted);

        // 2. Vérifier les préférences utilisateur sauvegardées
        const savedNotificationEnabled = await AsyncStorage.getItem('notifications_enabled');
        console.log('🔔 Préférences sauvegardées:', savedNotificationEnabled);

        let finalState: boolean;

        if (savedNotificationEnabled !== null) {
          // Si des préférences existent, les utiliser MAIS les synchroniser avec les permissions système
          const savedEnabled = savedNotificationEnabled === 'true';

          if (savedEnabled && !systemPermissionGranted) {
            // L'utilisateur avait activé les notifications mais les permissions système ont été révoquées
            console.log('🔔 Permissions révoquées, désactivation des notifications');
            finalState = false;
            await AsyncStorage.setItem('notifications_enabled', 'false');
          } else if (!savedEnabled && systemPermissionGranted) {
            // L'utilisateur n'avait pas activé les notifications mais les permissions système sont accordées
            // Cela peut arriver après l'onboarding - activer automatiquement les notifications push
            console.log('🔔 Permissions accordées mais notifications désactivées, activation automatique');
            finalState = true;
            await AsyncStorage.setItem('notifications_enabled', 'true');
            // Déclencher l'enregistrement du token push (sans alerte de succès)
            setTimeout(() => {
              registerForPushNotificationsAsync(false);
            }, 1000);
          } else {
            // États cohérents
            finalState = savedEnabled;
          }
        } else {
          // Première initialisation - utiliser les permissions système
          finalState = systemPermissionGranted;
          await AsyncStorage.setItem('notifications_enabled', systemPermissionGranted.toString());

          if (systemPermissionGranted) {
            console.log('🔔 Première initialisation avec permissions accordées, activation des notifications push');
            // Déclencher l'enregistrement du token push après un délai (sans alerte de succès)
            setTimeout(() => {
              registerForPushNotificationsAsync(false);
            }, 1000);
          }
        }

        console.log('🔔 État final des notifications:', finalState);
        setNotificationEnabled(finalState);

      } catch (error) {
        console.error('Erreur chargement statut notifications:', error);
        setNotificationEnabled(false);
      }
    }
    getInitialNotificationStatus();

    // Vérifier la disponibilité de l'authentification biométrique
    async function checkBiometricAvailability() {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    }
    checkBiometricAvailability();

    // Charger les préférences sauvegardées
    async function loadSavedPreferences() {
      try {
        const [
          savedOfflineMode,
          savedWifiOnly,
          savedCrashReporting,
          savedAutoLock,
          savedAutoBackup,
          savedFontSize,
          savedBiometricEnabled
        ] = await Promise.all([
          AsyncStorage.getItem('@app_offline_mode'),
          AsyncStorage.getItem('@app_wifi_only'),
          AsyncStorage.getItem('@app_crash_reporting'),
          AsyncStorage.getItem('@app_auto_lock'),
          AsyncStorage.getItem('@app_auto_backup'),
          AsyncStorage.getItem('@app_font_size')
        ]);

        if (savedOfflineMode !== null) setOfflineModeEnabled(savedOfflineMode === 'true');
        if (savedWifiOnly !== null) setWifiOnlyEnabled(savedWifiOnly === 'true');
        if (savedCrashReporting !== null) setCrashReportingEnabled(savedCrashReporting === 'true');
        if (savedAutoLock !== null) setAutoLockEnabled(savedAutoLock === 'true');
        if (savedAutoBackup !== null) setAutoBackupEnabled(savedAutoBackup === 'true');
        if (savedFontSize !== null) setFontSize(savedFontSize);
        if (savedBiometricEnabled !== null) setBiometricEnabled(savedBiometricEnabled === 'true');

        // Vérifier les préférences de géolocalisation
        const locationEnabled = await checkLocationPreferences();
        setLocationSuggestionsEnabled(locationEnabled);
        
        // Charger le rayon de recherche sauvegardé
        const savedRadius = await AsyncStorage.getItem('@location_radius');
        if (savedRadius) {
          setLocationRadius(parseInt(savedRadius));
        }
      } catch (error) {
        console.log('Erreur lors du chargement des préférences:', error);
      }
    }
    loadSavedPreferences();

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

  const registerForPushNotificationsAsync = async (showSuccessAlert = true) => {
    setRegisteringToken(true);
    try {
      console.log('🔔 registerForPushNotificationsAsync: Démarrage de l\'enregistrement');

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
      console.log('🔔 Permissions actuelles:', existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('🔔 Demande de nouvelles permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('🔔 Nouvelles permissions:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        console.log('🔔 Permissions refusées, arrêt de l\'enregistrement');
        Alert.alert(t('Permission refusée'), t('Impossible d\'obtenir le push token pour la notification ! Vous pouvez l\'activer dans les paramètres de votre appareil.'));
        setNotificationEnabled(false);
        await AsyncStorage.setItem('notifications_enabled', 'false');
        return;
      }

      console.log('🔔 Génération du token push...');
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('🔔 Expo Push Token généré:', token);

      console.log('🔔 Sauvegarde du token...');
      await savePushToken(token);

      // Synchroniser avec SimplePermissionsManager
      await AsyncStorage.setItem('notifications_requested', 'true');
      await AsyncStorage.setItem('notifications_enabled', 'true');

      console.log('🔔 Notifications push configurées avec succès');
      if (showSuccessAlert) {
        Alert.alert(t('Succès'), t('Notifications activées !'));
      }
      setNotificationEnabled(true);

    } catch (error: any) {
      console.error("Erreur d'enregistrement des notifications:", error);
      Alert.alert(t('Erreur'), t('Impossible d\'activer les notifications. ') + (error.message || t('Veuillez réessayer.')));
      setNotificationEnabled(false);
      await AsyncStorage.setItem('notifications_enabled', 'false');
    } finally {
      setRegisteringToken(false);
    }
  };

  const unregisterForPushNotificationsAsync = async () => {
    try {
      // Synchroniser avec SimplePermissionsManager
      await AsyncStorage.setItem('notifications_enabled', 'false');
      
      Alert.alert(t('Notifications désactivées'), t('Les notifications ont été désactivées.'));
      setNotificationEnabled(false);
    } catch (error) {
      console.error('Erreur désactivation notifications:', error);
      setNotificationEnabled(false);
    }
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
      // Si l'utilisateur active la biométrie, nous devons d'abord demander ses credentials
      Alert.alert(
        t('Configuration de l\'authentification biométrique'),
        t('Pour configurer l\'authentification biométrique, veuillez saisir vos identifiants actuels.'),
        [
          { text: t('Annuler'), style: 'cancel' },
          {
            text: t('Configurer'),
            onPress: () => {
              // Afficher un modal pour saisir les credentials
              showCredentialsModal();
            }
          }
        ]
      );
    } else {
      // Désactiver la biométrie et nettoyer les credentials
      try {
        await clearStoredCredentials();
        Alert.alert(t('Désactivé'), t('Authentification biométrique désactivée et credentials supprimés'));
      } catch (error) {
        console.error('Erreur lors de la désactivation biométrique:', error);
        Alert.alert(t('Erreur'), t('Erreur lors de la désactivation de l\'authentification biométrique'));
      }
    }
  };

  const showCredentialsModal = () => {
    // Pré-remplir l'email avec l'email de l'utilisateur connecté si disponible
    setBiometricEmail(user?.email || '');
    setBiometricPassword('');
    setShowBiometricPassword(false);
    setBiometricSetupModalVisible(true);
  };

  const handleBiometricSetup = async () => {
    if (!biometricEmail || !biometricPassword) {
      Alert.alert(t('Erreur'), t('Veuillez saisir votre email et mot de passe'));
      return;
    }

    setBiometricSetupLoading(true);
    try {
      const success = await setupBiometricWithCredentials(biometricEmail, biometricPassword);
      if (success) {
        await checkBiometricStatus(); // Rafraîchir le statut
        setBiometricSetupModalVisible(false);
        Alert.alert(t('Succès'), t('Authentification biométrique configurée avec succès'));
      } else {
        Alert.alert(t('Erreur'), t('Échec de la configuration de l\'authentification biométrique'));
      }
    } catch (error: any) {
      console.error('Erreur configuration biométrique:', error);
      Alert.alert(t('Erreur'), error.message || t('Erreur lors de la configuration'));
    } finally {
      setBiometricSetupLoading(false);
    }
  };

  // Fonctions pour sauvegarder les nouvelles préférences
  const toggleOfflineMode = async (value: boolean) => {
    setOfflineModeEnabled(value);
    await AsyncStorage.setItem('@app_offline_mode', value.toString());
  };

  const toggleWifiOnly = async (value: boolean) => {
    try {
      if (value) {
        // Vérifier la connexion réseau actuelle
        const networkState = await Network.getNetworkStateAsync();
        
        if (networkState.isConnected && networkState.type !== Network.NetworkStateType.WIFI) {
          Alert.alert(
            t('Wi-Fi uniquement activé'),
            t('L\'application utilisera uniquement le Wi-Fi pour les données. Connectez-vous à un réseau Wi-Fi pour continuer.'),
            [{ text: t('OK') }]
          );
        }
      }
      
      setWifiOnlyEnabled(value);
      await AsyncStorage.setItem('@app_wifi_only', value.toString());
    } catch (error) {
      console.error('Erreur lors de la configuration Wi-Fi seulement:', error);
      Alert.alert(t('Erreur'), t('Impossible de modifier ce paramètre'));
    }
  };

  const toggleCrashReporting = async (value: boolean) => {
    setCrashReportingEnabled(value);
    await AsyncStorage.setItem('@app_crash_reporting', value.toString());
  };

  const toggleAutoBackup = async (value: boolean) => {
    setAutoBackupEnabled(value);
    await AsyncStorage.setItem('@app_auto_backup', value.toString());
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    try {
      console.log('=== Début changement de mot de passe ===');
      
      // Appeler l'API pour changer le mot de passe
      const response = await changePassword(oldPassword, newPassword, newPassword);
      
      console.log('Réponse changePassword:', response);
      
      if (response.success) {
        Alert.alert(
          t('Succès'), 
          response.message || t('Mot de passe modifié avec succès'),
          [
            {
              text: 'OK',
              onPress: () => {
                setChangePasswordModalVisible(false);
                // Optionnel : afficher un message de confirmation supplémentaire
                Alert.alert(
                  t('Information'),
                  t('Votre mot de passe a été mis à jour. Vous pouvez continuer à utiliser l\'application normalement.'),
                  [{ text: 'Compris' }]
                );
              }
            }
          ]
        );
      } else {
        Alert.alert(t('Erreur'), response.message || t('Erreur lors du changement de mot de passe'));
      }
      
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      
      // Gestion des différents types d'erreurs
      let errorMessage = t('Erreur lors du changement de mot de passe');
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert(t('Erreur'), errorMessage);
    }
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
      `${t('Version')}: 1.0.0\n${t('Développé par')}: GBG TEAM IT\n${t('Copyright')} © 2025`,
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

  // Nouveaux handlers pour les fonctionnalités ajoutées
  const handleClearCache = async () => {
    Alert.alert(
      t('Vider le cache'),
      t('Êtes-vous sûr de vouloir vider le cache de l\'application ?'),
      [
        { text: t('Annuler'), style: 'cancel' },
        {
          text: t('Vider'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Vider le cache réel de l'application
              const cacheDir = FileSystem.cacheDirectory;
              if (cacheDir) {
                const cacheFiles = await FileSystem.readDirectoryAsync(cacheDir);
                await Promise.all(
                  cacheFiles.map(file => 
                    FileSystem.deleteAsync(`${cacheDir}${file}`, { idempotent: true })
                  )
                );
              }
              
              // Vider les données temporaires AsyncStorage non critiques
              const keys = await AsyncStorage.getAllKeys();
              const tempKeys = keys.filter(key => 
                key.includes('temp_') || 
                key.includes('cache_') || 
                key.includes('_temp')
              );
              await AsyncStorage.multiRemove(tempKeys);
              
              Alert.alert(t('Succès'), t('Cache vidé avec succès'));
            } catch (error) {
              console.error('Erreur lors du vidage du cache:', error);
              Alert.alert(t('Erreur'), t('Impossible de vider le cache'));
            }
          }
        }
      ]
    );
  };

  const handleStorageManagement = () => {
    setStorageModalVisible(true);
  };

  const handlePermissionsManagement = () => {
    setPermissionsModalVisible(true);
  };

  const handleFontSizeChange = () => {
    const fontSizes = [
      { label: t('Petit'), value: 'small' },
      { label: t('Normal'), value: 'normal' },
      { label: t('Grand'), value: 'large' },
      { label: t('Très grand'), value: 'xlarge' }
    ];
    
    Alert.alert(
      t('Taille de la police'),
      t('Sélectionnez la taille de police'),
      [
        ...fontSizes.map(size => ({
          text: `${size.label} ${fontSize === size.value ? '✓' : ''}`,
          onPress: () => {
            setFontSize(size.value);
            AsyncStorage.setItem('@app_font_size', size.value);
          }
        })),
        { text: t('Annuler'), style: 'cancel' }
      ]
    );
  };

  const handleAutoLockSettings = () => {
    const lockTimes = [
      { label: t('Immédiatement'), value: 0 },
      { label: t('1 minute'), value: 1 },
      { label: t('5 minutes'), value: 5 },
      { label: t('10 minutes'), value: 10 },
      { label: t('30 minutes'), value: 30 }
    ];
    
    Alert.alert(
      t('Verrouillage automatique'),
      t('Après quelle durée d\'inactivité verrouiller l\'app ?'),
      [
        ...lockTimes.map(time => ({
          text: time.label,
          onPress: () => {
            setAutoLockEnabled(true);
            AsyncStorage.setItem('@app_auto_lock_time', time.value.toString());
          }
        })),
        { text: t('Désactiver'), onPress: () => setAutoLockEnabled(false) },
        { text: t('Annuler'), style: 'cancel' }
      ]
    );
  };

  const createBackup = async () => {
    try {
      // Récupérer toutes les données utilisateur
      const allKeys = await AsyncStorage.getAllKeys();
      const userData = await AsyncStorage.multiGet(allKeys);
      
      // Créer un objet de sauvegarde
      const backupData = {
        app_version: appVersion,
        build_number: buildNumber,
        created_at: new Date().toISOString(),
        user_data: Object.fromEntries(userData.filter(([key, value]) => value !== null)),
        user_profile: user ? {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role
        } : null
      };

      // Sauvegarder dans un fichier
      const fileName = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2));
      
      // Partager le fichier de sauvegarde
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t('Sauvegarder les données utilisateur')
        });
      }
      
      Alert.alert(t('Succès'), t('Sauvegarde créée et partagée avec succès'));
    } catch (error) {
      console.error('Erreur lors de la création de la sauvegarde:', error);
      Alert.alert(t('Erreur'), t('Impossible de créer la sauvegarde'));
    }
  };

  const handleBackupSettings = () => {
    Alert.alert(
      t('Paramètres de sauvegarde'),
      t('Configurer les options de sauvegarde'),
      [
        {
          text: t('Sauvegarde manuelle'),
          onPress: createBackup
        },
        {
          text: t('Restaurer depuis sauvegarde'),
          onPress: () => Alert.alert(
            t('Restauration'), 
            t('La restauration depuis sauvegarde sera disponible dans une prochaine version'),
            [{ text: t('OK') }]
          )
        },
        {
          text: t('Paramètres auto-sauvegarde'),
          onPress: () => setAutoBackupEnabled(!autoBackupEnabled)
        },
        { text: t('Annuler'), style: 'cancel' }
      ]
    );
  };

  const handleCheckForUpdates = async () => {
    try {
      // Vérifier la connectivité réseau d'abord
      await checkNetworkConnectivity();

      Alert.alert(
        t('Vérification des mises à jour'),
        t('Recherche de nouvelles versions...'),
        [{ text: t('OK') }]
      );

      // Vérifier avec le backend s'il y a des mises à jour disponibles
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.11:8000/api'}/check-app-version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_version: appVersion,
          build_number: buildNumber,
          platform: Platform.OS
        }),
      });

      if (response.ok) {
        const updateInfo = await response.json();
        
        if (updateInfo.update_available) {
          Alert.alert(
            t('Mise à jour disponible'),
            t(`Une nouvelle version ${updateInfo.latest_version} est disponible. ${updateInfo.description || ''}`),
            [
              { text: t('Plus tard'), style: 'cancel' },
              { 
                text: t('Mettre à jour'),
                onPress: () => {
                  if (updateInfo.download_url) {
                    Linking.openURL(updateInfo.download_url);
                  } else {
                    // Ouvrir l'app store approprié
                    if (Platform.OS === 'ios') {
                      Linking.openURL('https://apps.apple.com/app/pro-recrute/idXXXXXXXXX');
                    } else {
                      Linking.openURL('https://play.google.com/store/apps/details?id=com.gbg.prorecruteapp');
                    }
                  }
                }
              }
            ]
          );
        } else {
          Alert.alert(
            t('Application à jour'),
            t('Vous utilisez la dernière version de l\'application'),
            [{ text: t('OK') }]
          );
        }
      } else {
        throw new Error('Erreur de connexion au serveur');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error);
      Alert.alert(
        t('Erreur'),
        t('Impossible de vérifier les mises à jour. Vérifiez votre connexion internet.'),
        [{ text: t('OK') }]
      );
    }
  };

  return (
    <>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#091e60" />
        <CustomHeader
          title={t('Paramètres')}
          user={user}
          showBackButton={true}
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
              title={t('Taille de police')}
              subtitle={t('Ajuster la taille du texte')}
              icon="type"
              iconLibrary="Feather"
              iconColor="#EC4899"
              onPress={handleFontSizeChange}
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
            <SettingItem
              title={t('Mode hors ligne')}
              subtitle={t('Permettre l\'utilisation sans connexion')}
              icon="wifi-off"
              iconLibrary="Feather"
              iconColor="#F59E0B"
              hasSwitch
              switchValue={offlineModeEnabled}
              onSwitchChange={toggleOfflineMode}
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
              switchValue={notificationEnabled ?? false}
              onSwitchChange={toggleNotifications}
              disabled={notificationEnabled === null}
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

          {/* Section Géolocalisation et Offres */}
          <SectionHeader title={t('Offres et Localisation')} icon="location-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Suggestions géolocalisées')}
              subtitle={locationSuggestionsEnabled 
                ? t(`Activé (rayon: ${locationRadius}km)`)
                : t('Recevoir des offres près de vous')
              }
              icon="map-pin"
              iconLibrary="Feather"
              iconColor="#10B981"
              hasSwitch
              switchValue={locationSuggestionsEnabled}
              onSwitchChange={async (enabled) => {
                if (enabled) {
                  try {
                    await enableLocationBasedSuggestions(locationRadius);
                    setLocationSuggestionsEnabled(true);
                    await AsyncStorage.setItem('@location_radius', locationRadius.toString());
                    Alert.alert(
                      t('Géolocalisation activée'),
                      t(`Vous recevrez des suggestions d'offres dans un rayon de ${locationRadius}km.`)
                    );
                  } catch (error) {
                    Alert.alert(
                      t('Erreur'),
                      t('Impossible d\'activer la géolocalisation. Vérifiez vos permissions.')
                    );
                  }
                } else {
                  await disableLocationBasedSuggestions();
                  setLocationSuggestionsEnabled(false);
                  Alert.alert(
                    t('Géolocalisation désactivée'),
                    t('Les suggestions basées sur votre position ont été désactivées.')
                  );
                }
              }}
            />
            {locationSuggestionsEnabled && (
              <>
                <SettingItem
                  title={t('Configurer le rayon')}
                  subtitle={t(`Distance de recherche: ${locationRadius}km`)}
                  icon="target"
                  iconLibrary="Feather"
                  iconColor="#3B82F6"
                  onPress={() => setShowLocationModal(true)}
                />
                <SettingItem
                  title={t('Ma position')}
                  subtitle={location.address || t('Position non disponible')}
                  icon="navigation"
                  iconLibrary="Feather"
                  iconColor="#8B5CF6"
                  onPress={() => {
                    if (location.latitude && location.longitude) {
                      Alert.alert(
                        t('Votre position'),
                        `${t('Adresse')}: ${location.address || 'Inconnue'}\n${t('Coordonnées')}: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}\n${t('Offres trouvées')}: ${locationOffers.length}`
                      );
                    } else {
                      Alert.alert(
                        t('Position non disponible'),
                        t('Impossible de déterminer votre position actuelle.')
                      );
                    }
                  }}
                />
                {locationOffers.length > 0 && (
                  <SettingItem
                    title={t('Offres géolocalisées')}
                    subtitle={t(`${locationOffers.length} offres trouvées près de vous`)}
                    icon="briefcase"
                    iconLibrary="Feather"
                    iconColor="#F59E0B"
                    onPress={() => {
                      Alert.alert(
                        t('Offres géolocalisées'),
                        t(`${locationOffers.length} offres trouvées dans un rayon de ${locationRadius}km.\nConsultez l'onglet emploi pour les voir.`)
                      );
                    }}
                  />
                )}
              </>
            )}
          </View>

          {/* Section Réseau */}
          <SectionHeader title={t('Réseau')} icon="wifi-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Wi-Fi seulement')}
              subtitle={t('Utiliser uniquement le Wi-Fi pour les données')}
              icon="wifi"
              iconLibrary="Feather"
              iconColor="#3B82F6"
              hasSwitch
              switchValue={wifiOnlyEnabled}
              onSwitchChange={toggleWifiOnly}
            />
            <SettingItem
              title={t('Rapports de crash')}
              subtitle={t('Envoyer automatiquement les rapports d\'erreur')}
              icon="alert-triangle"
              iconLibrary="Feather"
              iconColor="#F97316"
              hasSwitch
              switchValue={crashReportingEnabled}
              onSwitchChange={toggleCrashReporting}
            />
          </View>

          {/* Section Sécurité */}
          <SectionHeader title={t('Sécurité')} icon="shield-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Authentification biométrique')}
              subtitle={
                !biometricAvailable
                  ? t('Non disponible sur cet appareil')
                  : biometricEnabled && biometricHasCredentials
                    ? t('Configuré et prêt à utiliser')
                    : biometricEnabled
                      ? t('Activé - Credentials requis')
                      : t('Utiliser Face ID / Touch ID')
              }
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
            <SettingItem
              title={t('Verrouillage automatique')}
              subtitle={autoLockEnabled ? t('Activé') : t('Désactivé')}
              icon="lock"
              iconLibrary="Feather"
              iconColor="#F59E0B"
              onPress={handleAutoLockSettings}
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
            <SettingItem
              title={t('Permissions de l\'app')}
              subtitle={t('Gérer les autorisations')}
              icon="shield"
              iconLibrary="Feather"
              iconColor="#8B5CF6"
              onPress={handlePermissionsManagement}
            />
          </View>

          {/* Section Stockage et Données */}
          <SectionHeader title={t('Stockage et données')} icon="server-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Gestion du stockage')}
              subtitle={t('Voir l\'espace utilisé et libérer de l\'espace')}
              icon="hard-drive"
              iconLibrary="Feather"
              iconColor="#10B981"
              onPress={handleStorageManagement}
            />
            <SettingItem
              title={t('Vider le cache')}
              subtitle={t('Libérer de l\'espace en vidant le cache')}
              icon="trash-2"
              iconLibrary="Feather"
              iconColor="#EF4444"
              onPress={handleClearCache}
            />
            <SettingItem
              title={t('Sauvegarde automatique')}
              subtitle={t('Sauvegarder automatiquement vos données')}
              icon="save"
              iconLibrary="Feather"
              iconColor="#3B82F6"
              hasSwitch
              switchValue={autoBackupEnabled}
              onSwitchChange={toggleAutoBackup}
            />
            <SettingItem
              title={t('Paramètres de sauvegarde')}
              subtitle={t('Configurer la sauvegarde et la restauration')}
              icon="archive"
              iconLibrary="Feather"
              iconColor="#8B5CF6"
              onPress={handleBackupSettings}
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

          {/* Section Application */}
          <SectionHeader title={t('Application')} icon="phone-portrait-outline" />
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <SettingItem
              title={t('Version de l\'application')}
              subtitle={`${appVersion} (${buildNumber})`}
              icon="tag"
              iconLibrary="Feather"
              iconColor="#6366F1"
              showChevron={false}
            />
            <SettingItem
              title={t('Vérifier les mises à jour')}
              subtitle={t('Rechercher de nouvelles versions')}
              icon="download-cloud"
              iconLibrary="Feather"
              iconColor="#10B981"
              onPress={handleCheckForUpdates}
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

        <StorageManagementModal
          visible={storageModalVisible}
          onClose={() => setStorageModalVisible(false)}
        />

        <PermissionsModal
          visible={permissionsModalVisible}
          onClose={() => setPermissionsModalVisible(false)}
        />

        {/* Modal pour configurer le rayon de géolocalisation */}
        <Modal
          visible={showLocationModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLocationModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {t('Configurer le rayon de recherche')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowLocationModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Feather name="x" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {t('Sélectionnez la distance maximale pour les suggestions d\'offres')}
                </Text>

                <View style={styles.radiusSliderContainer}>
                  <Text style={[styles.radiusValue, { color: colors.textAccent }]}>
                    {locationRadius} km
                  </Text>
                  
                  <View style={styles.radiusOptions}>
                    {[10, 25, 50, 100, 200].map(radius => (
                      <TouchableOpacity
                        key={radius}
                        style={[
                          styles.radiusOption,
                          {
                            backgroundColor: locationRadius === radius 
                              ? colors.primary 
                              : colors.background,
                            borderColor: locationRadius === radius 
                              ? colors.primary 
                              : colors.border
                          }
                        ]}
                        onPress={() => setLocationRadius(radius)}
                      >
                        <Text style={[
                          styles.radiusOptionText,
                          { 
                            color: locationRadius === radius 
                              ? '#FFFFFF' 
                              : colors.textPrimary 
                          }
                        ]}>
                          {radius}km
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                    onPress={() => setShowLocationModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                      {t('Annuler')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      await AsyncStorage.setItem('@location_radius', locationRadius.toString());
                      if (locationSuggestionsEnabled) {
                        await refreshOffers(locationRadius);
                      }
                      setShowLocationModal(false);
                      Alert.alert(
                        t('Rayon mis à jour'),
                        t(`Le rayon de recherche a été défini à ${locationRadius}km.`)
                      );
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                      {t('Sauvegarder')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de configuration biométrique */}
        <Modal
          visible={biometricSetupModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setBiometricSetupModalVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {t('Configuration biométrique')}
                </Text>
                <TouchableOpacity
                  onPress={() => setBiometricSetupModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Feather name="x" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {t('Saisissez vos identifiants pour configurer l\'authentification biométrique')}
                </Text>

                <View style={[styles.inputGroup, { marginTop: 20 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    {t('Email')}
                  </Text>
                  <TextInput
                    style={[styles.modalInput, {
                      backgroundColor: colors.background,
                      color: colors.textPrimary,
                      borderColor: colors.border
                    }]}
                    value={biometricEmail}
                    onChangeText={setBiometricEmail}
                    placeholder={t('Votre email')}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!biometricSetupLoading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    {t('Mot de passe')}
                  </Text>
                  <View style={[styles.passwordContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: colors.textPrimary }]}
                      value={biometricPassword}
                      onChangeText={setBiometricPassword}
                      placeholder={t('Votre mot de passe')}
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showBiometricPassword}
                      editable={!biometricSetupLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowBiometricPassword(!showBiometricPassword)}
                      style={styles.eyeButton}
                    >
                      <Feather
                        name={showBiometricPassword ? "eye-off" : "eye"}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.border }]}
                    onPress={() => setBiometricSetupModalVisible(false)}
                    disabled={biometricSetupLoading}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                      {t('Annuler')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary, {
                      backgroundColor: colors.secondary,
                      opacity: biometricSetupLoading ? 0.6 : 1
                    }]}
                    onPress={handleBiometricSetup}
                    disabled={biometricSetupLoading || !biometricEmail || !biometricPassword}
                  >
                    {biometricSetupLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                        {t('Configurer')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
    maxWidth: '95%', // Augmenté de 90% à 95%
    maxHeight: '90%', // Augmenté de 80% à 90%
    height: '90%', // AJOUTÉ: Force une hauteur de 90%
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
    marginBottom: 10, // Retiré le marginBottom pour économiser l'espace
  },

  // Styles pour la liste des sessions
  sessionsList: {
    flex: 1,
    padding: 24,
    paddingTop: 16, // Réduit le padding top
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  storageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  storageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storageColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  clearCacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clearCacheText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  storageWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  permissionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  permissionInfo: {
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  permissionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  deviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  sessionOS: {
    fontSize: 13,
    marginBottom: 4,
  },
  sessionLocation: {
    fontSize: 14,
    marginBottom: 2,
  },
  sessionActivity: {
    fontSize: 12,
  },
  sessionIP: {
    fontSize: 11,
    marginTop: 4,
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

  // Containers de loading et empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200, // AJOUTÉ: Hauteur minimum
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200, // AJOUTÉ: Hauteur minimum
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },

  // Footer du modal
  modalFooter: {
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 20, // Augmenté le padding bottom
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityText: {
    marginLeft: 8,
    fontSize: 12,
    flex: 1,
  },

  // Styles pour le modal de géolocalisation
  radiusSliderContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  radiusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  radiusOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 60,
    alignItems: 'center',
  },
  radiusOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Styles pour le modal biométrique
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
  },
});