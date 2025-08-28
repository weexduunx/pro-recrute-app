import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  Dimensions,
  AppState,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteReadNotifications,
  formatNotificationDate,
  getNotificationIcon,
  getNotificationColor
} from '../../../utils/interim-notifications-api';
import CustomHeader from '../../../components/CustomHeader';
import { createShadow } from '../../../utils/shadow-utils';

const { width } = Dimensions.get('window');

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter === 'unread' ? { unread_only: true, limit: 50 } : { limit: 50 };
      const response = await getNotifications(params);
      
      if (response.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      Alert.alert('Erreur', 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
    
    // Rafraîchir quand l'app revient au premier plan
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        fetchNotifications();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = async (notification) => {
    try {
      // Marquer comme lue localement d'abord pour une UI plus réactive
      if (!notification.read_at) {
        setNotifications(prev => prev.map(n => 
          n.id === notification.id 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        ));
        
        // Puis marquer sur le serveur
        await markNotificationAsRead(notification.id);
      }

      // Naviguer vers l'action correspondante
      if (notification.action_url) {
        router.push(notification.action_url);
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du clic:', error);
      // Revenir en arrière en cas d'erreur
      if (!notification.read_at) {
        setNotifications(prev => prev.map(n => 
          n.id === notification.id 
            ? { ...n, read_at: null }
            : n
        ));
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read_at);
    if (unreadNotifications.length === 0) return;

    // Marquer localement d'abord
    setNotifications(prev => prev.map(n => ({ 
      ...n, 
      read_at: n.read_at || new Date().toISOString() 
    })));

    try {
      await markAllNotificationsAsRead();
      // Succès silencieux pour une meilleure UX
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
      // Revenir en arrière
      setNotifications(prev => prev.map(n => {
        const wasUnread = unreadNotifications.find(un => un.id === n.id);
        return wasUnread ? { ...n, read_at: null } : n;
      }));
      Alert.alert('Erreur', 'Impossible de marquer les notifications comme lues');
    }
  };

  const handleDeleteReadNotifications = async () => {
    const readNotifications = notifications.filter(n => n.read_at);
    if (readNotifications.length === 0) {
      Alert.alert('Information', 'Aucune notification lue à supprimer');
      return;
    }

    Alert.alert(
      'Supprimer les notifications lues',
      `Voulez-vous supprimer les ${readNotifications.length} notification(s) lue(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            // Supprimer localement d'abord pour une UI réactive
            const originalNotifications = notifications;
            setNotifications(prev => prev.filter(n => !n.read_at));

            try {
              const response = await deleteReadNotifications();
              // Succès silencieux pour une meilleure UX
              console.log(`${response.deleted_count} notifications supprimées`);
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              // Restaurer en cas d'erreur
              setNotifications(originalNotifications);
              Alert.alert('Erreur', 'Impossible de supprimer les notifications lues');
            }
          }
        }
      ]
    );
  };

  const renderNotificationItem = ({ item }) => {
    const isUnread = !item.read_at;
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type, item.priority);
    const formattedDate = formatNotificationDate(item.created_at);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: isUnread ? colors.background : '#fafbfc',
            borderColor: isUnread ? iconColor : colors.border,
            borderWidth: isUnread ? 2 : 1,
            opacity: 1,
            shadowColor: colors.shadow,
          }
        ]}
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.headerRow}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
              <Ionicons name={iconName as any} size={20} color={iconColor} />
            </View>
            
            <View style={styles.titleContainer}>
              <Text 
                style={[
                  styles.title, 
                  { 
                    color: colors.primary,
                    fontWeight: isUnread ? '700' : '600'
                  }
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {formattedDate}
              </Text>
            </View>

            {isUnread && (
              <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
            )}
          </View>

          <Text 
            style={[
              styles.message, 
              { 
                color: colors.primary,
                fontWeight: isUnread ? '500' : '400'
              }
            ]}
            numberOfLines={3}
          >
            {item.message}
          </Text>

          {item.priority === 'high' || item.priority === 'urgent' ? (
            <View style={[styles.priorityBadge, { backgroundColor: iconColor + '15' }]}>
              <Ionicons name="alert-circle" size={14} color={iconColor} />
              <Text style={[styles.priorityText, { color: iconColor }]}>
                {item.priority === 'urgent' ? 'URGENT' : 'IMPORTANT'}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => (
    <View style={[styles.filterContainer, { backgroundColor: colors.background }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <TouchableOpacity
          style={[
            styles.uniformButton,
            {
              backgroundColor: filter === 'all' ? colors.secondary : 'transparent',
              borderColor: colors.border,
            }
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.uniformButtonText,
              { color: filter === 'all' ? colors.textTertiary : colors.textSecondary }
            ]}
          >
            Toutes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.uniformButton,
            {
              backgroundColor: filter === 'unread' ? colors.secondary : 'transparent',
              borderColor: colors.border,
            }
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.uniformButtonText,
              { color: filter === 'unread' ? colors.textTertiary : colors.textSecondary }
            ]}
          >
            Non lues
          </Text>
        </TouchableOpacity>

        {notifications.some(n => !n.read_at) && (
          <TouchableOpacity
            style={[styles.uniformButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={handleMarkAllAsRead}
          >
            <Ionicons name="checkmark-done" size={14} color={colors.textTertiary} />
            <Text style={[styles.uniformButtonText, { color: colors.textTertiary }]}>
              Tout lire
            </Text>
          </TouchableOpacity>
        )}
        
        {notifications.some(n => n.read_at) && (
          <TouchableOpacity
            style={[styles.uniformButton, { backgroundColor: colors.error, borderColor: colors.error }]}
            onPress={handleDeleteReadNotifications}
          >
            <Ionicons name="trash" size={14} color={colors.textTertiary} />
            <Text style={[styles.uniformButtonText, { color: colors.textTertiary }]}>
              Supprimer lues
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="notifications-outline" 
        size={64} 
        color={colors.textSecondary} 
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: colors.error }]}>
        {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {filter === 'unread' 
          ? 'Toutes vos notifications ont été lues'
          : 'Vous recevrez ici vos rappels d\'échéances, validations de feuilles de soins et actualités IPM'
        }
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader
        title="Notifications"
        showBackButton={true}
      />

      {renderFilterTabs()}

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderNotificationItem}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[colors.secondary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={notifications.length === 0 ? styles.emptyListContainer : styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Filter tabs
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  uniformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 95,
    height: 36,
  },
  uniformButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 3,
    textAlign: 'center',
  },

  // List
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  // Notification item
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    ...createShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  notificationContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 22,
  },
  date: {
    fontSize: 12,
    fontWeight: '400',
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.8,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});