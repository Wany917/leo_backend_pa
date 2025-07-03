import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'

export default class Rating extends BaseModel {
  static table = 'ratings'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reviewer_id: number

  @column()
  declare reviewed_id: number

  @column()
  declare rating_type: 'delivery' | 'service' | 'product'

  @column()
  declare rating_for_id: number

  @column()
  declare overall_rating: number

  @column()
  declare punctuality_rating: number | null

  @column()
  declare quality_rating: number | null

  @column()
  declare communication_rating: number | null

  @column()
  declare value_rating: number | null

  @column()
  declare comment: string | null

  @column()
  declare is_verified_purchase: boolean

  @column()
  declare is_visible: boolean

  @column()
  declare admin_response: string | null

  @column.dateTime()
  declare admin_response_at: DateTime | null

  @belongsTo(() => Utilisateurs, { foreignKey: 'reviewer_id' })
  declare reviewer: BelongsTo<typeof Utilisateurs>

  @belongsTo(() => Utilisateurs, { foreignKey: 'reviewed_id' })
  declare reviewed: BelongsTo<typeof Utilisateurs>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
