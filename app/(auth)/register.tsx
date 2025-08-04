import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../components/AuthProvider';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import * as Device from 'expo-device';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // États pour montrer/cacher les mots de passe
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const { register, error: authError, clearError } = useAuth();

  useEffect(() => {
    clearError();
    if (authError) {
      setError(authError);
    }
  }, [authError, clearError]);

  // AJOUTÉ : Fonction pour évaluer la force du mot de passe
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthColors = ['#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#16A34A'];
  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];

  // AJOUTÉ : Validation email simple
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validations améliorées
    if (!name || !email || !password || !passwordConfirmation) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError('Veuillez entrer une adresse email valide.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      setLoading(false);
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const deviceName = Device.deviceName || 'UnknownDevice';
      await register(name, email, password, passwordConfirmation, selectedRole, deviceName);
      setSuccess('Inscription réussie ! Un code de vérification a été envoyé.');
    } catch (err: any) {
      console.error("Erreur d'inscription :", err.response ? err.response.data : err.message);
      setError(authError || err.response?.data?.message || "L'inscription a échoué. Veuillez vérifier vos coordonnées.");
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
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez GBG Pro Recrute</Text>
        </View>

        {/* Section Formulaire */}
        <View style={styles.formSection}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {/* Nom complet */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          {/* Email avec validation visuelle */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                email && !isValidEmail(email) && styles.inputError
              ]}
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
            {email.length > 0 && (
              <View style={styles.validationIcon}>
                <Feather
                  name={isValidEmail(email) ? "check-circle" : "x-circle"}
                  size={16}
                  color={isValidEmail(email) ? "#22C55E" : "#EF4444"}
                />
              </View>
            )}
          </View>

          {/* Mot de passe avec indicateur de force */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 50 }]}
              placeholder="Mot de passe"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              autoComplete="new-password"
              editable={!loading}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Indicateur de force du mot de passe */}
            {password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.strengthIndicator}>
                  <Text style={styles.strengthLabel}>
                    Force: <Text style={[styles.strengthValue, { color: strengthColors[passwordStrength] }]}>
                      {strengthLabels[passwordStrength]}
                    </Text>
                  </Text>
                </View>
                <View style={styles.strengthBars}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor: index <= passwordStrength
                            ? strengthColors[passwordStrength]
                            : '#E5E7EB'
                        }
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Confirmation mot de passe avec validation */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                { paddingRight: 50 },
                passwordConfirmation && password !== passwordConfirmation && styles.inputError
              ]}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor="#9CA3AF"
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry={!showPasswordConfirmation}
              textContentType="newPassword"
              autoComplete="new-password"
              editable={!loading}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
              style={styles.eyeIcon}
            >
              <Feather
                name={showPasswordConfirmation ? "eye-off" : "eye"}
                size={18}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Indicateur de correspondance */}
            {passwordConfirmation.length > 0 && (
              <View style={styles.matchIndicator}>
                <Feather
                  name={password === passwordConfirmation ? "check-circle" : "x-circle"}
                  size={14}
                  color={password === passwordConfirmation ? "#22C55E" : "#EF4444"}
                />
                <Text style={[
                  styles.matchText,
                  { color: password === passwordConfirmation ? "#22C55E" : "#EF4444" }
                ]}>
                  {password === passwordConfirmation
                    ? "Les mots de passe correspondent"
                    : "Les mots de passe ne correspondent pas"}
                </Text>
              </View>
            )}
          </View>

          {/* Sélecteur de rôle */}
          <View style={styles.rolePickerContainer}>
            <Text style={styles.pickerLabel}>Je suis :</Text>
            <Picker
              selectedValue={selectedRole}
              onValueChange={(itemValue: string) => setSelectedRole(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Candidat" value="user" />
              <Picker.Item label="Intérimaire" value="interimaire" />
            </Picker>
            {/* <Ionicons name="chevron-down" size={20} color="#6B7280" style={styles.pickerIcon} /> */}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Déjà un compte ? <Text style={styles.linkAccent}>Se connecter</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Section Header
  headerSection: {
    alignItems: "center",
    marginBottom: 48,
    paddingTop: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
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
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  successContainer: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  successText: {
    color: "#059669",
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  primaryButton: {
    backgroundColor: "#0e8030",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 15,
    color: "#6B7280",
  },
  linkAccent: {
    color: "#1F2937",
    fontWeight: "600",
  },
  // NOUVEAU : Styles pour le sélecteur de rôle (Picker)
  rolePickerContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pickerLabel: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 10,
  },
  picker: {
    flex: 1,
    height: 50, // Hauteur du Picker
    color: '#1F2937', // Couleur du texte sélectionné
  },
  pickerItem: {
    fontSize: 16,
  },
  pickerIcon: { // Icône du chevron à droite
    marginLeft: 'auto', // Pousse l'icône à droite
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    zIndex: 1,
  },
  validationIcon: {
    position: 'absolute',
    right: 15,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
  },

  // Styles pour l'indicateur de force du mot de passe
  passwordStrengthContainer: {
    marginTop: 8,
  },
  strengthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  strengthLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  strengthValue: {
    fontWeight: '600',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 2,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },

  // Styles pour l'indicateur de correspondance
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  matchText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },

});
