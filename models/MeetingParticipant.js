const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.js');
const Meeting = require('./Meeting');
const User = require('./User');

const MeetingParticipant = sequelize.define('MeetingParticipant', {
    MeetingId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: Meeting,
      key: 'id'
    }
  },
  UserId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['MeetingId', 'UserId']
    }
  ]
});

module.exports = MeetingParticipant;