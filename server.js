const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// MySQL connection using Railway environment variables
let db;
(async () => {
  try {
    db = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB
    });
    console.log("Connected to database successfully");
  } catch (err) {
    console.log("Database connection failed:", err);
  }
})();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Middleware
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes

// Get all images
app.get("/images", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM images ORDER BY id DESC");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload image
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const filename = req.file.filename;
  const description = req.body.description;

  try {
    await db.query("INSERT INTO images (filename, description) VALUES (?, ?)", [filename, description]);
    res.status(200).json({ message: "Upload successful" });
  } catch (err) {
    console.log("DB Error:", err);
    res.status(500).json({ message: "DB error" });
  }
});

// Delete image
app.post("/delete/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await db.query("SELECT filename FROM images WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });

    const filename = rows[0].filename;

    fs.unlink(path.join(__dirname, "uploads", filename), (err) => {
      if (err) console.log("File delete error:", err);
    });

    await db.query("DELETE FROM images WHERE id = ?", [id]);
    res.status(200).json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "DB delete error" });
  }
});

// Update image/description
app.post("/update/:id", upload.single("image"), async (req, res) => {
  const id = req.params.id;
  const description = req.body.description;

  try {
    if (req.file) {
      const newFilename = req.file.filename;

      const [rows] = await db.query("SELECT filename FROM images WHERE id = ?", [id]);
      if (rows.length === 0) return res.status(404).json({ message: "Not found" });

      const oldFilename = rows[0].filename;

      fs.unlink(path.join(__dirname, "uploads", oldFilename), (err) => {
        if (err) console.log("Old file delete error:", err);
      });

      await db.query(
        "UPDATE images SET filename = ?, description = ? WHERE id = ?",
        [newFilename, description, id]
      );
      res.status(200).json({ message: "Updated" });

    } else {
      await db.query("UPDATE images SET description = ? WHERE id = ?", [description, id]);
      res.status(200).json({ message: "Updated" });
    }
  } catch (err) {
    res.status(500).json({ message: "DB update error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
