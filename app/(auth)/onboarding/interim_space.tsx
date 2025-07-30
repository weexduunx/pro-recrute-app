import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg'; // NOUVEAU: Importer Svg, Path, Circle

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

  const handleGetStarted = () => {
    router.replace('/(auth)'); // Redirige vers l'écran de connexion/inscription
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <InterimSVG color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('Espace Intérimaire : Gérez votre profil intérimaire')}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('Suivez l\'historique de vos contrats, attestations et demandes IPM en toute simplicité.')}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={handleGetStarted}
        >
          <Text style={styles.buttonText}>{t('Accéder à l\'application')}</Text>
          <Ionicons name="log-in" size={20} color="#FFFFFF" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
});
