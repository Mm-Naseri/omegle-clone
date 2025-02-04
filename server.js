const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const { Op } = require('sequelize');
require('dotenv').config();

const { sequelize, User, Meeting, MeetingParticipant, ChatMessage } = require('./models');

// For parsing form data
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static('public'));

const waitingUsers = new Map();
const MEETING_CLIENT_LIMIT = 9;

app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/random', async (req, res) => {
  const userId = uuidV4();
  try {
    const user = await User.create({
      id: userId,
      username: null,
      is_in_meeting: false,
      status: 'available'
    });
  } catch (err) {
    console.error(err);
    return res.send('Error creating user');
  }

  // Try to match with another waiting user
  let waitingUserId;
  for (let key of waitingUsers.keys()) {
    if (key !== userId) {
      waitingUserId = key;
      break;
    }
  }
  if (waitingUserId) {
    // Found a match
    const waitingSocketId = waitingUsers.get(waitingUserId);
    waitingUsers.delete(waitingUserId);
    const meetingId = uuidV4();
    const meeting = await Meeting.create({ // Meeting created here
      id: meetingId,
      start_time: new Date(),
      status: 'available'
    });

    console.log("Created Meeting Object:", meeting.toJSON()); // Debug: Log the meeting object

    if (!meeting || !meeting.id) { // **Check if meeting and meeting.id are valid**
      console.error("Error: Meeting object or meeting.id is invalid after Meeting.create!");
      return res.status(500).send('Error creating meeting association.'); // Handle error and return
    }
    const waitingUser = await User.findByPk(waitingUserId); // Fetch waiting User model
    const newUser = await User.findByPk(userId);           // Fetch new User model
    await meeting.addUsers([waitingUser, newUser]);
    await User.update(
      { is_in_meeting: true },
      { where: { id: { [Op.in]: [userId, waitingUserId] } } }
    );
    // Notify the waiting user to redirect to the meeting room.
    io.to(waitingSocketId).emit('matchFound', meetingId);
    return res.redirect(`/${meetingId}?userId=${userId}`);
  } else {
    // No match found: render the waiting room.
    res.render('waitingRoom', { userId });
  }
});

app.get('/joinMeeting', async (req, res) => {
  const userId = uuidV4();
  try {
    const user = await User.create({
      id: userId,
      username: null,
      is_in_meeting: false,
      status: 'available'
    });
  } catch (err) {
    console.error(err);
    return res.send('Error creating user');
  }
  res.render('joinMeeting', { userId });
});

app.post('/joinMeeting', async (req, res) => {
  const { meetingId, userId } = req.body;
  try {
    const meeting = await Meeting.findOne({ where: { id: meetingId } });
    if (!meeting) {
      return res.status(404).send('Meeting not found');
    }
    if (meeting.status !== 'available') {
      return res.status(410).send('Meeting has ended');
    }

    // **--- Client Limit Check --- (Keep this section as it is)**
    const room = io.sockets.adapter.rooms.get(meetingId); // Get the Socket.IO room
    const numClientsInRoom = room ? room.size : 0;       // Get the number of clients in the room

    console.log('number of clinets in the room: ', numClientsInRoom);

    if (numClientsInRoom >= MEETING_CLIENT_LIMIT) {
      return res.status(429).send('Meeting is full. Maximum participants reached.');
    }
    // **--- End Client Limit Check ---**

    // **--- Create MeetingParticipant record to join the meeting ---**
    const user = await User.findByPk(userId); // Assuming user already exists
    if (!user) {
      return res.status(400).send('User not found');
    }
    await MeetingParticipant.create({  // Create MeetingParticipant record
      MeetingId: meetingId,
      UserId: userId,
    });
    // **--- End MeetingParticipant creation ---**

    await User.update({ is_in_meeting: true }, { where: { id: userId } });
    res.redirect(`/${meeting.id}?userId=${userId}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error joining meeting');
  }
});

app.post('/updateUsername', async (req, res) => {
  const { userId, username } = req.body;
  try {
    await User.update(
      { username },
      { where: { id: userId } }
    );
    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.send('Error updating username');
  }
});

app.get('/:room', async (req, res) => {
  const { room } = req.params;
  const { userId } = req.query;
  
  // If there's no userId, redirect to the landing page or handle the error appropriately.
  if (!userId) {
    return res.redirect('/');
  }
  
  try {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      // If no user found, redirect or show an error message.
      return res.redirect('/');
    }
    res.render('room', { roomId: room, userId, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/chat-history/:meetingId', async (req, res) => {
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
});



io.on('connection', socket => {
  console.log(`New socket connected: ${socket.id}`);
  
  // When a client in the waiting room emits "waiting", add them to the waitingUsers map.
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

    // Relay an offer to the target client.
    socket.on('offer', data => {
      const { to, offer } = data;
      console.log(`Relaying offer from ${socket.id} to ${to}`);
      io.to(to).emit('offer', { from: socket.id, offer });
    });

    // Relay an answer to the target client.
    socket.on('answer', data => {
      const { to, answer } = data;
      console.log(`Relaying answer from ${socket.id} to ${to}`);
      io.to(to).emit('answer', { from: socket.id, answer });
    });

    // Relay ICE candidates to the target client.
    socket.on('candidate', data => {
      const { to, candidate } = data;
      console.log(`Relaying candidate from ${socket.id} to ${to}`);
      io.to(to).emit('candidate', { from: socket.id, candidate });
    });

    // When a user disconnects, inform others in the room.
    socket.on('disconnect', async() => {
      console.log(`Socket ${socket.id} disconnected from room ${roomId}`);
      socket.to(roomId).emit('user-disconnected', socket.id);

      // Get the room’s current client count.
      const room = io.sockets.adapter.rooms.get(roomId);
      const numClients = room ? room.size : 0;
      console.log(`Room ${roomId} now has ${numClients} client(s)`);

      // If there is fewer than 2 clients, mark the meeting as ended.
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
        // Also, you can notify the remaining client(s) if desired:
        for (const clientId of room) {
          io.to(clientId).emit('alone'); // The client can then decide what to do (e.g. redirect to /random).
        }
      }
    });

    socket.on('update-username', newUsername => {
      console.log(`Socket ${socket.id} updating username to ${newUsername}`);
      socket.username = newUsername;
    });

    // Listen for chat messages
    socket.on('chat-message', data => {
      const messageText = data.message;
      console.log(`Received chat message from ${socket.username}: ${messageText}`);
      
      // Save the chat message in the database
      ChatMessage.create({
        message_text: messageText,
        username: socket.username,
        MeetingId: roomId,
        UserId: userId, // or socket.userId
        // timestamp will automatically default to NOW
      })
      .then(chatMessage => {
        console.log("Stored chat message:", chatMessage.toJSON());
        // Broadcast the chat message to others in the room.
        socket.to(roomId).emit('chat-message', { sender: socket.username, message: messageText });
      })
      .catch(err => {
        console.error("Error storing chat message:", err);
        // Optionally, you can still broadcast the message even if saving fails.
        socket.to(roomId).emit('chat-message', { sender: socket.username, message: messageText });
      });
    });
  });

  socket.on('disconnect', async () => {
    console.log(`Socket ${socket.id} disconnected`);
    // Check if a userId is stored on the socket
    if (socket.userId) {
      // Update the user's record in the database:
      try {
        // Mark the user as not in a meeting and update the status to "disconnected"
        await User.update(
          { is_in_meeting: false, status: 'disconnected' },
          { where: { id: socket.userId } }
        );
        console.log(`User ${socket.userId} marked as disconnected.`);
      } catch (err) {
        console.error(`Error updating user ${socket.userId} on disconnect:`, err);
      }
    }

    // You can also remove the user from waitingUsers if present.
    if (socket.userId && waitingUsers.has(socket.userId)) {
      waitingUsers.delete(socket.userId);
      console.log(`User ${socket.userId} removed from waiting list.`);
    }
  }); 
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    await sequelize.sync({ force: true }); // ADD { force: true } here
    console.log('Database synchronized (tables dropped and recreated - FORCE: TRUE).');

    server.listen(3000, () => console.log('Server is running on port 3000'));

  } catch (error) {
    console.error('Unable to connect to and synchronize with the database:', error);
    // process.exit(1);
  }
})();
