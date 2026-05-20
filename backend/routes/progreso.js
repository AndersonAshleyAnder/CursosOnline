const express = require("express");
const { ObjectId } = require("mongodb");
const { requireAuth } = require("../middleware/auth");

module.exports = (getDB) => {
  const router = express.Router();

  const TOTAL_LECCIONES = 4;

  // ✅ Inscripción (requiere login)
  router.post("/", requireAuth, async (req, res) => {
    try {
      const { cursoId } = req.body;

      if (!req.user.estudianteId) {
        return res.status(403).json({ error: "Solo estudiantes pueden inscribirse" });
      }

      const estudianteId = req.user.estudianteId;

      const existente = await getDB().collection("progreso").findOne({
        estudianteId: new ObjectId(estudianteId),
        cursoId: new ObjectId(cursoId)
      });

      if (existente) {
        return res.json({ mensaje: "El estudiante ya está inscrito en este curso" });
      }

      await getDB().collection("progreso").insertOne({
        estudianteId: new ObjectId(estudianteId),
        cursoId: new ObjectId(cursoId),
        leccionesCompletadas: [],
        porcentaje: 0,
        completado: false,
        fechaInicio: new Date()
      });

      return res.json({ mensaje: "Inscripción creada correctamente" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Error creando inscripción" });
    }
  });

  // ✅ Completar lección (requiere login)
  router.post("/leccion", requireAuth, async (req, res) => {
    try {
      const { cursoId, leccionId } = req.body;

      if (!req.user.estudianteId) {
        return res.status(403).json({ error: "Solo estudiantes pueden completar lecciones" });
      }

      const estudianteId = req.user.estudianteId;

      const progreso = await getDB().collection("progreso").findOne({
        estudianteId: new ObjectId(estudianteId),
        cursoId: new ObjectId(cursoId)
      });

      if (!progreso) {
        return res.status(400).json({ error: "No está inscrito en el curso" });
      }

      const lecciones = progreso.leccionesCompletadas || [];
      const yaExiste = lecciones.some(l => l.leccionId === leccionId);

      if (!yaExiste) {
        lecciones.push({ leccionId, fecha: new Date() });
      }

      const completadas = lecciones.length;
      const porcentaje = Math.round((completadas / TOTAL_LECCIONES) * 100);
      const cursoCompletado = completadas === TOTAL_LECCIONES;

      await getDB().collection("progreso").updateOne(
        { _id: progreso._id },
        { $set: { leccionesCompletadas: lecciones, porcentaje, completado: cursoCompletado } }
      );

      // Certificado automático
      if (cursoCompletado) {
        const existeCertificado = await getDB().collection("certificados").findOne({
          estudianteId: progreso.estudianteId,
          cursoId: progreso.cursoId
        });

        if (!existeCertificado) {
          await getDB().collection("certificados").insertOne({
            estudianteId: progreso.estudianteId,
            cursoId: progreso.cursoId,
            fechaEmision: new Date(),
            codigoCertificado: `CERT-${Date.now()}`
          });
        }
      }

      return res.json({ mensaje: "Lección registrada correctamente", porcentaje, cursoCompletado });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Error completando lección" });
    }
  });

  // ✅ NUEVO: Progreso del estudiante logueado
  router.get("/me", requireAuth, async (req, res) => {
    try {
      if (!req.user.estudianteId) {
        return res.status(403).json({ error: "Solo estudiantes" });
      }

      const estudianteId = req.user.estudianteId;

      const progreso = await getDB().collection("progreso").aggregate([
        { $match: { estudianteId: new ObjectId(estudianteId) } },
        {
          $lookup: {
            from: "cursos",
            localField: "cursoId",
            foreignField: "_id",
            as: "curso"
          }
        }
      ]).toArray();

      return res.json(progreso);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Error obteniendo progreso" });
    }
  });

  // (opcional) mantener este endpoint por si lo usas en admin:
  router.get("/:estudianteId", async (req, res) => {
    const progreso = await getDB().collection("progreso")
      .find({ estudianteId: new ObjectId(req.params.estudianteId) })
      .toArray();

    res.json(progreso);
  });

  return router;
};