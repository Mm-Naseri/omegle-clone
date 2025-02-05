const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");
const User = require("./User");

const Meeting = sequelize.define(
  "Meeting",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "available",
    },
  },
  {
    timestamps: false,
  }
);

module.exports = Meeting;
