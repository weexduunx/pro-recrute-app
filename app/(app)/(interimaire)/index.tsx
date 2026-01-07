import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import CustomHeader from '../../../components/CustomHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MainSpaceSelection() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fonctions de navigation
  const handleMenuPress = () => { Alert.alert(t("Menu"), t("Menu Sélection Espace pressé !")); };
  const handleAvatarPress = () => { router.push('/(app)/profile-details'); };

  const quickActions = [
    {
      id: 'candidat',
      title: t('Espace Candidat') || 'Espace Candidat',
      subtitle: t('Rechercher et postuler à des offres') || 'Rechercher et postuler à des offres',
      icon: 'person-outline',
      color: colors.primary,
      route: '/(app)/home',
    },
    {
      id: 'interimaire',
      title: t('Espace Intérimaire') || 'Espace Intérimaire',
      subtitle: t('Gérer vos missions intérimaires') || 'Gérer vos missions intérimaires',
      icon: 'briefcase-outline',
      color: colors.secondary,
      route: '/(app)/(interimaire)/e-interimaire',
    },
  ];

  const handleQuickAction = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#091e60" />
      <CustomHeader
        title={t('Sélection Espace') || 'Sélection Espace'}
        user={user}
        onMenuPress={handleMenuPress}
        onAvatarPress={handleAvatarPress}
        showNotificationIcon={true}
        hideMenuButton={true}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section de bienvenue */}
        <Animated.View
          style={[
            styles.welcomeContainer,
            { backgroundColor: colors.cardBackground },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.welcomeContent}>
            <Text style={[styles.welcomeTitle, { color: colors.primary }]}>
              {t('Bienvenue') || 'Bienvenue'}
            </Text>
            <Text style={[styles.userNameText, { color: colors.textPrimary }]}>
              {user?.name || 'Utilisateur'}
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
               {t('Sélectionnez un espace pour commencer votre session') || 'Sélectionnez un espace pour commencer votre session'}
            </Text>
          </View>
          <View style={[styles.welcomeIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="apps-outline" size={24} color={colors.primary} />
          </View>
        </Animated.View>

        {/* Section actions rapides */}
        <Animated.View
          style={[
            styles.actionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            {t('Espaces disponibles') || 'Espaces disponibles'}
          </Text>

          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => handleQuickAction(action.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon as any} size={32} color={action.color} />
                </View>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                  {action.title}
                </Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {action.subtitle}
                </Text>
                <View style={[styles.actionArrow, { backgroundColor: action.color + '10' }]}>
                  <Ionicons name="chevron-forward" size={16} color={action.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t('Sélectionnez un espace pour commencer votre session') || 'Sélectionnez un espace pour commencer votre session'}
          </Text> */}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },

  // Welcome Section Styles
  welcomeContainer: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  welcomeContent: {
    flex: 1,
  },

  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },

  userNameText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },

  welcomeSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    fontStyle: 'italic',
  },

  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actions Section Styles
  actionsSection: {
    paddingVertical: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  actionCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
  },

  actionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },

  actionDescription: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 16,
    marginBottom: 16,
  },

  actionArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer Section Styles
  footerSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  footerText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
