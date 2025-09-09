import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// Configuration des IDs client Google - doit correspondre au projet dans google-services.json
const GOOGLE_WEB_CLIENT_ID = '259055828314-tsskg52hvujjphttin0t4fh6d5ri8tvf.apps.googleusercontent.com';

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private initialized = false;

  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
      });
      
      this.initialized = true;
      console.log('✅ Google Sign-In configuré avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la configuration Google Sign-In:', error);
      throw error;
    }
  }

  async signIn(): Promise<{
    idToken: string;
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      photo?: string;
    };
  }> {
    try {
      // S'assurer que Google Sign-In est initialisé
      await this.initialize();

      // Vérifier si Google Play Services est disponible (Android uniquement)
      await GoogleSignin.hasPlayServices();

      // Effectuer la connexion
      const userInfo = await GoogleSignin.signIn();
      
      console.log('✅ Données Google reçues:', JSON.stringify(userInfo, null, 2));
      
      // Vérifier la structure des données (les données sont dans userInfo.data)
      const userData = userInfo.data || userInfo;
      if (!userData || !userData.user) {
        throw new Error('Données utilisateur Google invalides');
      }

      console.log('✅ Connexion Google réussie:', {
        id: userData.user.id,
        name: userData.user.name,
        email: userData.user.email
      });

      // Obtenir les tokens
      const tokens = await GoogleSignin.getTokens();

      return {
        idToken: userData.idToken!,
        accessToken: tokens.accessToken,
        user: {
          id: userData.user.id,
          name: userData.user.name!,
          email: userData.user.email,
          photo: userData.user.photo || undefined
        }
      };

    } catch (error: any) {
      console.error('❌ Erreur lors de la connexion Google:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Connexion Google annulée par l\'utilisateur');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Connexion Google déjà en cours');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services non disponible');
      } else {
        throw new Error('Erreur lors de la connexion Google: ' + error.message);
      }
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      console.log('✅ Déconnexion Google réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion Google:', error);
      throw error;
    }
  }

  async isSignedIn(): Promise<boolean> {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut Google:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      return await GoogleSignin.getCurrentUser();
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur Google:', error);
      return null;
    }
  }
}

export const googleAuth = GoogleAuthService.getInstance();