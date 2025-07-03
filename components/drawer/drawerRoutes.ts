// components/drawer/drawerRoutes.ts

export const allowedDrawerRoutesByRole: Record<string, string[]> = {
  user: ['home', 'profile-details', 'job_board', 'candidature', 'actualites', 'dashboard', 'settings'],
  interimaire: ['(interimaire)', 'profile-details', 'settings'],
  admin: ['home', 'profile-details', 'dashboard', 'settings'],
};

export const defaultRoutes = ['home', 'profile-details', 'settings'];
