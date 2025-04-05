const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("totalprice")
      .select("total_price");

    if (error) {
      console.error("Error fetching total revenue:", error);
      return res.status(500).json({ error: "Failed to fetch total revenue" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching total revenue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;