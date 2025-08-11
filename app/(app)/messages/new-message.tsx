import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import { searchUsers, createConversation } from '../../../utils/messaging-api';
import CustomHeader from '../../../components/CustomHeader';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function NewMessageScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const searchUsersDebounced = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await searchUsers(query);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      Alert.alert('Erreur', 'Impossible de rechercher des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      searchUsersDebounced(searchQuery);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const toggleUserSelection = (selectedUser: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === selectedUser.id);
      if (isSelected) {
        return prev.filter(u => u.id !== selectedUser.id);
      } else {
        return [...prev, selectedUser];
      }
    });
  };

  const startConversation = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Attention', 'Veuillez sélectionner au moins un utilisateur');
      return;
    }

    try {
      const participantIds = selectedUsers.map(u => u.id);
      const response = await createConversation(participantIds);
      router.replace(`/messages/chat/${response.data.conversationId}`);
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.find(u => u.id === item.id);
    
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
        onPress={() => toggleUserSelection(item)}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 2,
          }}>
            {item.name}
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
          }}>
            {item.role === 'recruiter' ? 'Recruteur' : 'Candidat'} • {item.email}
          </Text>
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.secondary} />
        )}
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    }}>
      <Ionicons
        name="search-outline"
        size={64}
        color={colors.textSecondary}
        style={{ marginBottom: 16 }}
      />
      <Text style={{
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
      }}>
        {searchQuery.length < 2 
          ? 'Tapez au moins 2 caractères pour rechercher des utilisateurs'
          : 'Aucun utilisateur trouvé'
        }
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CustomHeader
        title="Nouveau message"
        showBackButton={true}
        rightComponent={
          selectedUsers.length > 0 ? (
            <TouchableOpacity
              style={{
                backgroundColor: colors.secondary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 15,
              }}
              onPress={startConversation}
            >
              <Text style={{
                color: colors.textPrimary,
                fontWeight: '600',
                fontSize: 14,
              }}>
                Créer ({selectedUsers.length})
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={{
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: 25,
          paddingHorizontal: 15,
          paddingVertical: 10,
        }}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
            style={{ marginRight: 10 }}
          />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: colors.text,
            }}
            placeholder="Rechercher un utilisateur..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {loading && (
            <View style={{ marginLeft: 10 }}>
              <Text style={{ color: colors.textSecondary }}>...</Text>
            </View>
          )}
        </View>
      </View>

      {selectedUsers.length > 0 && (
        <View style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
          }}>
            Sélectionnés ({selectedUsers.length}):
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {selectedUsers.map(user => (
              <View
                key={user.id}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 15,
                  marginRight: 8,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: colors.textPrimary,
                  fontSize: 14,
                  marginRight: 6,
                }}>
                  {user.name}
                </Text>
                <TouchableOpacity onPress={() => toggleUserSelection(user)}>
                  <Ionicons name="close" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}