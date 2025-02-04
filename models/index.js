// models/index.js (Updated to match PascalCase in ChatMessage.js)
const sequelize = require('../config/database');
const User = require('./User');
const Meeting = require('./Meeting');
const MeetingParticipant = require('./MeetingParticipant');
const ChatMessage = require('./ChatMessage');

// Define Associations:

// Many-to-Many relationship between Meeting and User through MeetingParticipant
Meeting.belongsToMany(User, { through: MeetingParticipant });
User.belongsToMany(Meeting, { through: MeetingParticipant });

// Explicit foreign key associations for MeetingParticipant (optional but recommended)
MeetingParticipant.belongsTo(Meeting, { foreignKey: 'MeetingId' });
MeetingParticipant.belongsTo(User, { foreignKey: 'UserId' });
Meeting.hasMany(MeetingParticipant, { foreignKey: 'MeetingId' });
User.hasMany(MeetingParticipant, { foreignKey: 'UserId' });

// One-to-Many relationship: Meeting has many ChatMessages (Updated foreignKey to PascalCase)
Meeting.hasMany(ChatMessage, { foreignKey: 'MeetingId', as: 'chatMessages' }); // Meeting.getChatMessages(), Meeting.createChatMessage()
ChatMessage.belongsTo(Meeting, { foreignKey: 'MeetingId', as: 'meeting' });   // chatMessage.getMeeting()

// One-to-Many relationship: User has many ChatMessages (optional, Updated foreignKey to PascalCase)
User.hasMany(ChatMessage, { foreignKey: 'UserId', as: 'sentMessages' });     // User.getSentMessages()
ChatMessage.belongsTo(User, { foreignKey: 'UserId', as: 'sender' });        // chatMessage.getSender()


module.exports = {
  sequelize,
  User,
  Meeting,
  MeetingParticipant,
  ChatMessage,
};