import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'

export default class Subscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare utilisateur_id: number

  @column()
  declare subscription_type: 'free' | 'starter' | 'premium'

  @column()
  declare monthly_price: number

  @column.dateTime()
  declare start_date: DateTime

  @column.dateTime()
  declare end_date: DateTime | null

  @column()
  declare status: 'active' | 'expired' | 'cancelled'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'utilisateur_id',
  })
  declare utilisateur: BelongsTo<typeof Utilisateurs>

  static getSubscriptionPrices() {
    return {
      free: 0.0,
      starter: 9.90,
      premium: 19.99,
    }
  }

  static getSubscriptionFeatures() {
    return {
      free: {
        max_packages_per_month: 5,
        insurance_coverage: 0,
        priority_support: false,
      },
      starter: {
        max_packages_per_month: 50,
        insurance_coverage: 100,
        priority_support: false,
      },
      premium: {
        max_packages_per_month: -1, 
        insurance_coverage: 500,
        priority_support: true,
      },
    }
  }

  get isActive(): boolean {
    const now = DateTime.now()
    return this.status === 'active' && (this.end_date === null || this.end_date > now)
  }

  get isExpired(): boolean {
    const now = DateTime.now()
    return this.end_date !== null && this.end_date <= now
  }
}
