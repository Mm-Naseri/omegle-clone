// models/MeetingParticipant.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.js');
const Meeting = require('./Meeting'); // Import the Meeting model class
const User = require('./User');     // Import the User model class

const MeetingParticipant = sequelize.define('MeetingParticipant', {
    MeetingId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: Meeting, // Referencing the Meeting model class
      key: 'id'
    }
  },
  UserId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: User,     // Referencing the User model class
      key: 'id'
    }
  }
}, {
  timestamps: true, // Creates createdAt and updatedAt
  indexes: [
    {
      unique: true,
      fields: ['MeetingId', 'UserId'] // Composite unique index
    }
  ]
});

module.exports = MeetingParticipant;