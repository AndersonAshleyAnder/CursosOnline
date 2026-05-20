const express = require("express");
const { ObjectId } = require("mongodb");

module.exports = (getDB) => {
  const router = express.Router();

  // ✅ LISTAR CURSOS + RATING PROMEDIO + TOTAL RESEÑAS
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

      const total = await col.countDocuments(filtro);

      const data = await col.aggregate([
        { $match: filtro },
        { $sort: { mixIndex: 1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },

        // ✅ Calcula promedio y total de reseñas para este curso
        {
          $lookup: {
            from: "resenas",
            let: { cursoId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$cursoId", "$$cursoId"] } } },
              {
                $group: {
                  _id: null,
                  promedio: { $avg: "$rating" },
                  total: { $sum: 1 }
                }
              }
            ],
            as: "ratingInfo"
          }
        },

        {
          $addFields: {
            ratingPromedio: {
              $round: [
                { $ifNull: [{ $arrayElemAt: ["$ratingInfo.promedio", 0] }, 0] },
                1
              ]
            },
            totalResenas: { $ifNull: [{ $arrayElemAt: ["$ratingInfo.total", 0] }, 0] }
          }
        },

        { $project: { ratingInfo: 0 } }
      ]).toArray();

      const totalPages = Math.max(Math.ceil(total / limit), 1);
      return res.json({ data, page, limit, total, totalPages });

    } catch (error) {
      console.error("Error en /api/cursos:", error);
      return res.status(500).json({ error: "Error obteniendo cursos" });
    }
  });

  // ✅ RESEÑAS PÚBLICAS DE UN CURSO (para el popup del catálogo)
  router.get("/:cursoId/resenas", async (req, res) => {
    try {
      const cursoId = req.params.cursoId;
      if (!ObjectId.isValid(cursoId)) return res.json([]);

      const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);

      const reviews = await getDB().collection("resenas")
        .find({ cursoId: new ObjectId(cursoId) })
        .sort({ fecha: -1 })
        .limit(limit)
        .project({ rating: 1, comentario: 1, fecha: 1, _id: 0 })
        .toArray();

      return res.json(reviews);

    } catch (error) {
      console.error("Error en /api/cursos/:cursoId/resenas:", error);
      return res.status(500).json({ error: "Error obteniendo reseñas" });
    }
  });

  return router;
};
const express = require("express");
const { ObjectId } = require("mongodb");

module.exports = (getDB) => {
  const router = express.Router();

  // ✅ LISTAR CURSOS + RATING PROMEDIO + TOTAL RESEÑAS
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

      const total = await col.countDocuments(filtro);

      const data = await col.aggregate([
        { $match: filtro },
        { $sort: { mixIndex: 1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },

        // ✅ Calcula promedio y total de reseñas para este curso
        {
          $lookup: {
            from: "resenas",
            let: { cursoId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$cursoId", "$$cursoId"] } } },
              {
                $group: {
                  _id: null,
                  promedio: { $avg: "$rating" },
                  total: { $sum: 1 }
                }
              }
            ],
            as: "ratingInfo"
          }
        },

        {
          $addFields: {
            ratingPromedio: {
              $round: [
                { $ifNull: [{ $arrayElemAt: ["$ratingInfo.promedio", 0] }, 0] },
                1
              ]
            },
            totalResenas: { $ifNull: [{ $arrayElemAt: ["$ratingInfo.total", 0] }, 0] }
          }
        },

        { $project: { ratingInfo: 0 } }
      ]).toArray();

      const totalPages = Math.max(Math.ceil(total / limit), 1);
      return res.json({ data, page, limit, total, totalPages });

    } catch (error) {
      console.error("Error en /api/cursos:", error);
      return res.status(500).json({ error: "Error obteniendo cursos" });
    }
  });

  // ✅ RESEÑAS PÚBLICAS DE UN CURSO (para el popup del catálogo)
  router.get("/:cursoId/resenas", async (req, res) => {
    try {
      const cursoId = req.params.cursoId;
      if (!ObjectId.isValid(cursoId)) return res.json([]);

      const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);

      const reviews = await getDB().collection("resenas")
        .find({ cursoId: new ObjectId(cursoId) })
        .sort({ fecha: -1 })
        .limit(limit)
        .project({ rating: 1, comentario: 1, fecha: 1, _id: 0 })
        .toArray();

      return res.json(reviews);

    } catch (error) {
      console.error("Error en /api/cursos/:cursoId/resenas:", error);
      return res.status(500).json({ error: "Error obteniendo reseñas" });
    }
  });

  return router;
};
