const { Sequelize } = require('sequelize');

// Environment is already loaded by config/env.js (required first in server.js).
// The dotenv call below is kept for standalone script compatibility (seeds, etc.)
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: process.env.DB_DIALECT || 'mysql',
    // Disable query logging in production; enable in development for debugging.
    logging: isProduction ? false : false,
  }
);

module.exports = sequelize;
