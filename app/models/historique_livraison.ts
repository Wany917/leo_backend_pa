import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

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
}