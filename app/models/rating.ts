import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'

export default class Rating extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'reviewer_id' })
  declare reviewerId: number

  @column({ columnName: 'reviewed_id' })
  declare reviewedId: number

  @column({ columnName: 'rating_type' })
  declare ratingType: 'delivery' | 'service' | 'product'

  @column({ columnName: 'rating_for_id' })
  declare ratingForId: number

  @column({ columnName: 'overall_rating' })
  declare overallRating: number

  @column({ columnName: 'punctuality_rating' })
  declare punctualityRating: number | null

  @column({ columnName: 'quality_rating' })
  declare qualityRating: number | null

  @column({ columnName: 'communication_rating' })
  declare communicationRating: number | null

  @column({ columnName: 'value_rating' })
  declare valueRating: number | null

  @column()
  declare comment: string | null

  @column({ columnName: 'is_verified_purchase' })
  declare isVerifiedPurchase: boolean

  @column({ columnName: 'is_visible' })
  declare isVisible: boolean

  @column({ columnName: 'admin_response' })
  declare adminResponse: string | null

  @column.dateTime({ columnName: 'admin_response_at' })
  declare adminResponseAt: DateTime | null

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'reviewerId',
    localKey: 'id',
  })
  declare reviewer: BelongsTo<typeof Utilisateurs>

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'reviewedId',
    localKey: 'id',
  })
  declare reviewed: BelongsTo<typeof Utilisateurs>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
