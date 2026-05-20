const express = require("express");

module.exports = (getDB) => {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const categoria = (req.query.categoria || "").trim();
      const q = (req.query.q || "").trim();

      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);

      const filtro = {};

      if (categoria) filtro.categoria = categoria;
      if (q) filtro.nombre = { $regex: q, $options: "i" };

      const skip = (page - 1) * limit;

      const col = getDB().collection("cursos");

      const [total, data] = await Promise.all([
        col.countDocuments(filtro),
        col
          .find(filtro)
          .sort({ mixIndex: 1, _id: 1 }) // ✅ mezcla estable + fallback
          .skip(skip)
          .limit(limit)
          .toArray()
      ]);

      const totalPages = Math.max(Math.ceil(total / limit), 1);

      return res.json({ data, page, limit, total, totalPages });
    } catch (error) {
      console.error("Error en /api/cursos:", error);
      return res.status(500).json({ error: "Error obteniendo cursos" });
    }
  });

  return router;
};