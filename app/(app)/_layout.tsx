import React from "react";
import { Drawer } from "expo-router/drawer";
import { useAuth } from "../../components/AuthProvider";
import { FontAwesome5 } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, Image, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';

// Composant personnalisé pour le contenu du drawer
function CustomDrawerContent(props) {
  return (
    <View style={styles.drawerContainer}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      
      {/* Section du logo et version en bas */}
      <View style={styles.footerContainer}>
        <Image
          source={require('../../assets/images/logo-gbg-white.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.gbgAdresse}>Ouest Foire Cité Khadar Lot 3 | Dakar, Sénégal</Text>
        <Text style={styles.versionText}>copyright © {new Date().getFullYear()} Tous droits réservés | GBG SI </Text>
        <Text style={styles.versionText}>Version 1.0.0 </Text>

      </View>
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
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
          drawerPosition: "left",
          drawerHideStatusBarOnOpen: true,
          drawerStatusBarAnimation: "fade",
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
          name="candidature"
          options={{
            drawerLabel: "Mes Candidatures",
            drawerIcon: ({ color }) => (
              <FontAwesome name="file-text" size={22} color={color} />
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

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: "#091e60",
  },
  scrollContent: {
    flexGrow: 1,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e3a8a',
    backgroundColor: "#091e60",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  versionText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '400',
  },
  gbgAdresse: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 4,
    textAlign: 'center',
  },
});