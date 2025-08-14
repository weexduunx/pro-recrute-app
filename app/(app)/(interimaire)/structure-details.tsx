import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import {
  getStructureDetails,
  openStructureInMaps,
  formatDistance
} from '../../../utils/geolocation-api';
import CustomHeader from '../../../components/CustomHeader';

const { width } = Dimensions.get('window');

export default function StructureDetailsScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userLocation = params.latitude && params.longitude ? {
    latitude: parseFloat(params.latitude),
    longitude: parseFloat(params.longitude)
  } : null;

  useEffect(() => {
    loadStructureDetails();
  }, [params.id]);

  const loadStructureDetails = async () => {
    try {
      setLoading(true);
      const requestParams = userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      } : {};

      const response = await getStructureDetails(params.id, requestParams);

      if (response.success) {
        setStructure(response.data);
      } else {
        setError('Structure non trouvée');
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      setError('Impossible de charger les détails de la structure');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phoneNumber) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl);
  };

  const handleEmail = (email) => {
    const emailUrl = `mailto:${email}`;
    Linking.openURL(emailUrl);
  };

  const handleDirections = () => {
    if (!userLocation) {
      Alert.alert('Position indisponible', 'Impossible de calculer l\'itinéraire sans votre position');
      return;
    }

    const mapsUrl = openStructureInMaps(structure, userLocation);
    Linking.openURL(mapsUrl);
  };

  const handleWebsite = () => {
    if (structure.site_web) {
      let url = structure.site_web;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      Linking.openURL(url);
    }
  };

  const renderContactSection = () => (
    <View style={[styles.section, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        Contact
      </Text>

      {structure.tel && (
        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => handleCall(structure.tel)}
        >
          <View style={[styles.contactIcon, { backgroundColor: colors.secondary + '20' }]}>
            <Ionicons name="call" size={20} color={colors.secondary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
              Téléphone
            </Text>
            <Text style={[styles.contactValue, { color: colors.primary }]}>
              {structure.tel}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {structure.tel_urgence && (
        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => handleCall(structure.tel_urgence)}
        >
          <View style={[styles.contactIcon, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="medical" size={20} color={colors.error} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
              Urgences 24h
            </Text>
            <Text style={[styles.contactValue, { color: colors.primary }]}>
              {structure.tel_urgence}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {structure.email && (
        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => handleEmail(structure.email)}
        >
          <View style={[styles.contactIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="mail" size={20} color={colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
              Email
            </Text>
            <Text style={[styles.contactValue, { color: colors.primary }]}>
              {structure.email}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {structure.site_web && (
        <TouchableOpacity
          style={styles.contactRow}
          onPress={handleWebsite}
        >
          <View style={[styles.contactIcon, { backgroundColor: '#4285F4' + '20' }]}>
            <Ionicons name="globe" size={20} color="#4285F4" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
              Site web
            </Text>
            <Text style={[styles.contactValue, { color: colors.primary }]}>
              {structure.site_web}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLocationSection = () => (
    <View style={[styles.section, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        Localisation
      </Text>

      <View style={styles.addressContainer}>
        <Ionicons name="location" size={20} color={colors.secondary} />
        <Text style={[styles.fullAddress, { color: colors.textSecondary }]}>
          {structure.adresse}
        </Text>
      </View>

      {structure.distance && (
        <View style={styles.distanceContainer}>
          <Ionicons name="navigate" size={16} color={colors.textSecondary} />
          <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
            À {formatDistance(parseFloat(structure.distance))} de votre position
          </Text>
        </View>
      )}

      {structure.latitude && structure.longitude && userLocation && (
        <TouchableOpacity
          style={[styles.directionsButton, { backgroundColor: colors.secondary }]}
          onPress={handleDirections}
        >
          <Ionicons name="navigate" size={20} color={colors.textTertiary} />
          <Text style={[styles.directionsText, { color: colors.textTertiary }]}>
            Obtenir l'itinéraire
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderInfoSection = () => (
    <View style={[styles.section, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        Informations
      </Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <View style={[styles.infoIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="business" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>
            {(() => {
              switch (parseInt(structure.type)) {
                case 1: return 'Hôpital ou Clinique';
                case 2: return 'Pharmacie';
                case 3: return 'Opticien';
                default: return 'Non spécifié';
              }
            })()}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <View style={[styles.infoIcon, { backgroundColor: colors.secondary + '20' }]}>
            <Ionicons name="location" size={18} color={colors.secondary} />
          </View>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Région</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {(() => {
              switch (parseInt(structure.region)) {
                case 1: return 'Dakar';
                case 2: return 'Diourbel';
                case 3: return 'Fatick';
                case 4: return 'Kaolack';
                case 5: return 'Kolda';
                case 6: return 'Louga';
                case 7: return 'Matam';
                case 8: return 'Saint-Louis';
                case 9: return 'Tambacounda';
                case 10: return 'Thiès';
                case 11: return 'Ziguinchor';
                case 12: return 'Kaffrine';
                case 13: return 'Kédougou';
                case 14: return 'Sédhiou';
                default: return 'Non spécifiée';
              }
            })()}
          </Text>
        </View>

        {structure.horaires_ouverture && (
          <View style={styles.infoItem}>
            <View style={[styles.infoIcon, { backgroundColor: '#10B981' + '20' }]}>
              <Ionicons name="time" size={18} color="#10B981" />
            </View>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Horaires</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{structure.horaires_ouverture}</Text>
          </View>
        )}

        {structure.urgences_24h && (
          <View style={styles.infoItem}>
            <View style={[styles.infoIcon, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="medical" size={18} color={colors.error} />
            </View>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Urgences</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>24h/24</Text>
          </View>
        )}
      </View>

      {structure.PersonneRessource && (
        <View style={styles.contactPersonContainer}>
          <Text style={[styles.contactPersonLabel, { color: colors.textSecondary }]}>
            Personne ressource
          </Text>
          <Text style={[styles.contactPersonName, { color: colors.primary }]}>
            {structure.PersonneRessource}
          </Text>
        </View>
      )}
    </View>
  );

  const renderSpecialtiesSection = () => {
    if (!structure.specialites || structure.specialites.length === 0) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Spécialités ({structure.specialites.length})
        </Text>

        <View style={styles.specialtiesGrid}>
          {structure.specialites.map((specialty, index) => (
            <View
              key={index}
              style={[styles.specialtyChip, { backgroundColor: colors.secondary + '15' }]}
            >
              <Ionicons name="medical" size={14} color={colors.secondary} />
              <Text style={[styles.specialtyText, { color: colors.secondary }]}>
                {specialty}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderServicesSection = () => {
    if (!structure.services_disponibles || structure.services_disponibles.length === 0) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Services disponibles
        </Text>

        <View style={styles.servicesList}>
          {structure.services_disponibles.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
              <Text style={[styles.serviceText, { color: colors.text }]}>
                {service}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderDescriptionSection = () => {
    if (!structure.description) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          Description
        </Text>
        <Text style={[styles.descriptionText, { color: colors.text }]}>
          {structure.description}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader title="Détails de la structure" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des détails...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !structure) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CustomHeader title="Détails de la structure" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            Erreur
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title="Détails de la structure" showBackButton={true} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header avec nom et badges */}
        <View style={[styles.headerSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.structureName, { color: colors.primary }]}>
            {structure.name}
          </Text>

          <View style={styles.badgesRow}>
            <View style={[styles.typeBadge, { backgroundColor: colors.secondary + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: colors.secondary }]}>
                {(() => {
                  switch (parseInt(structure.type)) {
                    case 1: return 'Hôpital ou Clinique';
                    case 2: return 'Pharmacie';
                    case 3: return 'Opticien';
                    default: return 'Non spécifié';
                  }
                })()}
              </Text>
            </View>

            {structure.affilie && (
              <View style={[styles.affilieBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={[styles.affilieText, { color: colors.primary }]}>
                  Affilié IPM
                </Text>
              </View>
            )}

            {structure.urgences_24h && (
              <View style={[styles.urgencyBadge, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="medical" size={14} color={colors.error} />
                <Text style={[styles.urgencyText, { color: colors.error }]}>
                  24h/24
                </Text>
              </View>
            )}
          </View>

          {structure.note_moyenne && (
            <View style={styles.ratingRow}>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(structure.note_moyenne) ? "star" : "star-outline"}
                    size={16}
                    color="#FFD700"
                  />
                ))}
              </View>
              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                {structure.note_moyenne.toFixed(1)} ({structure.nombre_avis} avis)
              </Text>
            </View>
          )}
        </View>

        {renderLocationSection()}
        {renderContactSection()}
        {renderInfoSection()}
        {renderSpecialtiesSection()}
        {renderServicesSection()}
        {renderDescriptionSection()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Loading & Error states
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Header section
  headerSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  structureName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  affilieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  affilieText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 13,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },

  // Contact section
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Location section
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fullAddress: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    marginLeft: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 14,
    marginLeft: 6,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
  },
  directionsText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Info section
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  contactPersonContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  contactPersonLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  contactPersonName: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Specialties section
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },

  // Services section
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },

  // Description section
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
});