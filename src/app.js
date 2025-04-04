const express = require("express");
const cors = require("cors");
const eventRoutes = require("./routes/eventRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const uploadRoutes = require("./routes/upload");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());  
app.use(express.json());

// Basic route for testing
app.get("/", (req, res) => {
  res.json({ message: "Welcome to NFTickets API" });
});

// API Routes
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/upload", uploadRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;