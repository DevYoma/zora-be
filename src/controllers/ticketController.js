const supabase = require("../config/supabase");
const blockchainService = require("../services/blockchainService");

// Record new ticket purchase
exports.recordTicketPurchase = async (req, res) => {  
  try {
    const { eventId, tokenIds, ownerAddress, purchaseTransactionHash } =
      req.body;

    // Basic validation
    if (
      !eventId ||
      !Array.isArray(tokenIds) ||
      tokenIds.length === 0 ||
      !ownerAddress ||
      !purchaseTransactionHash
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // First, update the available tickets count
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("available_tickets")
      .eq("id", eventId)
      .single();

    if (eventError) throw eventError;

    const newAvailableTickets = eventData.available_tickets - tokenIds.length;

    if (newAvailableTickets < 0) {
      return res.status(400).json({ error: "Not enough tickets available" });
    }

    // Update the event's available tickets
    const { error: updateError } = await supabase
      .from("events")
      .update({ available_tickets: newAvailableTickets })
      .eq("id", eventId);

    if (updateError) throw updateError;

    // Create ticket records
    const ticketRecords = tokenIds.map((tokenId) => ({
      event_id: eventId,
      token_id: tokenId,
      owner_address: ownerAddress.toLowerCase(),
      purchase_transaction_hash: purchaseTransactionHash,
    }));

    const { data, error } = await supabase
      .from("tickets")
      .insert(ticketRecords)
      .select();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Error recording ticket purchase:", error);
    res.status(500).json({ error: error.message });
  }
};

// Verify and mark ticket as used
exports.verifyTicket = async (req, res) => {
  try {
    const { id } = req.params;

    // First check if ticket exists and is not used
    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select("*, events(*)")
      .eq("id", id)
      .single();

    if (ticketError) {
      if (ticketError.code === "PGRST116") {
        return res.status(404).json({ error: "Ticket not found" });
      }
      throw ticketError;
    }

    if (ticketData.is_used) {
      return res.status(400).json({
        error: "Ticket already used",
        usedAt: ticketData.used_at,
      });
    }

    // Verify ownership on blockchain
    const verificationResult = await blockchainService.verifyTicketOwnership(
      ticketData.events.collection_address,
      ticketData.token_id,
      ticketData.owner_address
    );

    if (!verificationResult.isValid) {
      return res.status(400).json({
        error: "Ticket ownership verification failed",
        details: verificationResult,
      });
    }

    // Mark ticket as used
    const { data, error } = await supabase
      .from("tickets")
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.status(200).json({
      message: "Ticket verified successfully",
      ticket: data[0],
    });
  } catch (error) {
    console.error("Error verifying ticket:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get tickets by owner address
exports.getTicketsByOwner = async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    const { data, error } = await supabase
      .from("tickets")
      .select("*, events(*)")
      .eq("owner_address", address.toLowerCase());

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: error.message });
  }
};

// Verify ticket by code (ID, token_id, or owner_address)
exports.verifyTicketByCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        valid: false,
        errorType: "MISSING_CODE",
        message: "Verification code is required",
      });
    }

    // Build the query based on the code
    let query = supabase.from("tickets").select(`
      id,
      token_id,
      owner_address,
      purchase_transaction_hash,
      is_used,
      used_at,
      events:event_id (
        id,
        name,
        date,
        time,
        location
      )
    `);

    // Check if code looks like a UUID (for ticket ID)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(code)) {
      query = query.eq("id", code);
    }
    // Check if code looks like an Ethereum address
    else if (code.startsWith("0x")) {
      query = query.ilike("owner_address", code);
    }
    // Otherwise treat as token_id
    else {
      query = query.eq("token_id", code);
    }

    // Execute the query
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Error verifying ticket:", error);
      return res.status(500).json({
        valid: false,
        errorType: "DATABASE_ERROR",
        message: "Error verifying ticket: " + error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        valid: false,
        errorType: "TICKET_NOT_FOUND",
        message:
          "Ticket does not exist. Please check the ID or wallet address and try again.",
      });
    }

    // Check if ticket has already been used
    if (data.is_used) {
      return res.status(400).json({
        valid: false,
        errorType: "TICKET_ALREADY_USED",
        message:
          "This ticket has already been used on " +
          new Date(data.used_at).toLocaleString(),
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
      return res.status(500).json({
        valid: false,
        errorType: "UPDATE_ERROR",
        message: "Error marking ticket as used: " + updateError.message,
      });
    }

    // Return data in the format expected by the frontend
    res.json({
      valid: true,
      ticket: {
        id: data.id,
        owner_address: data.owner_address,
        events: data.events,
      },
    });
  } catch (error) {
    console.error("Error verifying ticket:", error);
    res.status(500).json({
      valid: false,
      errorType: "SERVER_ERROR",
      message: "Server error: " + error.message,
    });
  }
};