import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useAuth } from '../../components/AuthProvider'; // Adjust path

/**
 * Authenticated Job Board Screen:
 * Displays job offers for logged-in users.
 * This can be the main tab for authenticated users.
 * Includes a logout button in the header.
 */
export default function AuthenticatedJobBoardScreen() {
  const { user, logout, loading } = useAuth(); // Get user and logout function from context

  // Mock Job Offers (replace with real data fetched from your Laravel API)
  const jobOffers = [
    { id: '1', title: 'Senior React Native Developer', company: 'Tech Solutions Inc.', location: 'Remote', description: 'Leverage your expertise to build cutting-edge mobile applications.' },
    { id: '2', title: 'Laravel Backend Engineer', company: 'Web Innovations', location: 'Dakar, Senegal', description: 'Design, develop, and maintain robust backend systems with Laravel.' },
    { id: '3', title: 'UI/UX Designer (Mobile)', company: 'Creative Apps', location: 'Casablanca, Morocco', description: 'Create intuitive and visually appealing user interfaces for mobile apps.' },
    { id: '4', title: 'DevOps Specialist', company: 'CloudWorks', location: 'London, UK', description: 'Automate and streamline our operations and development processes.' },
    { id: '5', title: 'Junior Data Analyst', company: 'Data Insights', location: 'Paris, France', description: 'Analyze large datasets to provide actionable insights.' },
    { id: '6', title: 'Marketing Manager', company: 'Brand Builders', location: 'New York, USA', description: 'Develop and execute marketing strategies to expand our reach.' },
    { id: '7', 'title': 'Customer Support Agent', company: 'Helpful Hands', location: 'Remote', description: 'Provide excellent customer service and support to our users.' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GBG PRO</Text>
        {user && <Text style={styles.welcomeText}>Bienvenue, {user.name}!</Text>}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          disabled={loading}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionTitle}>Available Job Offers</Text>
        {jobOffers.map(job => (
          <View key={job.id} style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobCompany}>{job.company} - {job.location}</Text>
            <Text style={styles.jobDescription}>{job.description.substring(0, 100)}...</Text>
            <TouchableOpacity style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.footerText}>More jobs coming soon!</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB', // Light gray for welcome text
    flexShrink: 1, // Allow text to shrink
    marginHorizontal: 10,
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
  scrollContainer: {
    padding: 24,
    paddingTop: 20, // Adjusted padding as header handles top
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#091e60', // Primary Dark Blue
    marginBottom: 20,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
    marginBottom: 8,
  },
  jobCompany: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  applyButton: {
    backgroundColor: '#0f8e35', // Secondary Green
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
});
