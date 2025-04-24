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
  })
  .prefix('auth')

router
  .group(() => {
    router.get(':id', [UtilisateursController, 'get'])
    router.put(':id', [UtilisateursController, 'update'])
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
    router.get(':id', [AnnonceController, 'getAnnonce'])
    router.put(':id', [AnnonceController, 'updateAnnonce'])
  })
  .prefix('annonces')

router
  .group(() => {
    router.post('create', [ColisController, 'create'])
    router.get(':tracking_number', [ColisController, 'getColis'])
  })
  .prefix('colis')
