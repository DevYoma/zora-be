const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");

// POST /api/tickets - Record new ticket purchase
router.post("/", ticketController.recordTicketPurchase);

// PUT /api/tickets/:id/verify - Verify and mark ticket as used
router.put("/:id/verify", ticketController.verifyTicket);

// GET /api/tickets/owner/:address - Get tickets owned by address
router.get("/owner/:address", ticketController.getTicketsByOwner);

module.exports = router;
