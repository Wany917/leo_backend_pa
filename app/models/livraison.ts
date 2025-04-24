import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Colis from '#models/colis'
import Livreur from '#models/livreur'

export default class Livraison extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'livreur_id' })
  declare livreurId: number | null

  @column.dateTime()
  declare scheduledDate: DateTime | null

  @column.dateTime()
  declare actualDeliveryDate: DateTime | null

  @column()
  declare pickupLocation: string

  @column()
  declare dropoffLocation: string

  @column()
  declare status: 'pending' | 'in_transit' | 'delivered' | 'cancelled'

  @belongsTo(() => Livreur, {
    foreignKey: 'livreur_id',
  })
  declare livreur: BelongsTo<typeof Livreur>

  @manyToMany(() => Colis, {
    pivotTable: 'livraison_colis',
    pivotForeignKey: 'livraison_id',
    pivotRelatedForeignKey: 'colis_id',
  })
  declare colis: ManyToMany<typeof Colis>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
