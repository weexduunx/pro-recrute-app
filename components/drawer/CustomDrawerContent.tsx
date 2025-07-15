
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useAuth } from '../AuthProvider';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../LanguageContext';
import { allowedDrawerRoutesByRole, defaultRoutes } from './drawerRoutes';

export default function CustomDrawerContent(props: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const allowedRoutes = allowedDrawerRoutesByRole[user?.role || ''] || defaultRoutes;

  const filteredState = {
    ...props.state,
    routes: props.state.routes.filter((route: any) =>
      allowedRoutes.includes(route.name)
    ),
    index: Math.min(props.state.index, allowedRoutes.length - 1),
  };

  return (
    <View style={[styles.drawerContainer, { backgroundColor: colors.primary }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
            {t('Bienvenue')} {user?.name}
          </Text>
          <Text style={{ color: '#ccc', fontSize: 12 }}>
            {user?.role === 'user' ? 'Candidat' : user?.role === 'interimaire' ? 'Agent Intérimaire' : user?.role}
          </Text>
        </View>
        <DrawerItemList {...props} state={filteredState} />
      </DrawerContentScrollView>

      <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
        <Image
          source={require('../../assets/images/logo-gbg-white.png')}
          style={styles.logo}
          resizeMode="contain"
        />
         <Text style={[styles.gbgAdresse, { color: colors.textSecondary }]}>
          {t('Ouest Foire Cité Khadar Lot 3 | Dakar, Sénégal')}
        </Text>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          {t(`copyright © ${new Date().getFullYear()} Tous droits réservés | GBG SI`)}
        </Text>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          {t('Version 1.0.0')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  logo: { width: 80, height: 80, marginBottom: 8 },
  footerText: { fontSize: 11, fontWeight: '400', textAlign: 'center' },
  gbgAdresse: { fontSize: 12, fontWeight: '400', textAlign: 'center', marginBottom: 4 },
  versionText: { fontSize: 11, fontWeight: '400', textAlign: 'center', marginBottom: 2 },
});
