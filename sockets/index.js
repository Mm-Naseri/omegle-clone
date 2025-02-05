const { Meeting, User, ChatMessage } = require('../models');

module.exports = function(io, waitingUsers) {
  io.on('connection', socket => {
    console.log(`New socket connected: ${socket.id}`);
    
    socket.on('waiting', (userId) => {
      socket.userId = userId;
      waitingUsers.set(userId, socket.id);
      console.log(`User ${userId} added to waiting list with socket ${socket.id}`);
    });

    socket.on('join-room', (roomId, userId, username) => {
      socket.userId = userId;
      socket.username = username;
      socket.join(roomId);
      console.log(`Socket ${socket.id} with userId ${userId} and username ${username} joined room: ${roomId}`);

      // Inform existing users in the room about the new user.
      socket.to(roomId).emit('user-connected', socket.id);

      // Relay offer, answer, and ICE candidates
      socket.on('offer', data => {
        const { to, offer } = data;
        console.log(`Relaying offer from ${socket.id} to ${to}`);
        io.to(to).emit('offer', { from: socket.id, offer });
      });

      socket.on('answer', data => {
        const { to, answer } = data;
        console.log(`Relaying answer from ${socket.id} to ${to}`);
        io.to(to).emit('answer', { from: socket.id, answer });
      });

      socket.on('candidate', data => {
        const { to, candidate } = data;
        console.log(`Relaying candidate from ${socket.id} to ${to}`);
        io.to(to).emit('candidate', { from: socket.id, candidate });
      });

      socket.on('disconnect', async () => {
        console.log(`Socket ${socket.id} disconnected from room ${roomId}`);
        socket.to(roomId).emit('user-disconnected', socket.id);
        const room = io.sockets.adapter.rooms.get(roomId);
        const numClients = room ? room.size : 0;
        console.log(`Room ${roomId} now has ${numClients} client(s)`);
        if (numClients < 2 && room) {
          try {
            await Meeting.update(
              { status: 'ended', end_time: new Date() },
              { where: { id: roomId } }
            );
            console.log(`Meeting ${roomId} marked as ended.`);
          } catch (err) {
            console.error(`Error updating meeting ${roomId}:`, err);
          }
          for (const clientId of room) {
            io.to(clientId).emit('alone');
          }
        }
      });

      socket.on('update-username', newUsername => {
        console.log(`Socket ${socket.id} updating username to ${newUsername}`);
        socket.username = newUsername;
      });

      socket.on('chat-message', data => {
        const messageText = data.message;
        console.log(`Received chat message from ${socket.username}: ${messageText}`);
        ChatMessage.create({
          message_text: messageText,
          username: socket.username,
          MeetingId: roomId,
          UserId: userId,
        })
        .then(chatMessage => {
          console.log("Stored chat message:", chatMessage.toJSON());
          socket.to(roomId).emit('chat-message', { sender: socket.username, message: messageText });
        })
        .catch(err => {
          console.error("Error storing chat message:", err);
          socket.to(roomId).emit('chat-message', { sender: socket.username, message: messageText });
        });
      });
    });

    socket.on('disconnect', async () => {
      console.log(`Socket ${socket.id} disconnected`);
      if (socket.userId) {
        try {
          await User.update(
            { is_in_meeting: false, status: 'disconnected' },
            { where: { id: socket.userId } }
          );
          console.log(`User ${socket.userId} marked as disconnected.`);
        } catch (err) {
          console.error(`Error updating user ${socket.userId} on disconnect:`, err);
        }
      }
      if (socket.userId && waitingUsers.has(socket.userId)) {
        waitingUsers.delete(socket.userId);
        console.log(`User ${socket.userId} removed from waiting list.`);
      }
    });
  });
};
  