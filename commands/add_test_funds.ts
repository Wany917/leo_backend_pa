import { BaseCommand, args } from '@adonisjs/core/ace'
import stripe from '#config/stripe'

export default class AddTestFunds extends BaseCommand {
  public static commandName = 'add:test-funds'
  public static description =
    'Ajoute instantanément des fonds de test disponibles sur le compte Stripe principal'

  @args.string({ description: 'Montant en centimes (ex : 5000 = 50€)', required: false })
  public amount?: string

  public async run() {
    const amount = Number(this.amount || 1000)

    if (Number.isNaN(amount) || amount <= 0) {
      this.logger.error('Montant invalide. Exemple : node ace add:test-funds 5000  # pour 50€')
      return
    }

    this.logger.info(
      `Création d'une charge de ${(amount / 100).toFixed(2)}€ avec la carte bypass-pending…`
    )

    try {
      const charge = await stripe.charges.create({
        amount,
        currency: 'eur',
        source: 'tok_bypassPending', // Carte 4000 0000 0000 0077
        description: 'Alimentation balance de test via add:test-funds',
      })

      this.logger.success(`Charge créée : ${charge.id}`)
      this.logger.success(
        `Nouveau solde disponible (+${(amount / 100).toFixed(2)}€) visible dans quelques secondes dans le dashboard test.`
      )
    } catch (error: any) {
      this.logger.error(`Erreur Stripe : ${error.message}`)
    }
  }
}
