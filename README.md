CAREDIFY Dashboard — Plateforme Web de Télésurveillance Cardiaque

Prototype académique — Mode simulé. Aucune donnée médicale réelle n'est transmise.

Aperçu

CAREDIFY Dashboard est une plateforme web de télésurveillance cardiaque développée avec React, TypeScript et Supabase.
Elle permet aux administrateurs et cardiologues de superviser les patients cardiaques, visualiser les données ECG, gérer les comptes médicaux et analyser les statistiques de surveillance en temps réel.

Le dashboard représente la partie web du système CAREDIFY dédiée au monitoring médical intelligent et à la gestion clinique.

Fonctionnalités
1. Authentification & Sécurité
Connexion sécurisée administrateur / cardiologue
Gestion des rôles utilisateurs
Validation des accès médicaux
Sessions sécurisées via Supabase
2. Dashboard Administrateur
Vue globale du système
Nombre total de patients surveillés
Nombre de cardiologues actifs
Statistiques des alertes ECG
Activité récente du système
Cartes statistiques interactives
3. Gestion des Cardiologues
Consultation des demandes d'inscription
Validation ou rejet des cardiologues
Consultation des profils médicaux
Gestion des statuts :
pending
active
rejected
4. Surveillance Cardiaque
Visualisation des données ECG
Monitoring des patients en temps réel
Affichage des statuts :
Normal
Suspect
Critique
Consultation des dernières mesures
5. Analyse & Statistiques
Graphiques dynamiques
Analyses statistiques des données ECG
Répartition des états cardiaques
Historique des alertes
Suivi des tendances médicales
6. Gestion des Patients
Liste des patients surveillés
Consultation des dossiers médicaux
Informations personnelles et médicales
Historique des analyses ECG
7. Notifications & Alertes
Alertes ECG critiques
Notifications administratives
Système d'information en temps réel
Gestion des urgences médicales simulées
Design
Couleurs :
Bleu médical (#1565C0)
Blanc
Vert = normal
Orange = suspect
Rouge = critique
Interface :
Dashboard moderne responsive
Cartes statistiques interactives
Sidebar de navigation
Responsive desktop/tablette
Typographie :
Inter
Material Design moderne
Structure du projet
Dashboard_CAREDIFY/
│
├── public/                        # Ressources statiques
│
├── src/
│   ├── assets/                    # Images et fichiers statiques
│   │
│   ├── components/                # Composants réutilisables
│   │   ├── cards/
│   │   ├── charts/
│   │   ├── tables/
│   │   └── sidebar/
│   │
│   ├── pages/                     # Pages principales
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Cardiologists.tsx
│   │   ├── Patients.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   │
│   ├── services/                  # Services API & Supabase
│   │   └── supabase.ts
│   │
│   ├── hooks/                     # Hooks React personnalisés
│   │
│   ├── context/                   # Gestion état global
│   │
│   ├── layouts/                   # Layouts du dashboard
│   │
│   ├── utils/                     # Fonctions utilitaires
│   │
│   ├── App.tsx                    # Composant principal
│   ├── main.tsx                   # Entrée application
│   └── index.css
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
Installation et démarrage
Prérequis
Node.js ≥ 18
npm ≥ 9
VS Code recommandé
Étapes
1. Cloner le projet
git clone https://github.com/EyaSghaier/Dashboard_CAREDIFY.git
2. Accéder au dossier
cd Dashboard_CAREDIFY
3. Installer les dépendances
npm install
4. Configurer les variables d'environnement

Créer un fichier .env :

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
5. Lancer le serveur de développement
npm run dev
6. Build production
npm run build
Technologies utilisées
Technologie	Usage
React.js	Interface utilisateur
TypeScript	Typage sécurisé
Vite	Build tool rapide
Tailwind CSS	Styling responsive
Supabase	Backend & authentification
React Router	Navigation
Chart Libraries	Visualisation des statistiques
Modules principaux
Module	Description
Authentification	Connexion sécurisée
Dashboard	Vue globale système
Gestion cardiologues	Validation et administration
Patients	Gestion des dossiers
ECG Monitoring	Surveillance cardiaque
Analytics	Statistiques et graphiques
Notifications	Alertes médicales
Objectifs du projet

CAREDIFY Dashboard a pour objectif de :

Faciliter la télésurveillance cardiaque
Centraliser les données médicales
Aider les cardiologues dans le suivi patient
Détecter rapidement les anomalies ECG
Fournir une interface médicale moderne et intuitive
Simuler une plateforme intelligente de santé connectée

Licence

Projet académique développé dans le cadre d'un projet de fin d'études (PFE).
