// Version alternative sans Alert - Redirection silencieuse
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../../components/ThemeContext';
import { useLanguage } from '../../../components/LanguageContext';
import { useAuth } from '../../../components/AuthProvider';

export default function InterimLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  // ✅ PROTECTION : Vérifier le rôle de l'utilisateur
  useEffect(() => {
    if (user && user.role !== 'interimaire') {
      // Redirection silencieuse selon le rôle
      if (user.role === 'user') {
        router.replace('/(app)/home'); // Candidat -> Accueil candidat
      } else if (user.role === 'admin') {
        router.replace('/(app)/home'); // Admin -> Accueil admin
      } else {
        router.replace('/(app)/home'); // Fallback
      }
    }
  }, [user, router]);

  // Si l'utilisateur n'est pas un intérimaire, ne pas afficher le contenu
  if (user && user.role !== 'interimaire') {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }, 
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('Tableau de bord Intérimaire'),
        }}
      />
    </Stack>
  );
}