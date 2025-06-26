import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany, HasMany } from '@adonisjs/lucid/types/relations'
import Prestataire from '#models/prestataire'
import Client from '#models/client'
import Annonce from '#models/annonce'

export default class Service extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'prestataireId' })
  declare prestataireId: number

  @column()
  declare clientId: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare price: number

  @column.dateTime()
  declare start_date: DateTime

  @column.dateTime()
  declare end_date: DateTime

  @column()
  declare location: string

  @column()
  declare status: string

  @column()
  declare service_type_id: number | null

  @column()
  declare duration: number | null

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @belongsTo(() => Prestataire, { foreignKey: 'prestataireId' })
  declare prestataire: BelongsTo<typeof Prestataire>

  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @manyToMany(() => Annonce, {
    pivotTable: 'annonce_services',
    pivotForeignKey: 'service_id',
    pivotRelatedForeignKey: 'annonce_id',
  })
  declare annonces: ManyToMany<typeof Annonce>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Méthode pour calculer la note moyenne du service
   */
  async getAverageRating(): Promise<number> {
    // Simulation - dans un vrai projet, calculer depuis la table ratings
    return 4.5
  }

  /**
   * Méthode pour vérifier si le service est réservable
   */
  isBookable(): boolean {
    const now = DateTime.now()
    return this.isActive && this.status === 'scheduled' && this.start_date > now
  }

  /**
   * Méthode pour calculer la commission EcoDeli
   */
  calculateCommission(rate: number = 0.15): number {
    return this.price * rate
  }

  /**
   * Méthode pour calculer le montant prestataire
   */
  calculateProviderAmount(commissionRate: number = 0.15): number {
    return this.price * (1 - commissionRate)
  }
}
