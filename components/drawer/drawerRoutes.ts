// components/drawer/drawerRoutes.ts

export const allowedDrawerRoutesByRole: Record<string, string[]> = {
  user: ['home', 'profile-details','dashboard','entretiens', 'job_board', 'candidature', 'actualites',  'settings'],
  interimaire: ['profile-details','(interimaire)', 'dashboard', 'entretiens','candidature', 'job_board', 'settings'],
  admin: ['home', 'profile-details', 'dashboard', 'messages', 'video-interview', 'settings'],
};

export const defaultRoutes = ['home', 'profile-details', 'settings'];
