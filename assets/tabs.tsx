// /app/(app)/tabs.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TabsScreen() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f8e35',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#091e60',
          borderTopWidth: 1,
          borderTopColor: '#091e60',
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          color: '#FFFFFF',
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      {/* NOUVEL ONGLET : Page d'accueil */}
      <Tabs.Screen
        name="home" // Nom du fichier : app/(app)home.tsx
        options={{
          title: 'Accueil', // Titre de l'onglet
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="home" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
        }}
      />
      <Tabs.Screen
        name="job_board"
        options={{
          title: "Offres d'emploi",
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="briefcase" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
        }}
      />
      <Tabs.Screen
        name="actualites"
        options={{
          title: 'Actualités',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="newspaper-o" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ focused }) => (
            <FontAwesome5 name="user" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ focused }) => (
            <FontAwesome5 name="cog" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} />
          ),
        }}
      />
    </Tabs>
  );
}
