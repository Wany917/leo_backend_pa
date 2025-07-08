-- 🔧 Script pour reset les séquences PostgreSQL après seeders
-- Exécution : psql -d your_database -f database/scripts/reset_sequences.sql

\echo '🔄 Reset des séquences PostgreSQL...'

-- ✅ Reset des séquences principales
SELECT setval('utilisateurs_id_seq', COALESCE((SELECT MAX(id) FROM utilisateurs), 1));
SELECT setval('admins_id_seq', COALESCE((SELECT MAX(id) FROM admins), 1));
SELECT setval('clients_id_seq', COALESCE((SELECT MAX(id) FROM clients), 1));
SELECT setval('livreurs_id_seq', COALESCE((SELECT MAX(id) FROM livreurs), 1));
SELECT setval('commercants_id_seq', COALESCE((SELECT MAX(id) FROM commercants), 1));
SELECT setval('prestataires_id_seq', COALESCE((SELECT MAX(id) FROM prestataires), 1));

-- ✅ Reset des séquences métier
SELECT setval('annonces_id_seq', COALESCE((SELECT MAX(id) FROM annonces), 1));
SELECT setval('colis_id_seq', COALESCE((SELECT MAX(id) FROM colis), 1));
SELECT setval('livraisons_id_seq', COALESCE((SELECT MAX(id) FROM livraisons), 1));
SELECT setval('services_id_seq', COALESCE((SELECT MAX(id) FROM services), 1));
SELECT setval('messages_id_seq', COALESCE((SELECT MAX(id) FROM messages), 1));

-- ✅ Reset des séquences systèmes
SELECT setval('complaints_id_seq', COALESCE((SELECT MAX(id) FROM complaints), 1));
SELECT setval('subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM subscriptions), 1));
SELECT setval('justification_pieces_id_seq', COALESCE((SELECT MAX(id) FROM justification_pieces), 1));
SELECT setval('bookings_id_seq', COALESCE((SELECT MAX(id) FROM bookings), 1));

-- ✅ Reset des séquences EcoDeli (nouvelles)
SELECT setval('portefeuille_ecodeli_id_seq', COALESCE((SELECT MAX(id) FROM portefeuille_ecodeli), 1));
SELECT setval('transactions_portefeuille_id_seq', COALESCE((SELECT MAX(id) FROM transactions_portefeuille), 1));
SELECT setval('payments_id_seq', COALESCE((SELECT MAX(id) FROM payments), 1));
SELECT setval('invoices_id_seq', COALESCE((SELECT MAX(id) FROM invoices), 1));

-- ✅ Reset des séquences complémentaires
SELECT setval('wharehouses_id_seq', COALESCE((SELECT MAX(id) FROM wharehouses), 1));
SELECT setval('stockage_colis_id_seq', COALESCE((SELECT MAX(id) FROM stockage_colis), 1));
SELECT setval('historique_livraisons_id_seq', COALESCE((SELECT MAX(id) FROM historique_livraisons), 1));
SELECT setval('livreur_positions_id_seq', COALESCE((SELECT MAX(id) FROM livreur_positions), 1));
SELECT setval('colis_location_histories_id_seq', COALESCE((SELECT MAX(id) FROM colis_location_histories), 1));
SELECT setval('service_types_id_seq', COALESCE((SELECT MAX(id) FROM service_types), 1));
SELECT setval('push_notifications_id_seq', COALESCE((SELECT MAX(id) FROM push_notifications), 1));
SELECT setval('ratings_id_seq', COALESCE((SELECT MAX(id) FROM ratings), 1));
SELECT setval('insurances_id_seq', COALESCE((SELECT MAX(id) FROM insurances), 1));
SELECT setval('translations_id_seq', COALESCE((SELECT MAX(id) FROM translations), 1));

\echo '✅ Toutes les séquences ont été synchronisées !'
\echo '🚀 Vous pouvez maintenant créer de nouveaux comptes sans conflit d\'ID !' 