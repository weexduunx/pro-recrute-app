import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { usePermissions } from './PermissionsManager';

/**
 * Hook qui gère automatiquement les permissions après l'authentification
 * À utiliser dans un composant au niveau de l'application
 */
export const useAuthPermissions = () => {
  const { isAuthenticated, user, isAppReady } = useAuth();
  const { hasRequestedPermissions, requestAllPermissions } = usePermissions();

  useEffect(() => {
    // Demander les permissions 2 secondes après qu'un utilisateur soit connecté
    // et seulement si elles n'ont pas déjà été demandées
    if (isAuthenticated && user && isAppReady && !hasRequestedPermissions) {
      const timer = setTimeout(() => {
        requestAllPermissions();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isAppReady, hasRequestedPermissions, requestAllPermissions]);
};

// Composant wrapper pour faciliter l'utilisation
export const AuthPermissionsManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAuthPermissions();
  return <>{children}</>;
};