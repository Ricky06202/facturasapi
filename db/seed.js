const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { facturas } = require('./schema');

async function seedDatabase() {
  try {
    // Database connection
    const connection = await mysql.createConnection(process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'facturas_db',
    });

    const db = drizzle(connection);

    // Sample invoices data
    const sampleFacturas = [
      {
        titulo: 'Factura Cliente A',
        descripcion: 'Servicios de consultoría tecnológica para el trimestre Q1',
        url: 'https://example.com/facturas/factura-001.pdf'
      },
      {
        titulo: 'Factura Cliente B',
        descripcion: 'Desarrollo de aplicación móvil y mantenimiento',
        url: 'https://example.com/facturas/factura-002.pdf'
      },
      {
        titulo: 'Factura Cliente C',
        descripcion: 'Hosting y servicios en la nube - mensualidad',
        url: 'https://example.com/facturas/factura-003.pdf'
      },
      {
        titulo: 'Factura Cliente D',
        descripcion: 'Diseño gráfico y branding corporativo',
        url: 'https://example.com/facturas/factura-004.pdf'
      },
      {
        titulo: 'Factura Cliente E',
        descripcion: 'Soporte técnico y actualización de sistemas',
        url: 'https://example.com/facturas/factura-005.pdf'
      }
    ];

    console.log('Inserting sample invoices...');

    // Insert sample data
    for (const factura of sampleFacturas) {
      await db.insert(facturas).values(factura);
      console.log(`✓ Inserted: ${factura.titulo}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log(`📊 Total invoices inserted: ${sampleFacturas.length}`);

    // Close connection
    await connection.end();
    console.log('🔌 Database connection closed');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
