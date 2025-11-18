const express = require('express');
const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { facturas } = require('./db/schema');
const { eq } = require('drizzle-orm');

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

// Start server
async function startServer() {
  try {
    const { db, connection } = await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database connected successfully`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await connection.end();
      console.log('Database connection closed');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
