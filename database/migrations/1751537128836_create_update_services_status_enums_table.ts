import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'services'

  async up() {
    // Mettre à jour l'enum des statuts pour inclure les nouveaux statuts
    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      DROP CONSTRAINT IF EXISTS services_status_check;
    `)

    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      ALTER COLUMN status TYPE TEXT;
    `)

    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      ADD CONSTRAINT services_status_check 
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'available', 'unavailable', 'suspended', 'pending', 'validated', 'refused'));
    `)
  }

  async down() {
    // Revenir à l'ancien enum
    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      DROP CONSTRAINT IF EXISTS services_status_check;
    `)

    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      ALTER COLUMN status TYPE TEXT;
    `)

    this.schema.raw(`
      ALTER TABLE ${this.tableName} 
      ADD CONSTRAINT services_status_check 
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));
    `)
  }
}
