import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class LivreurRoute extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare livreur_id: number

  @column()
  declare departure_location: string

  @column()
  declare arrival_location: string

  @column.dateTime()
  declare planned_departure: DateTime

  @column.dateTime()
  declare planned_arrival: DateTime

  @column()
  declare available_capacity: number

  @column()
  declare route_type: 'scheduled' | 'immediate'

  @column()
  declare status: 'active' | 'completed' | 'cancelled'
}
