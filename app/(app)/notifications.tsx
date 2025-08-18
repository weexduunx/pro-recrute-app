import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../components/AuthProvider';
import {
  getCandidatNotifications,
  markCandidatNotificationAsRead,
  markAllCandidatNotificationsAsRead,
  deleteCandidatNotification
} from '../../utils/candidat-notifications-api';

interface CandidatNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  read_at?: string;
  created_at: string;
  priority: string;
  action_url?: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CandidatNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadNotifications = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await getCandidatNotifications(pageNum, 20);
      
      if (response.success) {
        const newNotifications = response.notifications;
        
        if (isRefresh || pageNum === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setHasMore(newNotifications.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      Alert.alert('Erreur', 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(1, true);
  }, [loadNotifications]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadNotifications(page + 1);
    }
  }, [loadNotifications, page, loadingMore, hasMore]);

  const handleMarkAsRead = async (notification: CandidatNotification) => {
    if (notification.read_at) return;

    try {
      const response = await markCandidatNotificationAsRead(notification.id);
      
      if (response.success) {
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        ));
      }
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllCandidatNotificationsAsRead();
      
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        Alert.alert('Succès', 'Toutes les notifications ont été marquées comme lues');
      }
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
      Alert.alert('Erreur', 'Impossible de marquer les notifications comme lues');
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    Alert.alert(
      'Supprimer la notification',
      'Êtes-vous sûr de vouloir supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteCandidatNotification(notificationId);
              
              if (response.success) {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
              }
            } catch (error) {
              console.error('Erreur suppression notification:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la notification');
            }
          }
        }
      ]
    );
  };

  const handleNotificationPress = (notification: CandidatNotification) => {
    // Marquer comme lu
    handleMarkAsRead(notification);
    
    // Navigation selon l'action_url ou le type
    if (notification.action_url) {
      router.push(notification.action_url as any);
    } else {
      // Redirection par défaut selon le type
      switch (notification.type) {
        case 'candidature_accepted':
        case 'candidature_rejected':
          router.push('/(app)/candidature');
          break;
        case 'entretien_scheduled':
        case 'entretien_reminder':
        case 'entretien_cancelled':
          router.push('/(app)/entretiens');
          break;
        case 'offre_matching':
          router.push('/(app)/job_board');
          break;
        default:
          // Rester sur la page des notifications
          break;
      }
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const color = priority === 'urgent' || priority === 'high' ? '#ef4444' : '#3b82f6';
    
    switch (type) {
      case 'candidature_accepted':
        return <Ionicons name="checkmark-circle" size={24} color="#10b981" />;
      case 'candidature_rejected':
        return <Ionicons name="close-circle" size={24} color="#ef4444" />;
      case 'entretien_scheduled':
        return <Ionicons name="calendar" size={24} color={color} />;
      case 'entretien_reminder':
        return <Ionicons name="alarm" size={24} color="#f59e0b" />;
      case 'entretien_cancelled':
        return <Ionicons name="calendar-outline" size={24} color="#ef4444" />;
      case 'offre_matching':
        return <Ionicons name="briefcase" size={24} color="#10b981" />;
      case 'profile_update':
        return <Ionicons name="person" size={24} color={color} />;
      case 'system_news':
        return <Ionicons name="newspaper" size={24} color={color} />;
      default:
        return <Ionicons name="notifications" size={24} color={color} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Il y a quelques minutes';
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays}j`;
    }
  };

  const renderNotification = ({ item }: { item: CandidatNotification }) => {
    const isUnread = !item.read_at;
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.iconContainer}>
            {getNotificationIcon(item.type, item.priority)}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, isUnread && styles.unreadTitle]}>
              {item.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.time}>
              {formatDate(item.created_at)}
            </Text>
          </View>

          {isUnread && <View style={styles.unreadDot} />}
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>Aucune notification</Text>
      <Text style={styles.emptyMessage}>
        Vous n'avez pas encore de notifications. Elles apparaîtront ici dès qu'il y en aura.
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color="#091e60" />
      </View>
    );
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader 
        title="Notifications" 
        user={user}
        showBackButton
        onBackPress={() => router.back()}
      />
      
      {unreadCount > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.unreadCount}>
            {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#091e60" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  unreadCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#091e60',
    borderRadius: 6,
  },
  markAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadItem: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0ea5e9',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});