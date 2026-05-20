const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const JWT_SECRET = process.env.JWT_SECRET || "cambia_esto_por_un_secreto";

module.exports = (getDB) => {
  const router = express.Router();

  // ===============================
  // Middleware: solo admin
  // ===============================
  function requireAdmin(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No autorizado" });

    try {
      const token = auth.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET);

      if (payload.rol !== "admin") {
        return res.status(403).json({ error: "Solo admin" });
      }

      req.adminId = payload.id;
      next();
    } catch {
      return res.status(401).json({ error: "Token inválido" });
    }
  }

  // ===============================
  // LISTAR / BUSCAR usuarios estudiante
  // ===============================
  router.get("/usuarios", requireAdmin, async (req, res) => {
    const db = getDB();
    const q = (req.query.q || "").trim();

    const filtro = {
      rol: "estudiante",
      ...(q && {
        $or: [
          { email: { $regex: q, $options: "i" } },
          { nombre: { $regex: q, $options: "i" } },
          { apellido: { $regex: q, $options: "i" } }
        ]
      })
    };

    const data = await db.collection("usuarios").find(filtro).toArray();
    res.json(data);
  });

  // ===============================
  // CREAR usuario estudiante
  // ===============================
  router.post("/usuarios", requireAdmin, async (req, res) => {
    const db = getDB();
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const emailNorm = email.toLowerCase();
    const existe = await db.collection("usuarios").findOne({ email: emailNorm });
    if (existe) return res.status(409).json({ error: "Email ya existe" });

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.collection("usuarios").insertOne({
      nombre,
      apellido,
      email: emailNorm,
      passwordHash,
      rol: "estudiante",
      creadoEn: new Date()
    });

    // LOG
    await db.collection("logs_admin").insertOne({
      adminId: req.adminId,
      accion: "CREAR_USUARIO",
      usuarioId: result.insertedId.toString(),
      fecha: new Date()
    });

    res.json({ mensaje: "Usuario creado" });
  });

  // ===============================
  // EDITAR usuario
  // ===============================
  router.put("/usuarios/:id", requireAdmin, async (req, res) => {
    const db = getDB();
    const { nombre, apellido, email } = req.body;

    await db.collection("usuarios").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { nombre, apellido, email } }
    );

    await db.collection("logs_admin").insertOne({
      adminId: req.adminId,
      accion: "EDITAR_USUARIO",
      usuarioId: req.params.id,
      fecha: new Date()
    });

    res.json({ mensaje: "Usuario actualizado" });
  });

  // ===============================
  // RESETEAR CONTRASEÑA
  // ===============================
  router.put("/usuarios/:id/reset-password", requireAdmin, async (req, res) => {
    const db = getDB();
    const { password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    await db.collection("usuarios").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { passwordHash: hash } }
    );

    await db.collection("logs_admin").insertOne({
      adminId: req.adminId,
      accion: "RESET_PASSWORD",
      usuarioId: req.params.id,
      fecha: new Date()
    });

    res.json({ mensaje: "Contraseña reseteada" });
  });

  // ===============================
  // ELIMINAR usuario (protección admin)
  // ===============================
  router.delete("/usuarios/:id", requireAdmin, async (req, res) => {
    const db = getDB();

    if (req.params.id === req.adminId) {
      return res.status(400).json({
        error: "No puedes eliminar tu propio usuario"
      });
    }

    await db.collection("usuarios").deleteOne({
      _id: new ObjectId(req.params.id)
    });

    await db.collection("logs_admin").insertOne({
      adminId: req.adminId,
      accion: "ELIMINAR_USUARIO",
      usuarioId: req.params.id,
      fecha: new Date()
    });

    res.json({ mensaje: "Usuario eliminado" });
  });

  // ===============================
  // DASHBOARD: STATS
  // ===============================
  router.get("/stats", requireAdmin, async (req, res) => {
    const db = getDB();

    const estudiantes = await db.collection("usuarios").countDocuments({ rol: "estudiante" });
    const cursos = await db.collection("cursos").countDocuments();
    const inscripciones = await db.collection("progreso").countDocuments();
    const certificados = await db.collection("certificados").countDocuments();

    res.json({ estudiantes, cursos, inscripciones, certificados });
  });

  // ===============================
  // DASHBOARD: LOGS
  // ===============================
  router.get("/logs", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit || "10");

    const logs = await getDB()
      .collection("logs_admin")
      .find({})
      .sort({ fecha: -1 })
      .limit(limit)
      .toArray();

    res.json(logs);
  });

  return router;
};