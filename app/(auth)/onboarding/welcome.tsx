import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import Svg, { SvgProps, Path, Ellipse, Rect } from "react-native-svg"

const { width } = Dimensions.get('window');
// SVG pour l'illustration de bienvenue

const WelcomeSVG = ({ color }: { color: string }) => (
    <View style={styles.imgContainer}>
        <Image
            source={require('../../../assets/images/Job.png')} // Assurez-vous que le chemin est correct
            style={styles.icone}
            resizeMode="contain"
        />
    </View>
);

export default function WelcomeOnboardingScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { t } = useLanguage();

    const handleNext = () => {
        router.push('/(auth)/onboarding/candidate_space');
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.container}>
                <WelcomeSVG color={colors.primary} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('Bienvenue sur GBG\nPro Recrute !')}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('Votre passerelle vers des opportunités de carrière uniques.')}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {t('Découvrez comment notre application peut vous aider à trouver le poste idéal ou à gérer votre espace intérimaires.')}
                </Text>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.secondary }]}
                    onPress={handleNext}
                >
                    <Text style={styles.buttonText}>{t('Commencer l\'exploration')}</Text>
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
    subtitle: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 25,
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
