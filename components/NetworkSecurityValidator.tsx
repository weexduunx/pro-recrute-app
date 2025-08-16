// components/NetworkSecurityValidator.tsx - Network Security Layer
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import { detectAndRespondToIntrusion } from '../utils/security';

interface NetworkSecurityContextType {
  isNetworkSecure: boolean;
  networkType: string;
  isVpnDetected: boolean;
  locationSecure: boolean;
  performNetworkSecurityCheck: () => Promise<boolean>;
}

const NetworkSecurityContext = createContext<NetworkSecurityContextType | undefined>(undefined);

interface NetworkSecurityProviderProps {
  children: ReactNode;
}

export const NetworkSecurityProvider = ({ children }: NetworkSecurityProviderProps) => {
  const [isNetworkSecure, setIsNetworkSecure] = useState(false);
  const [networkType, setNetworkType] = useState('unknown');
  const [isVpnDetected, setIsVpnDetected] = useState(false);
  const [locationSecure, setLocationSecure] = useState(false);

  // Vérification complète de la sécurité réseau
  const performNetworkSecurityCheck = async (): Promise<boolean> => {
    try {
      console.log('🌐 Vérification sécurité réseau...');
      
      let securityScore = 100;
      const securityIssues: string[] = [];

      // 1. Vérifier l'état du réseau
      const networkState = await Network.getNetworkStateAsync();
      
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        securityScore -= 50;
        securityIssues.push('Connexion réseau instable');
        setIsNetworkSecure(false);
        return false;
      }

      setNetworkType(networkState.type || 'unknown');

      // 2. Détecter les VPN (signe possible de contournement)
      const vpnDetected = await detectVPN();
      setIsVpnDetected(vpnDetected);
      
      if (vpnDetected) {
        securityScore -= 20;
        securityIssues.push('VPN détecté - connexion potentiellement masquée');
        
        // Alerter l'utilisateur sans bloquer complètement
        Alert.alert(
          '🛡️ VPN Détecté',
          'Vous utilisez un VPN. Assurez-vous qu\'il s\'agit d\'un service de confiance.',
          [{ text: 'Compris' }]
        );
      }

      // 3. Vérifier la localisation (détection de géofencing)
      const locationCheck = await checkLocationSecurity();
      setLocationSecure(locationCheck.isSecure);
      
      if (!locationCheck.isSecure) {
        securityScore -= 15;
        securityIssues.push(locationCheck.reason || 'Localisation suspecte');
      }

      // 4. Vérifier l'intégrité DNS
      const dnsCheck = await checkDNSIntegrity();
      if (!dnsCheck.isSecure) {
        securityScore -= 25;
        securityIssues.push('Configuration DNS suspecte détectée');
        
        await detectAndRespondToIntrusion({
          type: 'network_anomaly',
          description: 'DNS manipulation suspectée',
          metadata: { dnsIssues: dnsCheck.issues }
        });
      }

      // 5. Test de connectivité vers nos serveurs
      const serverConnectivity = await testServerConnectivity();
      if (!serverConnectivity.isReachable) {
        securityScore -= 30;
        securityIssues.push('Impossible d\'atteindre les serveurs sécurisés');
      }

      // Déterminer la sécurité globale
      const isSecure = securityScore >= 70;
      setIsNetworkSecure(isSecure);

      if (!isSecure) {
        console.warn('⚠️ Problèmes de sécurité réseau:', securityIssues);
        
        Alert.alert(
          '⚠️ Sécurité Réseau',
          `Problèmes détectés:\n\n${securityIssues.join('\n')}\n\nLa sécurité de vos données pourrait être compromise.`,
          [
            { text: 'Continuer', style: 'default' },
            { text: 'Paramètres Réseau', style: 'cancel', onPress: openNetworkSettings }
          ]
        );
      }

      console.log(`🌐 Sécurité réseau: ${isSecure ? 'SÉCURISÉ' : 'RISQUÉ'} (Score: ${securityScore})`);
      
      return isSecure;
    } catch (error) {
      console.error('❌ Erreur vérification sécurité réseau:', error);
      setIsNetworkSecure(false);
      return false;
    }
  };

  // Détecter l'utilisation d'un VPN
  const detectVPN = async (): Promise<boolean> => {
    try {
      // Méthode 1: Vérifier les interfaces réseau (Android)
      if (Platform.OS === 'android') {
        // Dans un vrai projet, utiliser une lib native pour vérifier les interfaces tun/tap
        // Placeholder pour la détection VPN
        return false;
      }

      // Méthode 2: Vérifier les proxy système (iOS)
      if (Platform.OS === 'ios') {
        // Dans un vrai projet, vérifier les paramètres proxy via native modules
        return false;
      }

      // Méthode 3: Test de géolocalisation IP vs GPS
      const geoLocationCheck = await compareIPvsGPSLocation();
      return geoLocationCheck.vpnSuspected;
      
    } catch (error) {
      console.error('Erreur détection VPN:', error);
      return false;
    }
  };

  // Comparer la localisation IP vs GPS pour détecter les VPN
  const compareIPvsGPSLocation = async () => {
    try {
      // Obtenir la localisation GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { vpnSuspected: false, reason: 'GPS permission denied' };
      }

      const gpsLocation = await Location.getCurrentPositionAsync({});
      
      // Obtenir la localisation IP (via service externe)
      const ipLocationResponse = await fetch('https://ipapi.co/json/');
      const ipLocation = await ipLocationResponse.json();
      
      // Calculer la distance entre GPS et IP
      const distance = calculateDistance(
        gpsLocation.coords.latitude,
        gpsLocation.coords.longitude,
        ipLocation.latitude,
        ipLocation.longitude
      );
      
      // Si la distance > 100km, c'est suspect
      const vpnSuspected = distance > 100;
      
      if (vpnSuspected) {
        console.warn(`🚨 Distance GPS/IP suspecte: ${distance.toFixed(2)}km`);
      }
      
      return { 
        vpnSuspected, 
        distance, 
        gpsCountry: gpsLocation.coords,
        ipCountry: ipLocation.country_name 
      };
      
    } catch (error) {
      console.error('Erreur comparaison géolocalisation:', error);
      return { vpnSuspected: false, reason: 'Unable to compare locations' };
    }
  };

  // Calculer la distance entre deux points GPS
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Vérifier la sécurité de la localisation
  const checkLocationSecurity = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return { 
          isSecure: false, 
          reason: 'Permissions de localisation refusées - géofencing impossible' 
        };
      }

      const location = await Location.getCurrentPositionAsync({});
      
      // Vérifier si nous sommes dans une région à haut risque
      // (Cette liste devrait être configurée selon vos besoins)
      const highRiskRegions = [
        // Exemples de coordonnées à risque - à adapter
        { name: 'Zone Test', lat: 0, lon: 0, radius: 10 }
      ];
      
      for (const region of highRiskRegions) {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          region.lat,
          region.lon
        );
        
        if (distance < region.radius) {
          return {
            isSecure: false,
            reason: `Localisation dans une zone à risque: ${region.name}`
          };
        }
      }
      
      return { isSecure: true };
      
    } catch (error) {
      console.error('Erreur vérification localisation:', error);
      return { 
        isSecure: false, 
        reason: 'Impossible de vérifier la localisation' 
      };
    }
  };

  // Vérifier l'intégrité DNS
  const checkDNSIntegrity = async () => {
    try {
      const dnsTests = [
        'google.com',
        'cloudflare.com',
        'your-api-domain.com' // Remplacer par votre domaine
      ];
      
      const issues: string[] = [];
      
      for (const domain of dnsTests) {
        try {
          const startTime = Date.now();
          await fetch(`https://${domain}`, { 
            method: 'HEAD', 
            timeout: 5000 
          });
          const responseTime = Date.now() - startTime;
          
          // Temps de réponse anormalement long
          if (responseTime > 10000) {
            issues.push(`Temps de réponse DNS lent pour ${domain}: ${responseTime}ms`);
          }
          
        } catch (error) {
          issues.push(`Échec résolution DNS pour ${domain}`);
        }
      }
      
      return {
        isSecure: issues.length === 0,
        issues
      };
      
    } catch (error) {
      console.error('Erreur vérification DNS:', error);
      return {
        isSecure: false,
        issues: ['Erreur lors de la vérification DNS']
      };
    }
  };

  // Tester la connectivité vers nos serveurs
  const testServerConnectivity = async () => {
    try {
      const servers = [
        process.env.EXPO_PUBLIC_API_URL || 'https://api.pro-recrute.com',
        'https://backup-api.pro-recrute.com' // Serveur de backup
      ];
      
      let reachableCount = 0;
      
      for (const server of servers) {
        try {
          const response = await fetch(`${server}/health`, { 
            method: 'HEAD',
            timeout: 5000 
          });
          
          if (response.ok) {
            reachableCount++;
          }
        } catch (error) {
          console.warn(`Serveur non accessible: ${server}`);
        }
      }
      
      return {
        isReachable: reachableCount > 0,
        reachableCount,
        totalServers: servers.length
      };
      
    } catch (error) {
      console.error('Erreur test connectivité serveurs:', error);
      return { isReachable: false, reachableCount: 0, totalServers: 0 };
    }
  };

  // Ouvrir les paramètres réseau
  const openNetworkSettings = () => {
    Alert.alert(
      'Paramètres Réseau',
      'Veuillez vérifier:\n\n• Votre connexion WiFi/Mobile\n• Les paramètres VPN\n• Les paramètres DNS\n• La localisation GPS',
      [{ text: 'OK' }]
    );
  };

  // Vérification automatique périodique
  useEffect(() => {
    performNetworkSecurityCheck();
    
    const interval = setInterval(() => {
      performNetworkSecurityCheck();
    }, 300000); // Toutes les 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  const value: NetworkSecurityContextType = {
    isNetworkSecure,
    networkType,
    isVpnDetected,
    locationSecure,
    performNetworkSecurityCheck,
  };

  return (
    <NetworkSecurityContext.Provider value={value}>
      {children}
    </NetworkSecurityContext.Provider>
  );
};

export const useNetworkSecurity = () => {
  const context = useContext(NetworkSecurityContext);
  if (!context) {
    throw new Error('useNetworkSecurity must be used within a NetworkSecurityProvider');
  }
  return context;
};