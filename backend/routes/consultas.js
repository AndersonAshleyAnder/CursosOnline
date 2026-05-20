const express = require("express");

module.exports = (getDB) => {
  const router = express.Router();

  // ===============================
  // Helper
  // ===============================
const toObjectIdExpr = (fieldPath) => ({
  $cond: [
    { $or: [
        { $eq: [{ $type: fieldPath }, "objectId"] },
        { $eq: [fieldPath, null] }   // ✅ NUEVO FIX
      ]
    },
    fieldPath,
    { $toObjectId: fieldPath }
  ]
});

  // =====================================================
  // 1) Totales de estudiantes por curso
  // =====================================================
  router.get("/totales-por-curso", async (req, res) => {
    const db = getDB();

    const data = await db.collection("progreso").aggregate([
	{ $match: { cursoId: { $ne: null } } },
      { $addFields: { cursoLookupId: toObjectIdExpr("$cursoId") } },
      {
        $group: {
          _id: "$cursoLookupId",
          estudiantes: { $addToSet: "$estudianteId" }
        }
      },
      {
        $project: {
          cursoId: "$_id",
          total: { $size: "$estudiantes" }
        }
      },
      {
        $lookup: {
          from: "cursos",
          localField: "cursoId",
          foreignField: "_id",
          as: "curso"
        }
      },
      { $unwind: "$curso" },
      {
        $project: {
          _id: 0,
          curso: "$curso.nombre",
          total: 1
        }
      },
      { $sort: { total: -1, curso: 1 } }
    ]).toArray();

    res.json(data);
  });

  // =====================================================
  // 2) Promedio de progreso
  // =====================================================
  router.get("/promedio-progreso", async (req, res) => {
    const db = getDB();

    const data = await db.collection("progreso").aggregate([
      { $addFields: { cursoLookupId: toObjectIdExpr("$cursoId") } },
      {
        $group: {
          _id: "$cursoLookupId",
          promedio: { $avg: "$porcentaje" }
        }
      },
      {
        $lookup: {
          from: "cursos",
          localField: "_id",
          foreignField: "_id",
          as: "curso"
        }
      },
      { $unwind: "$curso" },
      {
        $project: {
          _id: 0,
          curso: "$curso.nombre",
          promedio: { $round: ["$promedio", 1] }
        }
      },
      { $sort: { promedio: -1, curso: 1 } }
    ]).toArray();

    res.json(data);
  });

  // =====================================================
  // 3) Ranking
  // =====================================================
  router.get("/ranking-completados", async (req, res) => {
    const db = getDB();

    const data = await db.collection("progreso").aggregate([
      { $match: { completado: true } },
      { $addFields: { cursoLookupId: toObjectIdExpr("$cursoId") } },
      {
        $group: {
          _id: "$cursoLookupId",
          estudiantes: { $addToSet: "$estudianteId" }
        }
      },
      {
        $project: {
          cursoId: "$_id",
          completados: { $size: "$estudiantes" }
        }
      },
      {
        $lookup: {
          from: "cursos",
          localField: "cursoId",
          foreignField: "_id",
          as: "curso"
        }
      },
      { $unwind: "$curso" },
      {
        $project: {
          _id: 0,
          curso: "$curso.nombre",
          completados: 1
        }
      },
      { $sort: { completados: -1, curso: 1 } }
    ]).toArray();

    res.json(data);
  });

  // =====================================================
  // 4) Top calificados
  // =====================================================
  router.get("/top-calificados", async (req, res) => {
  const db = getDB();

  const data = await db.collection("resenas").aggregate([

    { $match: { cursoId: { $ne: null } } },   // ✅ FIX CLAVE

    { $addFields: { cursoLookupId: toObjectIdExpr("$cursoId") } },

    {
      $group: {
        _id: "$cursoLookupId",
        promedio: { $avg: { $ifNull: ["$rating", 0] } },   // ✅ FIX
        total: { $sum: 1 }
      }
    },

    { $match: { total: { $gte: 3 } } },

    {
      $lookup: {
        from: "cursos",
        localField: "_id",
        foreignField: "_id",
        as: "curso"
      }
    },

    { $unwind: "$curso" },

    {
      $project: {
        _id: 0,
        curso: "$curso.nombre",
        categoria: "$curso.categoria",
        promedio: { $round: ["$promedio", 2] },
        total: 1
      }
    },

    { $sort: { promedio: -1, total: -1 } },
    { $limit: 5 }

  ]).toArray();

  res.json(data);
});

  // =====================================================
  // 5) Promedio por categoría
  // =====================================================
  router.get("/promedio-por-categoria", async (req, res) => {
  const db = getDB();

  const data = await db.collection("resenas").aggregate([

    { $match: { cursoId: { $ne: null } } },   // ✅ FIX CLAVE

    { $addFields: { cursoLookupId: toObjectIdExpr("$cursoId") } },

    {
      $lookup: {
        from: "cursos",
        localField: "cursoLookupId",
        foreignField: "_id",
        as: "curso"
      }
    },

    { $unwind: "$curso" },

    {
      $group: {
        _id: "$curso.categoria",
        promedio: { $avg: { $ifNull: ["$rating", 0] } },   // ✅ FIX
        total: { $sum: 1 }
      }
    },

    {
      $project: {
        _id: 0,
        categoria: "$_id",
        promedio: { $round: ["$promedio", 2] },
        total: 1
      }
    }

  ]).toArray();

  res.json(data);
});


  return router;
};
