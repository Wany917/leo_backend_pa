import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Utilisateurs from './utilisateurs.js'

export default class PortefeuilleEcodeli extends BaseModel {
  static table = 'portefeuille_ecodeli'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'utilisateur_id' })
  declare utilisateurId: number

  @column({ columnName: 'solde_disponible' })
  declare soldeDisponible: number

  @column({ columnName: 'solde_en_attente' })
  declare soldeEnAttente: number

  @column()
  declare iban: string | null

  @column()
  declare bic: string | null

  @column({ columnName: 'virement_auto_actif' })
  declare virementAutoActif: boolean

  @column({ columnName: 'seuil_virement_auto' })
  declare seuilVirementAuto: number

  @column({ columnName: 'is_active' })
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
    const disponible = Number.parseFloat(String(this.soldeDisponible)) || 0
    const enAttente = Number.parseFloat(String(this.soldeEnAttente)) || 0
    return disponible + enAttente
  }

  // Méthodes métier
  public async ajouterFondsEnAttente(montant: number): Promise<void> {
    const currentSoldeEnAttente = Number.parseFloat(String(this.soldeEnAttente)) || 0
    const montantToAdd = Number.parseFloat(String(montant)) || 0
    this.soldeEnAttente = currentSoldeEnAttente + montantToAdd

    console.log(
      ` ajouterFondsEnAttente: ${currentSoldeEnAttente} + ${montantToAdd} = ${this.soldeEnAttente}`
    )
    await this.save()
  }

  public async libererFonds(montant: number): Promise<void> {
    const currentSoldeEnAttente = Number.parseFloat(String(this.soldeEnAttente)) || 0
    const currentSoldeDisponible = Number.parseFloat(String(this.soldeDisponible)) || 0
    const montantNumeric = Number.parseFloat(String(montant)) || 0

    console.log(
      `🔍 libererFonds: Solde en attente: ${currentSoldeEnAttente}, Montant à libérer: ${montantNumeric}`
    )

    if (currentSoldeEnAttente < montantNumeric) {
      throw new Error(
        `Solde en attente insuffisant (${currentSoldeEnAttente}€ < ${montantNumeric}€)`
      )
    }

    this.soldeEnAttente = currentSoldeEnAttente - montantNumeric
    this.soldeDisponible = currentSoldeDisponible + montantNumeric

    console.log(
      ` libererFonds: Nouveau solde en attente: ${this.soldeEnAttente}, Nouveau solde disponible: ${this.soldeDisponible}`
    )
    await this.save()

    // Vérifier si virement automatique nécessaire
    if (this.virementAutoActif && this.soldeDisponible >= this.seuilVirementAuto) {
      // TODO: Déclencher virement automatique
      console.log('Virement automatique déclenché pour', this.soldeDisponible, '€')
    }
  }

  public async retirerFonds(montant: number): Promise<void> {
    const currentSoldeDisponible = Number.parseFloat(String(this.soldeDisponible)) || 0
    const montantNumeric = Number.parseFloat(String(montant)) || 0

    if (currentSoldeDisponible < montantNumeric) {
      throw new Error('Solde disponible insuffisant')
    }

    this.soldeDisponible = currentSoldeDisponible - montantNumeric
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
