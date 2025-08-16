// components/SecurityProvider.tsx - Zero-Trust Security Context
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState, Alert, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Application from 'expo-application';
import { 
  validateSession, 
  invalidateSession, 
  detectAndRespondToIntrusion,
  generateDeviceFingerprint 
} from '../utils/security';

interface SecurityContextType {
  isSecurityActive: boolean;
  deviceTrustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'COMPROMISED';
  lastSecurityCheck: number;
  performSecurityCheck: () => Promise<boolean>;
  reportSecurityIncident: (incident: SecurityIncident) => Promise<void>;
  isDeviceRooted: boolean;
  isDebugMode: boolean;
}

interface SecurityIncident {
  type: 'unauthorized_access' | 'device_tampering' | 'network_anomaly' | 'suspicious_activity';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: any;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  const [isSecurityActive, setIsSecurityActive] = useState(false);
  const [deviceTrustLevel, setDeviceTrustLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW' | 'COMPROMISED'>('HIGH');
  const [lastSecurityCheck, setLastSecurityCheck] = useState(Date.now());
  const [isDeviceRooted, setIsDeviceRooted] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(__DEV__);

  // Vérification de sécurité complète
  const performSecurityCheck = async (): Promise<boolean> => {
    try {
      console.log('🔍 Démarrage vérification sécurité...');
      
      let trustScore = 100; // Score initial
      const securityIssues: string[] = [];

      // 1. Vérifier l'intégrité de l'appareil
      const rootedCheck = await checkDeviceIntegrity();
      if (rootedCheck.isCompromised) {
        trustScore -= 40;
        securityIssues.push('Appareil rooté/jailbreaké détecté');
        setIsDeviceRooted(true);
      }

      // 2. Vérifier les capacités biométriques
      const biometricCheck = await checkBiometricSecurity();
      if (!biometricCheck.isSecure) {
        trustScore -= 20;
        securityIssues.push('Sécurité biométrique insuffisante');
      }

      // 3. Vérifier l'environnement d'exécution
      const environmentCheck = checkExecutionEnvironment();
      if (environmentCheck.isDebug && !__DEV__) {
        trustScore -= 30;
        securityIssues.push('Environnement de debug détecté en production');
      }

      // 4. Vérifier la session utilisateur
      const sessionValid = await validateSession();
      if (!sessionValid) {
        trustScore -= 25;
        securityIssues.push('Session utilisateur expirée ou invalide');
      }

      // 5. Déterminer le niveau de confiance
      let newTrustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'COMPROMISED';
      if (trustScore >= 80) {
        newTrustLevel = 'HIGH';
      } else if (trustScore >= 60) {
        newTrustLevel = 'MEDIUM';
      } else if (trustScore >= 40) {
        newTrustLevel = 'LOW';
      } else {
        newTrustLevel = 'COMPROMISED';
      }

      setDeviceTrustLevel(newTrustLevel);
      setLastSecurityCheck(Date.now());

      // 6. Actions selon le niveau de confiance
      if (newTrustLevel === 'COMPROMISED') {
        await handleCompromisedDevice(securityIssues);
        setIsSecurityActive(false);
        return false;
      } else if (newTrustLevel === 'LOW') {
        await showSecurityWarning(securityIssues);
      }

      setIsSecurityActive(true);
      console.log(`✅ Vérification sécurité terminée. Niveau: ${newTrustLevel} (Score: ${trustScore})`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification sécurité:', error);
      await reportSecurityIncident({
        type: 'suspicious_activity',
        description: 'Échec de la vérification de sécurité',
        severity: 'HIGH',
        metadata: { error: error.message }
      });
      return false;
    }
  };

  // Vérifier l'intégrité de l'appareil (root/jailbreak)
  const checkDeviceIntegrity = async () => {
    try {
      // Vérifications Android
      if (Platform.OS === 'android') {
        // Ces vérifications sont des exemples - à adapter selon les besoins
        const suspiciousApps = [
          'com.koushikdutta.superuser',
          'com.noshufou.android.su',
          'com.thirdparty.superuser',
          'com.yellowes.su',
          'com.chainfire.supersu',
        ];
        
        // Dans un vrai projet, utiliser une lib spécialisée comme react-native-root-detection
        const hasRootAccess = false; // Placeholder
        
        if (hasRootAccess) {
          return { isCompromised: true, reason: 'Root access detected' };
        }
      }
      
      // Vérifications iOS
      if (Platform.OS === 'ios') {
        // Vérifier les signes de jailbreak
        const jailbreakPaths = [
          '/Applications/Cydia.app',
          '/Library/MobileSubstrate/',
          '/var/cache/apt/',
          '/var/lib/apt/',
          '/usr/sbin/sshd',
        ];
        
        // Dans un vrai projet, utiliser des méthodes natives
        const hasJailbreak = false; // Placeholder
        
        if (hasJailbreak) {
          return { isCompromised: true, reason: 'Jailbreak detected' };
        }
      }
      
      return { isCompromised: false, reason: null };
    } catch (error) {
      console.error('Erreur vérification intégrité appareil:', error);
      return { isCompromised: true, reason: 'Unable to verify device integrity' };
    }
  };

  // Vérifier la sécurité biométrique
  const checkBiometricSecurity = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      const isSecure = hasHardware && isEnrolled && supportedTypes.length > 0;
      
      return {
        isSecure,
        hasHardware,
        isEnrolled,
        supportedTypes
      };
    } catch (error) {
      console.error('Erreur vérification biométrique:', error);
      return { isSecure: false };
    }
  };

  // Vérifier l'environnement d'exécution
  const checkExecutionEnvironment = () => {
    const isDebug = __DEV__;
    const isEmulator = !Application.isDevice;
    
    return {
      isDebug,
      isEmulator,
      isProduction: !isDebug && Application.isDevice
    };
  };

  // Gérer un appareil compromis
  const handleCompromisedDevice = async (issues: string[]) => {
    console.error('🚨 APPAREIL COMPROMIS DÉTECTÉ:', issues);
    
    // Invalider toutes les sessions
    await invalidateSession();
    
    // Rapporter l'incident
    await reportSecurityIncident({
      type: 'device_tampering',
      description: 'Appareil compromis détecté',
      severity: 'CRITICAL',
      metadata: { issues }
    });
    
    // Alerter l'utilisateur
    Alert.alert(
      '🚨 Sécurité Compromise',
      'Votre appareil présente des risques de sécurité. L\'application sera fermée pour votre protection.',
      [
        {
          text: 'Fermer l\'application',
          style: 'destructive',
          onPress: () => {
            // Fermer l'application (méthode dépendant de la plateforme)
            if (Platform.OS === 'android') {
              // BackHandler.exitApp(); // Nécessite import
            }
          }
        }
      ],
      { cancelable: false }
    );
  };

  // Afficher un avertissement de sécurité
  const showSecurityWarning = async (issues: string[]) => {
    Alert.alert(
      '⚠️ Avertissement Sécurité',
      `Problèmes détectés:\n\n${issues.join('\n')}\n\nVotre sécurité pourrait être compromise.`,
      [
        { text: 'Continuer avec précaution', style: 'default' },
        { text: 'Renforcer la sécurité', style: 'cancel', onPress: () => {} }
      ]
    );
  };

  // Rapporter un incident de sécurité
  const reportSecurityIncident = async (incident: SecurityIncident) => {
    try {
      const deviceFingerprint = await generateDeviceFingerprint();
      const incidentReport = {
        ...incident,
        timestamp: Date.now(),
        deviceFingerprint,
        appVersion: Application.nativeApplicationVersion,
        platform: Platform.OS,
        platformVersion: Platform.Version,
      };
      
      console.warn('🚨 INCIDENT SÉCURITÉ:', incidentReport);
      
      // Envoyer au service de détection d'intrusion
      await detectAndRespondToIntrusion({
        type: incident.type,
        ...incidentReport
      });
      
      // Dans un vrai projet, envoyer aussi au serveur de monitoring
      // await sendToSecurityMonitoring(incidentReport);
      
    } catch (error) {
      console.error('Erreur rapport incident sécurité:', error);
    }
  };

  // Surveiller les changements d'état de l'application
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Vérification de sécurité à chaque retour en premier plan
        const timeSinceLastCheck = Date.now() - lastSecurityCheck;
        if (timeSinceLastCheck > 300000) { // 5 minutes
          performSecurityCheck();
        }
      } else if (nextAppState === 'background') {
        // Détecter si l'app reste trop longtemps en arrière-plan
        setTimeout(() => {
          if (AppState.currentState === 'background') {
            invalidateSession();
          }
        }, 900000); // 15 minutes
      }
    });

    return () => subscription.remove();
  }, [lastSecurityCheck]);

  // Vérification initiale au montage
  useEffect(() => {
    performSecurityCheck();
  }, []);

  const value: SecurityContextType = {
    isSecurityActive,
    deviceTrustLevel,
    lastSecurityCheck,
    performSecurityCheck,
    reportSecurityIncident,
    isDeviceRooted,
    isDebugMode,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};