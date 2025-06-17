import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../../components/AuthProvider';

/**
 * User Dashboard Screen:
 * Displays content relevant to the authenticated user.
 * Accessible only when logged in, typically via a tab.
 * Includes a prominent logout button.
 */
export default function DashboardScreen() {
  const { user, logout, loading } = useAuth(); // Get user and logout function from context

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Dashboard</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          disabled={loading}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {user ? (
          <>
            <Text style={styles.welcomeText}>Hello, {user.name}!</Text>
            <Text style={styles.detailsText}>Your registered email: {user.email}</Text>
            <Text style={styles.infoText}>Here you can manage your applications, profile, and more.</Text>
            {/* Add more dashboard features here */}
          </>
        ) : (
          <Text style={styles.welcomeText}>User data not available.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Light gray background
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Android status bar height
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#091e60', // Primary Dark Blue
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF', // White text
  },
  logoutButton: {
    backgroundColor: '#0f8e35', // Secondary Green
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 24,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  detailsText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 32,
  },
});
