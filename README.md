# NextStep — Copilote de Recherche d'Emploi

<p align="center">
  <img src="public/nextstep-logo-full.png" alt="NextStep Logo" width="380" />
</p>

**NextStep** (anciennement JobMachine) est un outil complet pour suivre, organiser et optimiser sa recherche d'emploi et de stages.

---

## 🎨 Nouvelle Identité Visuelle

- **Deep Teal** (`#0F766E`) : Couleur principale (confiance, structure, professionnalisme)
- **Coral Orange** (`#FF7F50`) : Accent dynamique (énergie, passage à l'action, entretiens)
- **Sage Green** (`#A3C4B6`) : Teinte secondaire douce (équilibre, progression)
- **Warm White / Sand / Taupe** (`#F2EFE9`, `#D9BE98`, `#C9BAB4`) : Palette chaleureuse et élégante pour les fonds et surfaces neutres

---

## 🚀 Fonctionnalités Clés

- **Tableau de Bord & KPIs** : Statistiques en direct (taux de conversion, entretiens, relances prioritaires).
- **Pipeline Kanban fluide** : Glisser-déposer les candidatures par statut avec détection automatique des relances J+7.
- **Agrégateur & Scraping d'Offres** :
  - Bookmarklet navigateur **📌 + NextStep** pour capturer des offres en 1 clic (LinkedIn, Welcome to the Jungle, Indeed, etc.).
- **CRM Réseau & Contacts** : Fiches recruteurs, suivi des prises de contact et générateur de pitchs personnalisés.
- **Mode 100% Autonome / Hors-Ligne** : Sauvegarde et restauration locale JSON sans dépendance obligatoire à un serveur cloud.

---

## 🛠️ Stack Technique

- **Framework** : React 19 + TypeScript + Vite
- **Styles** : Tailwind CSS v4 (palette de marque sur-mesure)
- **Drag and Drop** : `@hello-pangea/dnd`
- **Icones** : `lucide-react`
- **Stockage** : LocalStorage hybride + synchronisation Supabase optionnelle

---

## 💻 Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Construction pour la production
npm run build
```
