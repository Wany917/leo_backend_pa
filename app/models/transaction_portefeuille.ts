import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import PortefeuilleEcodeli from './portefeuille_ecodeli.js'
import Utilisateurs from './utilisateurs.js'
import Livraison from './livraison.js'
import Service from './service.js'

export default class TransactionPortefeuille extends BaseModel {
  static table = 'transactions_portefeuille'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare portefeuilleId: number

  @column()
  declare utilisateurId: number

  @column()
  declare typeTransaction: 'credit' | 'debit' | 'liberation' | 'virement' | 'commission'

  @column()
  declare montant: number

  @column()
  declare soldeAvant: number

  @column()
  declare soldeApres: number

  @column()
  declare description: string

  @column()
  declare referenceExterne: string | null

  @column()
  declare livraisonId: number | null

  @column()
  declare serviceId: number | null

  @column()
  declare statut: 'pending' | 'completed' | 'failed' | 'cancelled'

  @column()
  declare metadata: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => PortefeuilleEcodeli, {
    foreignKey: 'portefeuilleId',
  })
  declare portefeuille: BelongsTo<typeof PortefeuilleEcodeli>

  @belongsTo(() => Utilisateurs, {
    foreignKey: 'utilisateurId',
  })
  declare utilisateur: BelongsTo<typeof Utilisateurs>

  @belongsTo(() => Livraison, {
    foreignKey: 'livraisonId',
  })
  declare livraison: BelongsTo<typeof Livraison>

  @belongsTo(() => Service, {
    foreignKey: 'serviceId',
  })
  declare service: BelongsTo<typeof Service>

  // Méthodes utilitaires
  public getMetadataAsJson() {
    return this.metadata ? JSON.parse(this.metadata) : null
  }

  public setMetadata(data: any) {
    this.metadata = JSON.stringify(data)
  }
}
