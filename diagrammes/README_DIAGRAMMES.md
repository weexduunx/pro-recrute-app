# Guide des Diagrammes Pro-Recrute Mobile

*Documentation complète des diagrammes techniques et d'architecture*

---

##  Vue d'Ensemble

Cette collection de diagrammes présente l'architecture complète de l'application mobile Pro-Recrute selon différents niveaux d'abstraction et perspectives techniques.

---

##  Diagrammes de Cas d'Utilisation

### 01. Authentification et Sécurité
**Fichier :** `01_cas_utilisation_authentification.puml`

**Description :** Présente tous les scénarios d'authentification supportés par l'application.

**Acteurs principaux :**
- Candidat, Intérimaire, Recruteur, Administrateur
- Système Biométrique, OAuth Provider

**Cas d'utilisation couverts :**
- Inscription multi-rôles avec validation OTP
- Connexion traditionnelle et biométrique (Face ID/Touch ID)
- Authentification sociale (Google, LinkedIn)
- Gestion des sessions et déconnexion automatique
- Réinitialisation de mot de passe sécurisée

### 02. Gestion des Offres d'Emploi
**Fichier :** `02_cas_utilisation_job_board.puml`

**Description :** Modélise l'écosystème complet de gestion des opportunités professionnelles.

**Fonctionnalités clés :**
- Navigation intelligente avec pagination avancée
- Système de recherche et filtrage sophistiqué
- Gestion des favoris avec persistance
- Processus de candidature simplifié
- Géolocalisation des opportunités

### 03. Intelligence Artificielle et Recommandations
**Fichier :** `03_cas_utilisation_ia_recommandations.puml`

**Description :** Détaille le système de recommandations basé sur l'IA.

**Algorithmes intégrés :**
- Machine Learning avec Cosine Similarity
- Analyse TF-IDF pour pertinence sémantique
- Neural Networks pour deep matching
- Collaborative et Content-Based Filtering

### 04. Évaluations de Compétences
**Fichier :** `04_cas_utilisation_skills_assessment.puml`

**Description :** Système complet d'évaluation et certification des compétences.

**Types d'évaluations :**
- QCM interactifs avec scoring pondéré
- Tests de codage en temps réel
- Simulations pratiques métier
- Évaluations comportementales

### 05. Messagerie Instantanée
**Fichier :** `05_cas_utilisation_messaging.puml`

**Description :** Système de communication temps réel intégré.

**Capacités techniques :**
- WebSocket avec Socket.IO pour temps réel
- Chiffrement end-to-end des messages sensibles
- Support multi-média (fichiers, images, documents)
- Synchronisation multi-device avec conflict resolution

---

##  Diagrammes Séquentiels

### 06. Authentification Biométrique
**Fichier :** `06_sequence_authentification_biometrique.puml`

**Description :** Flux détaillé de l'authentification biométrique native.

**Technologies impliquées :**
- Expo LocalAuthentication API
- Secure Store pour persistance tokens
- JWT Management avec refresh automatique
- Gestion gracieuse des échecs et fallbacks

### 07. Recherche IA et Recommandations
**Fichier :** `07_sequence_recherche_ia_offres.puml`

**Description :** Processus complet de recherche intelligente avec IA.

**Pipeline ML :**
1. Feature extraction du profil utilisateur
2. Calcul de vecteurs de similarité
3. Ranking par algorithmes de compatibilité
4. Personnalisation basée sur historique
5. Feedback loop pour amélioration continue

### 08. Chat Temps Réel
**Fichier :** `08_sequence_chat_temps_reel.puml`

**Description :** Architecture complète du système de messagerie.

**Flux techniques :**
- Connexion WebSocket avec authentification JWT
- Gestion des salles de conversation
- Diffusion temps réel avec acknowledgments
- Système de notifications push intelligent
- Mode hors-ligne avec queue de messages

### 09. Évaluation de Compétences Interactive
**Fichier :** `09_sequence_skills_assessment.puml`

**Description :** Processus complet d'évaluation avec scoring avancé.

**Composants clés :**
- Génération dynamique de questions
- Timer service avec sauvegarde automatique
- Algorithmes de scoring psychométriques
- Système de certification et badges
- Analytics pour amélioration des tests

---

##  Diagrammes d'Architecture C4

### 10. Diagramme de Contexte (Level 1)
**Fichier :** `10_c4_context_diagram.puml`

**Description :** Vue macro du système et ses interactions externes.

**Systèmes externes intégrés :**
- OAuth Providers (Google, LinkedIn)
- Services de notifications push (Expo)
- APIs de géolocalisation (Google Maps)
- Infrastructure vidéo (WebRTC)
- Plateformes ML (TensorFlow/PyTorch)
- Services analytics (Mixpanel/Firebase)

### 11. Diagramme de Conteneurs (Level 2)
**Fichier :** `11_c4_container_diagram.puml`

**Description :** Architecture détaillée des conteneurs et services.

**Conteneurs principaux :**
- **Application React Native** avec Expo Runtime
- **Services Backend** (Auth, Jobs, Messaging, Skills, IA)
- **Couche de données** (PostgreSQL, MongoDB, Redis, InfluxDB)
- **Stockage distribué** (AWS S3, CloudFront CDN)

### 12. Diagramme de Composants Mobile (Level 3)
**Fichier :** `12_c4_component_diagram_mobile.puml`

**Description :** Détail architectural de l'application mobile.

**Couches architecturales :**
1. **Présentation :** Écrans React Native spécialisés
2. **Logique Métier :** Hooks personnalisés et Context providers
3. **Services :** APIs et utilitaires de communication
4. **Données :** Stockage local et gestion cache
5. **Native :** Intégrations Expo et React Native

### 13. Diagramme de Code - Authentification (Level 4)
**Fichier :** `13_c4_code_diagram_auth.puml`

**Description :** Implémentation détaillée du système d'authentification.

**Structure de code :**
- **Composants React :** LoginScreen, RegisterScreen, OTPScreen
- **Services :** AuthService, GoogleAuth, LinkedInAuth
- **Hooks :** useAuth, useBiometricAuth, useOAuth
- **Utilitaires :** JWT Manager, Crypto Utils, Validators
- **Types :** Interfaces TypeScript complètes

---

## 🛠️ Comment Utiliser Ces Diagrammes

### Prérequis
- **PlantUML** installé localement ou utilisation d'un éditeur en ligne
- **Extension VS Code** : PlantUML pour prévisualisation
- **Serveur PlantUML** pour génération en ligne

### Génération des Diagrammes

```bash
# Installation PlantUML
npm install -g @plantuml/plantuml

# Génération d'un diagramme
plantuml 01_cas_utilisation_authentification.puml

# Génération de tous les diagrammes
plantuml diagrammes/*.puml
```

### Formats de Sortie Supportés
- **PNG** : Pour documentation et présentations
- **SVG** : Pour intégration web avec vectoriel
- **PDF** : Pour documents officiels
- **ASCII** : Pour documentation textuelle

### Personnalisation Visuelle

Tous les diagrammes utilisent le thème `!theme aws-orange` pour une cohérence visuelle. Vous pouvez modifier le thème en changeant cette ligne dans chaque fichier.

**Thèmes disponibles :**
- `aws-orange` (actuel)
- `bluegray`
- `plain`
- `sketchy-outline`
- `vibrant`

---

## 📚 Références Techniques

### Standards Utilisés
- **UML 2.5** pour diagrammes de cas d'utilisation et séquences
- **C4 Model** pour diagrammes d'architecture
- **PlantUML Syntax** pour définition des diagrammes

### Conventions de Nommage
- **Fichiers :** `NN_type_description.puml`
- **Composants :** PascalCase pour classes, camelCase pour instances
- **Relations :** Verbes explicites décrivant l'interaction

### Maintenance des Diagrammes

**Fréquence de mise à jour :** 
- Après chaque release majeure
- Lors d'ajouts de nouvelles fonctionnalités
- Modifications architecturales importantes

**Responsabilités :**
- Architecte technique : Diagrammes C4
- Lead développeur : Diagrammes séquentiels
- Product Owner : Diagrammes cas d'utilisation

---

## 💡 Conseils d'Utilisation

### Pour les Développeurs
1. Consultez les **diagrammes de composants** avant d'implémenter
2. Utilisez les **diagrammes séquentiels** pour comprendre les flux
3. Référez-vous au **diagramme de code** pour les détails d'implémentation

### Pour les Architectes
1. Les **diagrammes C4** montrent la vue globale du système
2. Le **diagramme de contexte** aide à comprendre les dépendances externes
3. Les **diagrammes de conteneurs** guident les décisions d'infrastructure

### Pour les Product Owners
1. Les **diagrammes de cas d'utilisation** documentent les fonctionnalités
2. Utilisez-les pour validation des user stories
3. Référence pour communications avec parties prenantes

---

*Documentation générée automatiquement - Maintenue à jour avec chaque évolution du système*