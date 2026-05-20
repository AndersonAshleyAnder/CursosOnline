const express = require("express");
const cors = require("cors");

const app = express();   // ✅ PRIMERO SE CREA

app.use(cors({
  origin: "*"
}));                      // ✅ DESPUÉS SE USA

app.use(express.json());

const path = require("path");
const connectDB = require("./config");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const { requireAuth, requireAdmin } = require("./middleware/auth");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());

// Servir frontend
app.use(express.static(path.join(__dirname, "../frontend")));

let db;
const dbReady = connectDB()
  .then((database) => {
    db = database;
    console.log("✅ Conectado a MongoDB Atlas");
  })
  .catch((error) => {
    console.error("❌ Error conectando a MongoDB Atlas:", error);
  });

app.use(async (req, res, next) => {
  await dbReady;
  if (!db) {
    return res.status(503).json({ error: "Base de datos no disponible" });
  }
  next();
});

const getDB = () => db;

// ===============================
// RUTAS
// ===============================

// Auth
app.use("/api/auth", require("./routes/auth")(getDB));

// Cursos (público)
app.use("/api/cursos", require("./routes/cursos")(getDB));

// ✅ ADMIN PROTEGIDO (FIX CLAVE)
app.use(
  "/api/admin",
  requireAuth,
  requireAdmin,
  require("./routes/admin")(getDB)
);

// ✅ ESTUDIANTES SOLO ADMIN
app.use(
  "/api/estudiantes",
  requireAuth,
  requireAdmin,
  require("./routes/estudiantes")(getDB)
);

// ✅ CONSULTAS SOLO ADMIN
app.use(
  "/api/consultas",
  requireAuth,
  requireAdmin,
  require("./routes/consultas")(getDB)
);

// ✅ PROGRESO
app.use(
  "/api/progreso",
  requireAuth,
  require("./routes/progreso")(getDB)
);

// ✅ RESEÑAS
app.use(
  "/api/resenas",
  requireAuth,
  require("./routes/resenas")(getDB)
);

// ✅ CERTIFICADOS
app.use(
  "/api/certificados",
  requireAuth,
  require("./routes/certificados")(getDB)
);

// ===============================

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
