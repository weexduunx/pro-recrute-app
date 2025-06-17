import React from 'react';
import { Tabs, Stack } from 'expo-router'; // Importer Stack également
import { FontAwesome5 } from '@expo/vector-icons';

/**
 * Layout des onglets authentifiés :
 * Définit la structure de navigation par onglets pour les utilisateurs connectés.
 * Comprend un onglet "Offres d'emploi" et un onglet "Tableau de bord" avec des icônes et des couleurs personnalisées.
 * Inclut également un Stack Navigator pour permettre la navigation vers job_details à l'intérieur de l'onglet Offres d'emploi.
 */
export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Masquer l'en-tête sur les écrans d'onglets
        tabBarActiveTintColor: '#0f8e35', // Vert secondaire pour l'onglet actif
        tabBarInactiveTintColor: '#6B7280', // Gris pour l'onglet inactif
        tabBarStyle: {
          backgroundColor: '#091e60', // Arrière-plan bleu foncé primaire pour la barre d'onglets
          borderTopWidth: 1,
          borderTopColor: '#091e60', // Faire correspondre la couleur de la bordure à l'arrière-plan
          paddingBottom: 4, // Ajuster le rembourrage
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          color: '#FFFFFF', // Texte blanc pour les étiquettes quelle que soit l'état actif pour le contraste
        },
        tabBarIconStyle: {
          marginTop: 4,
        }
      }}
    >
      <Tabs.Screen
        name="job_board" // Correspond à app/(app)/job_board.tsx
        options={{
          title: 'Offres d\'emploi', // Titre de l'onglet
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="briefcase" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
          // IMPORTANT : Si vous souhaitez naviguer de job_board à job_details
          // sans que les onglets ne disparaissent, vous avez besoin d'une pile imbriquée.
          // Cela permet à job_details de s'ouvrir *par-dessus* les onglets.
          headerShown: false, // Assurez-vous que l'en-tête spécifique de cet onglet est masqué si vous utilisez l'en-tête de pile natif
        }}
      />
      {/* Définir job_details comme un écran séparé au sein de ce groupe (app), en dehors des onglets si c'est un "modal" */}
      {/* Alternativement, si job_details doit apparaître dans la pile de navigation de l'onglet job_board,
          vous le structureriez dans sa propre pile comme suit :
          <Tabs.Screen
            name="job_board"
            options={{ ... }}
          >
            <Stack>
              <Stack.Screen name="index" /> // C'est job_board.tsx
              <Stack.Screen name="job_details" /> // C'est app/(app)/job_details.tsx
            </Stack>
          </Tabs.Screen>
          MAIS pour la simplicité et l'utilisation typique, nous garderons job_details au même niveau que les onglets,
          ce qui signifie qu'il couvrira les onglets lorsqu'on y naviguera.
      */}
      <Tabs.Screen
        name="dashboard" // Correspond à app/(app)/dashboard.tsx
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="user" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
          headerShown: false,
        }}
      />
      {/* Important : pour que `job_details` s'ouvre *par-dessus* les onglets, il doit s'agir d'un Stack.Screen dans le parent _layout,
          ou s'il est considéré comme faisant partie du groupe "(app)" mais pas d'un onglet, il est défini ici.
          Expo Router déduit automatiquement les piles imbriquées.
          Puisque job_details n'est pas un onglet, nous ne le mettons pas dans <Tabs>. Nous nous assurons qu'il est
          accessible au sein du groupe (app) par son nom de fichier.
          Le `useLocalSearchParams` dans `job_details.tsx` signifie que sa route est `/(app)/job_details`.
      */}
    </Tabs>
  );
}
