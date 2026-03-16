const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("/api/status", (req, res) => {
  res.json({ message: "Server is running" });
});

// Fallback to index.html for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
