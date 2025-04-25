import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'
import Livraison from '#models/livraison'

export default class Livreur extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare availability_status: string

  @column()
  declare rating: number | null

  @belongsTo(() => Utilisateurs, { foreignKey: 'id' })
  declare user: BelongsTo<typeof Utilisateurs>

  @hasMany(() => Livraison, { foreignKey: 'livreur_id' })
  declare livraisons: HasMany<typeof Livraison>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}