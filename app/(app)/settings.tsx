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
import { 
  savePushToken, 
  sendTestPushNotification,
  terminateSession,
  storeActiveSession,
  getActiveSessions,
  changePassword
} from '../../utils/api';
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
            timeout: 5000
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
      console.error('Error details:', error.response?.data);
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
      
      if (response.success && response.data) {
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

const TestSessionsButton = () => {
  const testSessions = async () => {
    try {
      console.log('=== TEST GET SESSIONS ===');
      
      // Test 1: Récupérer les sessions
      const response = await getActiveSessions();
      console.log('Réponse getActiveSessions:', response);
      Alert.alert('Succès GET', JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.error('Erreur test sessions:', error);
      Alert.alert('Erreur GET', `${error.message}\n\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
  };

  const testCreateSession = async () => {
    try {
      console.log('=== TEST CREATE SESSION ===');
      
      // Test 2: Créer une session
      const sessionData = {
        device_name: 'Test Device',
        device_type: 'mobile',
        operating_system: 'Test OS',
        browser: 'React Native App',
        location: 'Test Location',
        network_type: 'wifi'
      };

      const deviceHeaders = {
        'X-Device-Name': 'Test Device',
        'X-Device-Type': 'mobile',
        'X-Operating-System': 'Test OS',
        'X-Browser': 'React Native App'
      };

      const response = await storeActiveSession(sessionData, deviceHeaders);
      console.log('Réponse storeActiveSession:', response);
      Alert.alert('Succès CREATE', JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.error('Erreur test create session:', error);
      Alert.alert('Erreur CREATE', `${error.message}\n\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TouchableOpacity 
        style={{ backgroundColor: '#007AFF', padding: 15, margin: 10, borderRadius: 8 }}
        onPress={testSessions}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Test GET Sessions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{ backgroundColor: '#34C759', padding: 15, margin: 10, borderRadius: 8 }}
        onPress={testCreateSession}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Test CREATE Session</Text>
      </TouchableOpacity>
    </View>
  );
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
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.modalOverlay]}>
        <View style={[styles.modalContent, styles.largeModal, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('Sessions actives')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={refreshSessions} style={{ marginRight: 16 }}>
                <Feather name="refresh-cw" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {t('Chargement des sessions...')}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.sessionsList}>
              {sessions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Feather name="smartphone" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {t('Aucune session active trouvée')}
                  </Text>
                </View>
              ) : (
                sessions.map((session) => (
                  <View key={session.id} style={[styles.sessionItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.sessionLeft}>
                      {/* <View style={[styles.deviceIconContainer, { backgroundColor: colors.secondary + '20' }]}>
                        <Feather 
                          name={getDeviceIcon(session.deviceType, session.os)} 
                          size={20} 
                          color={colors.secondary} 
                        />
                      </View> */}
                      <SessionDeviceIcon session={session} colors={colors} />
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
                        
                        <Text style={[styles.sessionOS, { color: colors.textSecondary }]}>
                          {session.os}
                        </Text>
                        
                        <Text style={[styles.sessionLocation, { color: colors.textSecondary }]}>
                          📍 {session.location}
                        </Text>
                        
                        <Text style={[styles.sessionActivity, { color: colors.textSecondary }]}>
                          🕒 {t('Dernière activité')}: {session.lastActivity}
                        </Text>
                        
                        {session.ip && (
                          <Text style={[styles.sessionIP, { color: colors.textSecondary }]}>
                            🌐 IP: {session.ip} • {session.networkType}
                          </Text>
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
                ))
              )}
            </ScrollView>
          )}
          
          {/* Footer avec informations de sécurité */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.securityInfo}>
              <Feather name="shield" size={16} color={colors.textSecondary} />
              <Text style={[styles.securityText, { color: colors.textSecondary }]}>
                {t('Terminez les sessions suspectes pour protéger votre compte')}
              </Text>
            </View>
          </View>
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
});