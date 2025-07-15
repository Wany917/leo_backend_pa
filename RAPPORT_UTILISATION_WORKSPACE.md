# 📊 Rapport d'Utilisation du Workspace EcoDeli

## 🏗️ Vue d'ensemble de l'Architecture

Le workspace EcoDeli est organisé en **3 parties principales** :

```
PA/
├── backend_pa/     # Backend API (AdonisJS v6)
├── front-end/          # Application client (Next.js 15)
├── pa-backoffice/      # Interface d'administration (Next.js 15)
```

---

## 🔧 Backend - `backend_pa`

### Stack Technologique
- **Framework**: AdonisJS v6 (TypeScript)
- **Base de données**: PostgreSQL
- **ORM**: Lucid (AdonisJS)
- **Authentification**: JWT + Session-based
- **Validation**: VineJS
- **Paiements**: Stripe API
- **WebSocket**: Socket.io
- **Email**: Resend
- **Storage**: AWS S3

### Architecture Backend

```
backend_pa/
├── app/
│   ├── controllers/     # 30+ contrôleurs API REST
│   │   ├── auth_controller.ts
│   │   ├── admin_controller.ts
│   │   ├── clients_controller.ts
│   │   ├── livreurs_controller.ts
│   │   ├── colis_controller.ts
│   │   ├── stripe_controller.ts
│   │   └── ...
│   ├── models/          # 30+ modèles Lucid
│   │   ├── utilisateurs.ts
│   │   ├── client.ts
│   │   ├── livreur.ts
│   │   ├── annonce.ts
│   │   ├── colis.ts
│   │   └── ...
│   ├── middleware/      # Middlewares de sécurité
│   ├── validators/      # 40+ validateurs VineJS
│   └── services/        # Services métier
├── database/
│   ├── migrations/      # 50+ migrations PostgreSQL
│   └── seeders/         # Données de test
├── config/              # Configuration système
└── docs/                # Documentation API
```

### Fonctionnalités Backend Implémentées

#### ✅ Système d'Authentification Multi-Rôles
- Inscription/connexion JWT
- Validation email avec codes temporaires
- Gestion des rôles (client, livreur, prestataire, commerçant, admin)
- Middleware de protection par rôle

#### ✅ Gestion des Utilisateurs
- CRUD complet pour tous types d'utilisateurs
- Validation KYC pour livreurs/prestataires
- Système de statuts (pending, active, suspended, blocked)
- Upload et gestion des documents

#### ✅ Système d'Annonces et Livraisons
- Création d'annonces géolocalisées
- Workflow complet de livraison
- Tracking temps réel avec GPS
- Machine d'états pour les colis
- Calcul automatique des distances

#### ✅ Intégration Paiements Stripe
- Stripe Connect pour prestataires
- Paiements directs et commissions
- Webhooks de synchronisation
- Facturation automatisée
- Gestion des abonnements

#### ✅ Messagerie Temps Réel
- Chat WebSocket entre utilisateurs
- Notifications instantanées
- Support multi-médias
- Historique des conversations

#### ✅ Interface d'Administration
- Dashboard avec métriques
- Gestion des utilisateurs et validations KYC
- Gestion des réclamations
- Analytics avancées

### Dépendances Backend Principales

```json
{
  "@adonisjs/core": "^6.17.2",
  "@adonisjs/auth": "^9.3.1",
  "@adonisjs/lucid": "^21.6.0",
  "stripe": "^18.2.1",
  "socket.io": "^4.8.1",
  "@aws-sdk/client-s3": "^3.802.0",
  "resend": "^4.4.0",
  "@vinejs/vine": "^3.0.0"
}
```

---

## 🎨 Frontend Client - `front-end`

### Stack Technologique
- **Framework**: Next.js 15 (React 19)
- **Langage**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Maps**: React Leaflet
- **Paiements**: Stripe
- **WebSocket**: Socket.io Client

### Architecture Frontend

```
front-end/src/
├── app/                 # App Router Next.js 15
├── components/
│   ├── ui/             # Composants Shadcn/ui
│   ├── refactored/     # Composants métier
│   │   ├── admin/
│   │   ├── announcements/
│   │   ├── auth/
│   │   └── payments/
│   ├── stripe/         # Intégration Stripe
│   └── tracking/       # Composants de tracking
├── lib/                # Utilitaires et API
├── hooks/              # Hooks personnalisés
├── services/
│   ├── messaging/      # Service de messagerie
│   └── tracking/       # Service de tracking
├── stores/             # Stores Zustand
└── types/              # Types TypeScript
```

### Fonctionnalités Frontend

#### ✅ Interface Utilisateur Moderne
- Design responsive avec Tailwind CSS
- Composants réutilisables Shadcn/ui
- Thème sombre/clair
- Animations fluides

#### ✅ Gestion des Annonces
- Création d'annonces avec géolocalisation
- Upload d'images multiples
- Filtrage géographique
- Carte interactive avec Leaflet

#### ✅ Système de Tracking
- Suivi temps réel des livraisons
- Carte interactive avec positions
- Notifications push
- Historique détaillé

#### ✅ Intégration Paiements
- Checkout Stripe intégré
- Gestion des cartes
- Historique des transactions
- Facturation automatique

#### ✅ Messagerie Temps Réel
- Chat en temps réel
- Notifications instantanées
- Interface moderne
- Support multi-médias

### Dépendances Frontend Principales

```json
{
  "next": "^15.2.4",
  "react": "^19.1.0",
  "typescript": "^5",
  "tailwindcss": "^3.4.17",
  "@radix-ui/react-*": "latest",
  "zustand": "^5.0.5",
  "react-hook-form": "^7.54.1",
  "zod": "^3.24.1",
  "stripe": "latest",
  "socket.io-client": "^4.8.1",
  "react-leaflet": "^5.0.0",
  "recharts": "^3.0.0"
}
```

---

## 🔐 Back-Office - `pa-backoffice`

### Stack Technologique
- **Framework**: Next.js 15 (React 19)
- **Langage**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **Charts**: Recharts
- **PDF**: jsPDF
- **Calendar**: React Big Calendar

### Architecture Back-Office

```
pa-backoffice/src/
├── app/                 # App Router Next.js 15
├── components/
│   ├── ui/             # Composants Shadcn/ui
│   ├── refactored/     # Composants d'administration
│   │   ├── admin/      # Interfaces admin
│   │   ├── announcements/
│   │   ├── auth/
│   │   └── payments/
│   ├── stripe/         # Gestion Stripe
│   └── tracking/       # Monitoring
├── lib/                # Utilitaires admin
├── services/
│   ├── messaging/      # Communication
│   └── tracking/       # Analytics
└── types/              # Types admin
```

### Fonctionnalités Back-Office

#### ✅ Dashboard Administrateur
- Métriques en temps réel
- Graphiques avec Recharts
- KPIs de performance
- Monitoring système

#### ✅ Gestion des Utilisateurs
- Validation des comptes
- Gestion des documents KYC
- Suspension/activation
- Historique des actions

#### ✅ Gestion Financière
- Suivi des transactions
- Génération de rapports PDF
- Gestion des commissions
- Analytics financières

#### ✅ Gestion des Réclamations
- Workflow de traitement
- Assignation aux équipes
- Suivi des résolutions
- Notifications automatiques

#### ✅ Analytics Avancées
- Géolocalisation des activités
- Rapports de performance
- Tendances d'utilisation
- Export de données

### Dépendances Back-Office

```json
{
  "next": "^15.2.4",
  "react": "^19.1.0",
  "recharts": "^3.0.0",
  "jspdf": "^3.0.1",
  "react-big-calendar": "^1.19.4",
  "embla-carousel-react": "8.5.1",
  "input-otp": "1.4.1",
  "leaflet": "^1.9.4"
}
```

---

## 📊 Modèle de Données

### Entités Principales (50+ tables)

#### Utilisateurs
- `utilisateurs` - Table de base
- `clients` - Clients particuliers
- `livreurs` - Livreurs indépendants
- `prestataires` - Prestataires de services
- `commercants` - Commerçants partenaires
- `admins` - Administrateurs système

#### Annonces et Services
- `annonces` - Annonces de livraison
- `services` - Services proposés
- `service_types` - Types de services
- `bookings` - Réservations
- `contracts` - Contrats

#### Livraisons et Tracking
- `livraisons` - Livraisons
- `colis` - Colis à livrer
- `historique_livraisons` - Historique
- `livreur_positions` - Positions GPS
- `colis_location_histories` - Historique positions

#### Paiements et Finance
- `subscriptions` - Abonnements
- `portefeuille_ecodeli` - Portefeuilles
- `transaction_portefeuille` - Transactions
- `shopkeeper_deliveries` - Livraisons commerçants

#### Communication
- `messages` - Messagerie
- `complaints` - Réclamations
- `ratings` - Évaluations
- `translations` - Traductions

#### Administration
- `wharehouses` - Entrepôts
- `stockage_colis` - Stockage
- `justification_pieces` - Documents
- `codes_temporaire` - Codes de validation

## 🛠️ Technologies Utilisées

### Backend
- AdonisJS v6, TypeScript, PostgreSQL, Stripe, Socket.io, AWS S3, Resend

### Frontend Client
- Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn/ui, Zustand, Leaflet

### Back-Office
- Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, jsPDF

---

## 📝 Conclusion

Le workspace EcoDeli représente une **plateforme complète et moderne** de livraisons écologiques avec :

- **Architecture microservices** bien structurée
- **Technologies de pointe** (AdonisJS v6, Next.js 15, React 19)
- **Fonctionnalités avancées** (tracking GPS, paiements, messagerie temps réel)
- **Interface d'administration** complète
- **Sécurité robuste** avec authentification multi-rôles
- **Scalabilité** préparée pour la production

Le projet est **prêt pour le déploiement** avec toutes les fonctionnalités core implémentées et testées.
