import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeContext';
import { useLanguage } from '../../components/LanguageContext';
import { View, Text, Image, StyleSheet } from 'react-native'; // Importez les composants nécessaires
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer'; // Importez les composants du drawer

// Composant personnalisé pour le contenu du drawer
// Il reçoit les props par défaut du DrawerContentScrollView
function CustomDrawerContent(props: any) { // Typage simple pour les props
  const { colors } = useTheme(); // Utilisez le thème pour les couleurs
  const { t } = useLanguage(); // Utilisez la langue pour les traductions

  return (
    <View style={[styles.drawerContainer, { backgroundColor: colors.primary }]}> 
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      
     
      <View style={[styles.footerContainer, { borderTopColor: colors.border }]}> 
        <Image
          source={require('../../assets/images/logo-gbg-white.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.gbgAdresse, { color: colors.textSecondary }]}>{t('Ouest Foire Cité Khadar Lot 3 | Dakar, Sénégal')}</Text> 
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>{t(`copyright © ${new Date().getFullYear()} Tous droits réservés | GBG SI`)}</Text>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>{t('Version 1.0.0')}</Text> 
      </View>
    </View>
  );
}


/**
 * Layout du groupe authentifié (app/(app)/) :
 * Définit le Drawer Navigator pour la navigation principale des utilisateurs connectés,
 * en adaptant les éléments du tiroir en fonction du rôle de l'utilisateur.
 */
export default function AppDrawerLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const isCandidate = user?.role === 'user';
  const isInterim = user?.role === 'interimaire';
  const isAdmin = user?.role === 'admin';

  return (
    <Drawer 
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerHideStatusBarOnOpen: true,
        drawerStatusBarAnimation: 'fade',
        drawerActiveTintColor: colors.secondary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerStyle: {
          backgroundColor: colors.primary,
          borderRightWidth: 1,
          borderRightColor: colors.border,
          paddingTop: 20,
          paddingBottom: 20,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
          color: '#FFFFFF', 
        },
        drawerContentStyle: {
          backgroundColor: colors.primary,
        },
        drawerType: 'front',
        drawerPosition: 'left',
      }}
    >
     
      <Drawer.Screen
        name="home" 
        options={{
          drawerLabel: t('Accueil Principal'),
          drawerIcon: ({ color, size }) => (
            <FontAwesome5 name="home" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="profile-details" 
        options={{
          drawerLabel: t('Mon Profil'),
          drawerIcon: ({ color, size }) => (
            <FontAwesome5 name="user-circle" size={size} color={color} />
          ),
        }}
      />

  
      {isCandidate && (
        <>
          <Drawer.Screen
            name="job_board" // Correspond à app/(app)/tabs/job_board/_layout.tsx (ou index.tsx)
            options={{
              drawerLabel: t("Offres d'emploi"),
              drawerIcon: ({ color }) => (
                <FontAwesome name="briefcase" size={22} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="candidature" 
            options={{
              drawerLabel: t("Mes Candidatures"),
              drawerIcon: ({ color }) => (
                <FontAwesome name="file-text" size={22} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="actualites" // Correspond à app/(app)/tabs/actualites.tsx
            options={{
              drawerLabel: t("Actualités"),
              drawerIcon: ({ color }) => (
                <FontAwesome name="newspaper-o" size={22} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="dashboard" // Correspond à app/(app)/tabs/dashboard.tsx
            options={{
              drawerLabel: t("Tableau de bord"),
              drawerIcon: ({ color }) => (
                <FontAwesome name="dashboard" size={22} color={color} />
              ),
            }}
          />
        </>
      )}

      {/* Éléments spécifiques au rôle d'Intérimaire */}
      {isInterim && (
        <>
          <Drawer.Screen
            name="(interimaire)" // Le dossier du groupe pour les intérimaires (app/(app)/(interim)/_layout.tsx)
            options={{
              drawerLabel: t('Espace Intérimaire'),
              drawerIcon: ({ color, size }) => (
                <Ionicons name="business" size={size} color={color} />
              ),
            }}
          />
        </>
      )}

      {/* Éléments communs à tous les rôles ou spécifiques à d'autres rôles (ex: Admin) */}
      <Drawer.Screen
        name="settings" // Correspond à app/(app)/tabs/settings.tsx
        options={{
          drawerLabel: t('Paramètres'),
          drawerIcon: ({ color, size }) => (
            <FontAwesome5 name="cog" size={size} color={color} />
          ),
        }}
      />

    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    // backgroundColor est géré par le style inline
  },
  scrollContent: {
    flexGrow: 1,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    // borderTopColor est géré par le style inline
    // backgroundColor est géré par le style inline
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  versionText: {
    // color est géré par le style inline
    fontSize: 11,
    fontWeight: '400',
  },
  gbgAdresse: {
    // color est géré par le style inline
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 4,
    textAlign: 'center',
  },
});
