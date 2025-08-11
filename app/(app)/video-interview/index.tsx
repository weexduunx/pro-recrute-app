import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import { getVideoInterviews, testVideoConnection } from '../../../utils/video-api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CustomHeader from '../../../components/CustomHeader';

interface VideoInterview {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  participants: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  roomId?: string;
  recordingEnabled: boolean;
}

export default function VideoInterviewScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<VideoInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'good' | 'poor' | 'testing' | null>(null);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await getVideoInterviews();
      setInterviews(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des entretiens:', error);
      Alert.alert('Erreur', 'Impossible de charger vos entretiens vidéo');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInterviews();
    setRefreshing(false);
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const result = await testVideoConnection();
      setConnectionStatus(result.quality === 'good' ? 'good' : 'poor');
    } catch (error) {
      setConnectionStatus('poor');
      Alert.alert('Test de connexion', 'Problème de connexion détecté. Vérifiez votre réseau.');
    }
  };

  useEffect(() => {
    fetchInterviews();
    testConnection();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return colors.secondary;
      case 'in_progress':
        return '#00C851';
      case 'completed':
        return colors.textSecondary;
      case 'cancelled':
        return '#FF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programmé';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminé';
      case 'cancelled':
        return 'Annulé';
      default:
        return 'Inconnu';
    }
  };

  const joinInterview = (interview: VideoInterview) => {
    if (interview.status === 'scheduled') {
      const now = new Date();
      const scheduledTime = new Date(interview.scheduledAt);
      const timeDiff = scheduledTime.getTime() - now.getTime();
      const minutesDiff = Math.round(timeDiff / (1000 * 60));

      if (minutesDiff > 15) {
        Alert.alert(
          'Trop tôt',
          `L'entretien commence dans ${minutesDiff} minutes. Vous pourrez rejoindre 15 minutes avant le début.`
        );
        return;
      }
    }

    if (interview.roomId) {
      router.push(`/video-interview/room/${interview.roomId}`);
    } else {
      Alert.alert('Erreur', 'Salle d\'entretien non disponible');
    }
  };

  const renderInterviewItem = ({ item }: { item: VideoInterview }) => {
    const scheduledDate = new Date(item.scheduledAt);
    const isToday = format(scheduledDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    
    return (
      <TouchableOpacity
        style={{
          backgroundColor: colors.surface,
          marginHorizontal: 16,
          marginVertical: 8,
          padding: 16,
          borderRadius: 12,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
        onPress={() => joinInterview(item)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 4,
            }}>
              {item.title}
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 8,
            }}>
              {isToday ? 'Aujourd\'hui' : format(scheduledDate, 'EEEE dd MMMM', { locale: fr })} • {format(scheduledDate, 'HH:mm')}
            </Text>
          </View>
          
          <View style={{
            backgroundColor: getStatusColor(item.status),
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{
              color: colors.textPrimary,
              fontSize: 12,
              fontWeight: '600',
            }}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={{ marginLeft: 6, color: colors.textSecondary, fontSize: 14 }}>
            {item.duration} minutes
          </Text>
          
          {item.recordingEnabled && (
            <>
              <Ionicons name="videocam" size={16} color={colors.textSecondary} style={{ marginLeft: 16 }} />
              <Text style={{ marginLeft: 6, color: colors.textSecondary, fontSize: 14 }}>
                Enregistrement activé
              </Text>
            </>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={{ marginLeft: 6, color: colors.textSecondary, fontSize: 14 }}>
              {item.participants.length} participant{item.participants.length > 1 ? 's' : ''}
            </Text>
          </View>

          {item.status === 'scheduled' && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.secondary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => joinInterview(item)}
            >
              <Ionicons name="videocam" size={16} color={colors.textPrimary} />
              <Text style={{
                color: colors.textPrimary,
                fontWeight: '600',
                marginLeft: 6,
              }}>
                Rejoindre
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const ConnectionStatus = () => (
    <View style={{
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <View style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: connectionStatus === 'good' ? '#00C851' : 
                         connectionStatus === 'poor' ? '#FF4444' : 
                         connectionStatus === 'testing' ? colors.secondary : colors.textSecondary,
        marginRight: 12,
      }} />
      <Text style={{ color: colors.text, flex: 1 }}>
        {connectionStatus === 'testing' ? 'Test de connexion en cours...' :
         connectionStatus === 'good' ? 'Connexion excellente pour la vidéo' :
         connectionStatus === 'poor' ? 'Connexion faible détectée' :
         'Statut de connexion inconnu'}
      </Text>
      {connectionStatus === 'poor' && (
        <TouchableOpacity
          style={{
            backgroundColor: colors.secondary,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 15,
          }}
          onPress={testConnection}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
            Retester
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const EmptyState = () => (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    }}>
      <Ionicons
        name="videocam-outline"
        size={64}
        color={colors.textSecondary}
        style={{ marginBottom: 16 }}
      />
      <Text style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
      }}>
        Aucun entretien vidéo programmé
      </Text>
      <Text style={{
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
      }}>
        Vos entretiens vidéo avec les recruteurs apparaîtront ici
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CustomHeader title="Entretiens vidéo" showBackButton={false} />
      
      <ConnectionStatus />
      
      <FlatList
        data={interviews}
        keyExtractor={(item) => item.id}
        renderItem={renderInterviewItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      />

      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.secondary,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        }}
        onPress={() => router.push('/video-interview/schedule')}
      >
        <Ionicons name="calendar" size={28} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}