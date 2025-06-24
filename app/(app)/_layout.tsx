import React from "react";
import { Drawer } from "expo-router/drawer";
import { useAuth } from "../../components/AuthProvider";
import { FontAwesome5 } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerActiveTintColor: "#0f8e35",
          drawerInactiveTintColor: "#6B7280",
          drawerStyle: {
            backgroundColor: "#091e60",
            borderRightWidth: 1,
            borderRightColor: "#091e60",
            paddingTop: 20,
            paddingBottom: 20,
          },
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: "600",
            color: "#FFFFFF",
          },
          drawerContentStyle: {
            backgroundColor: "#091e60",
          },
          drawerType: "front",
          drawerPosition: "left", // Position du drawer à gauche
          drawerHideStatusBarOnOpen: true, // Masquer la barre d'état lorsque le drawer est ouvert
          drawerStatusBarAnimation: "fade", // Animation de la barre d'état lors de l'ouverture du drawer
          drawerIconStyle: {
            marginTop: 4,
          },
        }}
      >
        <Drawer.Screen
          name="home"
          options={{
            drawerLabel: "Accueil",
            drawerIcon: ({ color }) => (
              <FontAwesome5 name="home" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="profile-details"
          options={{
            drawerLabel: "Mon Profil",
            drawerIcon: ({ color, size }) => (
              <FontAwesome5 name="user-circle" size={size} color={color} />
            ),
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="job_board"
          options={{
            drawerLabel: "Offres d'emploi",
            drawerIcon: ({ color }) => (
              <FontAwesome name="briefcase" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="actualites"
          options={{
            drawerLabel: "Actualités",
            drawerIcon: ({ color }) => (
              <FontAwesome name="newspaper-o" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerLabel: "Tableau de bord",
            drawerIcon: ({ color }) => (
              <FontAwesome name="dashboard" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: "Paramètres",
            drawerIcon: ({ color }) => (
              <FontAwesome5 name="cog" size={22} color={color} />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
