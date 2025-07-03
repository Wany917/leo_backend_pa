import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Translation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare locale: string

  @column()
  declare namespace: string

  @column()
  declare key: string

  @column()
  declare value: string

  @column()
  declare metadata: Record<string, any>

  @column()
  declare is_verified: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
