const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "aditya",
  database: "image_gallery"
});

db.connect(err => {
  if (err) console.log("Database connection failed:", err);
  else console.log("Connected to database successfully");
});

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
app.get("/images", (req, res) => {
  db.query("SELECT * FROM images ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Upload image
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const filename = req.file.filename;
  const description = req.body.description;

  db.query(
    "INSERT INTO images (filename, description) VALUES (?, ?)",
    [filename, description],
    (err) => {
      if (err) {
        console.log("DB Error:", err);
        return res.status(500).json({ message: "DB error" });
      }
      res.status(200).json({ message: "Upload successful" });
    }
  );
});

// Delete image
app.post("/delete/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT filename FROM images WHERE id = ?", [id], (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ message: "Not found" });

    const filename = results[0].filename;

    fs.unlink(path.join(__dirname, "uploads", filename), (err) => {
      if (err) console.log("File delete error:", err);
    });

    db.query("DELETE FROM images WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "DB delete error" });
      res.status(200).json({ message: "Deleted" });
    });
  });
});

// Update image/description
app.post("/update/:id", upload.single("image"), (req, res) => {
  const id = req.params.id;
  const description = req.body.description;

  if (req.file) {
    const newFilename = req.file.filename;

    db.query("SELECT filename FROM images WHERE id = ?", [id], (err, results) => {
      if (err || results.length === 0) return res.status(500).json({ message: "Not found" });

      const oldFilename = results[0].filename;

      fs.unlink(path.join(__dirname, "uploads", oldFilename), (err) => {
        if (err) console.log("Old file delete error:", err);
      });

      db.query(
        "UPDATE images SET filename = ?, description = ? WHERE id = ?",
        [newFilename, description, id],
        (err) => {
          if (err) return res.status(500).json({ message: "DB update error" });
          res.status(200).json({ message: "Updated" });
        }
      );
    });
  } else {
    db.query(
      "UPDATE images SET description = ? WHERE id = ?",
      [description, id],
      (err) => {
        if (err) return res.status(500).json({ message: "DB update error" });
        res.status(200).json({ message: "Updated" });
      }
    );
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
