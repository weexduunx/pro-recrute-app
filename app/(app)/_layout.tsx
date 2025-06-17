import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

/**
 * Authenticated Tabs Layout:
 * Defines the tab navigation structure for users who are logged in.
 * Includes a "Job Board" tab and a "Dashboard" tab with custom icons and colors.
 */
export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hide header on tab screens (each tab will manage its own header or lack thereof)
        tabBarActiveTintColor: '#0f8e35', // Secondary Green for active tab
        tabBarInactiveTintColor: '#6B7280', // Gray for inactive tab
        tabBarStyle: {
          backgroundColor: '#091e60', // Primary Dark Blue background for tab bar
          borderTopWidth: 1,
          borderTopColor: '#091e60', // Match border color to background
          paddingBottom: 4, // Adjust padding
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
          color: '#FFFFFF', // White text for labels regardless of active state for contrast
        },
        tabBarIconStyle: {
          marginTop: 0,
        }
      }}
    >
      <Tabs.Screen
        name="job_board" // Corresponds to app/(app)/job_board.tsx
        options={{
          title: 'Offres d\'emplois',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="briefcase" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} /> // Conditional color for icon
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard" // Corresponds to app/(app)/dashboard.tsx
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="user" size={22} color={focused ? '#0f8e35' : '#D1D5DB'} /> // Conditional color for icon
          ),
        }}
      />
      {/* Add more authenticated tabs here */}
    </Tabs>
  );
}
