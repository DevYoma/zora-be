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
