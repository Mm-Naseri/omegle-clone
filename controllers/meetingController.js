const { v4: uuidV4 } = require("uuid");
const { Op } = require("sequelize");
const { User, Meeting, MeetingParticipant } = require("../models");

const MEETING_CLIENT_LIMIT = 9;

exports.randomMeeting = async (req, res, io, waitingUsers) => {
  const userId = uuidV4();
  try {
    await User.create({ id: userId, username: null, is_in_meeting: false, status: "available" });
  } catch (err) {
    console.error(err);
    return res.send("Error creating user");
  }

  let waitingUserId;
  for (let key of waitingUsers.keys()) {
    if (key !== userId) {
      waitingUserId = key;
      break;
    }
  }

  if (waitingUserId) {
    const waitingSocketId = waitingUsers.get(waitingUserId);
    waitingUsers.delete(waitingUserId);
    const meetingId = uuidV4();
    const meeting = await Meeting.create({ id: meetingId, start_time: new Date(), status: "available" });

    console.log("Created Meeting Object:", meeting.toJSON());

    if (!meeting || !meeting.id) {
      console.error("Error: Meeting object or meeting.id is invalid!");
      return res.status(500).send("Error creating meeting association.");
    }

    const waitingUser = await User.findByPk(waitingUserId);
    const newUser = await User.findByPk(userId);
    await meeting.addUsers([waitingUser, newUser]);
    await User.update({ is_in_meeting: true }, { where: { id: { [Op.in]: [userId, waitingUserId] } } });

    io.to(waitingSocketId).emit("matchFound", meetingId);
    return res.redirect(`/${meetingId}?userId=${userId}`);
  } else {
    res.render("waitingRoom", { userId });
  }
};

exports.joinMeetingPage = async (req, res) => {
  const userId = uuidV4();
  try {
    await User.create({ id: userId, username: null, is_in_meeting: false, status: "available" });
  } catch (err) {
    console.error(err);
    return res.send("Error creating user");
  }
  res.render("joinMeeting", { userId });
};

exports.joinMeeting = async (req, res, io) => {
  const { meetingId, userId } = req.body;
  try {
    const meeting = await Meeting.findOne({ where: { id: meetingId } });
    if (!meeting) return res.status(404).send("Meeting not found");
    if (meeting.status !== "available") return res.status(410).send("Meeting has ended");

    const room = io.sockets.adapter.rooms.get(meetingId);
    const numClientsInRoom = room ? room.size : 0;

    if (numClientsInRoom >= MEETING_CLIENT_LIMIT) {
      return res.status(429).send("Meeting is full. Maximum participants reached.");
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(400).send("User not found");

    await MeetingParticipant.create({ MeetingId: meetingId, UserId: userId });
    await User.update({ is_in_meeting: true }, { where: { id: userId } });

    res.redirect(`/${meeting.id}?userId=${userId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error joining meeting");
  }
};
