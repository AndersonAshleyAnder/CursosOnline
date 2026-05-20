const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "cambia_esto_por_un_secreto";

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Token requerido" });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    // ✅ IMPORTANTE: NO MODIFICAR, SOLO PASAR TAL CUAL
    req.user = payload;

    next();

  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

function requireAdmin(req, res, next) {
  // ✅ SOLO VALIDAR ROL, NADA MÁS
  if (!req.user || req.user.rol !== "admin") {
    return res.status(403).json({ error: "Solo administrador" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };