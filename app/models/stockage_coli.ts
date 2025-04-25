import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class StockageColi extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare colis_id: number

  @column()
  declare wharehouse_id: number

  @column()
  declare storage_area: string

  @column()
  declare stored_until: DateTime

  @column()
  declare description: string

  @belongsTo(() => Colis, {
    foreignKey: 'colis_tracking_number',
    ownerKey: 'tracking_number',
  })
  declare colis: BelongsTo<typeof Colis>

  @belongsTo(() => Wharehouse, { foreignKey: 'wharehouse_id' })
  declare wharehouse: BelongsTo<typeof Wharehouse>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}