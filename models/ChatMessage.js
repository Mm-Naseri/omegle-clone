// models/ChatMessage.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.js');
const Meeting = require('./Meeting'); // Import Meeting model
const User = require('./User');       // Import User model

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  message_text: {
    type: DataTypes.TEXT, // Use TEXT for longer messages
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING, // Store username for display even if user is deleted
    allowNull: false,
  },
  MeetingId: { // Changed to PascalCase: MeetingId
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Meeting,
      key: 'id',
    },
  },
  UserId: {     // Changed to PascalCase: UserId (Optional FK to User)
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true, // Keep createdAt and updatedAt for record management
});

module.exports = ChatMessage;