const sequelize = require('../config/database');
const User = require('./User');
const Meeting = require('./Meeting');
const MeetingParticipant = require('./MeetingParticipant');
const ChatMessage = require('./ChatMessage');

Meeting.belongsToMany(User, { through: MeetingParticipant });
User.belongsToMany(Meeting, { through: MeetingParticipant });

MeetingParticipant.belongsTo(Meeting, { foreignKey: 'MeetingId' });
MeetingParticipant.belongsTo(User, { foreignKey: 'UserId' });
Meeting.hasMany(MeetingParticipant, { foreignKey: 'MeetingId' });
User.hasMany(MeetingParticipant, { foreignKey: 'UserId' });

Meeting.hasMany(ChatMessage, { foreignKey: 'MeetingId', as: 'chatMessages' }); // Meeting.getChatMessages(), Meeting.createChatMessage()
ChatMessage.belongsTo(Meeting, { foreignKey: 'MeetingId', as: 'meeting' });   // chatMessage.getMeeting()

User.hasMany(ChatMessage, { foreignKey: 'UserId', as: 'sentMessages' });     // User.getSentMessages()
ChatMessage.belongsTo(User, { foreignKey: 'UserId', as: 'sender' });        // chatMessage.getSender()


module.exports = {
  sequelize,
  User,
  Meeting,
  MeetingParticipant,
  ChatMessage,
};