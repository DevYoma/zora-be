const express = require("express");
const router = express.Router();
const multer = require("multer");
const supabase = require("../config/supabase");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// File upload endpoint
router.post("/image", upload.single("image"), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const eventName = req.body.eventName || "event";

    // Create a unique file name
    const fileName = `${Date.now()}-${eventName
      .replace(/\s+/g, "-")
      .toLowerCase()}.${file.originalname.split(".").pop()}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("event-images") // Make sure this bucket exists in your Supabase project
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("event-images")
      .getPublicUrl(fileName);

    res.json({
      success: true,
      url: urlData.publicUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: error.message || "Failed to upload image" });
  }
});

module.exports = router;
