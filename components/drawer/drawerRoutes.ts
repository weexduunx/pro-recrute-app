// components/drawer/drawerRoutes.ts

export const allowedDrawerRoutesByRole: Record<string, string[]> = {
  user: ['home', 'profile-details','dashboard', 'job_board', 'candidature', 'actualites',  'settings'],
  interimaire: ['profile-details','(interimaire)','dashboard','candidature', 'job_board', 'settings'],
  admin: ['home', 'profile-details', 'dashboard', 'settings'],
};

export const defaultRoutes = ['home', 'profile-details', 'settings'];
