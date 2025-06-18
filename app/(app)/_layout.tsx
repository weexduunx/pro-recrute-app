import React from 'react';
import { Tabs, Stack } from 'expo-router'; // Importer Stack également
import { FontAwesome5 } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

/**
 * Layout des onglets authentifiés :
 * Définit la structure de navigation par onglets pour les utilisateurs connectés.
 * L'onglet "Offres d'emploi" inclut maintenant sa propre pile de navigation imbriquée.
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
          paddingLeft: 6,
          paddingRight: 6,
          height: 80,
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
        name="job_board" // Ce nom fait maintenant référence au dossier app/(app)/job_board/_layout.tsx
        options={{
          title: 'Offres d\'emploi', // Titre de l'onglet
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome name="briefcase" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
          headerShown: false, // L'en-tête sera géré par le _layout.tsx imbriqué
        }}
      />
      
      <Tabs.Screen
        name="actualites" // Nom de l'onglet "Actualités"
        options={{
          title: 'Actualités', // Titre de l'onglet
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome name="newspaper-o" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} /> // Icône journal
          ),
          headerShown: false,
        }}
      />

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

      <Tabs.Screen
        name="settings" // Correspond à app/(app)/dashboard.tsx
        options={{
          title: 'Paramétres',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="cog" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
          headerShown: false,
        }}
      />
      
    </Tabs>
  );
}
