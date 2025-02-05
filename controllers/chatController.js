// controllers/chatController.js
const { ChatMessage } = require('../models');

exports.getChatHistory = async (req, res) => {
  const { meetingId } = req.params;
  try {
    const messages = await ChatMessage.findAll({
      where: { MeetingId: meetingId },
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving chat history');
  }
};
