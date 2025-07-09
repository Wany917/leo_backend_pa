import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Utilisateurs from '#models/utilisateurs'
import Service from '#models/service'

export default class Prestataire extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare service_type: string | null

  @column()
  declare rating: number | null

  @column({ columnName: 'stripe_account_id' })
  declare stripeAccountId: string | null

  @belongsTo(() => Utilisateurs, { foreignKey: 'id' })
  declare user: BelongsTo<typeof Utilisateurs>

  @hasMany(() => Service, { foreignKey: 'prestataireId' })
  declare services: HasMany<typeof Service>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Calcule le nombre de services actifs du prestataire
   */
  async getActiveServicesCount(): Promise<number> {
    const count = await Service.query()
      .where('prestataireId', this.id)
      .where('is_active', true)
      .count('* as total')

    return count[0].$extras.total
  }

  /**
   * Calcule le chiffre d'affaires mensuel du prestataire
   */
  async getMonthlyRevenue(month?: number, year?: number): Promise<number> {
    const targetMonth = month || DateTime.now().month
    const targetYear = year || DateTime.now().year

    const startOfMonth = DateTime.fromObject({ year: targetYear, month: targetMonth, day: 1 })
    const endOfMonth = startOfMonth.endOf('month')

    const services = await Service.query()
      .where('prestataireId', this.id)
      .where('status', 'completed')
      .whereBetween('start_date', [startOfMonth.toSQL()!, endOfMonth.toSQL()!])

    return services.reduce((total, service) => {
      return total + service.calculateProviderAmount()
    }, 0)
  }

  /**
   * Vérifie si le prestataire est disponible à une date donnée
   */
  async isAvailableAt(dateTime: DateTime): Promise<boolean> {
    const existingServices = await Service.query()
      .where('prestataireId', this.id)
      .where('status', 'scheduled')
      .where('start_date', '<=', dateTime.toSQL()!)
      .where('end_date', '>=', dateTime.toSQL()!)

    return existingServices.length === 0
  }

  /**
   * Calcule les créneaux disponibles pour le mois
   */
  async getAvailabilityForMonth(month?: number, year?: number): Promise<any[]> {
    const targetMonth = month || DateTime.now().month
    const targetYear = year || DateTime.now().year

    const startOfMonth = DateTime.fromObject({ year: targetYear, month: targetMonth, day: 1 })
    const endOfMonth = startOfMonth.endOf('month')

    // Récupérer tous les services du mois
    const services = await Service.query()
      .where('prestataireId', this.id)
      .whereBetween('start_date', [startOfMonth.toSQL()!, endOfMonth.toSQL()!])
      .orderBy('start_date', 'asc')

    const availability = []
    let currentDate = startOfMonth

    while (currentDate <= endOfMonth) {
      // Ignorer les dimanches
      if (currentDate.weekday !== 7) {
        const dayServices = services.filter((service) =>
          service.start_date.hasSame(currentDate, 'day')
        )

        availability.push({
          date: currentDate.toISODate(),
          is_available: dayServices.length < 3, // Max 3 services par jour
          services_count: dayServices.length,
          services: dayServices.map((service) => ({
            id: service.id,
            name: service.name,
            start_time: service.start_date.toFormat('HH:mm'),
            end_time: service.end_date.toFormat('HH:mm'),
          })),
        })
      }

      currentDate = currentDate.plus({ days: 1 })
    }

    return availability
  }

  /**
   * Met à jour la note moyenne du prestataire basée sur les vrais avis
   */
  async updateRating(): Promise<void> {
    const Rating = (await import('#models/rating')).default

    const ratings = await Rating.query()
      .where('reviewed_id', this.id)
      .where('rating_type', 'service')
      .where('is_visible', true)

    if (ratings.length > 0) {
      // Conversion explicite en nombre pour éviter les NaN
      const validRatings = ratings
        .map((rating) => {
          const numRating =
            typeof rating.overall_rating === 'string'
              ? Number.parseFloat(rating.overall_rating)
              : rating.overall_rating
          return !isNaN(numRating) ? numRating : null
        })
        .filter((rating) => rating !== null) as number[]

      if (validRatings.length > 0) {
        const totalRating = validRatings.reduce((sum, rating) => sum + rating, 0)
        this.rating = Math.round((totalRating / validRatings.length) * 10) / 10
      } else {
        this.rating = null
      }
    } else {
      this.rating = null // Pas d'avis = pas de note
    }

    await this.save()
  }

  /**
   * Vérifie si le prestataire est validé
   */
  async isValidated(): Promise<boolean> {
    const user = await Utilisateurs.find(this.id)
    return user?.state === 'open'
  }

  /**
   * Génère un rapport mensuel pour le prestataire
   */
  async generateMonthlyReport(month?: number, year?: number): Promise<any> {
    const targetMonth = month || DateTime.now().month
    const targetYear = year || DateTime.now().year

    const startOfMonth = DateTime.fromObject({ year: targetYear, month: targetMonth, day: 1 })
    const endOfMonth = startOfMonth.endOf('month')

    const services = await Service.query()
      .where('prestataireId', this.id)
      .whereBetween('start_date', [startOfMonth.toSQL()!, endOfMonth.toSQL()!])

    const completedServices = services.filter((s) => s.status === 'completed')
    const totalRevenue = completedServices.reduce((sum, service) => sum + service.price, 0)
    const providerRevenue = completedServices.reduce(
      (sum, service) => sum + service.calculateProviderAmount(),
      0
    )

    return {
      period: {
        month: targetMonth,
        year: targetYear,
        start_date: startOfMonth.toISODate(),
        end_date: endOfMonth.toISODate(),
      },
      stats: {
        total_services: services.length,
        completed_services: completedServices.length,
        cancelled_services: services.filter((s) => s.status === 'cancelled').length,
        completion_rate:
          services.length > 0 ? ((completedServices.length / services.length) * 100).toFixed(1) : 0,
      },
      financial: {
        total_revenue: totalRevenue,
        provider_revenue: providerRevenue,
        ecodeli_commission: totalRevenue - providerRevenue,
        average_service_price:
          completedServices.length > 0 ? (totalRevenue / completedServices.length).toFixed(2) : 0,
      },
      services: completedServices.map((service) => ({
        id: service.id,
        name: service.name,
        date: service.start_date.toISODate(),
        price: service.price,
        provider_amount: service.calculateProviderAmount(),
      })),
    }
  }
}
