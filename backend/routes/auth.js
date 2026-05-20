const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "cambia_esto_por_un_secreto";

module.exports = (getDB) => {
  const router = express.Router();

  // ===============================
  // ✅ REGISTRO
  // ===============================
  router.post("/register", async (req, res) => {
    try {
      const db = getDB();
      const { nombre, email, password } = req.body;

      if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      // Separar nombre en partes
      const partes = nombre.split(" ");
      const nombreReal = partes[0];
      const apellidoReal = partes.slice(1).join(" ") || "Sin apellido";

      // Validar duplicado
      const existe = await db.collection("usuarios").findOne({ email });

      if (existe) {
        return res.status(400).json({
          error: "El correo ya está registrado"
        });
      }

      // ✅ HASH correctamente dentro de async
      const passwordHash = await bcrypt.hash(password, 10);

      // Crear estudiante
      const est = await db.collection("estudiantes").insertOne({
        nombre: nombreReal,
        apellido: apellidoReal,
        email,
        fechaRegistro: new Date()
      });

      // Crear usuario
      await db.collection("usuarios").insertOne({
        nombre: nombreReal,
        apellido: apellidoReal,
        email,
        passwordHash,
        rol: "estudiante",
        estudianteId: est.insertedId,
        creadoEn: new Date()
      });

      res.json({ mensaje: "Registro exitoso" });

    } catch (err) {
      console.error("ERROR REGISTER:", err);

      if (err.code === 11000) {
        return res.status(400).json({
          error: "El correo ya está registrado"
        });
      }

      res.status(500).json({
        error: "Error registrando usuario"
      });
    }
  });

  // ===============================
  // ✅ LOGIN
  // ===============================
router.post("/login", async (req, res) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    const user = await db.collection("usuarios").findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const valido = await bcrypt.compare(password, user.passwordHash);

    if (!valido) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    // ✅ TOKEN CORRECTO (AQUÍ ESTÁ EL FIX)
    const token = jwt.sign(
      {
        id: user._id.toString(),     // ✅ CAMBIO CLAVE
        rol: user.rol,
        estudianteId: user.estudianteId || null
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      rol: user.rol,
      estudianteId: user.estudianteId || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en login" });
  }
});

  return router;
};