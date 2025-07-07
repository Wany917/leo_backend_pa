# Plan d'Intégration Backend pour la Gestion des Contrats Commerçants (Version Stricte)

Ce document détaille les ajouts et modifications nécessaires dans le backend AdonisJS pour permettre la gestion des contrats des commerçants, en se basant **strictement** sur les exigences du cahier des charges.

## 1. Vision d'Ensemble

L'objectif est d'implémenter la fonctionnalité "gestion de son contrat" (Page 5) pour les commerçants. Le système devra s'intégrer à Stripe pour les paiements (Page 7) and générer les documents nécessaires au format PDF (Page 7).

## 2. Modifications de la Base de Données

### A. Nouveau Modèle : `ContractPlan`

Il faut un modèle pour stocker les différents plans de contrat disponibles (ex: Basic, Standard).

- **Migration:** `create_contract_plans_table`
- **Modèle:** `app/models/ContractPlan.ts`
- **Champs:** `id`, `name`, `description`, `price`, `currency`, `features` (JSON).

### B. Nouveau Modèle : `Contract`

Ce modèle représente une instance de contrat souscrit par un commerçant.

- **Migration :** `create_contracts_table` et `add_plan_id_to_contracts`
- **Modèle :** `app/models/Contract.ts`
- **Champs Clés :**
  - `commercant_id` (FK vers `utilisateurs`)
  - `contract_plan_id` (FK vers `contract_plans`)
  - ... autres champs

## 3. Logique Métier et API

### A. Nouveau Contrôleur : `ContractsController`

- **Méthodes à créer :**
  - `getPlans()`: Récupère la liste de tous les `ContractPlan` disponibles.
  - `getCurrent()`: Récupère le contrat `active` du commerçant.
  - `getHistory()`: Récupère l'historique des contrats du commerçant.
  - `create({ request })`: Crée un contrat basé sur un `planId` fourni.
  - `downloadContract()`: Permet de télécharger le PDF du contrat.

### B. Nouveau Service : `ContractService`

Pour encapsuler la logique complexe.

- `createContract(commercantId, chargeDetails)`: Crée une nouvelle entrée `Contract` après un paiement Stripe réussi.
- `generateContractPdf(contract)`: Génère un PDF pour un contrat et le stocke.
- `scheduleContractChecks()`: Mettre en place une tâche planifiée qui vérifie quotidiennement les contrats pour mettre à jour leur statut de `active` à `expired` à la date de fin.

### C. Mise à jour de `StripeController` et `StripeService`

- **Webhook :** Dans la méthode `webhook`, gérer l'événement `checkout.session.completed` pour déclencher la création du contrat via le `ContractService`.

## 4. Routes de l'API

Ajouter les routes suivantes dans `start/routes.ts`, protégées par le middleware d'authentification.

```typescript
// In start/routes.ts
// ...
const ContractsController = () => import('#controllers/contracts_controller')

router
  .group(() => {
    router
      .group(() => {
        // ... autres routes commerçants
        router
          .group(() => {
            router.get('/plans', [ContractsController, 'getPlans'])
            router.get('/current', [ContractsController, 'getCurrent'])
            router.get('/history', [ContractsController, 'getHistory'])
            router.post('/', [ContractsController, 'create'])
            router.get('/:id/download', [ContractsController, 'downloadContract'])
          })
          .prefix('contracts')
      })
      .prefix('commercants')
    // ...
  })
  .prefix('/api')
  .use(middleware.auth())
```

## 5. Résumé pour l'Intégration Front-End

Le front-end devra consommer les endpoints suivants. Toutes ces routes sont protégées et nécessitent un token d'authentification.

- **`GET /api/commercants/contracts/plans`**

  - **Requête :** Aucune donnée requise.
  - **Réponse (Succès) :** `200 OK` avec un tableau d'objets JSON des plans de contrat.

- **`POST /api/commercants/contracts`**

  - **Requête :** Corps de la requête au format JSON avec l'ID du plan choisi.
    ```json
    { "planId": 1 }
    ```
  - **Réponse (Succès) :** `201 Created` avec le JSON du contrat nouvellement créé.

- **`GET /api/commercants/contracts/current`**

  - **Requête :** Aucune donnée requise.
  - **Réponse (Succès) :** `200 OK` avec le JSON de l'objet du contrat actif.
  - **Réponse (Erreur) :** `404 Not Found` si aucun contrat actif n'est trouvé.

- **`GET /api/commercants/contracts/history`**

  - **Requête :** Aucune donnée requise.
  - **Réponse (Succès) :** `200 OK` avec un tableau d'objets JSON des contrats passés.

- **`GET /api/commercants/contracts/:id/download`**
  - **Paramètre d'URL :** `:id` est l'ID du contrat à télécharger.
  - **Réponse (Succès) :** `200 OK` avec le fichier `contract_<id>.pdf` en téléchargement.
  - **Réponse (Erreur) :** `404 Not Found` si le contrat ou le fichier n'existe pas.
