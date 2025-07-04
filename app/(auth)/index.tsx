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
import { FontAwesome5 } from "@expo/vector-icons";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, socialLogin, loading, error, clearError } = useAuth();

  useEffect(() => {
    if (error) {
      clearError();
    }
    console.log('api: ' + process.env.EXPO_PUBLIC_API_URL);
  }, [email, password]);

  const handleLoginPress = async () => {
    if (!email || !password) {
      clearError();
      return;
    }
    await login(email, password);
  };

  const handleGoogleLogin = async () => {
    await socialLogin('google');
  };

  const handleLinkedInLogin = async () => {
    await socialLogin('linkedin');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Section Logo et Titre */}
        <View style={styles.headerSection}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>GBG | Pro Recrute</Text>
          <Text style={styles.subtitle}>Bienvenue</Text>
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

          <View style={styles.inputContainer}>
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
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLoginPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.linkText}>
              Pas encore de compte ? <Text style={styles.linkAccent}>Créer un compte </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Connexion Sociale */}
        <View style={styles.socialSection}>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <FontAwesome5 name="google" size={18} color="#FFFFFF" />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.linkedinButton, loading && styles.buttonDisabled]}
            onPress={handleLinkedInLogin}
            disabled={loading}
          >
            <FontAwesome5 name="linkedin" size={18} color="#FFFFFF" />
            <Text style={styles.socialButtonText}>LinkedIn</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
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
    color: "#091e60",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "400",
     marginBottom: 10,
  },

  // Section Formulaire
  formSection: {
    flex: 1,
    justifyContent: "center",
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

  // Section Sociale
  socialSection: {
    paddingBottom: 20,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 12,
  },
  googleButton: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  linkedinButton: {
    backgroundColor: "#0A66C2",
  },
  socialButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});