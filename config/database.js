// config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false, // Disable Sequelize logging
  });

module.exports = sequelize;