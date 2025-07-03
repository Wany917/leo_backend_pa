import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany, HasMany } from '@adonisjs/lucid/types/relations'
import Prestataire from '#models/prestataire'
import Annonce from '#models/annonce'
import ServiceType from '#models/service_type'

export default class Service extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'prestataireId' })
  declare prestataireId: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare price: number

  @column()
  declare pricing_type: 'fixed' | 'hourly' | 'custom'

  @column()
  declare hourly_rate: number | null

  @column()
  declare location: string

  @column()
  declare status: string

  @column()
  declare availability_description: string | null

  @column()
  declare home_service: boolean

  @column()
  declare requires_materials: boolean

  @column()
  declare service_type_id: number | null

  @column()
  declare duration: number | null

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @belongsTo(() => Prestataire, { foreignKey: 'prestataireId' })
  declare prestataire: BelongsTo<typeof Prestataire>

  @belongsTo(() => ServiceType, { foreignKey: 'service_type_id' })
  declare serviceType: BelongsTo<typeof ServiceType>

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
    return this.isActive && this.status === 'available'
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

  /**
   * Calcule le prix selon le type de tarification
   */
  calculatePrice(durationInHours?: number): number {
    switch (this.pricing_type) {
      case 'hourly':
        if (!this.hourly_rate || !durationInHours) {
          throw new Error('Tarif horaire ou durée manquante pour le calcul')
        }
        return this.hourly_rate * durationInHours
      case 'fixed':
        return this.price
      case 'custom':
        return this.price
      default:
        return this.price
    }
  }

  /**
   * Vérifie si le service peut être réservé
   */
  isAvailableForBooking(): boolean {
    return this.isActive && this.status === 'available'
  }

  /**
   * Retourne les informations de tarification formatées
   */
  getPricingInfo(): string {
    switch (this.pricing_type) {
      case 'hourly':
        return `${this.hourly_rate}€/heure`
      case 'fixed':
        return `${this.price}€ (prix fixe)`
      case 'custom':
        return `${this.price}€ (sur mesure)`
      default:
        return `${this.price}€`
    }
  }
}
