import React, { createContext, useContext, useCallback } from 'react';

interface NotificationUpdateContextType {
  triggerNotificationCheck: () => void;
}

const NotificationUpdateContext = createContext<NotificationUpdateContextType | undefined>(undefined);

export const useNotificationUpdate = () => {
  const context = useContext(NotificationUpdateContext);
  if (!context) {
    throw new Error('useNotificationUpdate must be used within a NotificationUpdateProvider');
  }
  return context;
};

interface NotificationUpdateProviderProps {
  children: React.ReactNode;
  onNotificationCheck: () => void;
}

export const NotificationUpdateProvider: React.FC<NotificationUpdateProviderProps> = ({
  children,
  onNotificationCheck
}) => {
  const triggerNotificationCheck = useCallback(() => {
    console.log('🔔 Déclenchement de vérification des notifications');
    onNotificationCheck();
  }, [onNotificationCheck]);

  return (
    <NotificationUpdateContext.Provider value={{ triggerNotificationCheck }}>
      {children}
    </NotificationUpdateContext.Provider>
  );
};