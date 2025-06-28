import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateurs from './utilisateurs.js'

export default class PortefeuilleEcodeli extends BaseModel {
  static table = 'portefeuille_ecodeli'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare utilisateurId: number

  @column()
  declare soldeDisponible: number

  @column()
  declare soldeEnAttente: number

  @column()
  declare iban: string | null

  @column()
  declare bic: string | null

  @column()
  declare virementAutoActif: boolean

  @column()
  declare seuilVirementAuto: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Utilisateurs, {
    foreignKey: 'utilisateurId',
  })
  declare utilisateur: BelongsTo<typeof Utilisateurs>

  // Computed Properties
  @computed()
  get soldeTotal() {
    return this.soldeDisponible + this.soldeEnAttente
  }

  // Méthodes métier
  public async ajouterFondsEnAttente(montant: number): Promise<void> {
    this.soldeEnAttente += montant
    await this.save()
  }

  public async libererFonds(montant: number): Promise<void> {
    if (this.soldeEnAttente < montant) {
      throw new Error('Solde en attente insuffisant')
    }

    this.soldeEnAttente -= montant
    this.soldeDisponible += montant
    await this.save()

    // Vérifier si virement automatique nécessaire
    if (this.virementAutoActif && this.soldeDisponible >= this.seuilVirementAuto) {
      // TODO: Déclencher virement automatique
      console.log('Virement automatique déclenché pour', this.soldeDisponible, '€')
    }
  }

  public async retirerFonds(montant: number): Promise<void> {
    if (this.soldeDisponible < montant) {
      throw new Error('Solde disponible insuffisant')
    }

    this.soldeDisponible -= montant
    await this.save()
  }

  public async configurerVirementAuto(iban: string, bic: string, seuil: number): Promise<void> {
    this.iban = iban
    this.bic = bic
    this.seuilVirementAuto = seuil
    this.virementAutoActif = true
    await this.save()
  }

  public async desactiverVirementAuto(): Promise<void> {
    this.virementAutoActif = false
    await this.save()
  }
}
