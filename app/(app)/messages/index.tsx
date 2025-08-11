import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import { getConversations } from '../../../utils/messaging-api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CustomHeader from '../../../components/CustomHeader';

interface Conversation {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
}

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getConversations();
      setConversations(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
      Alert.alert('Erreur', 'Impossible de charger vos conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const getOtherParticipant = (participants: Conversation['participants']) => {
    return participants.find(p => p.id !== user?.id) || participants[0];
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else {
      return format(date, 'dd/MM', { locale: fr });
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherParticipant = getOtherParticipant(item.participants);
    const isUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
        onPress={() => router.push(`/messages/chat/${item.id}`)}
      >
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' }}>
            {otherParticipant.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: isUnread ? 'bold' : 'normal',
                color: colors.text,
                flex: 1,
              }}
            >
              {otherParticipant.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {otherParticipant.role === 'recruiter' ? 'Recruteur' : 'Candidat'}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              fontWeight: isUnread ? 'bold' : 'normal',
            }}
            numberOfLines={1}
          >
            {item.lastMessage?.content || 'Aucun message'}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          {item.lastMessage && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
              {formatMessageTime(item.lastMessage.createdAt)}
            </Text>
          )}
          {isUnread && (
            <View
              style={{
                backgroundColor: colors.secondary,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' }}>
                {item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyConversations = () => (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    }}>
      <Ionicons
        name="chatbubbles-outline"
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
        Aucune conversation
      </Text>
      <Text style={{
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
      }}>
        Vos conversations avec les recruteurs et autres candidats apparaîtront ici
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CustomHeader title="Messages" showBackButton={false} />
      
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={EmptyConversations}
        showsVerticalScrollIndicator={false}
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
        onPress={() => router.push('/messages/new-message')}
      >
        <Ionicons name="add" size={28} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}