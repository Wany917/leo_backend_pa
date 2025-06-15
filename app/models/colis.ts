import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany, HasOne } from '@adonisjs/lucid/types/relations'
import Annonce from '#models/annonce'
import Livraison from '#models/livraison'
import StockageColi from '#models/stockage_coli'

export default class Colis extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'annonce_id' })
  declare annonceId: number

  @column({ columnName: 'tracking_number' })
  declare trackingNumber: string | null

  @column()
  declare weight: number

  @column()
  declare length: number

  @column()
  declare width: number

  @column()
  declare height: number

  @column()
  declare contentDescription: string

  @column()
  declare status: 'stored' | 'in_transit' | 'delivered' | 'lost'

  @column()
  declare locationType: 'warehouse' | 'storage_box' | 'client_address' | 'in_transit' | null

  @column()
  declare locationId: number | null

  @column()
  declare currentAddress: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Annonce, {
    foreignKey: 'annonceId',
  })
  declare annonce: BelongsTo<typeof Annonce>

  @manyToMany(() => Livraison, {
    pivotTable: 'livraison_colis',
    pivotForeignKey: 'colis_id',
    pivotRelatedForeignKey: 'livraison_id',
  })
  declare livraisons: ManyToMany<typeof Livraison>

  @hasOne(() => StockageColi, {
    foreignKey: 'colisId',
  })
  declare stockage: HasOne<typeof StockageColi>

  /**
   * Génère un tracking number unique
   */
  static async generateTrackingNumber(): Promise<string> {
    let trackingNumber = `COLIS-${Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, '0')}`

    while (await Colis.findBy('tracking_number', trackingNumber)) {
      trackingNumber = `COLIS-${Math.floor(Math.random() * 1e6)
        .toString()
        .padStart(6, '0')}`
    }

    return trackingNumber
  }

  /**
   * S'assure que le colis a un tracking number
   */
  async ensureTrackingNumber(): Promise<void> {
    if (!this.trackingNumber) {
      this.trackingNumber = await Colis.generateTrackingNumber()
      await this.save()
    }
  }

  /**
   * Retourne le tracking number ou génère un fallback basé sur l'ID
   */
  getTrackingNumber(): string {
    return this.trackingNumber || `COLIS-${this.id.toString().padStart(6, '0')}`
  }
}
