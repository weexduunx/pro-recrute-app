import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
// Import conditionnel pour éviter les erreurs de dépendances manquantes
let GiftedChat, Send, InputToolbar, Composer;
try {
  const GiftedChatModule = require('react-native-gifted-chat');
  GiftedChat = GiftedChatModule.GiftedChat;
  Send = GiftedChatModule.Send;
  InputToolbar = GiftedChatModule.InputToolbar;
  Composer = GiftedChatModule.Composer;
} catch (error) {
  console.log('GiftedChat not available, using fallback');
}
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../components/ThemeContext';
import { useAuth } from '../../../../components/AuthProvider';
import { 
  getMessages, 
  sendMessage, 
  markMessagesAsRead,
  initializeSocketConnection,
  disconnectSocket 
} from '../../../../utils/messaging-api';
import CustomHeader from '../../../../components/CustomHeader';
import { TouchableOpacity } from 'react-native-gesture-handler';

function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherParticipant, setOtherParticipant] = useState<{
    name: string;
    role: string;
    isOnline: boolean;
  } | null>(null);

  const conversationId = Array.isArray(id) ? id[0] : id;

  const fetchMessages = useCallback(async () => {
    try {
      const response = await getMessages(conversationId);
      const fetchedMessages = response.data.messages.map((msg: any) => ({
        _id: msg.id,
        text: msg.content,
        createdAt: new Date(msg.createdAt),
        user: {
          _id: msg.senderId,
          name: msg.senderName,
        },
      }));
      setMessages(fetchedMessages.reverse());
      setOtherParticipant(response.data.otherParticipant);
      
      // Marquer les messages comme lus
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      Alert.alert('Erreur', 'Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
    
    // Initialiser la connexion Socket.IO
    const socket = initializeSocketConnection(user?.id);
    
    // Rejoindre la conversation
    socket.emit('join_conversation', conversationId);
    
    // Écouter les nouveaux messages
    socket.on('new_message', (message: any) => {
      const newMessage: IMessage = {
        _id: message.id,
        text: message.content,
        createdAt: new Date(message.createdAt),
        user: {
          _id: message.senderId,
          name: message.senderName,
        },
      };
      setMessages(previousMessages => GiftedChat.append(previousMessages, [newMessage]));
    });

    // Écouter le statut en ligne
    socket.on('user_status', (data: { userId: string; isOnline: boolean }) => {
      if (otherParticipant && data.userId !== user?.id) {
        setOtherParticipant(prev => prev ? { ...prev, isOnline: data.isOnline } : null);
      }
    });

    return () => {
      socket.emit('leave_conversation', conversationId);
      disconnectSocket();
    };
  }, [fetchMessages, conversationId, user?.id, otherParticipant]);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    const message = newMessages[0];
    
    // Ajouter le message localement immédiatement
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    
    try {
      await sendMessage(conversationId, message.text);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      
      // Retirer le message en cas d'erreur
      setMessages(previousMessages => 
        previousMessages.filter(msg => msg._id !== message._id)
      );
    }
  }, [conversationId]);

  const renderSend = (props: any) => (
    <Send {...props}>
      <View style={{
        marginRight: 10,
        marginBottom: 5,
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.secondary,
      }}>
        <Ionicons name="send" size={18} color={colors.textPrimary} />
      </View>
    </Send>
  );

  const renderInputToolbar = (props: any) => (
    <InputToolbar
      {...props}
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    />
  );

  const renderComposer = (props: any) => (
    <Composer
      {...props}
      textInputStyle={{
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginHorizontal: 5,
        color: colors.text,
      }}
      placeholder="Tapez votre message..."
      placeholderTextColor={colors.textSecondary}
    />
  );

  const renderHeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
      <TouchableOpacity
        style={{
          padding: 8,
          marginLeft: 10,
        }}
        onPress={() => {
          // TODO: Implémenter l'appel vidéo
          Alert.alert('Appel vidéo', 'Fonctionnalité en cours de développement');
        }}
      >
        <Ionicons name="videocam" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          padding: 8,
          marginLeft: 10,
        }}
        onPress={() => {
          // TODO: Implémenter l'appel audio
          Alert.alert('Appel audio', 'Fonctionnalité en cours de développement');
        }}
      >
        <Ionicons name="call" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <CustomHeader
        title={otherParticipant?.name || 'Conversation'}
        subtitle={otherParticipant?.isOnline ? 'En ligne' : 'Hors ligne'}
        showBackButton={true}
        rightComponent={renderHeaderRight()}
      />

{GiftedChat ? (
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{
            _id: user?.id || '',
            name: user?.name || '',
          }}
          renderSend={renderSend}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          placeholder="Tapez votre message..."
          showAvatarForEveryMessage={false}
          showUserAvatar={false}
          alwaysShowSend={false}
          scrollToBottom
          messagesContainerStyle={{
            backgroundColor: colors.background,
          }}
          textInputProps={{
            returnKeyType: 'send',
            blurOnSubmit: true,
          }}
          locale="fr"
          dateFormat="DD/MM/YYYY"
          timeFormat="HH:mm"
          isLoadingEarlier={loading}
        />
      ) : (
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          backgroundColor: colors.background,
        }}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginTop: 16,
            textAlign: 'center',
          }}>
            Interface de messagerie en développement
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 8,
            textAlign: 'center',
          }}>
            Cette fonctionnalité sera disponible avec la version complète
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export default ChatScreen;