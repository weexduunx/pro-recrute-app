# Documentation Pro-Recrute

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation et configuration](#installation-et-configuration)
4. [Structure du projet](#structure-du-projet)
5. [Fonctionnalités](#fonctionnalités)
6. [API et Backend](#api-et-backend)
7. [Base de données](#base-de-données)
8. [Déploiement](#déploiement)
9. [Guide de développement](#guide-de-développement)

---

## Vue d'ensemble

**Pro-Recrute** est une plateforme de recrutement complète composée de :
- **Application mobile** (React Native/Expo) pour candidats et intérimaires (travailleurs temporaires)
- **Backend Laravel** avec API REST et interface d'administration web
- **Base de données MySQL** avec système de recommandations IA

### Technologies principales
- **Frontend Mobile** : React Native 0.79.4, Expo 53.0.12
- **Backend** : Laravel 12.x, PHP 8.2+
- **Base de données** : MySQL
- **Authentification** : Laravel Sanctum + JWT
- **Interface Admin** : Livewire + TailwindCSS + Vite

---

## Architecture

### Architecture globale
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │◄──►│  Laravel API    │◄──►│   MySQL DB      │
│  (React Native) │    │   (Backend)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │ Expo Go │             │  Admin  │             │ Fichiers│
    │ Client  │             │   Web   │             │   SQL   │
    └─────────┘             └─────────┘             └─────────┘
```

### Stack technologique

#### Application Mobile
- **Framework** : React Native avec Expo
- **Routage** : Expo Router (file-based routing)
- **UI** : React Native Paper + composants custom
- **État** : Context API (Auth, Theme, Language, Permissions)
- **Stockage** : AsyncStorage
- **API** : Axios avec intercepteurs JWT
- **Authentification** : JWT + support biométrique

#### Backend Laravel
- **Framework** : Laravel 12.x
- **Authentification** : Laravel Sanctum (API) + Jetstream (web)
- **Frontend** : Livewire + TailwindCSS + Vite
- **Queue** : Redis/Database queues
- **Mail** : Classes Mail Laravel
- **Files** : Système de stockage Laravel

---

## Installation et configuration

### Prérequis
- Node.js 18+ et npm
- PHP 8.2+ et Composer
- MySQL 8.0+
- Expo CLI : `npm install -g @expo/cli`
- EAS CLI : `npm install -g eas-cli`

### Installation Mobile App

```bash
cd pro-recrute-app
npm install                    # Installer les dépendances
npm start                     # Démarrer le serveur Expo
```

#### Scripts disponibles
```bash
npm start                     # Démarrer Expo dev server
npm run android              # Lancer sur Android
npm run ios                  # Lancer sur iOS  
npm run web                  # Version web
npm run lint                 # ESLint
eas build --platform android # Build Android
eas build --platform ios     # Build iOS
```

### Installation Backend Laravel

```bash
cd pro_recrute
composer install              # Dépendances PHP
cp .env.example .env          # Configuration
php artisan key:generate      # Clé d'application
php artisan migrate           # Migrations
php artisan db:seed           # Données de test
php artisan serve            # Serveur dev (port 8000)
```

#### Scripts de développement
```bash
composer dev                 # Tous services (server + queue + vite)
php artisan serve           # Serveur Laravel seul
php artisan queue:work      # Worker de queues
npm run dev                 # Vite dev server
npm run build               # Build assets
php artisan test            # Tests PHPUnit
```

### Configuration de l'API

Modifier `pro-recrute-app/utils/api.js` :
```javascript
const API_BASE_URL = 'http://votre-ip:8000/api';
```

---

## Structure du projet

### Application Mobile (`pro-recrute-app/`)

```
app/
├── _layout.tsx              # Layout racine avec providers
├── (auth)/                  # Écrans d'authentification
│   ├── index.tsx           # Connexion
│   ├── register.tsx        # Inscription
│   ├── otp_verification.tsx
│   └── onboarding/         # Processus d'accueil
├── (app)/                  # Application principale
│   ├── dashboard.tsx       # Tableau de bord
│   ├── home.tsx           # Accueil
│   ├── settings.tsx       # Paramètres
│   ├── job_board/         # Offres d'emploi
│   ├── candidature/       # Candidatures
│   ├── actualites/        # Actualités
│   └── (interimaire)/     # Fonctionnalités intérim
└── (admin)/               # Interface admin
```

#### Composants clés
```
components/
├── AuthProvider.tsx        # Gestion authentification
├── ThemeContext.tsx       # Thèmes (clair/sombre)
├── LanguageContext.tsx    # Internationalisation
├── SimplePermissionsManager.tsx # Permissions
├── UnifiedModal.tsx       # Modales standardisées
└── RouteProtection.tsx    # Protection des routes
```

### Backend Laravel (`pro_recrute/`)

```
app/
├── Http/Controllers/Api/   # Contrôleurs API mobile
├── Http/Controllers/      # Contrôleurs web admin
├── Livewire/             # Composants Livewire
├── Models/               # Modèles Eloquent
├── Services/             # Logique métier
│   └── RecommendationService.php # IA recommandations
├── Mail/                 # Notifications email
└── Observers/            # Observateurs modèles
```

#### Modèles principaux
- **User** : Authentification multi-rôles
- **Candidat** : Profils candidats avec compétences
- **Offre** : Offres d'emploi avec critères
- **CandidatureOffre** : Candidatures
- **Entretien** : Système d'entretiens
- **Entreprise** : Gestion entreprises

---

## Fonctionnalités

### Application Mobile

#### Authentification et profils
- ✅ Connexion/inscription multi-rôles
- ✅ Vérification OTP par email/SMS
- ✅ Authentification biométrique (Face ID/Touch ID)
- ✅ Gestion profil candidat complet
- ✅ Upload CV et parsing automatique
- ✅ Système de compétences et expériences

#### Recherche d'emploi
- ✅ Navigation des offres d'emploi
- ✅ Filtres avancés (secteur, localisation, type contrat)
- ✅ Recommandations IA basées sur profil
- ✅ Candidature en un clic
- ✅ Suivi des candidatures

#### Fonctionnalités avancées
- ✅ Mode hors-ligne
- ✅ Notifications push
- ✅ Géolocalisation et rayon de recherche
- ✅ Thème sombre/clair
- ✅ Support multi-langues (FR)
- ✅ Gestion sessions actives
- ✅ Stockage et cache

#### Interface temporaires (intérimaires)
- ✅ Dashboard spécialisé
- ✅ Missions temporaires
- ✅ Gestion planning
- ✅ Évaluations

### Backend Laravel

#### API REST
- ✅ Authentification JWT via Sanctum
- ✅ CRUD complet pour tous les modèles
- ✅ Upload et traitement fichiers
- ✅ Recommandations IA avec scoring
- ✅ Notifications push Expo
- ✅ Géolocalisation et filtres

#### Interface d'administration
- ✅ Dashboard analytics Livewire
- ✅ Gestion utilisateurs et rôles
- ✅ CRUD offres d'emploi
- ✅ Suivi candidatures et entretiens
- ✅ Génération documents PDF
- ✅ Statistiques avancées

#### Système de recommandations
- ✅ Algorithme de matching compétences
- ✅ Score de compatibilité (0-100%)
- ✅ Pondération expérience/localisation/formation
- ✅ Cache avec TTL optimisé
- ✅ Fallback sur titre de poste

---

## API et Backend

### Endpoints principaux

#### Authentification
```
POST /api/login              # Connexion
POST /api/register           # Inscription  
POST /api/logout             # Déconnexion
POST /api/otp/send           # Envoi OTP
POST /api/otp/verify         # Vérification OTP
```

#### Profil candidat
```
GET  /api/user               # Profil utilisateur
PUT  /api/user               # Mise à jour profil
GET  /api/candidat           # Données candidat
PUT  /api/candidat           # Mise à jour candidat
POST /api/candidat/cv        # Upload CV
```

#### Offres et candidatures
```
GET  /api/offres             # Liste offres
GET  /api/offres/{id}        # Détail offre
POST /api/applications       # Postuler
GET  /api/applications       # Mes candidatures
```

#### Recommandations
```
GET  /api/recommendations    # Recommandations IA
POST /api/recommendations/clear-cache # Vider cache
```

### Configuration API

Le client API est configuré dans `utils/api.js` :
```javascript
const api = axios.create({
  baseURL: 'http://192.168.1.144:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});
```

### Authentification JWT

Les tokens sont automatiquement injectés via un intercepteur :
```javascript
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Base de données

### Schéma principal

#### Utilisateurs et authentification
```sql
users                    # Utilisateurs base
├── candidats           # Profils candidats
├── entreprises         # Profils entreprises  
└── user_roles          # Rôles utilisateurs
```

#### Système de compétences
```sql
competences                      # Référentiel compétences
candidat_has_competences        # Compétences candidat (many-to-many)
offre_has_competences          # Compétences requises offre
```

#### Offres et candidatures
```sql
offres                   # Offres d'emploi
├── candidature_offres  # Candidatures
├── entretiens          # Entretiens programmés
└── postes              # Types de postes
```

#### Relations clés
- **User 1:1 Candidat** : Un utilisateur = un profil candidat
- **Candidat N:N Competences** : Many-to-many avec niveau
- **Offre N:N Competences** : Compétences requises
- **Candidat N:N Offres** : via candidature_offres
- **Candidature 1:N Entretiens** : Processus de recrutement

### Migrations importantes
```bash
# Structure de base
2024_01_01_000000_create_users_table.php
2024_01_02_000000_create_candidats_table.php
2024_01_03_000000_create_competences_table.php
2024_01_04_000000_create_candidat_has_competences_table.php
2024_01_05_000000_create_offres_table.php
2024_01_06_000000_create_candidature_offres_table.php
```

---

## Déploiement

### Build Mobile (Production)

#### Configuration EAS Build
```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

#### Commands de build
```bash
# Build de développement
eas build --platform android --profile development

# Build de preview
eas build --platform android --profile preview

# Build de production
eas build --platform android --profile production
eas build --platform ios --profile production
```

### Déploiement Backend

#### Serveur de production
```bash
# Optimisations Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache
composer install --optimize-autoloader --no-dev

# Build assets
npm run build

# Queues en production
php artisan queue:work --daemon
```

#### Variables d'environnement
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://votre-domaine.com

DB_HOST=localhost
DB_DATABASE=pro_recrute_prod
DB_USERNAME=username
DB_PASSWORD=password

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
# ... autres configs mail
```

---

## Guide de développement

### Workflow de développement

1. **Backend d'abord** : Développer les APIs Laravel
2. **Tests API** : Utiliser Postman/Insomnia
3. **Frontend mobile** : Intégrer les APIs dans React Native
4. **Tests manuels** : Expo Go pour tests rapides
5. **Build et test** : EAS build pour tests sur device

### Bonnes pratiques

#### Code style
- **TypeScript strict** pour le mobile
- **PSR-12** pour PHP Laravel
- **ESLint + Prettier** configurés
- **Pas de commentaires** sauf si nécessaire

#### Gestion d'état
- **Context API** pour l'état global
- **AsyncStorage** pour la persistance
- **Cache Laravel** avec TTL approprié

#### Sécurité
- **Jamais de secrets** dans le code
- **Validation côté serveur** obligatoire  
- **Sanitisation** des inputs utilisateur
- **HTTPS** en production

### Débogage

#### Mobile
```bash
# Logs détaillés
npx expo start --clear

# Debugging React Native
npx react-native log-android
npx react-native log-ios
```

#### Backend
```bash
# Logs Laravel
tail -f storage/logs/laravel.log

# Debug SQL
DB_LOG_QUERIES=true dans .env
```

### Tests

#### Mobile
```bash
npm run lint                # ESLint
npm run test               # Jest (si configuré)
```

#### Backend
```bash
php artisan test           # PHPUnit
./vendor/bin/phpunit       # PHPUnit direct
```

---

## Support et ressources

### Documentation technique
- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/docs/getting-started)
- [Laravel Documentation](https://laravel.com/docs)
- [Laravel Sanctum](https://laravel.com/docs/sanctum)

### Outils de développement
- **Expo Dev Tools** : Interface web de développement
- **React Native Debugger** : Debugging avancé
- **Laravel Telescope** : Monitoring et debugging Laravel
- **Postman** : Tests API

### Structure des commits
```
feat: nouvelle fonctionnalité
fix: correction de bug  
docs: documentation
style: formatage code
refactor: refactoring
test: ajout de tests
chore: tâches de maintenance
```

---

**Dernière mise à jour** : Janvier 2025  
**Version** : 1.0.0  
**Auteur** :GBG | Team IT