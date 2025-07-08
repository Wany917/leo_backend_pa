import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Utilisateurs from '#models/utilisateurs'

export default class extends BaseSeeder {
  async run() {
    const emma = await Utilisateurs.findBy('email', 'emma.dubois@email-test.fr')
    const pierre = await Utilisateurs.findBy('email', 'pierre.durand@livreur-test.fr')
    const antoine = await Utilisateurs.findBy('email', 'antoine.martin@fakemail.fr')
    const isabelle = await Utilisateurs.findBy('email', 'isabelle.cohen@prestafake.fr')

    if (!emma || !pierre || !antoine || !isabelle) {
      console.log('❌ Utilisateurs manquants pour messages')
      return
    }

    const messages = [
      {
        sender_id: emma.id,
        receiver_id: pierre.id,
        content: 'Bonjour Pierre, pouvez-vous livrer mes documents cet après-midi ?',
        is_read: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        sender_id: pierre.id,
        receiver_id: emma.id,
        content: 'Bonjour Emma, oui je peux passer vers 15h, ça vous convient ?',
        is_read: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        sender_id: antoine.id,
        receiver_id: isabelle.id,
        content: 'Bonjour, je souhaite réserver un service de ménage pour samedi matin.',
        is_read: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        sender_id: isabelle.id,
        receiver_id: antoine.id,
        content: 'Bonjour Antoine, samedi 10h est disponible. Confirmez-vous ?',
        is_read: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await this.client.table('messages').insert(messages)
  }
}
