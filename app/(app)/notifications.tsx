import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  AppState,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../components/AuthProvider';
import { useNotifications } from '../../hooks/useNotifications';
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
  const { refreshUnreadCount } = useNotifications();
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

  // Charger les notifications au montage et rafraîchir automatiquement
  useEffect(() => {
    loadNotifications();
    
    // Rafraîchir quand l'app revient au premier plan
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        loadNotifications(1, true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
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

    // Marquer localement d'abord pour une UI plus réactive
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
    ));
    refreshUnreadCount();

    try {
      await markCandidatNotificationAsRead(notification.id);
    } catch (error) {
      console.error('Erreur marquage notification:', error);
      // Revenir en arrière en cas d'erreur
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, read_at: undefined } : n
      ));
      refreshUnreadCount();
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read_at);
    if (unreadNotifications.length === 0) return;

    // Marquer localement d'abord
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    refreshUnreadCount();

    try {
      const response = await markAllCandidatNotificationsAsRead();
      if (response.success) {
        // Succès silencieux pour une meilleure UX
      }
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
      // Revenir en arrière
      setNotifications(prev => prev.map(n => {
        const wasUnread = unreadNotifications.find(un => un.id === n.id);
        return wasUnread ? { ...n, read_at: undefined } : n;
      }));
      refreshUnreadCount();
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
                // Rafraîchir le compteur de notifications globales
                refreshUnreadCount();
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

    // Extraire le titre du poste depuis les données d'entretien si disponible
    const getJobTitleFromData = (data: any) => {
      if (!data) return null;

      // Structure réelle des données : les infos sont directement dans data
      return data.offre_titre ||
             data.titre_offre ||
             data.titre_poste ||
             data.job_title ||
             data.poste_titre ||
             null;
    };

    // Construire le titre avec le nom du poste si c'est une notification d'entretien
    const getDisplayTitle = () => {
      if (item.type.includes('entretien') && item.data) {
        const jobTitle = getJobTitleFromData(item.data);
        if (jobTitle) {
          return `${item.title} - ${jobTitle}`;
        }
      }
      return item.title;
    };

    // Construire le message avec plus de détails pour les entretiens
    const getDisplayMessage = () => {
      if (item.type.includes('entretien') && item.data) {
        const data = item.data;
        const entreprise = data.entreprise || data.entreprise_nom || '';
        const date = data.date || data.date_entretien || '';
        const heure = data.heure || data.heure_entretien || '';
        const lieu = data.lieu || data.lieux_entretien || '';
        const jobTitle = getJobTitleFromData(item.data);

        // Pour les rappels d'entretien, créer un message personnalisé
        if (item.type === 'entretien_reminder') {
          let message = `Rappel : Votre entretien`;

          if (jobTitle) {
            message += ` pour le poste "${jobTitle}"`;
          }

          if (entreprise) {
            message += ` chez ${entreprise}`;
          }

          if (heure) {
            const heureFormatee = heure.substring(0, 5);
            message += ` est aujourd'hui à ${heureFormatee}`;
          } else {
            message += ` est aujourd'hui`;
          }

          if (lieu) {
            message += `. 📍 ${lieu}`;
          }

          message += `. Bonne chance !`;
          return message;
        }

        // Pour les autres types d'entretien, améliorer le message existant
        let enhancedMessage = item.message;

        if (date && heure) {
          const heureFormatee = heure.substring(0, 5);
          const today = new Date().toISOString().split('T')[0];
          const isToday = date === today;

          if (isToday) {
            enhancedMessage = enhancedMessage.replace(/le \d{4}-\d{2}-\d{2}/, 'aujourd\'hui');
            enhancedMessage += ` à ${heureFormatee}`;
          }
        }

        if (entreprise && !enhancedMessage.includes(entreprise)) {
          enhancedMessage += ` chez ${entreprise}`;
        }

        if (lieu && !enhancedMessage.includes(lieu)) {
          enhancedMessage += ` 📍 ${lieu}`;
        }

        return enhancedMessage;
      }
      return item.message;
    };

    // Debug pour voir la structure des données
    if (item.type.includes('entretien')) {
      console.log('🔍 DEBUG NOTIFICATION ENTRETIEN:', {
        type: item.type,
        title: item.title,
        data: item.data,
        jobTitle: getJobTitleFromData(item.data)
      });
    }

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread ? styles.unreadItem : styles.readItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, isUnread && styles.unreadIconContainer]}>
            {getNotificationIcon(item.type, item.priority)}
          </View>

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
                {getDisplayTitle()}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={[styles.message, isUnread && styles.unreadMessage]} numberOfLines={3}>
              {getDisplayMessage()}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.time}>
                {formatDate(item.created_at)}
              </Text>
              {item.priority === 'high' || item.priority === 'urgent' ? (
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityText}>Urgent</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteNotification(item.id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={isUnread ? "#9ca3af" : "#d1d5db"} />
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
    <>
    <StatusBar barStyle="light-content" backgroundColor="#091e60" />
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
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0f8e35']}
              tintColor="#0f8e35" />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </SafeAreaView>
    </>
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
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadItem: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#3b82f6',
    shadowOpacity: 0.12,
  },
  readItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unreadIconContainer: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  textContainer: {
    flex: 1,
    paddingTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#4b5563',
  },
  time: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  priorityBadge: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
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