import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { compose } from '@adonisjs/core/helpers'
import Annonce from '#models/annonce'
import Admin from '#models/admin'
import Client from '#models/client'
import Livreur from '#models/livreur'
import Prestataire from '#models/prestataire'
import Commercant from '#models/commercant'
import JustificationPiece from '#models/justification_piece'
import Subscription from '#models/subscription'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class Utilisateurs extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare first_name: string

  @column()
  declare last_name: string

  @column()
  declare address: string | null

  @column()
  declare city: string

  @column({ columnName: 'postal_code' })
  declare postalCode: string

  @column()
  declare country: string

  @column()
  declare phone_number: string | null

  @column()
  declare state: string

  @column()
  declare email: string

  @column()
  declare preferred_language: string | null

  @column()
  declare onesignal_player_id: string | null

  @column()
  declare push_notifications_enabled: boolean

  @column()
  declare email_notifications_enabled: boolean

  @column()
  declare notification_preferences: any | null

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare stripeCustomerId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Annonce, {
    foreignKey: 'utilisateurId',
  })
  declare annonces: HasMany<typeof Annonce>

  @hasOne(() => Admin, { foreignKey: 'id' })
  declare admin: HasOne<typeof Admin>

  @hasOne(() => Client, { foreignKey: 'id' })
  declare client: HasOne<typeof Client>

  @hasOne(() => Livreur, { foreignKey: 'id' })
  declare livreur: HasOne<typeof Livreur>

  @hasOne(() => Prestataire, { foreignKey: 'id' })
  declare prestataire: HasOne<typeof Prestataire>

  @hasOne(() => Commercant, { foreignKey: 'id' })
  declare commercant: HasOne<typeof Commercant>

  @hasMany(() => JustificationPiece, {
    foreignKey: 'utilisateur_id',
  })
  declare justificationPieces: HasMany<typeof JustificationPiece>

  @hasOne(() => Subscription, {
    foreignKey: 'utilisateur_id',
  })
  declare subscription: HasOne<typeof Subscription>

  static accessTokens = DbAccessTokensProvider.forModel(Utilisateurs)

  // Méthode de sérialisation personnalisée pour exposer les propriétés utilisateur
  serialize() {
    const serialized = super.serialize()

    console.log('🔧 [UTILISATEURS] Sérialisation utilisateur:', {
      firstName: serialized.firstName,
      lastName: serialized.lastName,
      raw_first_name: this.first_name,
      raw_last_name: this.last_name,
    })

    // S'assurer que first_name et last_name sont inclus en plus des versions camelCase
    const result = {
      ...serialized,
      first_name: serialized.firstName,
      last_name: serialized.lastName,
    }

    console.log('🔧 [UTILISATEURS] Résultat sérialisation:', result)
    return result
  }
}
