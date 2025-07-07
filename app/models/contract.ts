import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateur from '#models/utilisateurs'
import ContractPlan from '#models/contract_plan'

export default class Contract extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare commercantId: number

  @column()
  declare contractPlanId: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare price: number

  @column.dateTime()
  declare startDate: DateTime

  @column.dateTime()
  declare endDate: DateTime

  @column()
  declare status: 'active' | 'expired' | 'cancelled'

  @column()
  declare stripeChargeId: string

  @column()
  declare pdfUrl: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Utilisateur, {
    foreignKey: 'commercantId',
  })
  declare commercant: BelongsTo<typeof Utilisateur>

  @belongsTo(() => ContractPlan)
  declare contractPlan: BelongsTo<typeof ContractPlan>
}
