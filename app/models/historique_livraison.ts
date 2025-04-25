import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Livraison from '#models/livraison'

export default class HistoriqueLivraison extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare livraison_id: number

  @column()
  declare status: string

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare update_time: DateTime

  @column()
  declare remarks: string | null

  @belongsTo(() => Livraison, { foreignKey: 'livraison_id' })
  declare livraison: BelongsTo<typeof Livraison>
}