import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'
import Service from '#models/service'

export default class Booking extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'client_id' })
  declare clientId: number

  @column({ columnName: 'service_id' })
  declare serviceId: number

  @column.dateTime({ columnName: 'start_datetime' })
  declare startDatetime: DateTime

  @column.dateTime({ columnName: 'end_datetime' })
  declare endDatetime: DateTime

  @column()
  declare status: 'pending' | 'confirmed' | 'completed' | 'cancelled'

  @column()
  declare notes: string | null

  @column({ columnName: 'total_price' })
  declare totalPrice: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Utilisateurs, { foreignKey: 'clientId' })
  declare client: BelongsTo<typeof Utilisateurs>

  @belongsTo(() => Service, { foreignKey: 'serviceId' })
  declare service: BelongsTo<typeof Service>

  async calculateTotalPrice(): Promise<number> {
    const service = await Service.find(this.serviceId)
    return service ? service.price : 0
  }

  /**
   * Vérifie si le booking peut être annulé
   */
  canBeCancelled(): boolean {
    const now = DateTime.now()
    const startDatetime = this.startDatetime

    // Peut être annulé si c'est au moins 24h avant
    return (
      this.status === 'pending' ||
      (this.status === 'confirmed' && startDatetime.diff(now, 'hours').hours > 24)
    )
  }

  /**
   * Calcule la durée du service en heures
   */
  getDurationInHours(): number {
    return this.endDatetime.diff(this.startDatetime, 'hours').hours
  }

  /**
   * Vérifie si le booking est en cours
   */
  isInProgress(): boolean {
    const now = DateTime.now()
    return now >= this.startDatetime && now <= this.endDatetime
  }

  /**
   * Vérifie si le booking est terminé
   */
  isFinished(): boolean {
    const now = DateTime.now()
    return now > this.endDatetime
  }

  /**
   * Vérifie si le booking peut être confirmé
   */
  canBeConfirmed(): boolean {
    return this.status === 'pending'
  }

  /**
   * Vérifie si le booking peut être complété
   */
  canBeCompleted(): boolean {
    return this.status === 'confirmed'
  }
}
