import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Colis extends BaseModel {
  @column({ isPrimary: true })
  declare tracking_number: string

  @column()
  declare annonce_id: number

  @column()
  declare livraison_id: number | null

  @belongsTo(() => Livraison, {
    foreignKey: 'livraison_id',
  })
  public livraison: BelongsTo<typeof Livraison>

  @column()
  declare weight: number

  @column()
  declare length: number

  @column()
  declare width: number

  @column()
  declare height: number

  @column()
  declare content_description: string

  @column()
  declare status: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}