import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../components/ThemeContext';
import { useAuth } from '../../../components/AuthProvider';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatNotificationDate,
  getNotificationIcon,
  getNotificationColor
} from '../../../utils/interim-notifications-api';
import CustomHeader from '../../../components/CustomHeader';

const { width } = Dimensions.get('window');

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = async (notification) => {
    try {
      // Marquer comme lue si pas encore lue
      if (!notification.read_at) {
        await markNotificationAsRead(notification.id);
        setNotifications(prev => prev.map(n => 
          n.id === notification.id 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        ));
      }

      // Naviguer vers l'action correspondante
      if (notification.action_url) {
        router.push(notification.action_url);
      }
    } catch (error) {
      console.error('Erreur lors de la gestion du clic:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ 
        ...n, 
        read_at: n.read_at || new Date().toISOString() 
      })));
      
      Alert.alert('Succès', 'Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
      Alert.alert('Erreur', 'Impossible de marquer les notifications comme lues');
    }
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
            backgroundColor: colors.background,
            borderLeftColor: isUnread ? iconColor : 'transparent',
            borderLeftWidth: isUnread ? 4 : 0,
            opacity: isUnread ? 1 : 0.8,
            shadowColor: colors.shadow,
          }
        ]}
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
      <TouchableOpacity
        style={[
          styles.filterTab,
          {
            backgroundColor: filter === 'all' ? colors.secondary : 'transparent',
            borderColor: colors.border,
          }
        ]}
        onPress={() => setFilter('all')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: filter === 'all' ? colors.textTertiary : colors.textSecondary }
          ]}
        >
          Toutes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterTab,
          {
            backgroundColor: filter === 'unread' ? colors.secondary : 'transparent',
            borderColor: colors.border,
          }
        ]}
        onPress={() => setFilter('unread')}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: filter === 'unread' ? colors.textTertiary : colors.textSecondary }
          ]}
        >
          Non lues
        </Text>
      </TouchableOpacity>

      {notifications.some(n => !n.read_at) && (
        <TouchableOpacity
          style={[styles.markAllButton, { backgroundColor: colors.primary }]}
          onPress={handleMarkAllAsRead}
        >
          <Ionicons name="checkmark-done" size={16} color={colors.textTertiary} />
          <Text style={[styles.markAllText, { color: colors.textTertiary }]}>
            Tout lire
          </Text>
        </TouchableOpacity>
      )}
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

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Filter tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 'auto',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // List
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },

  // Notification item
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
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