const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

// GET /api/events - Get all events
router.get("/", eventController.getAllEvents);

// POST /api/events - Create new event
router.post("/", eventController.createEvent);

// GET /api/events/:id - Get event details
router.get("/:id", eventController.getEventById);

module.exports = router;
