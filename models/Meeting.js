// models/Meeting.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database.js'); // Import Sequelize instance
const User = require('./User'); // Import the User model (although technically not directly used in attributes anymore, might be used in associations later or for type hinting)

const Meeting = sequelize.define('Meeting', {
  // Sequelize will generate a UUID if you specify it in the options
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  start_time: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'available'
  }
}, {
  timestamps: false // or true if you want createdAt and updatedAt
});

module.exports = Meeting;