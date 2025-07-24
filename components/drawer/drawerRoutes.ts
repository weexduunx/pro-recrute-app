// components/drawer/drawerRoutes.ts

export const allowedDrawerRoutesByRole: Record<string, string[]> = {
  user: ['home', 'profile-details', 'job_board', 'candidature', 'actualites', 'dashboard', 'settings'],
  interimaire: ['profile-details','(interimaire)', 'job_board', 'candidature', 'actualites',  'settings'],
  admin: ['home', 'profile-details', 'dashboard', 'settings'],
};

export const defaultRoutes = ['home', 'profile-details', 'settings'];
