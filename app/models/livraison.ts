import { DateTime } from 'luxon'
import Colis from '#models/colis'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Livraison extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'livreur_id' })
  declare livreur_id: number | null

  @column()
  declare scheduled_date: DateTime

  @column()
  declare actual_delivery_date: DateTime | null

  @column()
  declare pickup_location: string

  @column()
  declare dropoff_location: string

  @column()
  declare status: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Colis, {
    foreignKey: 'livraison_id',
  })
  public declare colis: HasMany<typeof Colis>
}