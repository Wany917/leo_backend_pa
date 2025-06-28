#!/bin/bash

# 🔧 Script de reset des séquences PostgreSQL pour EcoDeli
# Usage: ./reset-sequences.sh [database_name]

# Configuration par défaut (modifiez selon votre setup)
DB_NAME=${1:-"ecodeli"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}

echo "🔄 Reset des séquences PostgreSQL pour EcoDeli..."
echo "📊 Base de données: $DB_NAME"
echo "🏠 Host: $DB_HOST:$DB_PORT"
echo "👤 Utilisateur: $DB_USER"
echo ""

# Vérifier si le script SQL existe
if [ ! -f "database/scripts/reset_sequences.sql" ]; then
    echo "❌ Erreur: Le fichier database/scripts/reset_sequences.sql n'existe pas"
    exit 1
fi

# Exécuter le script SQL
echo "🚀 Exécution du script de reset..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/scripts/reset_sequences.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Reset des séquences terminé avec succès !"
    echo "🎯 Vous pouvez maintenant créer des comptes via le frontend sans conflit d'ID"
else
    echo ""
    echo "❌ Erreur lors du reset des séquences"
    echo "💡 Vérifiez vos paramètres de connexion PostgreSQL"
    echo "💡 Alternative manuelle :"
    echo "   psql -d $DB_NAME -f database/scripts/reset_sequences.sql"
fi 