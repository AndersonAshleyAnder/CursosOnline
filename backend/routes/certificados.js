const express = require("express");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { ObjectId } = require("mongodb");

module.exports = (getDB) => {
  const router = express.Router();

  // ===============================
  // ✅ OBTENER CERTIFICADOS
  // ===============================
  router.get("/me", async (req, res) => {
    try {
      const db = getDB();
      const estudianteId = req.user?.estudianteId;

      if (!estudianteId) {
        return res.status(401).json({ error: "No autenticado" });
      }

      const certificados = await db.collection("certificados")
        .find({ estudianteId: new ObjectId(estudianteId) })
        .sort({ fechaEmision: -1 })
        .toArray();

      res.json(certificados);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error obteniendo certificados" });
    }
  });

  // ===============================
  // ✅ GENERAR CERTIFICADO
  // ===============================
  router.post("/generar", async (req, res) => {
    try {
      const db = getDB();
      const { cursoId } = req.body;

      if (!ObjectId.isValid(cursoId)) {
        return res.status(400).json({ error: "cursoId inválido" });
      }

      const estudianteId = req.user.estudianteId;

      // ✅ VALIDAR PROGRESO
      const progreso = await db.collection("progreso").findOne({
        estudianteId: new ObjectId(estudianteId),
        cursoId: new ObjectId(cursoId),
        completado: true
      });

      if (!progreso) {
        return res.status(400).json({
          error: "El curso no está completado"
        });
      }

      // ✅ DATOS
      const curso = await db.collection("cursos").findOne({
        _id: new ObjectId(cursoId)
      });

      if (!curso) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }

      const estudiante = await db.collection("estudiantes").findOne({
        _id: new ObjectId(estudianteId)
      });

      if (!estudiante) {
        return res.status(404).json({ error: "Estudiante no encontrado" });
      }

      // ✅ EVITAR DUPLICADOS
      const existente = await db.collection("certificados").findOne({
        estudianteId: new ObjectId(estudianteId),
        cursoId: new ObjectId(cursoId)
      });

      if (existente) {
  // ✅ Si existe el registro pero NO existe el archivo en disco (Render reinició),
  // regeneramos el PDF y evitamos "Not Found"
  if (existente.pdfPath && fs.existsSync(existente.pdfPath)) {
    return res.download(existente.pdfPath);
  }

  console.warn("⚠️ Certificado existe en DB pero PDF no existe en disco. Regenerando...", {
    pdfPath: existente.pdfPath
  });

  // Opcional: borra el registro viejo para evitar duplicados inconsistentes
  await db.collection("certificados").deleteOne({ _id: existente._id });
}

      // ===============================
      // 🎓 GENERAR PDF
      // ===============================
      const codigo = `CERT-${new Date().getFullYear()}-${Date.now()}`;

      const certDir = path.join(__dirname, "..", "certificados");
     if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

      const pdfPath = path.join(certDir, `${codigo}.pdf`);
      const doc = new PDFDocument({ size: "A4", margin: 50 });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      const logoPath = path.join(__dirname, "..", "assets", "logo.png");

      // ✅ BORDES DIPLOMA
      doc
        .lineWidth(5)
        .strokeColor("#0A1C3D")
        .rect(15, 15, doc.page.width - 30, doc.page.height - 30)
        .stroke();

      doc
        .lineWidth(1)
        .strokeColor("#6A0DAD")
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .stroke();

      // ✅ LOGO GRANDE
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, doc.page.width / 2 - 140, 40, {
          width: 280
        });
      }

      doc.moveDown(6);

      // ✅ TITULO
      doc
        .fontSize(30)
        .fillColor("#6A0DAD")
        .text("CERTIFICADO", { align: "center" });

      doc.moveDown(3);

      // ✅ TEXTO
      doc
        .fontSize(14)
        .fillColor("#000")
        .text("Se certifica que:", { align: "center" });

      doc.moveDown();

      // ✅ NOMBRE
      doc
        .fontSize(22)
        .text(estudiante.nombre, {
          align: "center",
          underline: true
        });

      doc.moveDown();

      doc
        .fontSize(14)
        .text("Ha completado satisfactoriamente el curso:", {
          align: "center"
        });

      doc.moveDown();

      // ✅ CURSO
      doc
        .fontSize(18)
        .text(curso.nombre, {
          align: "center",
          underline: true
        });

      doc.moveDown();

      // ✅ DATOS
      doc
        .fontSize(12)
        .text(`Duración: ${curso.duracionHoras} horas`, {
          align: "center"
        });

      doc.moveDown(2);

      doc.text(
        `Fecha de emisión: ${new Date().toLocaleDateString()}`,
        { align: "center" }
      );

      doc.moveDown();

      doc.text(`Código de verificación: ${codigo}`, {
        align: "center"
      });

      // ✅ FIRMA
      doc.moveDown(4);

      doc.text("______________________________", { align: "center" });
      doc.text("Dirección Académica", { align: "center" });

      doc.end();

      // ✅ ESPERAR FINALIZACIÓN DEL PDF
      stream.on("finish", async () => {
        try {
          await db.collection("certificados").insertOne({
            estudianteId: new ObjectId(estudianteId),
            cursoId: new ObjectId(cursoId),
            nombreEstudiante: estudiante.nombre,
            nombreCurso: curso.nombre,
            duracionHoras: curso.duracionHoras,
            fechaEmision: new Date(),
            codigo,
            pdfPath
          });

          res.download(pdfPath);

        } catch (err) {
          console.error(err);
          res.status(500).json({ error: "Error guardando certificado" });
        }
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error generando certificado" });
    }
  });

  return router;
};
