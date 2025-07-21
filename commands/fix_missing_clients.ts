import { BaseCommand } from '@adonisjs/core/ace'
import Utilisateurs from '#models/utilisateurs'
import Client from '#models/client'
import { Database } from '@adonisjs/lucid/database'
import app from '@adonisjs/core/services/app'

export default class FixMissingClients extends BaseCommand {
  public static commandName = 'fix:missing-clients'
  public static description = 'Crée des enregistrements client manquants pour les utilisateurs existants'

  public async run() {
    this.logger.info('Recherche des utilisateurs sans enregistrement client...')

    try {
      const db = await app.container.make('lucid.db')
      
      // Trouver tous les utilisateurs qui n'ont pas d'enregistrement client
      const usersWithoutClient = await db
        .from('utilisateurs')
        .leftJoin('clients', 'utilisateurs.id', 'clients.id')
        .whereNull('clients.id')
        .select('utilisateurs.id', 'utilisateurs.first_name', 'utilisateurs.last_name', 'utilisateurs.email')

      if (usersWithoutClient.length === 0) {
        this.logger.success('Tous les utilisateurs ont déjà un enregistrement client.')
        return
      }

      this.logger.info(`Trouvé ${usersWithoutClient.length} utilisateur(s) sans enregistrement client.`)

      // Créer les enregistrements client manquants
      for (const user of usersWithoutClient) {
        await Client.create({
          id: user.id,
          loyalty_points: 0,
          preferred_payment_method: null,
        })

        this.logger.info(`✓ Client créé pour ${user.first_name} ${user.last_name} (${user.email})`)
      }

      this.logger.success(`${usersWithoutClient.length} enregistrement(s) client créé(s) avec succès.`)
    } catch (error: any) {
      this.logger.error(`Erreur lors de la correction : ${error.message}`)
    }
  }
}