import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Annonce from '#models/annonce'
import Livraison from '#models/livraison'

export default class Colis extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'annonce_id' })
  declare annonceId: number

  @column()
  declare trackingNumber: string

  @column()
  declare weight: number

  @column()
  declare length: number

  @column()
  declare width: number

  @column()
  declare height: number

  @column()
  declare status: 'ready' | 'picked' | 'in_transit' | 'delivered'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Annonce, {
    foreignKey: 'annonce_id',
  })
  declare annonce: BelongsTo<typeof Annonce>

  @manyToMany(() => Livraison, {
    pivotTable: 'livraison_colis',
    pivotForeignKey: 'colis_id',
    pivotRelatedForeignKey: 'livraison_id',
  })
  declare livraisons: ManyToMany<typeof Livraison>
}