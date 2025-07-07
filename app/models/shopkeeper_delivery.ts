import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateur from '#models/utilisateurs'

export default class ShopkeeperDelivery extends BaseModel {
  public static table = 'shopkeeper_deliveries'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'commercant_id' })
  declare commercantId: number

  @column({ columnName: 'livreur_id' })
  declare livreurId: number | null

  @column({ columnName: 'customer_name' })
  declare customerName: string

  @column({ columnName: 'customer_email' })
  declare customerEmail: string

  @column({ columnName: 'customer_address' })
  declare customerAddress: string

  @column({ columnName: 'products_summary' })
  declare productsSummary: string

  @column({ columnName: 'total_weight' })
  declare totalWeight: number | null

  @column()
  declare status: 'pending_acceptance' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled'

  @column({ columnName: 'tracking_number' })
  declare trackingNumber: string

  @column()
  declare price: number

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => Utilisateur, {
    foreignKey: 'commercantId',
  })
  declare commercant: BelongsTo<typeof Utilisateur>

  @belongsTo(() => Utilisateur, {
    foreignKey: 'livreurId',
  })
  declare livreur: BelongsTo<typeof Utilisateur>
}
