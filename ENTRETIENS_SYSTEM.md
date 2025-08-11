# Système de Gestion des Entretiens - Pro-recrute

## Vue d'ensemble
Le système de gestion des entretiens est une fonctionnalité complète qui permet aux candidats de gérer efficacement leurs entretiens d'embauche au Sénégal.

## Architecture du Système

### Écrans Principaux
```
/entretiens/
├── index.tsx          # Page d'accueil avec vue d'ensemble
├── liste.tsx          # Liste détaillée avec filtres
├── calendrier.tsx     # Vue calendrier interactive
├── details.tsx        # Détails d'un entretien spécifique
├── preparation.tsx    # Guide de préparation et conseils
└── historique.tsx     # Historique avec statistiques
```

### Composants Réutilisables
```
/components/entretiens/
├── CalendrierEntretiens.tsx     # Calendrier personnalisé
└── EntretienNotifications.tsx   # Système de notifications
```

## Fonctionnalités Principales

### 1. Vue d'Ensemble (index.tsx)
- **Dashboard central** avec statistiques
- **Prochain entretien** mis en évidence
- **Actions rapides** vers les autres sections
- **Conseils du jour** pour la préparation

### 2. Liste des Entretiens (liste.tsx)
- **Filtrage avancé** : tous, futurs, passés, en attente
- **Actions rapides** : rejoindre, préparer
- **Statuts visuels** : couleurs selon l'état
- **Pull-to-refresh** pour actualiser

### 3. Calendrier (calendrier.tsx)
- **Vue mensuelle** interactive
- **Indicateurs visuels** : type d'entretien, urgence
- **Navigation mensuelle** fluide
- **Sélection de date** avec détails
- **Légende explicative**

### 4. Détails d'Entretien (details.tsx)
- **Informations complètes** : date, lieu, type
- **Actions principales** : rejoindre, préparer
- **Lien vers l'offre** d'emploi associée
- **Résultats** si disponibles
- **Conseils personnalisés**

### 5. Préparation (preparation.tsx)
- **4 onglets thématiques** :
  - Conseils pratiques
  - Checklist interactive
  - Questions fréquentes
  - Ressources utiles
- **Progression trackée** sur la checklist
- **Conseils contextuels** sénégalais

### 6. Historique (historique.tsx)
- **Statistiques détaillées** : taux de réussite
- **Filtrage par résultat** : accepté, refusé, etc.
- **Feedback visuel** selon les résultats
- **Conseils d'amélioration** si nécessaire

## Intégrations

### API Backend
- Utilise les endpoints Laravel existants
- Nouvelles fonctions ajoutées dans `utils/api.js`
- Gestion d'erreurs robuste

### Notifications
- **Notifications automatiques** : 24h, 2h, 15min avant
- **Rappels personnalisés** configurable
- **Permissions système** gérées automatiquement
- **Nettoyage automatique** des anciennes notifications

### Navigation
- Intégré dans le drawer principal
- Navigation contextuelle entre écrans
- Gestion du back navigation
- Deep linking supporté

## Personnalisation Sénégalaise

### Langue et Culture
- **Interface en français** adaptée au contexte local
- **Conseils culturels** pour les entretiens au Sénégal
- **Exemples contextuels** d'entreprises sénégalaises
- **Horaires locaux** respectés

### Types d'Entretiens
- **Entretien de sélection** : première étape
- **Entretien final** : étape décisive
- **Codes couleur** intuitifs
- **Indicateurs d'urgence** visuels

## Configuration Technique

### Dépendances
- `expo-notifications` : système de notifications
- `@expo/vector-icons` : icônes
- `expo-router` : navigation
- Composants React Native Paper existants

### Permissions Requises
- Notifications push
- Calendrier (optionnel, pour export futur)
- Internet (pour API calls)

## Utilisation

### Navigation Drawer
Le système est accessible via l'entrée "Entretiens" dans le menu de navigation principal.

### Workflow Candidat
1. **Découverte** : accueil avec vue d'ensemble
2. **Planification** : calendrier pour visualiser
3. **Préparation** : guide complet et checklist
4. **Participation** : liens directs et rappels
5. **Suivi** : historique et analyse

### États d'Entretien
- **En attente** : orange (#F59E0B)
- **Confirmé** : bleu (#3B82F6)  
- **Refusé** : rouge (#EF4444)
- **Accepté** : vert (#10B981)

## Extensions Futures

### Fonctionnalités Possibles
- **Enregistrement vidéo** de simulation
- **IA de préparation** personnalisée
- **Feedback automatique** post-entretien
- **Intégration calendrier** système
- **Mode hors-ligne** partiel
- **Partage social** des succès
- **Analytics avancées** pour RH

### Intégrations Tierces
- **Zoom/Teams** : création automatique de liens
- **Google Calendar** : synchronisation bidirectionnelle
- **LinkedIn** : import de profil entreprise
- **WhatsApp** : rappels via chatbot

## Maintenance

### Logs et Debug
- Console logs détaillés pour API calls
- Gestion d'erreurs avec fallbacks
- États de chargement appropriés

### Performance
- Lazy loading des composants
- Mise en cache des données
- Optimisation des rerenders
- Images optimisées

### Tests
- Tests unitaires des composants
- Tests d'intégration API
- Tests de notifications
- Tests de navigation

## Support et Documentation

### Pour les Développeurs
- Code commenté en français
- Architecture modulaire
- Types TypeScript stricts
- Hooks personnalisés réutilisables

### Pour les Utilisateurs
- Interface intuitive
- Messages d'erreur clairs en français
- Aide contextuelle
- Onboarding progressif

---

*Cette documentation couvre la v1.0 du système de gestion des entretiens pour Pro-recrute Sénégal.*