import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { FontAwesome5, Feather, MaterialIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<string>('Empreinte digitale');

  const { login, socialLogin, error: authError, clearError } = useAuth();
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    hasStoredCredentials,
    authenticateWithBiometrics,
    storeCredentials,
    getBiometricType,
    checkBiometricStatus,
  } = useBiometricAuth();

  useEffect(() => {
    // Nettoyer l'erreur du contexte AuthProvider lors du montage du composant
    clearError();
    // Utiliser l'erreur du contexte pour l'affichage si elle existe
    if (authError) {
      setError(authError);
    }
  }, [authError, clearError]);

  // Initialiser l'authentification biométrique
  useEffect(() => {
    const initBiometric = async () => {
      try {
        await checkBiometricStatus();
        const type = await getBiometricType();
        setBiometricType(type);
      } catch (error) {
        console.error('Erreur initialisation biométrique:', error);
      }
    };

    initBiometric();
  }, [checkBiometricStatus, getBiometricType]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Veuillez saisir votre email et mot de passe.');
      setLoading(false);
      return;
    }

    try {
      const deviceName = Device.deviceName || 'UnknownDevice';
      // La fonction login dans AuthProvider gère maintenant la redirection OTP
      await login(email, password, deviceName); 
      
      // Si la connexion réussit, stocker les credentials pour l'authentification biométrique
      await storeCredentials(email, password);
    } catch (err: any) {
      // Ici, on peut juste s'assurer que le loading est false
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError(null);

    try {
      const credentials = await authenticateWithBiometrics();
      
      if (credentials) {
        const deviceName = Device.deviceName || 'UnknownDevice';
        await login(credentials.email, credentials.password, deviceName);
      } else {
        setError('Authentification biométrique échouée.');
      }
    } catch (err: any) {
      setError('Erreur lors de l\'authentification biométrique.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      await socialLogin(provider);
    } catch (err: any) {
      setError(authError || err.message || `Échec de la connexion via ${provider}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <View style={styles.headerSection}>
          <Image
            source={require('../../assets/images/logo.png')} // Assurez-vous que le chemin est correct
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Bienvenue !</Text>
          <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>
        </View>

        {/* Section Formulaire */}
        <View style={styles.formSection}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          {/* <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoComplete="password"
              editable={!loading}
              autoCapitalize="none"
            />
             <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 5 }}
              >
                <Feather 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={18} 
                  color={styles.textSecondary.color}
                />
              </TouchableOpacity>
          </View> */}
<View style={styles.inputContainer}>
  <TextInput
    style={[styles.input, { paddingRight: 50 }]} // AJOUT: paddingRight pour l'icône
    placeholder="Mot de passe"
    placeholderTextColor="#9CA3AF"
    value={password}
    onChangeText={setPassword}
    secureTextEntry={!showPassword}
    textContentType="password"
    autoComplete="password"
    editable={!loading}
    autoCapitalize="none"
  />
  <TouchableOpacity 
    onPress={() => setShowPassword(!showPassword)}
    style={styles.eyeIcon} // AJOUT: nouveau style
  >
    <Feather 
      name={showPassword ? "eye-off" : "eye"} 
      size={18} 
      color="#9CA3AF"
    />
  </TouchableOpacity>
</View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>


          {/* Bouton d'authentification biométrique */}
          {biometricAvailable && (
            <TouchableOpacity
              style={[styles.biometricButton, biometricLoading && styles.buttonDisabled]}
              onPress={
                biometricEnabled && hasStoredCredentials 
                  ? handleBiometricLogin 
                  : () => Alert.alert(
                      'Authentification biométrique',
                      biometricEnabled 
                        ? 'Connectez-vous d\'abord avec votre email et mot de passe pour activer la connexion biométrique.'
                        : 'Activez d\'abord l\'authentification biométrique dans les paramètres, puis connectez-vous une première fois.',
                      [{ text: 'Compris' }]
                    )
              }
              disabled={loading || biometricLoading}
            >
              {biometricLoading ? (
                <ActivityIndicator color="#3B82F6" size="small" />
              ) : (
                <View style={styles.biometricButtonContent}>
                  <MaterialIcons name="fingerprint" size={24} color="#3B82F6" />
                  <Text style={styles.biometricButtonText}>
                    {biometricEnabled && hasStoredCredentials 
                      ? `Connexion avec ${biometricType}`
                      : biometricEnabled 
                        ? `Configurer ${biometricType}`
                        : `Activer ${biometricType}`
                    }
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Alert.alert("Mot de passe oublié", "Fonctionnalité à implémenter.")}
            disabled={loading}
          >
            <Text style={styles.linkText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Boutons de connexion sociale */}
          <View style={styles.socialButtonsContainer}>
            <Text style={styles.socialText}>Ou se connecter avec</Text>
            <View style={styles.socialButtonRow}>
              <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('google')} disabled={loading}>
                <FontAwesome5 name="google" size={24} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('linkedin')} disabled={loading}>
                <FontAwesome5 name="linkedin" size={24} color="#0A66C2" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
            disabled={loading}
          >
            <Text style={styles.registerText}>
              Vous n'avez pas de compte ? <Text style={styles.registerLink}>S'inscrire</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
   textSecondary: {
     color: '#A0A0A0'
   },
  // Section Header
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 12,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "400",
  },

  // Section Formulaire
  formSection: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flex: 1,
  },
    eyeIcon: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -13 }], // Centrage vertical (ajustez si nécessaire)
    padding: 5, // Zone de touch plus grande
    zIndex: 1, // Au-dessus de l'input
  },

  primaryButton: {
    backgroundColor: "#0e8030",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Styles pour l'authentification biométrique
  biometricButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  biometricButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  biometricButtonText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 15,
    color: "#6B7280",
  },
  socialButtonsContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  socialText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  socialButtonRow: {
    flexDirection: 'row',
    gap: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  registerText: {
    fontSize: 15,
    color: '#6B7280',
  },
  registerLink: {
    color: '#1F2937',
    fontWeight: '600',
  },
});
