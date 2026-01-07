import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, Card, IconButton } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import api from '../utils/api';

const { width, height } = Dimensions.get('window');

interface PasswordSetupModalProps {
  visible: boolean;
  onDismiss: () => void;
  userProvider: 'google' | 'linkedin' | null;
  userToken: string;
  onPasswordSet?: () => void;
}

export const PasswordSetupModal: React.FC<PasswordSetupModalProps> = ({
  visible,
  onDismiss,
  userProvider,
  userToken,
  onPasswordSet,
}) => {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canSkip, setCanSkip] = useState(true);

  const getProviderName = () => {
    return userProvider === 'google' ? 'Google' : 'LinkedIn';
  };

  const getProviderIcon = () => {
    return userProvider === 'google' ? 'google' : 'linkedin';
  };

  const validatePassword = () => {
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }
    return true;
  };

  const handleSetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);

    try {
      console.log('=== Password Setup API Call ===');
      console.log('Token:', userToken ? 'Present' : 'Missing');
      console.log('Provider:', userProvider);

      const response = await api.post('/auth/set-social-password', {
        password: password,
        password_confirmation: confirmPassword,
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      console.log('Password setup response:', response.data);

      if (response.data.success) {
        Alert.alert(
          'Succès! ',
          'Votre mot de passe a été défini avec succès. Vous pouvez maintenant vous connecter avec votre email et ce mot de passe.',
          [
            {
              text: 'Parfait!',
              onPress: () => {
                onPasswordSet && onPasswordSet();
                onDismiss();
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', response.data.message || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('=== Password Setup Error ===');
      console.error('Error type:', (error as Error).constructor.name);
      console.error('Error message:', (error as Error).message);
      console.error('Response status:', (error as any).response?.status);
      console.error('Response data:', (error as any).response?.data);

      let errorMessage = 'Impossible de définir le mot de passe.';

      if ((error as any).response?.status === 422) {
        errorMessage = (error as any).response.data.message || 'Données invalides.';
      } else if ((error as any).response?.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if ((error as any).response?.status === 404) {
        errorMessage = 'Service non disponible. Contactez le support.';
      } else if ((error as any).message.includes('Network')) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      }

      Alert.alert('Erreur lors de la définition du mot de passe', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Passer cette étape?',
      'Vous pourrez toujours définir un mot de passe plus tard dans les paramètres de votre compte.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Passer', onPress: onDismiss },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={getProviderIcon()}
                  size={40}
                  color={userProvider === 'google' ? '#DB4437' : '#0077B5'}
                />
                <MaterialIcons name="arrow-forward" size={24} color={colors.primary} />
                <MaterialIcons name="lock" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Sécurisez votre compte
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Connecté via {getProviderName()}
              </Text>
            </View>

            {/* Benefits Card */}
            <Card style={[styles.benefitsCard, { backgroundColor: colors.cardBackground }]}>
              <Card.Content>
                <Text style={[styles.benefitsTitle, { color: colors.textPrimary }]}>
                  Pourquoi définir un mot de passe?
                </Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefit}>
                    <MaterialIcons name="check-circle" size={20} color={colors.success} />
                    <Text style={[styles.benefitText, { color: colors.textPrimary }]}>
                      Accès sécurisé même si {getProviderName()} est indisponible
                    </Text>
                  </View>
                  <View style={styles.benefit}>
                    <MaterialIcons name="check-circle" size={20} color={colors.success} />
                    <Text style={[styles.benefitText, { color: colors.textPrimary }]}>
                      Contrôle total de vos informations de connexion
                    </Text>
                  </View>
                  <View style={styles.benefit}>
                    <MaterialIcons name="check-circle" size={20} color={colors.success} />
                    <Text style={[styles.benefitText, { color: colors.textPrimary }]}>
                      Sécurité renforcée pour votre compte
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
            

            {/* Password Form */}
            <View style={styles.form}>
              <TextInput
                label="Nouveau mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                mode="outlined"
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                disabled={loading}
              />

              <TextInput
                label="Confirmer le mot de passe"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                mode="outlined"
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                disabled={loading}
              />

              <Text style={[styles.passwordHint, { color: colors.textSecondary }]}>
                Minimum 8 caractères avec lettres et chiffres
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={handleSetPassword}
                disabled={loading || !password || !confirmPassword}
                style={styles.setPasswordButton}
                loading={loading}
              >
                {loading ? 'Définition...' : 'Définir mon mot de passe'}
              </Button>

              {canSkip && (
                <TouchableOpacity onPress={handleSkip} disabled={loading} style={styles.skipButton}>
                  <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                    Passer cette étape
                  </Text>
                </TouchableOpacity>
              )}
            </View>
         
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  container: {
    width: width * 0.9,
    maxWidth: 450,
    maxHeight: height * 0.85,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scrollView: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  benefitsCard: {
    marginBottom: 24,
    elevation: 2,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  benefitsList: {
    gap: 10,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  passwordHint: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
  },
  actions: {
    marginBottom: 20,
  },
  setPasswordButton: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});