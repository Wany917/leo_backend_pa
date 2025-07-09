import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Livraison from '#models/livraison'
import Utilisateurs from '#models/utilisateurs'

export default class Livreur extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare utilisateurId: number

  @column()
  declare numeroPermis: string | null

  @column()
  declare typeVehicule: string | null

  @column()
  declare plaqueImmatriculation: string | null

  @column()
  declare numeroAssurance: string | null

  @column.date()
  declare dateExpirationAssurance: DateTime | null

  @column()
  declare disponible: boolean

  @column()
  declare latitude: number | null

  @column()
  declare longitude: number | null

  @column.dateTime()
  declare dernierePosition: DateTime | null

  @column()
  declare enService: boolean

  @column()
  declare stripeAccountId: string | null

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'id',
    localKey: 'id',
  })
  declare user: BelongsTo<typeof Utilisateurs>

  @hasMany(() => Livraison, {
    foreignKey: 'livreurId',
  })
  declare livraisons: HasMany<typeof Livraison>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
