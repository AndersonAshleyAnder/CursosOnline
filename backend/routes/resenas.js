const express = require("express");
const { ObjectId } = require("mongodb");

module.exports = (getDB) => {
  const router = express.Router();

  // ---------------------------------------------
  // POST /api/resenas
  // Body: { estudianteId, cursoId, rating, comentario }
  // ---------------------------------------------
  router.post("/", async (req, res) => {
    try {
      const { estudianteId, cursoId, rating, comentario } = req.body;

      if (!estudianteId || !cursoId) {
        return res.status(400).json({ error: "estudianteId y cursoId son obligatorios" });
      }

      const ratingNum = parseInt(rating, 10);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: "rating debe estar entre 1 y 5" });
      }

      const comentarioTxt = (comentario || "").trim();
      if (comentarioTxt.length < 3) {
        return res.status(400).json({ error: "comentario muy corto" });
      }

      // ✅ Solo permitir reseña si el curso está completado
      const progreso = await getDB().collection("progreso").findOne({
        estudianteId: new ObjectId(estudianteId),
        cursoId: new ObjectId(cursoId)
      });

      if (!progreso || progreso.completado !== true) {
        return res.status(403).json({ error: "Solo puedes reseñar cuando el curso esté completado" });
      }

      await getDB().collection("resenas").insertOne({
        estudianteId: new ObjectId(estudianteId),
        cursoId: new ObjectId(cursoId),
        rating: ratingNum,
        comentario: comentarioTxt,
        fecha: new Date()
      });

      return res.json({ mensaje: "Reseña guardada correctamente" });
    } catch (error) {
      if (error && error.code === 11000) {
        return res.status(409).json({ error: "Ya existe una reseña para este curso" });
      }
      console.error("Error creando reseña:", error);
      return res.status(500).json({ error: "Error guardando reseña" });
    }
  });

  // ---------------------------------------------
  // GET /api/resenas?estudianteId=...&cursoId=...
  // Devuelve reseña del estudiante para ese curso
  // ---------------------------------------------
  router.get("/", async (req, res) => {
    try {
      const estudianteId = (req.query.estudianteId || "").trim();
      const cursoId = (req.query.cursoId || "").trim();

      if (!estudianteId || !cursoId) {
        return res.json(null);
      }

      const resena = await getDB().collection("resenas").findOne({
        estudianteId: new ObjectId(estudianteId),
        cursoId: new ObjectId(cursoId)
      });

      return res.json(resena || null);
    } catch (error) {
      console.error("Error consultando reseña:", error);
      return res.status(500).json({ error: "Error consultando reseña" });
    }
  });

  // ---------------------------------------------
  // GET /api/resenas/estrellas
  // Distribución global por estrellas (1..5)
  // ---------------------------------------------
  router.get("/estrellas", async (req, res) => {
    try {
      const agg = await getDB().collection("resenas").aggregate([
        { $group: { _id: "$rating", total: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]).toArray();

      const mapa = new Map();
      agg.forEach(x => mapa.set(x._id, x.total));

      const distribucion = [1, 2, 3, 4, 5].map(r => ({
        rating: r,
        total: mapa.get(r) || 0
      }));

      const totalResenas = distribucion.reduce((a, b) => a + b.total, 0);
      const sumaPonderada = distribucion.reduce((a, b) => a + (b.rating * b.total), 0);
      const promedioGlobal = totalResenas ? Math.round((sumaPonderada / totalResenas) * 100) / 100 : 0;

      return res.json({ totalResenas, promedioGlobal, distribucion });
    } catch (error) {
      console.error("Error en /api/resenas/estrellas:", error);
      return res.status(500).json({ error: "Error obteniendo estadísticas de reseñas" });
    }
  });

  // ---------------------------------------------
  // GET /api/resenas/top?limit=5&min=3
  // Top cursos mejor calificados
  // ✅ min por defecto = 3 (más realista)
  // ---------------------------------------------
  router.get("/top", async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit || "5", 10), 1), 50);
      const min = Math.min(Math.max(parseInt(req.query.min || "3", 10), 1), 100);

      const data = await getDB().collection("resenas").aggregate([
        {
          $group: {
            _id: "$cursoId",
            promedioRating: { $avg: "$rating" },
            totalResenas: { $sum: 1 }
          }
        },
        { $match: { totalResenas: { $gte: min } } },
        {
          $lookup: {
            from: "cursos",
            localField: "_id",
            foreignField: "_id",
            as: "curso"
          }
        },
        {
          $project: {
            _id: 0,
            cursoId: "$_id",
            nombreCurso: { $arrayElemAt: ["$curso.nombre", 0] },
            categoria: { $arrayElemAt: ["$curso.categoria", 0] },
            promedioRating: { $round: ["$promedioRating", 2] },
            totalResenas: 1
          }
        },
        { $sort: { promedioRating: -1, totalResenas: -1 } },
        { $limit: limit }
      ]).toArray();

      return res.json(data);
    } catch (error) {
      console.error("Error en /api/resenas/top:", error);
      return res.status(500).json({ error: "Error obteniendo top calificados" });
    }
  });

  // ---------------------------------------------
  // GET /api/resenas/promedio-categoria
  // Promedio de rating por categoría
  // ---------------------------------------------
  router.get("/promedio-categoria", async (req, res) => {
    try {
      const data = await getDB().collection("resenas").aggregate([
        {
          $lookup: {
            from: "cursos",
            localField: "cursoId",
            foreignField: "_id",
            as: "curso"
          }
        },
        {
          $project: {
            rating: 1,
            categoria: { $arrayElemAt: ["$curso.categoria", 0] }
          }
        },
        {
          $group: {
            _id: "$categoria",
            promedioRating: { $avg: "$rating" },
            totalResenas: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            categoria: "$_id",
            promedioRating: { $round: ["$promedioRating", 2] },
            totalResenas: 1
          }
        },
        { $sort: { promedioRating: -1 } }
      ]).toArray();

      return res.json(data);
    } catch (error) {
      console.error("Error en /api/resenas/promedio-categoria:", error);
      return res.status(500).json({ error: "Error obteniendo promedio por categoría" });
    }
  });

  return router;
};