const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const { requireAuth, requireAdmin } = require("./middleware/auth");

// ✅ CREAR APP UNA SOLA VEZ
const app = express();

// ✅ CORS (PRODUCCIÓN + PRUEBAS)
app.use(cors({
  origin: "*", // puedes cambiar luego a tu dominio Vercel
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ JSON
app.use(express.json());

// ✅ SERVIR FRONTEND (opcional)
app.use(express.static(path.join(__dirname, "../frontend")));

// ===============================
// CONEXIÓN DB
// ===============================
let db;

const dbReady = connectDB()
  .then((database) => {
    db = database;
    console.log("✅ Conectado a MongoDB Atlas");
  })
  .catch((error) => {
    console.error("❌ Error conectando a MongoDB Atlas:", error);
  });

// ✅ Middleware para asegurar DB lista
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

// Admin
app.use(
  "/api/admin",
  requireAuth,
  requireAdmin,
  require("./routes/admin")(getDB)
);

// Estudiantes
app.use(
  "/api/estudiantes",
  requireAuth,
  requireAdmin,
  require("./routes/estudiantes")(getDB)
);

// Consultas
app.use(
  "/api/consultas",
  requireAuth,
  requireAdmin,
  require("./routes/consultas")(getDB)
);

// Progreso
app.use(
  "/api/progreso",
  requireAuth,
  require("./routes/progreso")(getDB)
);

// Reseñas
app.use(
  "/api/resenas",
  requireAuth,
  require("./routes/resenas")(getDB)
);

// Certificados
app.use(
  "/api/certificados",
  requireAuth,
  require("./routes/certificados")(getDB)
);

// ===============================
// SERVER
// ===============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
