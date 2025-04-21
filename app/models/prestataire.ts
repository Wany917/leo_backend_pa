import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Prestataire extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare service_type: string | null

  @column()
  declare rating: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}