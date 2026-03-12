import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("read2relax.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    profile_photo TEXT,
    selected_apps TEXT DEFAULT '[]',
    screen_time_limit INTEGER DEFAULT 30,
    exercise_minutes_earned INTEGER DEFAULT 0,
    daily_usage INTEGER DEFAULT 0,
    focus_score INTEGER DEFAULT 100,
    gender TEXT,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Simple migration to add gender column if it doesn't exist
try {
  db.exec(`ALTER TABLE users ADD COLUMN gender TEXT`);
} catch (e) {
  // Column already exists
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Auth: Signup
  app.post("/api/auth/signup", (req, res) => {
    const { name, email, password, selected_apps, screen_time_limit, gender } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const stmt = db.prepare("INSERT INTO users (name, email, password, selected_apps, screen_time_limit, gender) VALUES (?, ?, ?, ?, ?, ?)");
      const result = stmt.run(name, email, hashedPassword, selected_apps || '[]', screen_time_limit || 30, gender || null);
      const token = jwt.sign({ id: result.lastInsertRowid }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, name, email, selected_apps, screen_time_limit, gender } });
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // User: Get Profile
  app.get("/api/user/profile", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // User: Update Data
  app.post("/api/user/update", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const { name, profile_photo, selected_apps, screen_time_limit, exercise_minutes_earned, daily_usage, focus_score, gender } = req.body;
      
      const stmt = db.prepare(`
        UPDATE users SET 
          name = COALESCE(?, name),
          profile_photo = COALESCE(?, profile_photo),
          selected_apps = COALESCE(?, selected_apps),
          screen_time_limit = COALESCE(?, screen_time_limit),
          exercise_minutes_earned = COALESCE(?, exercise_minutes_earned),
          daily_usage = COALESCE(?, daily_usage),
          focus_score = COALESCE(?, focus_score),
          gender = COALESCE(?, gender)
        WHERE id = ?
      `);
      stmt.run(
        name,
        profile_photo,
        selected_apps ? (typeof selected_apps === 'string' ? selected_apps : JSON.stringify(selected_apps)) : null,
        screen_time_limit,
        exercise_minutes_earned,
        daily_usage,
        focus_score,
        gender,
        decoded.id
      );
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Update failed" });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
