import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../components/AuthProvider';
import { createShadow } from '../../../utils/shadow-utils';


const { width } = Dimensions.get('window');
// SVG pour l'illustration de l'espace Intérimaire
const InterimSVG = ({ color }: { color: string }) => (
  <View style={styles.imgContainer}>
       <Image
            source={require('../../../assets/images/interim.png')} // Assurez-vous que le chemin est correct
            style={styles.icone}
            resizeMode="contain"
        />
  </View>
);

export default function InterimSpaceOnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { completeOnboarding } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    if (isLoading) return; // Prevent double-tap
    
    setIsLoading(true);
    
    try {
      console.log('Completing onboarding from interim_space...');
      
      if (completeOnboarding && typeof completeOnboarding === 'function') {
        await completeOnboarding();
        console.log('Onboarding completed successfully');
      } else {
        console.warn('completeOnboarding function not available');
      }
      
      // Web-safe navigation
      if (Platform.OS === 'web') {
        // Use replace to avoid back button issues on web
        setTimeout(() => {
          router.replace('/(auth)');
        }, 100);
      } else {
        router.replace('/(auth)');
      }
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      
      // Show user-friendly error on web
      if (Platform.OS === 'web') {
        alert('Une erreur s\'est produite. Redirection vers la connexion...');
      } else {
        Alert.alert('Erreur', 'Une erreur s\'est produite. Redirection vers la connexion...');
      }
      
      // Still redirect even on error
      setTimeout(() => {
        router.replace('/(auth)');
      }, 1000);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>{t('Retour')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <InterimSVG color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('Espace Intérimaire : Gérez votre profil intérimaire')}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('Suivez l\'historique de vos contrats, attestations et demandes IPM en toute simplicité.')}
        </Text>
        <TouchableOpacity
          style={[
            styles.button, 
            { backgroundColor: colors.secondary },
            isLoading && styles.buttonDisabled
          ]}
          onPress={handleGetStarted}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? t('Chargement...') : t('Accéder à l\'application')}
          </Text>
          {!isLoading && (
            <Ionicons name="log-in" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backButtonContainer: {
    alignSelf: 'flex-start',
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
    imgContainer: {
        alignItems: 'center',
    },
    icone: {
        width: 400,
        height: 350,
    },
    svgCaption: {
        fontSize: 18,
        fontWeight: 'bold',
        // marginTop: 5,
    },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    ...createShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  buttonIcon: {
    marginLeft: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
