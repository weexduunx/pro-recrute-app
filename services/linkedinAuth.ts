import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Configuration LinkedIn OAuth 2.0
const LINKEDIN_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_LINKEDIN_CLIENT_ID || 'YOUR_LINKEDIN_CLIENT_ID', // À configurer dans .env
  redirectUri: 'https://auth.expo.io/@weexduunx88/pro-recrute-gbg/linkedin-callback',
  scope: 'profile email openid', // Permissions demandées selon la doc LinkedIn
  responseType: 'code',
  state: Math.random().toString(36).substring(2, 15) // État aléatoire pour la sécurité
};

export class LinkedInAuthService {
  private static instance: LinkedInAuthService;

  public static getInstance(): LinkedInAuthService {
    if (!LinkedInAuthService.instance) {
      LinkedInAuthService.instance = new LinkedInAuthService();
    }
    return LinkedInAuthService.instance;
  }

  /**
   * Initie le processus d'authentification LinkedIn
   */
  async signIn(): Promise<{
    code: string;
    state: string;
    user: {
      id: string;
      name: string;
      email: string;
      photo?: string;
    };
  }> {
    try {
      console.log('🔗 Démarrage de l\'authentification LinkedIn...');

      // Construire l'URL d'autorisation LinkedIn
      const authUrl = this.buildAuthUrl();
      
      console.log('🌐 Ouverture de LinkedIn OAuth:', authUrl);

      // Ouvrir la page d'authentification LinkedIn
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        LINKEDIN_CONFIG.redirectUri!
      );

      if (result.type === 'success' && result.url) {
        console.log('✅ Redirection LinkedIn reçue:', result.url);
        
        // Extraire le code d'autorisation de l'URL de retour
        const { code, state } = this.parseCallbackUrl(result.url);
        
        if (!code) {
          throw new Error('Code d\'autorisation LinkedIn manquant');
        }

        // Échanger le code contre un access token via votre backend
        console.log('🔄 Échange du code contre un access token...');
        const tokenData = await this.exchangeCodeForToken(code, state);
        
        // Récupérer les informations utilisateur
        console.log('👤 Récupération du profil utilisateur...');
        const userProfile = await this.getUserProfile(tokenData.accessToken);
        
        return {
          code,
          state,
          user: userProfile
        };

      } else if (result.type === 'cancel') {
        throw new Error('Authentification LinkedIn annulée par l\'utilisateur');
      } else {
        throw new Error('Erreur lors de l\'authentification LinkedIn');
      }

    } catch (error: any) {
      console.error('❌ Erreur LinkedIn Auth:', error);
      throw new Error(`Erreur LinkedIn: ${error.message}`);
    }
  }

  /**
   * Construit l'URL d'autorisation LinkedIn selon la documentation officielle
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: LINKEDIN_CONFIG.responseType,
      client_id: LINKEDIN_CONFIG.clientId,
      redirect_uri: LINKEDIN_CONFIG.redirectUri!,
      scope: LINKEDIN_CONFIG.scope,
      state: LINKEDIN_CONFIG.state
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Parse l'URL de callback pour extraire le code et l'état
   */
  private parseCallbackUrl(url: string): { code?: string; state?: string; error?: string } {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const error = urlObj.searchParams.get('error');
    
    return { code: code || undefined, state: state || undefined, error: error || undefined };
  }

  /**
   * Échange le code d'autorisation contre un access token via votre backend
   */
  private async exchangeCodeForToken(code: string, state: string): Promise<{ accessToken: string }> {
    // Cette partie sera gérée par votre backend Laravel
    // Pour l'instant, on retourne une structure de base
    console.log('🔄 Code à échanger:', code);
    
    // Le backend fera l'appel à LinkedIn pour obtenir le token
    // POST https://www.linkedin.com/oauth/v2/accessToken
    
    return { accessToken: 'PLACEHOLDER_TOKEN' };
  }

  /**
   * Récupère le profil utilisateur LinkedIn avec l'access token
   */
  private async getUserProfile(accessToken: string): Promise<{
    id: string;
    name: string;
    email: string;
    photo?: string;
  }> {
    // Cette partie sera également gérée par votre backend
    // Le backend utilisera l'access token pour appeler:
    // GET https://api.linkedin.com/v2/userinfo (OpenID Connect)
    // ou
    // GET https://api.linkedin.com/v2/people/~
    
    console.log('👤 Token pour profil:', accessToken);
    
    return {
      id: 'linkedin_user_id',
      name: 'Utilisateur LinkedIn',
      email: 'user@linkedin.example',
      photo: 'https://media.licdn.com/dms/image/photo.jpg'
    };
  }

  /**
   * Déconnexion LinkedIn (révoque les tokens si nécessaire)
   */
  async signOut(): Promise<void> {
    try {
      console.log('🚪 Déconnexion LinkedIn...');
      // La révocation des tokens sera gérée côté backend
      console.log('✅ Déconnexion LinkedIn réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion LinkedIn:', error);
      throw error;
    }
  }
}

export const linkedinAuth = LinkedInAuthService.getInstance();