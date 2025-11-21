const express = require('express');
const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { facturas } = require('./db/schema');
const { eq } = require('drizzle-orm');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Database connection
async function initDatabase() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'facturas_db',
  });

  const db = drizzle(connection);
  return { db, connection };
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Facturas API - Drizzle ORM with MySQL' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Facturas routes
app.get('/api/facturas', async (req, res) => {
  try {
    const { db } = await initDatabase();
    const allFacturas = await db.select().from(facturas);
    res.json(allFacturas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/facturas', async (req, res) => {
  try {
    const { db } = await initDatabase();
    const { titulo, descripcion, url } = req.body;
    
    if (!titulo) {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    
    const result = await db.insert(facturas).values({
      titulo,
      descripcion,
      url
    });
    
    res.status(201).json({ message: 'Factura creada', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/facturas/:id', async (req, res) => {
  try {
    const { db } = await initDatabase();
    const { id } = req.params;
    
    const factura = await db.select().from(facturas).where(eq(facturas.id, parseInt(id))).limit(1);
    
    if (factura.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    res.json(factura[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/facturas/:id', async (req, res) => {
  try {
    const { db } = await initDatabase();
    const { id } = req.params;
    const { titulo, descripcion, url } = req.body;
    
    if (!titulo) {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    
    const result = await db.update(facturas)
      .set({ titulo, descripcion, url })
      .where(eq(facturas.id, parseInt(id)));
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    res.json({ message: 'Factura actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/facturas/:id', async (req, res) => {
  try {
    const { db } = await initDatabase();
    const { id } = req.params;
    
    const result = await db.delete(facturas).where(eq(facturas.id, parseInt(id)));
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    res.json({ message: 'Factura eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scrape-factura', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'La URL es requerida' });
    }

    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract Date
    // The date is in the third col-sm-4 in the first panel heading
    // Structure: .panel-heading .row .col-sm-4.text-right h5
    const fecha = $('.panel-heading .row .col-sm-4.text-right h5').first().text().trim();

    // Extract Issuer Info
    let emisorNombre = '';
    let emisorRuc = '';
    let emisorDv = '';

    $('.panel-default').each((i, el) => {
      const heading = $(el).find('.panel-heading').text().trim();
      if (heading.includes('EMISOR')) {
        const body = $(el).find('.panel-body');
        emisorRuc = body.find('dt:contains("RUC") + dd').text().trim();
        emisorDv = body.find('dt:contains("DV") + dd').text().trim();
        emisorNombre = body.find('dt:contains("NOMBRE") + dd').text().trim();
      }
    });

    // Extract Products
    const productos = [];
    $('#detalle table tbody tr').each((i, el) => {
      const descripcion = $(el).find('td[data-title="Descripción"]').text().trim();
      const cantidad = $(el).find('td[data-title="Cantidad"]').text().trim();
      const precioUnitario = $(el).find('td[data-title="Precio"]').text().trim();
      const descuento = $(el).find('td[data-title="Descuento"]').text().trim();
      const precioTotal = $(el).find('td[data-title="Total"]').text().trim();

      if (descripcion) {
        productos.push({
          descripcion,
          cantidad,
          precioUnitario,
          descuento,
          precioTotal
        });
      }
    });

    // Extract Totals
    // Note: The text is inside a div inside the td, e.g. "Descuentos: <div>0.00</div>"
    // We need to get the text of the div.
    const descuentos = $('#detalle table tfoot td:contains("Descuentos:") div').text().trim();
    const itbms = $('#detalle table tfoot td:contains("ITBMS Total:") div').text().trim();
    const total = $('#detalle table tfoot td:contains("TOTAL PAGADO:") div').text().trim();

    res.json({
      fecha,
      emisor: {
        nombre: emisorNombre,
        ruc: emisorRuc,
        dv: emisorDv
      },
      productos,
      descuentos,
      itbms,
      total
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Error al procesar la factura: ' + error.message });
  }
});

// Start server
async function startServer() {
  let connection;
  try {
    const dbResult = await initDatabase();
    connection = dbResult.connection;
    console.log(`Database connected successfully`);
  } catch (error) {
    console.error('Warning: Database connection failed:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
    process.exit(0);
  });
}

startServer();
