import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import { useAuth, hasPasswordBeenSetup } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageContext';
import Toast from 'react-native-toast-message';
import { apiRequest, getInterimProfile, markTokenAsRecentlySet } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Page de traitement du callback LinkedIn
 * Cette page est appelée après l'authentification LinkedIn via deep linking
 */
export default function LinkedInCallback() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const {
    setUser,
    setToken,
    setError: setAuthError,
    setLoading: setAuthLoading,
    showPasswordSetupModalForProvider,
    handleRedirect
  } = useAuth();
  const params = useLocalSearchParams();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Traitement de l\'authentification LinkedIn...');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Protection contre les appels multiples
    if (!isProcessing && params.code) {
      handleLinkedInCallback();
    }
  }, [params.code, isProcessing]);

  const handleLinkedInCallback = async () => {
    if (isProcessing) {
      console.log('LinkedIn callback already processing, skipping...');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('LinkedIn callback params:', params);
      
      const { code, state, error, error_description } = params;

      if (error) {
        // console.error('LinkedIn error:', error, error_description);
        setStatus('error');
        setMessage(`Erreur LinkedIn: ${error} - ${error_description}`);
        
        Toast.show({
          type: 'error',
          text1: 'Erreur LinkedIn',
          text2: error_description || 'Une erreur est survenue lors de l\'authentification'
        });

        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          router.replace('/(auth)');
        }, 3000);
        return;
      }

      if (!code) {
        // console.error('No authorization code received');
        setStatus('error');
        setMessage('Code d\'autorisation manquant');
        
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Code d\'autorisation LinkedIn manquant'
        });

        setTimeout(() => {
          router.replace('/(auth)');
        }, 3000);
        return;
      }

      setMessage('Finalisation de la connexion...');
      console.log('Processing LinkedIn auth with code:', code);

      // Vérifier si ce code a déjà été utilisé (protection contre double traitement)
      const usedCodesData = await AsyncStorage.getItem('used_linkedin_codes');
      const usedCodes = usedCodesData ? JSON.parse(usedCodesData) : {};
      const now = Date.now();
      
      // Nettoyer les codes expirés (plus de 10 minutes)
      Object.keys(usedCodes).forEach(storedCode => {
        if (now - usedCodes[storedCode].timestamp > 10 * 60 * 1000) {
          delete usedCodes[storedCode];
        }
      });
      
      if (usedCodes[code]) {
        const codeData = usedCodes[code];
        console.log('Code LinkedIn déjà utilisé:', codeData);
        
        if (codeData.success) {
          setStatus('success');
          setMessage('Vous êtes déjà connecté ! Redirection...');
          // Laisser AuthProvider gérer la redirection automatiquement
          return;
        } else {
          throw new Error('Ce code d\'authentification a déjà été utilisé. Veuillez recommencer.');
        }
      }

      // Marquer le code comme en cours de traitement
      usedCodes[code] = {
        timestamp: now,
        success: false,
        processing: true
      };
      await AsyncStorage.setItem('used_linkedin_codes', JSON.stringify(usedCodes));
      
      setAuthLoading(true);
      setAuthError(null);

      // Envoyer le code d'autorisation au backend
      const response = await apiRequest('/auth/linkedin/token', {
        method: 'POST',
        body: {
          code,
          state
        }
      });

      if (response.success) {
        const { user: userFromApi, token: tokenFromApi } = response;
        
        // Sauvegarder le token et mettre à jour le contexte
        await AsyncStorage.setItem('user_token', tokenFromApi);
        
        // Marquer le token comme récemment défini pour éviter sa suppression automatique
        markTokenAsRecentlySet();
        
        setToken(tokenFromApi);
        
        // Attendre un peu pour laisser le token se propager
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Récupérer le profil intérimaire si nécessaire
        if (userFromApi?.role === 'interimaire') {
          try {
            const interimProfile = await getInterimProfile();
            if (interimProfile) {
              userFromApi.is_contract_active = interimProfile.is_contract_active;
              userFromApi.interim_profile = interimProfile;
            }
          } catch (error) {
            console.warn('Erreur lors de la récupération du profil intérimaire:', error);
          }
        }
        
        setUser(userFromApi);

        // Vérifier si l'utilisateur doit configurer son mot de passe
        // Mais seulement s'il ne l'a pas déjà fait
        const hasAlreadySetupPassword = await hasPasswordBeenSetup(userFromApi.email);
        if (response.requires_password_setup && tokenFromApi && !hasAlreadySetupPassword) {
          // Afficher le modal automatiquement
          showPasswordSetupModalForProvider('linkedin', tokenFromApi);

          // Et aussi afficher le toast pour informer de l'email
          Toast.show({
            type: 'info',
            text1: 'Configuration du mot de passe',
            text2: 'Un email vous a été envoyé pour sécuriser votre compte',
            visibilityTime: 6000,
          });
        }

        console.log('✅ Connexion LinkedIn réussie pour:', userFromApi.email);

        // Déclencher la redirection basée sur le rôle
        handleRedirect(true, userFromApi?.role, userFromApi?.is_otp_verified, userFromApi?.is_contract_active);
        
        // Marquer le code comme réussi
        const updatedCodes = await AsyncStorage.getItem('used_linkedin_codes');
        const codesData = updatedCodes ? JSON.parse(updatedCodes) : {};
        codesData[code] = {
          timestamp: now,
          success: true,
          processing: false,
          email: userFromApi.email
        };
        await AsyncStorage.setItem('used_linkedin_codes', JSON.stringify(codesData));
        
        setStatus('success');
        setMessage('Connexion réussie ! Redirection...');
        
        Toast.show({
          type: 'success',
          text1: 'Connexion réussie',
          text2: 'Bienvenue dans Pro Recrute !'
        });

        // La redirection a été déclenchée par handleRedirect ci-dessus
        
      } else {
        // Marquer le code comme échoué
        const updatedCodes = await AsyncStorage.getItem('used_linkedin_codes');
        const codesData = updatedCodes ? JSON.parse(updatedCodes) : {};
        codesData[code] = {
          timestamp: now,
          success: false,
          processing: false,
          error: response.message || 'Erreur lors de l\'authentification LinkedIn'
        };
        await AsyncStorage.setItem('used_linkedin_codes', JSON.stringify(codesData));
        
        throw new Error(response.message || 'Erreur lors de l\'authentification LinkedIn');
      }

    } catch (error: any) {
      // console.error('LinkedIn callback error:', error);
      
      // Marquer le code comme échoué si on a un code
      if (code) {
        const updatedCodes = await AsyncStorage.getItem('used_linkedin_codes');
        const codesData = updatedCodes ? JSON.parse(updatedCodes) : {};
        codesData[code] = {
          timestamp: Date.now(),
          success: false,
          processing: false,
          error: error.message || 'Erreur lors de l\'authentification LinkedIn'
        };
        await AsyncStorage.setItem('used_linkedin_codes', JSON.stringify(codesData));
      }
      
      setAuthError(error.message || 'Erreur lors de l\'authentification LinkedIn');
      setStatus('error');
      setMessage(`Erreur: ${error.message}`);
      
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: error.message || 'Une erreur est survenue'
      });

      // Rediriger vers la page de connexion
      setTimeout(() => {
        router.replace('/(auth)');
      }, 3000);
    } finally {
      setIsProcessing(false);
      setAuthLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      default: return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {status === 'loading' && (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        )}
        
        {status === 'success' && (
          <View style={[styles.icon, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.iconText}>✓</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={[styles.icon, { backgroundColor: '#F44336' }]}>
            <Text style={styles.iconText}>✕</Text>
          </View>
        )}

        <Text style={[styles.title, { color: colors.text }]}>
          LinkedIn Authentication
        </Text>
        
        <Text style={[styles.message, { color: getStatusColor() }]}>
          {message}
        </Text>

        {status === 'error' && (
          <Text style={[styles.subMessage, { color: colors.textSecondary }]}>
            Redirection vers la page de connexion...
          </Text>
        )}

        {status === 'success' && (
          <Text style={[styles.subMessage, { color: colors.textSecondary }]}>
            Redirection vers le dashboard...
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  loader: {
    marginBottom: 20,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});