// Create a single socket connection.
const socket = io("/");

const videoGrid = document.getElementById("video-grid");
const roomIdContainer = document.getElementById("room-id-container");
const roomIdText = document.getElementById("room-id-text");
const showRoomIdButton = document.getElementById("show-room-id-button");
const copyRoomIdButton = document.getElementById("copy-room-id-button");
const chatForm = document.getElementById("chat-form");
const messagesContainer = document.getElementById("messages");
// Create local video element and mute it
const localVideo = document.createElement("video");
localVideo.muted = true;
const peers = {}; // Map of peerId -> RTCPeerConnection

let localStream;

// ICE configuration – adjust if needed.
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Function to append messages
function appendMessage(text) {
  const msgElem = document.createElement("div");
  msgElem.innerText = text;
  messagesContainer.append(msgElem);
}

// Fetch chat history for the meeting
function fetchChatHistory(meetingId) {
  fetch(`/chat-history/${meetingId}`)
    .then((response) => response.json())
    .then((messages) => {
      messages.forEach((message) => {
        appendMessage(`${message.username}: ${message.message_text}`);
      });
    })
    .catch((err) => {
      console.error("Error fetching chat history:", err);
    });
}

// Get local media stream
navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then((stream) => {
    localStream = stream;
    addVideoStream(localVideo, stream);

    // Immediately join the room with ROOM_ID, USER_ID, and USERNAME (default "Anonymous" if not set)
    socket.emit("join-room", ROOM_ID, USER_ID, USERNAME);

    fetchChatHistory(ROOM_ID);

    // WebRTC signaling
    socket.on("user-connected", (userId) => {
      const peerConnection = createPeerConnection(userId);
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
      peerConnection
        .createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .then(() => {
          socket.emit("offer", { to: userId, offer: peerConnection.localDescription });
        })
        .catch(console.error);
    });

    socket.on("offer", (data) => {
      const { from, offer } = data;
      const peerConnection = createPeerConnection(from);
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
      peerConnection
        .setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then((answer) => peerConnection.setLocalDescription(answer))
        .then(() => {
          socket.emit("answer", { to: from, answer: peerConnection.localDescription });
        })
        .catch(console.error);
    });

    socket.on("answer", (data) => {
      const { from, answer } = data;
      const peerConnection = peers[from];
      if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer)).catch(console.error);
      }
    });

    socket.on("candidate", (data) => {
      const { from, candidate } = data;
      const peerConnection = peers[from];
      if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    });

    socket.on("user-disconnected", (userId) => {
      if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
      }
      const video = document.getElementById(userId);
      if (video) {
        video.remove();
      }
    });

    socket.on("alone", () => {
      alert("It looks like you are alone in the meeting. Redirecting you to random matching...");
      window.location.href = `/random`;
    });
  })
  .catch(console.error);

function createPeerConnection(userId) {
  const peerConnection = new RTCPeerConnection(configuration);
  peers[userId] = peerConnection;
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", { to: userId, candidate: event.candidate });
    }
  };
  peerConnection.ontrack = (event) => {
    let video = document.getElementById(userId);
    if (!video) {
      video = document.createElement("video");
      video.id = userId;
      addVideoStream(video, event.streams[0]);
    }
  };
  return peerConnection;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

// Optionally stop local media on page unload
window.addEventListener("beforeunload", () => {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
});

// Chat functionality
if (chatForm) {
  const chatInput = document.getElementById("chat-input");

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
      socket.emit("chat-message", { room: ROOM_ID, message });
      appendMessage(message, "user"); // Append the user's own message with 'user' class
      chatInput.value = "";
    }
  });

  socket.on("chat-message", (data) => {
    appendMessage(data.message, "other", data.sender); // Append other users' messages with 'other' class and their username
  });

  function appendMessage(text, type, sender) {
    const msgElem = document.createElement("div");
    msgElem.classList.add("message", type);

    const messageContent = document.createElement("div");
    const senderName = document.createElement("span");
    senderName.classList.add("sender-name");

    if (type === "other" && sender !== USERNAME) {
      senderName.innerText = sender; // Add the sender's username
      messageContent.append(senderName); // Append the username
    }

    const messageText = document.createElement("span");
    messageText.classList.add("message-text");
    messageText.innerText = text; // Add the message text

    messageContent.append(messageText); // Append the message content
    msgElem.append(messageContent);
    messagesContainer.append(msgElem);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto scroll to the latest message
  }
}

// Function to fetch chat history when the user joins
function fetchChatHistory(meetingId) {
  fetch(`/chat-history/${meetingId}`)
    .then((response) => response.json())
    .then((messages) => {
      messages.forEach((message) => {
        appendMessage(message.message_text, "other", message.username);
      });
    })
    .catch(console.error);
}

// Handle inline username update without a page reload
document.addEventListener('DOMContentLoaded', function() {
  const usernameForm = document.getElementById('username-update-form');
  if (usernameForm) {
    usernameForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const usernameValue = document.getElementById('username-input').value.trim();
      if (usernameValue) {
        fetch(`${window.location.origin}/updateUsername`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `userId=${USER_ID}&username=${encodeURIComponent(usernameValue)}`
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Emit an event so the server updates the socket's username.
            socket.emit('update-username', usernameValue);
            console.log('Username updated successfully to:', usernameValue);
            // Remove the overlay without reloading the page.
            const overlay = document.getElementById('username-update-overlay');
            if (overlay) {
              overlay.remove();
            }
          } else {
            console.error('Username update failed:', data.error);
          }
        })
        .catch(console.error);
      }
    });
  }
});


// Handle Room ID copying functionality
// (Note: 'copyButton' was replaced by copyRoomIdButton below)
copyRoomIdButton.addEventListener("click", () => {
  const meetingId = roomIdText.textContent.replace('Room ID: ', '').trim();
  navigator.clipboard
    .writeText(meetingId)
    .then(() => {
      alert("Room ID copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy room ID: ", err);
    });
});

// Toggle the Room ID visibility
function showRoomId() {
  roomIdText.style.display = "inline";
  copyRoomIdButton.style.display = "inline";
  showRoomIdButton.style.display = "none";
  // Use requestAnimationFrame to ensure the display changes are rendered before changing opacity
  requestAnimationFrame(() => {
    roomIdText.style.opacity = 1;
  });
}

// Function to hide the room ID (and show the button)
function hideRoomId() {
  roomIdText.style.opacity = 0;
  // Delay hiding the elements until after the transition is complete
  setTimeout(() => {
    roomIdText.style.display = "none";
    copyRoomIdButton.style.display = "none";
    showRoomIdButton.style.display = "inline";
  }, 500); // The duration should match the transition duration
}

// Add click event to toggle Room ID visibility
showRoomIdButton.addEventListener("click", () => {
  showRoomId();
  setTimeout(hideRoomId, 5000); // Hide the Room ID after 5 seconds
});

// ***** New Functionality for Audio and Video Toggle *****
const muteButton = document.getElementById("muteButton");
const videoToggleButton = document.getElementById("videoToggleButton");
let isMuted = false;
let isVideoHidden = false;

muteButton.addEventListener("click", () => {
  if (!localStream) return;
  // Toggle audio tracks
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });
  isMuted = !isMuted;
  muteButton.innerText = isMuted ? "Unmute" : "Mute";
});

videoToggleButton.addEventListener("click", () => {
  if (!localStream) return;
  // Toggle video tracks
  localStream.getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });
  isVideoHidden = !isVideoHidden;
  // Additionally, hide or show the local video element in the video grid
  localVideo.style.display = isVideoHidden ? "none" : "";
  videoToggleButton.innerText = isVideoHidden ? "Show My Video" : "Hide My Video";
});
