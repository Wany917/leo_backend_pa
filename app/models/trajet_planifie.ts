import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Livreur from '#models/livreur'

export default class TrajetPlanifie extends BaseModel {
  public static table = 'trajets_planifies'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'livreur_id' })
  declare livreurId: number

  @column()
  declare startingAddress: string

  @column()
  declare destinationAddress: string

  @column.dateTime({ columnName: 'planned_date' })
  declare plannedDate: DateTime

  @column()
  declare description: string | null

  @column()
  declare type: 'delivery_route' | 'shopping_trip' | 'other'

  @column()
  declare status: 'active' | 'completed' | 'cancelled'

  @column()
  declare maxCapacity: number | null // Nombre maximum de colis/courses qu'il peut prendre

  @column()
  declare estimatedDuration: number | null // Durée estimée en minutes

  @belongsTo(() => Livreur, {
    foreignKey: 'livreurId',
  })
  declare livreur: BelongsTo<typeof Livreur>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
