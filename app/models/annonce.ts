import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'
import Colis from '#models/colis'

export default class Annonce extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'utilisateur_id' })
  declare utilisateurId: number

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare state: 'draft' | 'published' | 'closed'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'utilisateur_id',
  })
  declare utilisateur: BelongsTo<typeof Utilisateurs>

  @hasMany(() => Colis, {
    foreignKey: 'annonce_id',
  })
  declare colis: HasMany<typeof Colis>
}