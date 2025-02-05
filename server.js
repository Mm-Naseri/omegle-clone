const express = require("express");
const app = express();
const fs = require("fs");
const https = require("https");
require("dotenv").config();

const { sequelize } = require("./models");

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(express.static("public"));

const privateKey = fs.readFileSync("certs/localhost+1-key.pem", "utf8");
const certificate = fs.readFileSync("certs/localhost+1.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app);

const io = require("socket.io")(server);

const waitingUsers = new Map();

const routes = require("./routes/index")(io, waitingUsers);
app.use("/", routes);

require("./sockets/index")(io, waitingUsers);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");

    await sequelize.sync({ force: true });
    console.log("Database synchronized.");

    server.listen(3000, () => console.log("HTTPS Server running on port 3000"));
  } catch (error) {
    console.error("Database connection error:", error);
  }
})();
