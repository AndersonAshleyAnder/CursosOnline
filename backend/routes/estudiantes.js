const express = require("express");
const { ObjectId } = require("mongodb");

// ✅ IMPORT SEGURO
const authMiddleware = require("../middleware/auth");

const requireAuth = authMiddleware.requireAuth;
const requireAdmin = authMiddleware.requireAdmin;

module.exports = (getDB) => {
  const router = express.Router();

  // ✅ PROTEGER RUTAS (SEPARADO PARA EVITAR ERRORES)
  router.use(requireAuth);
  router.use(requireAdmin);

  // ===============================
  // ✅ GET estudiantes
  // ===============================
 // ===============================
// ✅ GET estudiantes (PAGINADO + BÚSQUEDA)
// /api/estudiantes?page=1&limit=10&q=texto
// ===============================
router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip = (page - 1) * limit;

    const q = (req.query.q || "").trim();
    const filtro = {};

    if (q) {
      // busca por nombre o email
      filtro.$or = [
        { nombre: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ];
    }

    const col = db.collection("estudiantes");

    const [total, data] = await Promise.all([
      col.countDocuments(filtro),
      col.find(filtro)
        .sort({ fechaRegistro: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    res.json({ data, page, limit, total, totalPages });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo estudiantes" });
  }
});
  // ===============================
  // ✅ POST estudiante
  // ===============================
  router.post("/", async (req, res) => {
    try {
      const { nombre, email } = req.body;

      if (!nombre || !email) {
        return res.status(400).json({ error: "Nombre y email son obligatorios" });
      }

      const emailNorm = email.toLowerCase();

      const existe = await getDB().collection("estudiantes").findOne({ email: emailNorm });

      if (existe) {
        return res.status(400).json({ error: "Ya existe un estudiante con ese email" });
      }

      await getDB().collection("estudiantes").insertOne({
        nombre,
        email: emailNorm,
        fechaRegistro: new Date()
      });

      res.json({ mensaje: "Estudiante creado" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error creando estudiante" });
    }
  });

  // ===============================
  // ✅ DELETE estudiante
  // ===============================
  router.delete("/:id", async (req, res) => {
    try {
      await getDB().collection("estudiantes").deleteOne({
        _id: new ObjectId(req.params.id)
      });

      res.json({ mensaje: "Estudiante eliminado" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error eliminando estudiante" });
    }
  });

  return router;
};
