import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../components/AuthProvider'; // Add this import


const { width } = Dimensions.get('window');
// SVG pour l'illustration de l'espace Candidat
const CandidateSVG = ({ color }: { color: string }) => (
    <View style={styles.imgContainer}>

        <Image
            source={require('../../../assets/images/resume.png')} // Assurez-vous que le chemin est correct
            style={styles.icone}
            resizeMode="contain"
        />
    </View>
);

export default function CandidateSpaceOnboardingScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { completeOnboarding } = useAuth(); // Add this line

    const handleNext = () => {
        router.push('/(auth)/onboarding/interim_space');
    };

    const handleSkip = async () => {
        try {
            await completeOnboarding(); // Complete onboarding when skipping
            router.replace('/(auth)'); // Redirige directement vers l'écran de connexion/inscription
        } catch (error) {
            console.error('Error completing onboarding:', error);
            // Even if there's an error, still redirect to auth
            router.replace('/(auth)');
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.skipButtonContainer}>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>{t('Passer')}</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.container}>
                <CandidateSVG color={colors.primary} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('Espace Candidat : Trouvez votre emploi idéal')}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {t('Créez un profil percutant, postulez facilement aux offres qui vous correspondent et suivez l\'avancement de vos candidatures en temps réel.')}
                </Text>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.secondary }]}
                    onPress={handleNext}
                >
                    <Text style={styles.buttonText}>{t('Découvrir l\'espace Intérimaire')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    skipButtonContainer: {
        alignSelf: 'flex-end',
        padding: 20,
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '600',
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
