const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const supabase = require("../config/supabase");

// POST /api/tickets - Record new ticket purchase
router.post("/", ticketController.recordTicketPurchase);

// PUT /api/tickets/:id/verify - Verify and mark ticket as used
router.put("/:id/verify", ticketController.verifyTicket);

// GET /api/tickets/owner/:address - Get tickets owned by address
router.get("/owner/:address", ticketController.getTicketsByOwner);


// verifyTicket-code
router.post("/verify-code", ticketController.verifyTicketByCode);

// ============================================================================

// POST /api/tickets/purchase - Purchase a ticket
router.post('/purchase', async (req, res) => {
  try {
    const { 
      eventId, 
      buyerAddress, 
      transactionHash,
      price
    } = req.body;
    
    if (!eventId || !buyerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if event exists and has available tickets
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
      
    if (eventError) {
      console.error('Error fetching event:', eventError);
      return res.status(500).json({ error: eventError.message });
    }
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.available_tickets <= 0) {
      return res.status(400).json({ error: 'No tickets available' });
    }
    
    // Check if user already has a ticket for this event
    const { data: existingTicket, error: checkError } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('buyer_address', buyerAddress)
      .single();
      
    if (existingTicket) {
      return res.status(400).json({ error: 'You already have a ticket for this event' });
    }
    
    // Create ticket record
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert([{ 
        event_id: eventId, 
        buyer_address: buyerAddress,
        transaction_hash: transactionHash,
        price: price || event.ticket_price,
        purchase_date: new Date().toISOString(),
        is_used: false
      }])
      .select();
      
    if (error) {
      console.error('Error creating ticket:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Decrement available tickets
    const { error: updateError } = await supabase.rpc('decrement_available_tickets', { 
      p_event_id: eventId 
    });
    
    if (updateError) {
      console.error('Error updating available tickets:', updateError);
      // Don't return error here, as the ticket purchase was successful
    }
    
    res.json({ 
      success: true, 
      ticketId: ticket[0].id
    });
  } catch (error) {
    console.error('Error purchasing ticket:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/tickets/user/:address - Get ticket by buyer address
router.get("/user/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const { data, error } = await supabase
      .from("tickets")
      .select(
        `
        *,
        events:event_id (
          name,
          date,
          time,
          location,
          image_url
        )
      `
      )
      .eq("buyer_address", address.toLowerCase());

    if (error) {
      console.error("Error fetching tickets:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: error.message });
  }
});

 // POST /api/tickets/verify  - Verify a ticket
 router.post("/verify", async (req, res) => {
   try {
     const { ticketId, eventId, buyerAddress } = req.body;

     if ((!ticketId && !buyerAddress) || !eventId) {
       return res
         .status(400)
         .json({ error: "Ticket ID/Buyer Address and Event ID are required" });
     }

     // Query to find the ticket
     let query = supabase
       .from("tickets")
       .select(
         `
        *,
        events:event_id (
          name,
          date,
          time,
          location
        )
      `
       )
       .eq("event_id", eventId);

     if (ticketId) {
       query = query.eq("id", ticketId);
     } else if (buyerAddress) {
       query = query.eq("buyer_address", buyerAddress);
     }

     const { data, error } = await query.single();

     if (error) {
       console.error("Error verifying ticket:", error);
       return res.status(404).json({ error: "Ticket not found" });
     }

     // Check if ticket has already been used
     if (data.is_used) {
       return res.status(400).json({
         valid: false,
         message: "Ticket has already been used",
         usedAt: data.used_at,
       });
     }

     // Mark ticket as used
     const { error: updateError } = await supabase
       .from("tickets")
       .update({
         is_used: true,
         used_at: new Date().toISOString(),
       })
       .eq("id", data.id);

     if (updateError) {
       console.error("Error marking ticket as used:", updateError);
       return res.status(500).json({ error: updateError.message });
     }

     res.json({
       valid: true,
       ticket: {
         id: data.id,
         buyerAddress: data.buyer_address,
         purchaseDate: data.purchase_date,
         event: data.events,
       },
     });
   } catch (error) {
     console.error("Error verifying ticket:", error);
     res.status(500).json({ error: error.message });
   }
 });

module.exports = router;
