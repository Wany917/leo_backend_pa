import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'
import Contract from '#models/contract'

export default class Commercant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare storeName: string

  @column()
  declare businessAddress: string | null

  @column()
  declare contactNumber: string | null

  @column()
  declare verificationState: 'pending' | 'verified' | 'rejected'

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'id',
    localKey: 'id',
  })
  declare user: BelongsTo<typeof Utilisateurs>

  @hasMany(() => Contract)
  declare contracts: HasMany<typeof Contract>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Méthode de sérialisation personnalisée pour inclure les données utilisateur
  serialize() {
    const serialized = super.serialize()

    // S'assurer que les données utilisateur sont incluses
    if (this.user) {
      console.log('🏪 [COMMERCANT] Sérialisation utilisateur:', {
        user_exists: !!this.user,
        user_id: this.user.id,
        user_firstName: this.user.first_name,
        user_lastName: this.user.last_name,
        user_first_name: this.user.first_name,
        user_last_name: this.user.last_name,
      })

      const userSerialized = this.user.serialize()
      console.log('🏪 [COMMERCANT] Utilisateur sérialisé:', userSerialized)

      serialized.user = userSerialized

      // Ajouter directement first_name et last_name au niveau utilisateur
      if (userSerialized) {
        serialized.user.first_name = this.user.first_name || userSerialized.first_name
        serialized.user.last_name = this.user.last_name || userSerialized.last_name
      }
    }

    return serialized
  }
}
