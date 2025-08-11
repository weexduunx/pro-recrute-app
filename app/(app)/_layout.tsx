import React from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '../../components/drawer/CustomDrawerContent';
import { drawerIcons } from '../../components/drawer/drawerIcons';
import { useAuth } from '../../components/AuthProvider';
import { useTheme } from '../../components/ThemeContext';
import { useLanguage } from '../../components/LanguageContext';
import { allowedDrawerRoutesByRole } from '../../components/drawer/drawerRoutes';
import { Tabs } from 'expo-router';

export default function AppDrawerLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const role = user?.role || '';
  const allowedRoutes = allowedDrawerRoutesByRole[role] || [];

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: colors.secondary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerStyle: {
          backgroundColor: colors.primary,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
          color: '#FFFFFF',
        },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {allowedRoutes.map((route) => (
        <Drawer.Screen
          key={route}
          name={route}
          options={{
            drawerLabel: t(getDrawerLabel(route)),
            drawerIcon: ({ color, size }) =>
              drawerIcons[route] ? drawerIcons[route](color, size) : null,
          }}
        />
        
      ))}
    </Drawer>



  );
}


// Traductions personnalisées si besoin
function getDrawerLabel(route: string): string {
  const labels: Record<string, string> = {
    home: 'Accueil',
    'profile-details': 'Mon Profil',
    job_board: "Offres d'emploi",
    candidature: 'Mes Candidatures',
    actualites: 'Actualités',
    dashboard: 'Tableau de bord',
    settings: 'Paramètres',
    '(interimaire)': 'Espace Intérimaire',
    entretiens: 'Mes entretiens',
    hr_file: 'Dossier RH',
    ipm_file: 'Dossier IPM',
    welcome: 'Welcome',
  };
  return labels[route] || route;
}
