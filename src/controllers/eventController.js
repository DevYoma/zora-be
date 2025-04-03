const supabase = require("../config/supabase");

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create new event
exports.createEvent = async (req, res) => {
  try {
    const {
      name,
      date,
      time,
      location,
      description,
      ticketPrice,
      ticketQuantity,
      imageUrl,
      collectionAddress,
      creatorAddress,
      transactionHash,
    } = req.body;

    // Basic validation
    if (
      !name ||
      !date ||
      !time ||
      !location ||
      !ticketPrice ||
      !ticketQuantity ||
      !collectionAddress ||
      !creatorAddress ||
      !transactionHash
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          name,
          date,
          time,
          location,
          description,
          ticket_price: ticketPrice,
          ticket_quantity: ticketQuantity,
          available_tickets: ticketQuantity,
          image_url: imageUrl,
          collection_address: collectionAddress,
          creator_address: creatorAddress,
          transaction_hash: transactionHash,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get event details
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Event not found" });
      }
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: error.message });
  }
};
