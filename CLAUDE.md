# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm install` - Install dependencies
- `npm start` or `expo start` - Start the Expo development server
- `npm run android` or `expo run:android` - Run on Android device/emulator
- `npm run ios` or `expo run:ios` - Run on iOS device/simulator  
- `npm run web` or `expo start --web` - Run web version
- `npm run lint` or `expo lint` - Run ESLint
- `npm run reset-project` - Reset project to clean state

### Build Commands
- Use EAS Build for production builds (see `eas.json`)
- `eas build --platform android` - Build for Android
- `eas build --platform ios` - Build for iOS
- Build profiles: development, preview, production

## Project Architecture

### Tech Stack
- **Framework**: React Native with Expo (~53.0.12)
- **Router**: Expo Router with file-based routing
- **UI**: React Native Paper + custom components
- **State Management**: Context API for auth, theme, language, permissions
- **Backend**: Laravel API (configured in `utils/api.js`)
- **Storage**: AsyncStorage for local data persistence
- **Authentication**: JWT tokens with biometric support

### App Structure
```
app/
├── _layout.tsx           # Root layout with providers
├── (auth)/              # Authentication screens
│   ├── index.tsx        # Login screen
│   ├── register.tsx     # Registration
│   ├── otp_verification.tsx
│   └── onboarding/      # User onboarding flow
├── (app)/               # Main authenticated app
│   ├── dashboard.tsx
│   ├── home.tsx
│   ├── settings.tsx
│   ├── job_board/       # Job listings and details
│   ├── candidature/     # Job applications
│   ├── actualites/      # News/updates
│   └── (interimaire)/   # Temporary worker features
└── (admin)/             # Admin-only screens
```

### Key Components and Contexts
- `AuthProvider` - Authentication state and user management
- `ThemeContext` - Dark/light theme support
- `LanguageContext` - Internationalization
- `SimplePermissionsManager` - Permission handling
- `RouteProtection` - Role-based route guards

### API Configuration
- Base URL configured in `utils/api.js` (currently: `http://192.168.1.144:8000/api`)
- Uses Axios with automatic token injection
- JWT token stored in AsyncStorage
- Handles authentication, profile management, job operations

### Navigation Structure
- Uses Expo Router with nested layouts
- Authentication-based routing (public vs private routes)
- Role-based access control (user, interim, admin)
- Deep linking support with custom scheme: `prorecruteapp`

### Key Features
- **Multi-role Authentication**: Supports candidates, temporary workers, and admins
- **Biometric Authentication**: Uses expo-local-authentication
- **File Management**: Document upload/download with expo-document-picker
- **Push Notifications**: Expo notifications integration
- **Offline Support**: AsyncStorage for data persistence
- **Multi-platform**: iOS, Android, and web support

### Development Notes
- TypeScript enabled with strict mode
- ESLint configured with Expo config
- Uses expo-dev-client for development builds
- Google Services configured for Android
- Supports both light and dark themes
- French language support with internationalization

### Important Files
- `utils/api.js` - API client and backend communication
- `components/AuthProvider.tsx` - Authentication logic
- `app/_layout.tsx` - Root layout and provider setup
- `app.json` - Expo configuration
- `eas.json` - Build configuration

### Environment Setup
- Requires backend Laravel API running (update API_URL in utils/api.js)
- Google Services setup for Android builds
- EAS CLI for production builds
- Expo CLI for development