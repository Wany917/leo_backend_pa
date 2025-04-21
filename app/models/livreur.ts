import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Livreur extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare availability_status: string

  @column()
  declare rating: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}