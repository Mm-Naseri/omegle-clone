// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.js'); // Import Sequelize instance

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,  // Automatically generates a UUID v4.
    primaryKey: true,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_in_meeting: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'available'
  }
}, {
  timestamps: true, // Enable Sequelize's automatic timestamps (createdAt, updatedAt)
});

module.exports = User;