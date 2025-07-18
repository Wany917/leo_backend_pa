# Test du système de booking simplifié

## Modifications apportées

### 1. Modèle Booking
- ✅ Ajout du champ `address` (string)
- ✅ Suppression de la logique complexe de créneaux

### 2. Contrôleur BookingsController
- ✅ Simplification de la méthode `create`:
  - Récupération automatique du client via `auth.user`
  - Champs requis: `service_id`, `booking_datetime`, `address`
  - Calcul automatique de `end_datetime` (durée du service ou 1h par défaut)
  - Suppression de la vérification de conflits de créneaux
  - Ajout des informations client dans la réponse

### 3. Validateur
- ✅ Mise à jour de `createBookingValidator`:
  - Suppression de `client_id`, `start_datetime`, `end_datetime`
  - Ajout de `booking_datetime` et `address`
  - Validation de l'adresse (5-255 caractères)

### 4. Migration
- ✅ Création de la migration pour ajouter le champ `address`

## API simplifiée

### Endpoint: POST /bookings

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "service_id": 1,
  "booking_datetime": "2024-01-15T14:30:00.000Z",
  "address": "123 Rue de la Paix, 75001 Paris",
  "notes": "Merci de sonner à l'interphone"
}
```

**Réponse:**
```json
{
  "message": "Réservation créée avec succès",
  "booking": {
    "id": 1,
    "service_name": "Nettoyage de vitres",
    "client_name": "Jean Dupont",
    "booking_datetime": "2024-01-15T14:30:00.000Z",
    "end_datetime": "2024-01-15T15:30:00.000Z",
    "address": "123 Rue de la Paix, 75001 Paris",
    "duration_hours": 1,
    "status": "pending",
    "notes": "Merci de sonner à l'interphone",
    "total_price": 50
  }
}
```

## Avantages de cette approche

1. **Simplicité**: Plus besoin de gérer les créneaux, disponibilités, horaires de travail
2. **Flexibilité**: Le client peut réserver à n'importe quelle heure
3. **Automatisation**: Récupération automatique des infos client via l'authentification
4. **Clarté**: API plus simple et plus directe

## Test avec curl

```bash
curl -X POST http://localhost:3333/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": 1,
    "booking_datetime": "2024-01-15T14:30:00.000Z",
    "address": "123 Rue de la Paix, 75001 Paris",
    "notes": "Merci de sonner à l'interphone"
  }'
```