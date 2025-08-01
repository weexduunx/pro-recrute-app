import { useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { usePermissions } from './PermissionsManager';

/**
 * Hook qui gère automatiquement les permissions après l'authentification
 * À utiliser dans un composant au niveau de l'application
 */
export const useAuthPermissions = () => {
  const { isAuthenticated, user, isAppReady } = useAuth();
  const { hasRequestedPermissions, requestAllPermissions } = usePermissions();
  
  // Utiliser useRef pour éviter les appels multiples
  const hasTriggeredPermissions = useRef(false);

  useEffect(() => {
    // Réinitialiser le flag quand l'utilisateur se déconnecte
    if (!isAuthenticated) {
      hasTriggeredPermissions.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Demander les permissions seulement si :
    // - L'utilisateur est connecté ET authentifié (pas en phase d'OTP)
    // - L'app est prête
    // - Les permissions n'ont pas déjà été demandées
    // - On n'a pas déjà déclenché les permissions pour cette session
    // - L'utilisateur a vérifié son OTP (is_otp_verified !== false)
    if (
      isAuthenticated && 
      user && 
      user.is_otp_verified !== false && // S'assurer que l'OTP est vérifié
      isAppReady && 
      !hasRequestedPermissions && 
      !hasTriggeredPermissions.current
    ) {
      hasTriggeredPermissions.current = true;
      
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