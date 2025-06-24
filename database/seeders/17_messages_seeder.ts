import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    const messages = [
      // Conversation entre Marie Dupont (3) et Ahmed Benali (5) pour livraison documents
      {
        id: 1,
        sender_id: 3, // Marie Dupont
        receiver_id: 5, // Ahmed Benali
        content:
          'Bonjour Ahmed, je vois que vous faites des livraisons Paris-Lyon. Pourriez-vous prendre en charge des documents urgents ?',
        is_read: true,
        created_at: new Date('2025-01-20 10:30:00'),
        updated_at: new Date('2025-01-20 10:30:00'),
      },
      {
        id: 2,
        sender_id: 5, // Ahmed Benali
        receiver_id: 3, // Marie Dupont
        content:
          "Bonjour Marie ! Oui bien sûr, je peux m'occuper de vos documents. Quelle est la taille du colis et la date souhaitée ?",
        is_read: true,
        created_at: new Date('2025-01-20 10:45:00'),
        updated_at: new Date('2025-01-20 10:45:00'),
      },
      {
        id: 3,
        sender_id: 3, // Marie Dupont
        receiver_id: 5, // Ahmed Benali
        content:
          "Parfait ! C'est une enveloppe format A4, très léger. J'aimerais que ce soit livré vendredi avant 17h si possible.",
        is_read: true,
        created_at: new Date('2025-01-20 11:00:00'),
        updated_at: new Date('2025-01-20 11:00:00'),
      },
      {
        id: 4,
        sender_id: 5, // Ahmed Benali
        receiver_id: 3, // Marie Dupont
        content:
          "C'est noté ! J'ai un départ prévu jeudi soir, livraison vendredi matin. Le prix serait de 45€. Ça vous convient ?",
        is_read: false,
        created_at: new Date('2025-01-20 11:15:00'),
        updated_at: new Date('2025-01-20 11:15:00'),
      },

      // Conversation entre Jean Martin (4) et Isabelle Moreau (7) pour transport médical
      {
        id: 5,
        sender_id: 4, // Jean Martin
        receiver_id: 7, // Isabelle Moreau
        content:
          "Bonjour Isabelle, ma mère a besoin d'un transport pour son rendez-vous médical mardi prochain. Votre service est-il adapté aux personnes âgées ?",
        is_read: true,
        created_at: new Date('2025-01-21 14:20:00'),
        updated_at: new Date('2025-01-21 14:20:00'),
      },
      {
        id: 6,
        sender_id: 7, // Isabelle Moreau
        receiver_id: 4, // Jean Martin
        content:
          "Bonjour Jean ! Absolument, je suis spécialisée dans le transport médical pour seniors. Mon véhicule est équipé et j'assure l'accompagnement. Quel est le lieu du rendez-vous ?",
        is_read: true,
        created_at: new Date('2025-01-21 14:35:00'),
        updated_at: new Date('2025-01-21 14:35:00'),
      },
      {
        id: 7,
        sender_id: 4, // Jean Martin
        receiver_id: 7, // Isabelle Moreau
        content:
          "Parfait ! C'est à l'hôpital Pitié-Salpêtrière, rendez-vous à 15h. Départ depuis le 15ème arrondissement. Combien cela coûterait-il ?",
        is_read: true,
        created_at: new Date('2025-01-21 14:50:00'),
        updated_at: new Date('2025-01-21 14:50:00'),
      },

      // Conversation entre François Dubois (9) et Sophie Rousseau (6) pour livraison épicerie
      {
        id: 8,
        sender_id: 9, // François Dubois
        receiver_id: 6, // Sophie Rousseau
        content:
          "Bonjour Sophie, j'ai vu votre profil pour les livraisons. Seriez-vous intéressée par un partenariat régulier pour livrer mes paniers gourmets ?",
        is_read: true,
        created_at: new Date('2025-01-22 09:15:00'),
        updated_at: new Date('2025-01-22 09:15:00'),
      },
      {
        id: 9,
        sender_id: 6, // Sophie Rousseau
        receiver_id: 9, // François Dubois
        content:
          "Bonjour François ! Oui, ça m'intéresse beaucoup. Je fais déjà des livraisons alimentaires et j'adore travailler avec des produits locaux. Quelles sont vos conditions ?",
        is_read: true,
        created_at: new Date('2025-01-22 09:30:00'),
        updated_at: new Date('2025-01-22 09:30:00'),
      },
      {
        id: 10,
        sender_id: 9, // François Dubois
        receiver_id: 6, // Sophie Rousseau
        content:
          'Excellente nouvelle ! Je propose 15€ par livraison dans Paris. Les paniers pèsent entre 3-5kg et contiennent des produits fragiles. Cela vous convient ?',
        is_read: false,
        created_at: new Date('2025-01-22 09:45:00'),
        updated_at: new Date('2025-01-22 09:45:00'),
      },

      // Message de suivi automatique
      {
        id: 11,
        sender_id: 5, // Ahmed Benali
        receiver_id: 3, // Marie Dupont
        content:
          "Votre colis a été récupéré avec succès ! Départ prévu dans 2h, je vous tiens informée de l'avancement.",
        is_read: true,
        created_at: new Date('2025-01-23 18:00:00'),
        updated_at: new Date('2025-01-23 18:00:00'),
      },

      // Message entre Thomas Petit (8) et un potentiel client
      {
        id: 12,
        sender_id: 8, // Thomas Petit
        receiver_id: 4, // Jean Martin
        content:
          "Bonjour ! J'ai vu votre demande de ménage pour mercredi. Je suis disponible et j'utilise uniquement des produits écologiques. Souhaitez-vous plus de détails ?",
        is_read: false,
        created_at: new Date('2025-01-22 16:30:00'),
        updated_at: new Date('2025-01-22 16:30:00'),
      },
    ]

    await this.client.table('messages').insert(messages)
  }
}
