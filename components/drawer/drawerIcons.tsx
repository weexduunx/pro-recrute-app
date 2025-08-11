// components/drawer/drawerIcons.ts

import React from 'react';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';

type IconRenderer = (color: string, size: number) => React.ReactNode;

export const drawerIcons: Record<string, IconRenderer> = {
  home: (color, size) => <FontAwesome5 name="home" size={size} color={color} />,
  'profile-details': (color, size) => <FontAwesome5 name="user-circle" size={size} color={color} />,
  job_board: (color, size) => <FontAwesome name="briefcase" size={size} color={color} />,
  candidature: (color, size) => <FontAwesome name="file-text" size={size} color={color} />,
  actualites: (color, size) => <FontAwesome name="newspaper-o" size={size} color={color} />,
  dashboard: (color, size) => <FontAwesome name="dashboard" size={size} color={color} />,
  settings: (color, size) => <FontAwesome5 name="cog" size={size} color={color} />,
  '(interimaire)': (color, size) => <Ionicons name="business" size={size} color={color} />,
  entretiens: (color, size) => <FontAwesome name="calendar" size={size} color={color} />,
   'hr_file': (color, size) => <FontAwesome name="folder" size={size} color={color} />,
  'ipm_file': (color, size) => <FontAwesome name="medkit" size={size} color={color} />,
};
