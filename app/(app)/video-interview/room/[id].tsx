import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../components/ThemeContext';
import { useAuth } from '../../../../components/AuthProvider';
import { 
  joinInterviewRoom, 
  leaveInterviewRoom, 
  startRecording, 
  stopRecording 
} from '../../../../utils/video-api';
import CustomHeader from '../../../../components/CustomHeader';
import { Camera } from 'expo-camera';

const { width, height } = Dimensions.get('window');

function VideoInterviewRoom() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<Array<{
    id: string;
    name: string;
    isVideoOn: boolean;
    isAudioOn: boolean;
  }>>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const cameraRef = useRef<Camera>(null);
  const roomId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    (async () => {
      // Demander les permissions pour caméra et microphone
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      // Note: Les permissions audio seront gérées par le backend pour les vraies implémentations WebRTC
      
      setHasPermission(cameraStatus === 'granted');
      
      if (cameraStatus === 'granted') {
        try {
          // Rejoindre la salle d'entretien
          const response = await joinInterviewRoom(roomId);
          setParticipants(response.data.participants || []);
          setConnectionStatus('connected');
        } catch (error) {
          console.error('Erreur lors de la connexion à la salle:', error);
          Alert.alert('Erreur', 'Impossible de rejoindre la salle d\'entretien');
          setConnectionStatus('disconnected');
        }
      }
    })();

    return () => {
      // Quitter la salle lors de la fermeture du composant
      leaveInterviewRoom(roomId).catch(console.error);
    };
  }, [roomId]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implémenter la logique de mute/unmute avec WebRTC
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    // TODO: Implémenter la logique de video on/off avec WebRTC
  };

  const handleStartRecording = async () => {
    try {
      await startRecording(roomId);
      setIsRecording(true);
      Alert.alert('Enregistrement', 'L\'enregistrement a commencé');
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording(roomId);
      setIsRecording(false);
      Alert.alert('Enregistrement', 'L\'enregistrement a été arrêté');
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
    }
  };

  const handleEndCall = () => {
    Alert.alert(
      'Terminer l\'entretien',
      'Êtes-vous sûr de vouloir terminer cet entretien vidéo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Terminer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveInterviewRoom(roomId);
              router.back();
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              router.back();
            }
          }
        },
      ]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Demande des permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="videocam-off" size={64} color={colors.textSecondary} />
        <Text style={[styles.permissionText, { color: colors.text }]}>
          Permission caméra requise pour les entretiens vidéo
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.secondary }]}
          onPress={() => {
            Alert.alert(
              'Permission requise',
              'Veuillez activer la permission caméra dans les paramètres de l\'application.'
            );
          }}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
            Activer la caméra
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader
        title="Entretien vidéo"
        showBackButton={false}
        rightComponent={
          <View style={styles.headerRight}>
            <View style={[styles.statusIndicator, { 
              backgroundColor: connectionStatus === 'connected' ? '#00C851' : 
                              connectionStatus === 'connecting' ? '#FB8500' : '#FF4444' 
            }]} />
            <Text style={[styles.statusText, { color: colors.textPrimary }]}>
              {connectionStatus === 'connected' ? 'Connecté' : 
               connectionStatus === 'connecting' ? 'Connexion...' : 'Déconnecté'}
            </Text>
          </View>
        }
      />

      {/* Zone vidéo principale */}
      <View style={styles.videoContainer}>
        {!isVideoOff ? (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
        ) : (
          <View style={[styles.videoOff, { backgroundColor: colors.surface }]}>
            <Ionicons name="videocam-off" size={64} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              Caméra désactivée
            </Text>
          </View>
        )}

        {/* Statut d'enregistrement */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>REC</Text>
          </View>
        )}

        {/* Information utilisateur */}
        <View style={[styles.userInfo, { backgroundColor: colors.surface + 'DD' }]}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {user?.name || 'Utilisateur'}
          </Text>
          {isMuted && (
            <Ionicons name="mic-off" size={16} color="#FF4444" style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>

      {/* Participants (si plusieurs) */}
      {participants.length > 1 && (
        <View style={styles.participantsContainer}>
          <Text style={[styles.participantsTitle, { color: colors.text }]}>
            Participants ({participants.length})
          </Text>
          {/* TODO: Afficher les autres participants */}
        </View>
      )}

      {/* Contrôles */}
      <View style={[styles.controls, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: isMuted ? '#FF4444' : colors.background }]}
          onPress={toggleMute}
        >
          <Ionicons 
            name={isMuted ? "mic-off" : "mic"} 
            size={24} 
            color={isMuted ? 'white' : colors.text} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: isVideoOff ? '#FF4444' : colors.background }]}
          onPress={toggleVideo}
        >
          <Ionicons 
            name={isVideoOff ? "videocam-off" : "videocam"} 
            size={24} 
            color={isVideoOff ? 'white' : colors.text} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: isRecording ? '#FF4444' : colors.background }]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
        >
          <Ionicons 
            name={isRecording ? "stop" : "radio-button-on"} 
            size={24} 
            color={isRecording ? 'white' : colors.text} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.endCallButton, { backgroundColor: '#FF4444' }]}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  videoOff: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantsContainer: {
    padding: 16,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
});

export default VideoInterviewRoom;