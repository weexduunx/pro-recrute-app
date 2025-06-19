import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../components/AuthProvider";
import { FontAwesome5 } from "@expo/vector-icons"; // Pour l'icône Google

/**
 * Écran de Connexion :
 * Fournit une interface utilisateur pour la connexion des utilisateurs.
 * Utilise la fonction `login` du contexte d'authentification.
 * Inclut maintenant votre logo d'application en haut.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   const { login, socialLogin, loading, error, clearError } = useAuth(); // Récupérer socialLogin


  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password]);

  const handleLoginPress = async () => {
    if (!email || !password) {
      clearError();
       // Vous pouvez ajouter un feedback visuel ici
      return;
    }
    await login(email, password);
  };
  const handleGoogleLogin = async () => {
    await socialLogin('google'); // Appeler la connexion sociale pour Google
  };

  const handleLinkedInLogin = async () => {
    await socialLogin('linkedin'); // Pour LinkedIn plus tard
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.loginTitle}>GBG ProRecrute</Text>
        <Text style={styles.subtitle}>Accéder à votre espace</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Email"
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
          textContentType="password"
          autoComplete="password"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLoginPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push("/(auth)/register")}
        >
          <Text style={styles.registerButtonText}>
            Vous n'avez pas de compte ? Candidater
          </Text>
        </TouchableOpacity>

                {/* Boutons de connexion sociale */}
        <View style={styles.socialLoginContainer}>
          <Text style={styles.socialLoginDivider}>OU</Text>
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton, loading && styles.loginButtonDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <FontAwesome5 name="google" size={20} color="#FFFFFF" style={styles.socialIcon} />
            <Text style={styles.socialButtonText}>Continuer avec Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.socialButton, styles.linkedinButton, loading && styles.loginButtonDisabled]}
            onPress={handleLinkedInLogin}
            disabled={loading}
          >
            <FontAwesome5 name="linkedin" size={20} color="#FFFFFF" style={styles.socialIcon} />
            <Text style={styles.socialButtonText}>Continuer avec LinkedIn</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    // RETIRÉ : paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F3F4F6",
  },
  logo: {
    width: "60%",
    height: 70,
    marginBottom: 30,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#091e60",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#4B5563",
    marginBottom: 32,
    textAlign: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  input: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loginButton: {
    backgroundColor: "#0f8e35", // Vert secondaire
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: "#93C5FD",
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  registerButton: {
    marginTop: 20,
  },
  registerButtonText: {
    color: "#091e60", // Bleu foncé primaire pour le lien d'inscription
    fontSize: 16,
    textDecorationLine: "underline",
  },
    socialLoginContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  socialLoginDivider: {
    position: 'absolute',
    top: -15,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButton: {
    backgroundColor: '#DB4437', // Couleur de Google
  },
  linkedinButton: {
    backgroundColor: '#0A66C2', // Couleur de LinkedIn
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  socialIcon: {
    marginRight: 10,
  },
});
