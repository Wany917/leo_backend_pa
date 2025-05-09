/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
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

import { middleware } from '#start/kernel'

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
    router.get('all', [UtilisateursController, 'getIndex'])
    router.get(':id', [UtilisateursController, 'get']).use(middleware.auth())
    router.put(':id', [UtilisateursController, 'update']).use(middleware.auth())
    router.post('check-password', [UtilisateursController, 'checkPassword'])
  })
  .prefix('utilisateurs')

router
  .group(() => {
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
  })
  .prefix('livreurs')

router
  .group(() => {
    router.post('add', [PrestataireController, 'add'])
    router.get(':id/profile', [PrestataireController, 'getProfile'])
    router.put(':id/profile', [PrestataireController, 'updateProfile'])
  })
  .prefix('prestataires')

router
  .group(() => {
    router.post('add', [CommercantController, 'add'])
    router.get(':id/profile', [CommercantController, 'getProfile'])
    router.put(':id/profile', [CommercantController, 'updateProfile'])
  })
  .prefix('commercants')

router
  .group(() => {
    router.post('create', [AnnonceController, 'create'])
    router.post(':id/livraisons', [LivraisonController, 'create'])
    router.get(':id', [AnnonceController, 'getAnnonce'])
    router.get('/user/:utilisateur_id', [AnnonceController, 'getUserAnnonces'])
    router.put(':id', [AnnonceController, 'updateAnnonce'])
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
    router.get(':id', [LivraisonController, 'show'])
    router.put(':id', [LivraisonController, 'update'])
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
