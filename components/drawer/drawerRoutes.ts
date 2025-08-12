// components/drawer/drawerRoutes.ts

export const allowedDrawerRoutesByRole: Record<string, string[]> = {
  user: [
    'home', 
    'dashboard', 
    'profile-details', 
    'job_board', 
    'ai-recommendations', 
    'candidature', 
    'entretiens', 
    'actualites', 
    'settings'
  ],
  interimaire: [
    'dashboard', 
    'profile-details', 
    '(interimaire)', 
    'job_board', 
    'candidature', 
    'entretiens', 
    'settings'
  ],
  admin: [
    'home', 
    'dashboard', 
    'profile-details', 
    'messages', 
    'video-interview', 
    'settings'
  ],
};

export const defaultRoutes = ['home', 'dashboard', 'profile-details', 'settings'];
