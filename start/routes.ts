/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import openapi from '#config/openapi'
import AutoSwagger from 'adonis-autoswagger'
const EmailController = () => import('#controllers/send_email')
const CodeTemporaireController = () => import('#controllers/codes_temporaire_controller')
const AuthController = () => import('#controllers/auth_controller')
const UtilisateursController = () => import('#controllers/utilisateurs_controller')
const ClientController = () => import('#controllers/clients_controller')
const LivreurController = () => import('#controllers/livreurs_controller')
const PrestataireController = () => import('#controllers/prestataires_controller')
const CommercantController = () => import('#controllers/commercants_controller')
const AnnonceController = () => import('#controllers/annonces_controller')
const ColisController = () => import('#controllers/colis_controller')
const LivraisonController = () => import('#controllers/livraisons_controller')
const MessageController = () => import('#controllers/messages_controller')
const StockageColisController = () => import('#controllers/stockage_colis_controller')
const WharehousesController = () => import('#controllers/wharehouses_controller')
const ComplaintsController = () => import('#controllers/complaints_controller')
const AdminController = () => import('#controllers/admin_controller')
const ServicesController = () => import('#controllers/services_controller')
const ServiceTypesController = () => import('#controllers/service_types_controller')
const AnnonceServicesController = () => import('#controllers/annonce_services_controller')
const JustificationPiecesController = () => import('#controllers/justification_pieces_controller')
const TrackingController = () => import('#controllers/tracking_controller')
const SubscriptionsController = () => import('#controllers/subscriptions_controller')
const FilesController = () => import('#controllers/files_controller')
const BookingsController = () => import('#controllers/bookings_controller')
const PortefeuilleController = () => import('#controllers/portefeuille_controller')
const StripeController = () => import('#controllers/stripe_controller')
const RatingController = () => import('#controllers/rating_controller')

import { middleware } from '#start/kernel'

// Documentation API avec Scalar (méthode officielle AutoSwagger)
// Returns the OpenAPI file as YAML
router.get('/openapi', async () => {
  return AutoSwagger.default.docs(router.toJSON(), openapi)
})

// Renders the API reference with Scalar (méthode officielle)
router.get('/docs', async () => {
  return AutoSwagger.default.scalar('/openapi')
})

// Alias et redirections pour compatibilité
router.get('/scalar', ({ response }) => response.redirect('/docs'))
router.get('/swagger', ({ response }) => response.redirect('/openapi'))

router.get('/', async () => {
  return {
    message: 'Welcome to the API',
    version: '0.1 Beta',
  }
})

router.post('send-email', [EmailController, 'sendEmail'])

router
  .group(() => {
    router.post('generate-code', [CodeTemporaireController, 'generate_code'])
    router.post('check-code', [CodeTemporaireController, 'check_code'])
    router.post('reset-code', [CodeTemporaireController, 'reset_code'])
    router.post('validate-delivery', [CodeTemporaireController, 'validateDelivery'])
  })
  .prefix('codes-temporaire')

router
  .group(() => {
    router.post('login', [AuthController, 'login'])
    router.post('register', [AuthController, 'register'])
    router.get('me', [AuthController, 'me']).use(middleware.auth())
    router.post('logout', [AuthController, 'remove_token']).use(middleware.auth())
  })
  .prefix('auth')

router
  .group(() => {
    router
      .get('all', [UtilisateursController, 'getIndex'])
      .use([middleware.auth(), middleware.admin()])
    router.get('get-recent', [UtilisateursController, 'getRecent']).use(middleware.auth())
    router.get(':id', [UtilisateursController, 'get']).use(middleware.auth())
    router.put(':id', [UtilisateursController, 'update']).use(middleware.auth())
    router.post('check-password', [UtilisateursController, 'checkPassword']).use(middleware.auth())
  })
  .prefix('utilisateurs')

router
  .group(() => {
    router.get('/', [ClientController, 'index']).use(middleware.auth())
    router.post('add', [ClientController, 'add'])
    router.get(':id/profile', [ClientController, 'getProfile'])
    router.put(':id/profile', [ClientController, 'updateProfile'])
  })
  .prefix('clients')

router
  .group(() => {
    router.post('add', [LivreurController, 'add'])
    router.get(':id/profile', [LivreurController, 'getProfile'])
    router.put(':id/profile', [LivreurController, 'updateProfile'])
    router.get(':id/livraisons', [LivreurController, 'getLivraisons']).use(middleware.auth())
    router
      .get('available-livraisons', [LivreurController, 'getAvailableLivraisons'])
      .use(middleware.auth())
    router
      .post(':id/livraisons/:livraisonId/accept', [LivreurController, 'acceptLivraison'])
      .use(middleware.auth())
    router
      .put(':id/livraisons/:livraisonId/status', [LivreurController, 'updateLivraisonStatus'])
      .use(middleware.auth())
    router.get(':id/stats', [LivreurController, 'getStats']).use(middleware.auth())
    router.put(':id/availability', [LivreurController, 'updateAvailability']).use(middleware.auth())
  })
  .prefix('livreurs')

router
  .group(() => {
    router.get('/', [PrestataireController, 'index'])
    router.post('add', [PrestataireController, 'add'])
    router.get(':id', [PrestataireController, 'getProfile'])
    router.put(':id', [PrestataireController, 'updateProfile'])
    router.get(':id/reviews', [PrestataireController, 'getReviews']).use(middleware.auth())
  })
  .prefix('prestataires')

router
  .group(() => {
    router.post('add', [CommercantController, 'add'])
    router.get(':id/profile', [CommercantController, 'getProfile'])
    router.put(':id/profile', [CommercantController, 'updateProfile'])
    router.put('reject/:id', [CommercantController, 'reject'])
    router.put('verify/:id', [CommercantController, 'verify'])
    router.get('unverified', [CommercantController, 'getUnverified'])
    router.get('verified', [CommercantController, 'getVerified'])
  })
  .prefix('commercants')

router
  .group(() => {
    router.get('/', [AnnonceController, 'getAllAnnonces'])
    router.post('create', [AnnonceController, 'create'])
    router.post(':id/livraisons', [LivraisonController, 'create'])
    router.get(':id/livraisons', [LivraisonController, 'getAnnounceLivraisons'])
    router.get(':id', [AnnonceController, 'getAnnonce'])
    router.get('/user/:utilisateur_id', [AnnonceController, 'getUserAnnonces'])
    router.put(':id', [AnnonceController, 'updateAnnonce'])
    router.put(':id/with-string-dates', [AnnonceController, 'updateAnnonceWithStringDates'])
    router.post(':id/services', [AnnonceServicesController, 'attachServices'])
    router.delete(':id/services', [AnnonceServicesController, 'detachServices'])
    router.get(':id/services', [AnnonceServicesController, 'getServices'])
  })
  .prefix('annonces')

router
  .group(() => {
    router.post('create', [ColisController, 'create'])
    router.get(':tracking_number', [ColisController, 'getColis'])
    router.get(':tracking_number/location-history', [ColisController, 'getLocationHistory'])
    router.post(':tracking_number/update-location', [ColisController, 'updateLocation'])
  })
  .prefix('colis')

router
  .group(() => {
    router.get('/', [ColisController, 'getAllColis'])
  })
  .prefix('admin/colis')
  .use([middleware.auth(), middleware.admin()])

router
  .group(() => {
    router.post('create', [WharehousesController, 'create'])
    router.get('/', [WharehousesController, 'getAllWharehouses'])
    router.get(':id', [WharehousesController, 'getWharehouse'])
    router.put(':id', [WharehousesController, 'update'])
    router.delete(':id', [WharehousesController, 'delete'])
    router.get(':id/capacity', [WharehousesController, 'getAvailableCapacity'])
  })
  .prefix('wharehouses')

router
  .group(() => {
    router.post('create', [StockageColisController, 'create'])
    router.get(':id', [StockageColisController, 'show'])
    router.get('colis/:colis_id', [StockageColisController, 'getByColisId'])
    router.put(':id', [StockageColisController, 'update'])
    router.delete(':id', [StockageColisController, 'delete'])
    router.post('move-to-client', [StockageColisController, 'moveToClientAddress'])
  })
  .prefix('stockage-colis')

router
  .group(() => {
    router.get('/', [LivraisonController, 'index']).use([middleware.auth(), middleware.admin()])
    router.get(':id', [LivraisonController, 'show'])
    router.put(':id', [LivraisonController, 'update'])
    router.get('client/:client_id', [LivraisonController, 'getClientLivraisons'])
  })
  .prefix('livraisons')

router
  .group(() => {
    router.post('/', [MessageController, 'send']).use(middleware.auth())
    router.get('inbox', [MessageController, 'inbox']).use(middleware.auth())
    router.get('conversations', [MessageController, 'conversations']).use(middleware.auth())
    router.get('available-users', [MessageController, 'getAvailableUsers']).use(middleware.auth())
    router.put(':id/read', [MessageController, 'markRead']).use(middleware.auth())
  })
  .prefix('messages')

router
  .group(() => {
    router.get('/', [ComplaintsController, 'index'])
    router.post('/', [ComplaintsController, 'create'])
    router.get(':id', [ComplaintsController, 'show'])
    router.put(':id', [ComplaintsController, 'update'])
    router.delete(':id', [ComplaintsController, 'delete'])
    router.get('user/:utilisateur_id', [ComplaintsController, 'getUserComplaints'])
  })
  .prefix('complaints')

router
  .group(() => {
    router.get('/', [AdminController, 'index']).use(middleware.auth())
    router.post('/', [AdminController, 'create']).use(middleware.auth())
    router.post('create-user', [AdminController, 'createUserWithEmail']).use(middleware.auth())
    router.get(':id', [AdminController, 'get']).use(middleware.auth())
    router.put(':id', [AdminController, 'update']).use(middleware.auth())
    router.delete(':id', [AdminController, 'delete']).use(middleware.auth())
    router
      .put('toggle-user-status/:id', [AdminController, 'toggleUserStatus'])
      .use(middleware.auth())
    router.delete('delete-user/:id', [AdminController, 'deleteUser']).use(middleware.auth())

    // ==============================
    // ROUTES SERVICES ADMIN - FONCTIONNELLES
    // ==============================

    // Dashboard et analytics services
    router
      .get('services/dashboard', [AdminController, 'getServicesDashboard'])
      .use(middleware.auth())
    router
      .get('services/analytics', [ServicesController, 'getServiceAnalytics'])
      .use(middleware.auth())

    // Gestion des prestataires
    router
      .post('prestataires/:id/validate', [AdminController, 'validatePrestataire'])
      .use(middleware.auth())

    // Gestion des types de services
    router.get('service-types', [AdminController, 'getServiceTypes']).use(middleware.auth())
    router
      .put('service-types/:id/toggle', [AdminController, 'toggleServiceType'])
      .use(middleware.auth())

    // Validation des services
    router
      .post('services/:id/validate', [ServicesController, 'validateService'])
      .use(middleware.auth())

    // Facturation mensuelle automatique
    router
      .get('facturation/mensuelle', [AdminController, 'generateFacturationMensuelle'])
      .use(middleware.auth())

    // Calendrier des prestataires
    router
      .get('prestataires/:prestataireId/calendar', [ServicesController, 'getProviderCalendar'])
      .use(middleware.auth())
  })
  .prefix('admins')

router
  .group(() => {
    router.get('/', [ServicesController, 'index'])
    router.post('/', [ServicesController, 'create'])

    // Routes pour la validation des services (admin) - AVANT les routes avec :id
    router
      .get('pending', [ServicesController, 'getPendingServices'])
      .use([middleware.auth(), middleware.admin()])
    router
      .post(':id/validate', [ServicesController, 'validateService'])
      .use([middleware.auth(), middleware.admin()])

    // Routes avec paramètres - APRÈS les routes spécifiques
    router.get(':id', [ServicesController, 'show'])
    router.put(':id', [ServicesController, 'update'])
    router.delete(':id', [ServicesController, 'delete'])
  })
  .prefix('services')

router
  .group(() => {
    router.post('create', [JustificationPiecesController, 'create'])
    router.get('all', [JustificationPiecesController, 'getAll'])
    router.get('unverified', [JustificationPiecesController, 'getUnverified'])
    router.get('verified', [JustificationPiecesController, 'getVerified'])
    router.get('user/:utilisateur_id', [JustificationPiecesController, 'getUserPieces'])
    router.put('verify/:id', [JustificationPiecesController, 'verify'])
    router.put('reject/:id', [JustificationPiecesController, 'reject'])
    router.get(':id/download', [JustificationPiecesController, 'downloadById'])
    router.get(':id', [JustificationPiecesController, 'get'])
  })
  .prefix('justification-pieces')

router
  .group(() => {
    router
      .get('livreur/:livreur_id/positions', [TrackingController, 'getLivreurPositions'])
      .use(middleware.auth())
    router
      .get('livreur/:livreur_id/last-position', [TrackingController, 'getLastPosition'])
      .use(middleware.auth())
    router
      .get('livraison/:livraison_id', [TrackingController, 'getLivraisonTracking'])
      .use(middleware.auth())
    router
      .get('active-livreurs', [TrackingController, 'getActiveLivreurs'])
      .use([middleware.auth(), middleware.admin()])

    // Nouvelles routes pour compléter la géolocalisation
    router.post('update-position', [TrackingController, 'updatePosition']).use(middleware.auth())
    router
      .get('nearby-deliverers', [TrackingController, 'searchNearbyDeliverers'])
      .use(middleware.auth())
  })
  .prefix('tracking')

// Subscription routes
router
  .group(() => {
    // Public routes
    router.get('plans', [SubscriptionsController, 'plans'])

    // User routes (authenticated)
    router.get('user/:userId', [SubscriptionsController, 'show']).use(middleware.auth())
    router.post('subscribe', [SubscriptionsController, 'store']).use(middleware.auth())
    router.put(':id/cancel', [SubscriptionsController, 'cancel']).use(middleware.auth())

    // Admin routes
    router
      .get('all', [SubscriptionsController, 'index'])
      .use([middleware.auth(), middleware.admin()])
    router
      .put(':id', [SubscriptionsController, 'update'])
      .use([middleware.auth(), middleware.admin()])
    router
      .post('check-expired', [SubscriptionsController, 'checkExpired'])
      .use([middleware.auth(), middleware.admin()])
  })
  .prefix('subscriptions')

// Routes pour intégration Leaflet.js
router
  .group(() => {
    // Configuration des cartes
    router.get('config/tiles', async () => {
      return {
        tileServerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        defaultCenter: [46.227638, 2.213749], // Centre de la France
        defaultZoom: 6,
      }
    })

    // Données géographiques de base
    router.get('geo/france-regions', async () => {
      return {
        regions: [
          {
            name: 'Île-de-France',
            center: [48.8566, 2.3522],
            bounds: [
              [48.1, 1.4],
              [49.2, 3.6],
            ],
          },
          {
            name: 'Auvergne-Rhône-Alpes',
            center: [45.764, 4.8357],
            bounds: [
              [44.1, 3.2],
              [46.8, 7.2],
            ],
          },
          {
            name: 'PACA',
            center: [43.296, 5.3695],
            bounds: [
              [42.3, 4.2],
              [44.9, 7.7],
            ],
          },
          {
            name: 'Hauts-de-France',
            center: [50.6311, 3.0588],
            bounds: [
              [49.5, 1.6],
              [51.1, 4.3],
            ],
          },
        ],
      }
    })

    // Points d'intérêt transport
    router.get('geo/transport-hubs', async () => {
      return {
        airports: [
          { name: 'CDG', coordinates: [49.0097, 2.5479], code: 'CDG' },
          { name: 'Orly', coordinates: [48.7262, 2.3656], code: 'ORY' },
          { name: 'Lyon Saint-Exupéry', coordinates: [45.7256, 5.0811], code: 'LYS' },
        ],
        trainStations: [
          { name: 'Gare du Nord', coordinates: [48.8809, 2.3553] },
          { name: 'Gare de Lyon', coordinates: [48.8437, 2.374] },
          { name: 'Lyon Part-Dieu', coordinates: [45.7604, 4.8595] },
          { name: 'Marseille Saint-Charles', coordinates: [43.3032, 5.3805] },
        ],
      }
    })
  })
  .prefix('map')

// Routes pour les bookings
router
  .group(() => {
    // Routes publiques/CRUD basiques
    router.get('/', [BookingsController, 'index']).use(middleware.auth())
    router.post('/', [BookingsController, 'create']).use(middleware.auth())
    router.get(':id', [BookingsController, 'show']).use(middleware.auth())
    router.put(':id/status', [BookingsController, 'updateStatus']).use(middleware.auth())

    // Routes par client
    router.get('client/:clientId', [BookingsController, 'getClientBookings']).use(middleware.auth())

    // Routes par prestataire
    router
      .get('provider/:prestataireId', [BookingsController, 'getProviderBookings'])
      .use(middleware.auth())

    // Statistiques admin
    router
      .get('admin/stats', [BookingsController, 'getBookingStats'])
      .use([middleware.auth(), middleware.admin()])
  })
  .prefix('bookings')

// Routes pour les types de services
router
  .group(() => {
    router.get('/', [ServiceTypesController, 'index'])
    router.post('/', [ServiceTypesController, 'create']).use(middleware.auth())
    router.get('stats', [ServiceTypesController, 'getStats']).use(middleware.auth())
    router.get(':id', [ServiceTypesController, 'show'])
    router.put(':id', [ServiceTypesController, 'update']).use(middleware.auth())
    router.put(':id/toggle-status', [ServiceTypesController, 'toggleStatus']).use(middleware.auth())
    router.delete(':id', [ServiceTypesController, 'destroy']).use(middleware.auth())
  })
  .prefix('service-types')

// ===============================================
// ROUTES PORTEFEUILLE ECODELI
// ===============================================
router
  .group(() => {
    // Routes utilisateur (authentifié)
    router.get('user/:userId', [PortefeuilleController, 'show']).use(middleware.auth())
    router
      .post('user/:userId/configure-virement', [PortefeuilleController, 'configureVirementAuto'])
      .use(middleware.auth())
    router
      .post('user/:userId/desactiver-virement', [PortefeuilleController, 'desactiverVirementAuto'])
      .use(middleware.auth())
    router
      .get('user/:userId/historique', [PortefeuilleController, 'historique'])
      .use(middleware.auth())
    router
      .post('user/:userId/demander-virement', [PortefeuilleController, 'demanderVirement'])
      .use(middleware.auth())

    // Routes admin
    router
      .get('statistiques', [PortefeuilleController, 'statistiques'])
      .use([middleware.auth(), middleware.admin()])
  })
  .prefix('portefeuille')

// ===============================================
// ROUTES RATINGS/AVIS
// ===============================================
router
  .group(() => {
    // Création d'avis (authentifié)
    router.post('/', [RatingController, 'create']).use(middleware.auth())

    // Récupération avis par prestataire (public)
    router.get('prestataire/:prestataireId', [RatingController, 'getByPrestataire'])

    // Récupération avis par service (public)
    router.get('service/:serviceId', [RatingController, 'getByService'])

    // Modération admin
    router
      .get('admin/all', [RatingController, 'getAllForAdmin'])
      .use([middleware.auth(), middleware.admin()])
    router.put(':id', [RatingController, 'update']).use([middleware.auth(), middleware.admin()])
    router.delete(':id', [RatingController, 'delete']).use(middleware.auth())
  })
  .prefix('ratings')

// ===============================================
// ROUTES STRIPE - PAIEMENTS & ABONNEMENTS
// ===============================================
router
  .group(() => {
    // Webhooks (sans authentification - requis par Stripe)
    router.post('webhook', [StripeController, 'webhook'])

    // Informations publiques (sans authentification)
    router.get('commission-info', [StripeController, 'getCommissionInfo'])

    // Gestion des abonnements (authentifié)
    router
      .post('subscribe', [StripeController, 'createSubscriptionCheckout'])
      .use(middleware.auth())
    router.get('checkout/success', [StripeController, 'handleCheckoutSuccess'])
    router
      .get('session/:sessionId', [StripeController, 'getCheckoutSession'])
      .use(middleware.auth())
    router
      .post('customer-portal', [StripeController, 'createCustomerPortal'])
      .use(middleware.auth())

    // Factures et téléchargements
    router
      .get('invoice/:invoiceId/download', [StripeController, 'downloadInvoice'])
      .use(middleware.auth())

    // Gestion des paiements (authentifié)
    router
      .post('payments/delivery', [StripeController, 'createDeliveryPayment'])
      .use(middleware.auth())
    router
      .post('payments/service', [StripeController, 'createServicePayment'])
      .use(middleware.auth())
    router
      .post('payments/livraison', [StripeController, 'createLivraisonPayment'])
      .use(middleware.auth())
      .use(middleware.auth())
    router.post('payments/capture', [StripeController, 'capturePayment']).use(middleware.auth())
  })
  .prefix('stripe')

router.get('documents/:filename', [FilesController, 'downloadJustification'])

// Route webhook alternative pour compatibilité avec Stripe Dashboard
router
  .group(() => {
    router.post('stripe/webhook', [StripeController, 'webhook'])
  })
  .prefix('api')
