const { mysqlTable, varchar, int, text } = require('drizzle-orm/mysql-core');

// Facturas table schema
const facturas = mysqlTable('facturas', {
  id: int('id').primaryKey().autoincrement(),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  descripcion: text('descripcion'),
  url: varchar('url', { length: 500 })
});

module.exports = {
  facturas
};
