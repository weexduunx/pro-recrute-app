import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ModalProps
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

interface UnifiedModalProps extends Omit<ModalProps, 'children'> {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  rightHeaderComponent?: React.ReactNode;
  scrollable?: boolean;
  fullHeight?: boolean;
}

export default function UnifiedModal({
  visible,
  onClose,
  title,
  children,
  rightHeaderComponent,
  scrollable = true,
  fullHeight = false,
  ...modalProps
}: UnifiedModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      {...modalProps}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer,
          fullHeight && styles.fullHeightContainer,
          { backgroundColor: colors.background }
        ]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: '#091e60' }]}>
              {title}
            </Text>
            <View style={styles.headerRight}>
              {rightHeaderComponent}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <FontAwesome5 name="times" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          {scrollable ? (
            <ScrollView 
              style={styles.modalContentScrollable}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContentContainer}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.modalContentStatic}>
              {children}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Composant pour section avec icône et titre (réutilisable)
interface ModalSectionProps {
  icon?: string;
  title?: string;
  children: React.ReactNode;
  last?: boolean;
}

export function ModalSection({ icon, title, children, last = false }: ModalSectionProps) {
  const { colors } = useTheme();

  // Mapping d'icônes pour éviter les erreurs FontAwesome5
  const getValidIcon = (iconName?: string) => {
    const iconMap: { [key: string]: { icon: any; name: string } } = {
      'smartphone': { icon: Feather, name: 'smartphone' },
      'shield': { icon: Feather, name: 'shield' },
      'info': { icon: Feather, name: 'info' },
      'camera': { icon: FontAwesome5, name: 'camera' },
      'images': { icon: FontAwesome5, name: 'images' },
      'map-marker-alt': { icon: FontAwesome5, name: 'map-marker-alt' },
      'bell': { icon: FontAwesome5, name: 'bell' },
      'folder': { icon: FontAwesome5, name: 'folder' },
      'microphone': { icon: FontAwesome5, name: 'microphone' },
      'mobile-alt': { icon: FontAwesome5, name: 'mobile-alt' },
      'shield-alt': { icon: FontAwesome5, name: 'shield-alt' },
      'info-circle': { icon: FontAwesome5, name: 'info-circle' },
      'archive': { icon: FontAwesome5, name: 'archive' },
      'trash': { icon: FontAwesome5, name: 'trash' },
    };

    return iconMap[iconName || ''] || { icon: FontAwesome5, name: iconName || 'question' };
  };

  return (
    <View style={[
      styles.modalSection,
      !last && { borderBottomColor: colors.border },
      last && { borderBottomWidth: 0 }
    ]}>
      {(icon || title) && (
        <View style={styles.modalSectionHeader}>
          {icon && (() => {
            const { icon: IconComponent, name } = getValidIcon(icon);
            return <IconComponent name={name} size={16} color="#091e60" />;
          })()}
          {title && (
            <Text style={[
              styles.modalSectionTitle,
              { color: '#091e60' },
              !icon && { marginLeft: 0 }
            ]}>
              {title}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

// Composants de texte stylisés
interface ModalTextProps {
  children: React.ReactNode;
  variant?: 'normal' | 'bold' | 'secondary';
  style?: any;
}

export function ModalText({ children, variant = 'normal', style }: ModalTextProps) {
  const { colors } = useTheme();
  
  const textStyles = {
    normal: { color: colors.textSecondary },
    bold: { color: '#091e60', fontWeight: '600' as const, fontSize: 16 },
    secondary: { color: colors.textSecondary, fontStyle: 'italic' as const, fontSize: 13 }
  };

  return (
    <Text style={[styles.modalText, textStyles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  fullHeightContainer: {
    maxHeight: '95%',
    height: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#091e60',
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalContentScrollable: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  modalContentStatic: {
    flex: 1,
    padding: 20,
    minHeight: 200,
  },
  modalSection: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091e60',
    marginLeft: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});