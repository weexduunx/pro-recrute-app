import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // <-- CHANGEMENT ICI
import { router } from 'expo-router';
import { registerUser } from '../../utils/api';
import { useAuth } from '../../components/AuthProvider';

/**
 * Écran d'inscription :
 * Fournit une interface utilisateur pour l'inscription de l'utilisateur.
 * Envoie les données d'inscription à l'API Laravel et gère l'état.
 * Inclut maintenant votre logo.
 */
export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { login } = useAuth();

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!name || !email || !password || !passwordConfirmation) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const response = await registerUser(name, email, password, passwordConfirmation);
      setSuccess('Inscription réussie ! Connexion en cours...');
      await login(email, password);
    } catch (err: any) {
      console.error("Erreur d'inscription :", err.response ? err.response.data : err.message);
      if (err.response && err.response.data && err.response.data.errors) {
        const firstError = Object.values(err.response.data.errors)[0] as string[];
        setError(firstError[0] || "L'inscription a échoué. Veuillez réessayer.");
      } else {
        setError(err.response?.data?.message || "L'inscription a échoué. Veuillez vérifier vos coordonnées.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Créer votre compte</Text>
        <Text style={styles.subtitle}>Rejoignez GBG aujourd'hui !</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {success && <Text style={styles.successText}>{success}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Nom complet"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Adresse e-mail"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor="#9CA3AF"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.registerButtonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.backButtonText}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    // RETIRÉ : paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  logo: {
    width: '60%',
    height: 70,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  successText: {
    color: '#0f8e35',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  registerButton: {
    backgroundColor: '#0f8e35', // Vert secondaire
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderColor: '#091e60', // Bordure bleu foncé primaire
    borderWidth: 1,
  },
  backButtonText: {
    color: '#091e60', // Bleu foncé primaire
    fontSize: 16,
    fontWeight: '600',
  },
});
