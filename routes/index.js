const express = require("express");
const router = express.Router();
const meetingController = require("../controllers/meetingController");
const userController = require("../controllers/userController");
const chatController = require("../controllers/chatController");

module.exports = function (io, waitingUsers) {
  router.get("/", (req, res) => res.render("landing"));
  router.get("/random", (req, res) => meetingController.randomMeeting(req, res, io, waitingUsers));
  router.get("/joinMeeting", meetingController.joinMeetingPage);
  router.post("/joinMeeting", (req, res) => meetingController.joinMeeting(req, res, io));
  router.post("/updateUsername", userController.updateUsername);
  router.get("/:room", userController.getRoom);
  router.get("/chat-history/:meetingId", chatController.getChatHistory);

  return router;
};
