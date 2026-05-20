window.API_URL = window.API_URL || "https://cursosonline-9def.onrender.com";
var API_URL = window.API_URL; // var permite redeclaración sin romper

/* ===================================================
   AUTH / SESIÓN
=================================================== */
function getToken() { return localStorage.getItem("token") || ""; }
function getRol() { return localStorage.getItem("rol") || ""; }
function getEstudianteId() { return localStorage.getItem("estudianteId") || ""; }
function isLoggedIn() { return !!getToken(); }

// ✅ Logout vuelve al catálogo (index) y limpia todo
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  localStorage.removeItem("estudianteId");
  localStorage.removeItem("pendingCourseId");

  aplicarMenuPorRol();  // ✅ ESTA ES LA ÚNICA LÍNEA NUEVA

  window.location.href = "index.html";
}

window.logout = logout;

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = Object.assign({}, options.headers || {});
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, Object.assign({}, options, { headers }));

  // ✅ SOLO cerrar sesión si no hay token realmente
  if (res.status === 401) {
    console.warn("401 detectado");

    // 👉 SOLO cerrar si NO hay token
    if (!token) {
      logout();
    }

    throw new Error("No autorizado");
  }

  // ✅ 403 = no permiso → NO logout
  if (res.status === 403) {
    console.warn("403 detectado");

    mostrarToast("No tienes permisos para esta sección", "error");

    throw new Error("Forbidden");
  }

  return res;
}

/* ===================================================
   ⭐ HELPERS DE RATING (PEGAR AQUÍ) ✅
=================================================== */
function ratingText(avg, count) {
  const a = Number(avg || 0);
  const c = Number(count || 0);

  // Si no hay reseñas
  if (!c) return `<span style="opacity:.75">⭐ Sin reseñas</span>`;

  // Limita promedio a 0..5 y muestra 1 decimal
  const prom = Math.max(0, Math.min(5, a)).toFixed(1);
  return `<span title="Promedio ${prom} (${c} reseñas)">⭐ ${prom} (${c})</span>`;
}
/* ===================================================
   MENÚ POR ROL (COMPATIBLE CON NAV + HAMBURGUESA) ✅
   - No fuerza "block/inline-flex", deja que el CSS mande
   - Solo oculta con display:none
=================================================== */
function aplicarMenuPorRol() {
  const rol = localStorage.getItem("rol") || "";
  const logged = !!localStorage.getItem("token");
  const esAdmin = logged && rol === "admin";
  const esEstudiante = logged && rol === "estudiante";

  const linkMis = document.getElementById("link-mis");
  const linkCert = document.getElementById("link-cert");
  const linkEst = document.getElementById("link-est");
  const linkCon = document.getElementById("link-con");
  const linkDash = document.getElementById("link-dashboard");

  const linkLogin = document.getElementById("link-login");
  const linkRegister = document.getElementById("link-register");
  const linkLogout = document.getElementById("link-logout");

  const show = (el) => { if (el) el.style.removeProperty("display"); };
  const hide = (el) => { if (el) el.style.display = "none"; };

  // Auth links
  if (!logged) {
    show(linkLogin);
    show(linkRegister);
    hide(linkLogout);
  } else {
    hide(linkLogin);
    hide(linkRegister);
    show(linkLogout);
  }

  // Estudiante links
  if (esEstudiante) {
    show(linkMis);
    show(linkCert);
  } else {
    hide(linkMis);
    hide(linkCert);
  }

  // Admin links
  if (esAdmin) {
    show(linkEst);
    show(linkCon);
    show(linkDash);
  } else {
    hide(linkEst);
    hide(linkCon);
    hide(linkDash);
  }

  // Logout handler
  if (linkLogout) {
    linkLogout.onclick = (e) => {
      e.preventDefault();
      logout();
      return false;
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  aplicarMenuPorRol();
});


/* ===================================================
   FUNCIONES GLOBAL PARA curso.html (TOKEN)
=================================================== */
window.completarLeccion = async function (cursoId, leccionId) {
  const estudianteId = getEstudianteId();
  const res = await authFetch(`${API_URL}/api/progreso/leccion`, {
    method: "POST",
    body: JSON.stringify({ cursoId, leccionId, estudianteId })
  });
  return res.json();
};

window.enviarResena = async function (cursoId, rating, comentario) {
  const estudianteId = getEstudianteId();
  const res = await authFetch(`${API_URL}/api/resenas`, {
    method: "POST",
    body: JSON.stringify({ cursoId, rating, comentario, estudianteId })
  });
  return res.json();
};

window.obtenerResena = async function (cursoId) {
  const estudianteId = getEstudianteId();
  const url = `${API_URL}/api/resenas?estudianteId=${encodeURIComponent(estudianteId)}&cursoId=${encodeURIComponent(cursoId)}`;
  const res = await authFetch(url);
  return res.json();
};



/* ===================================================
   CATÁLOGO (Cards + Modal Preview + Paginación)
=================================================== */
const estadoCursos = { pageActual: 1, limit: 12, totalPages: 1 };
const cursosPorId = new Map();

function inicializarListadoCursos() {
  const filtro = document.getElementById("filtro-categoria");
  const buscador = document.getElementById("buscador");
  const btnBuscar = document.getElementById("btn-buscar");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  if (filtro) filtro.addEventListener("change", () => { estadoCursos.pageActual = 1; cargarCursos(1); });
  if (btnBuscar) btnBuscar.addEventListener("click", () => { estadoCursos.pageActual = 1; cargarCursos(1); });
  if (buscador) buscador.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { estadoCursos.pageActual = 1; cargarCursos(1); }
  });

  if (btnPrev) btnPrev.addEventListener("click", () => {
    if (estadoCursos.pageActual > 1) { estadoCursos.pageActual--; cargarCursos(estadoCursos.pageActual); }
  });

  if (btnNext) btnNext.addEventListener("click", () => {
    if (estadoCursos.pageActual < estadoCursos.totalPages) { estadoCursos.pageActual++; cargarCursos(estadoCursos.pageActual); }
  });

  instalarModalPreview();
  cargarCursos(1);
}
window.inicializarListadoCursos = inicializarListadoCursos;

async function cargarCursos(page = 1) {
  const grid = document.getElementById("grid-cursos");
  if (!grid) return;

  const categoria = document.getElementById("filtro-categoria")?.value || "";
  const q = document.getElementById("buscador")?.value?.trim() || "";

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(estadoCursos.limit));
  if (categoria) params.set("categoria", categoria);
  if (q) params.set("q", q);

  const resp = await fetch(`${API_URL}/api/cursos?${params.toString()}`).then(r => r.json());
  const cursos = resp.data || [];
  estadoCursos.pageActual = resp.page || page;
  estadoCursos.totalPages = resp.totalPages || 1;

  cursosPorId.clear();
  cursos.forEach(c => cursosPorId.set(c._id, c));

  let inscritos = [];
  if (isLoggedIn() && getRol() === "estudiante") {
    try {
      const r = await authFetch(`${API_URL}/api/progreso/me`);
      const data = await r.json();
      if (Array.isArray(data)) {
        inscritos = data.map(p => typeof p.cursoId === "string" ? p.cursoId : (p.cursoId?.$oid || String(p.cursoId)));
      }
    } catch { inscritos = []; }
  }

  renderCards(grid, cursos, inscritos);
  renderPaginacion();
}

function renderCards(grid, cursos, inscritos) {
  grid.innerHTML = "";

  cursos.forEach(c => {
    const estaInscrito = inscritos.includes(c._id);
    const desc = c.descripcionCorta || "Haz clic en la tarjeta para ver la vista previa.";
    const img = c.imagen || "";

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.cursoId = c._id;

    card.innerHTML = `
     <div class="thumb" style="${img ? `background-image:url('${img}');` : ""}">
</div>


      <div class="content">
        <p class="title">${c.nombre}</p>
       <div class="meta">
  <span>⏱ ${c.duracionHoras} h</span>
  <span>📌 ${c.categoria}</span>
  ${ratingText(c.ratingPromedio, c.totalResenas)}
</div>
        <p class="desc">${desc}</p>
      </div>

      <div class="actions">
        <div class="left">
          ${estaInscrito && isLoggedIn() && getRol() === "estudiante"
            ? '<span class="badge badge-success">Inscrito ✅</span>' : ''}
        </div>
        <div class="right">
          ${accionHtml(c._id, estaInscrito)}
        </div>
      </div>
    `;

    card.addEventListener("click", () => abrirPreview(c._id, estaInscrito));
    card.querySelectorAll("button, a").forEach(el =>
      el.addEventListener("click", ev => ev.stopPropagation())
    );

    grid.appendChild(card);
  });
}

function accionHtml(cursoId, estaInscrito) {
  if (!isLoggedIn()) {
    return `<button onclick="inscribirDesdeCatalogo('${cursoId}', this)">Inscribirse</button>`;
  }
  if (getRol() !== "estudiante") {
    return `<button disabled>Solo estudiante</button>`;
  }
  if (estaInscrito) {
    return `<a class="mini-link" href="curso.html?cursoId=${cursoId}">Ver curso</a>`;
  }
  return `<button onclick="inscribirDesdeCatalogo('${cursoId}', this)">Inscribirse</button>`;
}

async function inscribirDesdeCatalogo(cursoId, btn) {
  if (!isLoggedIn()) {
    localStorage.setItem("pendingCourseId", cursoId);
    window.location.href = `login.html?redirect=${encodeURIComponent("index.html")}`;
    return;
  }
  if (getRol() !== "estudiante") {
    alert("Solo estudiantes pueden inscribirse.");
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "Inscribiendo...";

    const res = await authFetch(`${API_URL}/api/progreso`, {
      method: "POST",
      body: JSON.stringify({ cursoId })
    });
    const data = await res.json();

    const msg = (data?.mensaje || "").toLowerCase();
    if (msg.includes("ya está inscrito"))
      alert("✅ Ya estás inscrito. Ve a Mis Cursos.");
    else
      alert("✅ Inscripción exitosa");

    await cargarCursos(estadoCursos.pageActual);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Inscribirse";
    alert("Error: " + e.message);
  }
}
window.inscribirDesdeCatalogo = inscribirDesdeCatalogo;

/* ===================================================
   MIS CURSOS
=================================================== */
async function cargarMisCursos() {
  const tabla = document.getElementById("tabla-mis-cursos");
  if (!tabla) return;

  // ✅ Obtener cursos
  const res = await authFetch(`${API_URL}/api/progreso/me`);
  const data = await res.json();

  // ✅ Obtener certificados del usuario
  const resCert = await authFetch(`${API_URL}/api/certificados/me`);
  const certificados = await resCert.json();

  tabla.innerHTML = "";

  data.forEach(p => {
    const total = 4;
    const completadas = p.leccionesCompletadas?.length || 0;
    const porcentaje = Math.round((completadas / total) * 100);

    const cursoId = typeof p.cursoId === "string"
      ? p.cursoId
      : (p.cursoId?.$oid || String(p.cursoId));

    // ✅ comprobar si ya existe certificado
   const cert = certificados.find(c => {
  let certCursoId = c.cursoId;

  // ✅ normalizar posibles formatos
  if (typeof certCursoId === "object") {
    certCursoId =
      certCursoId.$oid ||
      certCursoId._id ||
      String(certCursoId);
  }

  return String(certCursoId) === String(cursoId);
});


    let estadoCertificado = `<span style="color:#888;">⛔ No disponible</span>`;
    let accionCertificado = "";

    if (porcentaje === 100) {
      estadoCertificado = `<span style="color:#28a745; font-weight:bold;">✅ Disponible</span>`;

      if (cert) {
        // ✅ YA EXISTE → DESCARGAR
        accionCertificado = `
          <button onclick="descargarCertificado('${cursoId}')">
            Descargar
          </button>
        `;
      } else {
        // ✅ NO EXISTE → GENERAR
        accionCertificado = `
          <button onclick="generarCertificado('${cursoId}')">
            Generar
          </button>
        `;
      }
    }

tabla.innerHTML += `
  <tr>
    <td>${p.curso?.[0]?.nombre || "Sin nombre"}</td>
    <td>${completadas} / ${total}</td>
    <td>${porcentaje} %</td>
    <td>${estadoCertificado}</td>

    <!-- ✅ VER CURSO SEPARADO -->
    <td>
      <a href="curso.html?cursoId=${cursoId}" class="mini-link">
        Ver curso
      </a>
    </td>

    <!-- ✅ BOTÓN CERTIFICADO SOLO -->
    <td>
      ${accionCertificado}
    </td>
  </tr>
`;

  });
}
window.cargarMisCursos = cargarMisCursos;

/* ===================================================
   ✅ APRENDIZAJES DINÁMICOS POR CURSO
=================================================== */
function generarAprendizajesPorCurso(curso) {
  const categoria = (curso.categoria || "").toLowerCase();

  if (categoria.includes("program")) return [
    "Dominarás los fundamentos del lenguaje y su sintaxis",
    "Resolverás ejercicios prácticos paso a paso",
    "Aplicarás buenas prácticas de programación"
  ];

  if (categoria.includes("bases")) return [
    "Diseñarás bases de datos correctamente estructuradas",
    "Realizarás consultas CRUD y filtros avanzados",
    "Optimizarás consultas y rendimiento"
  ];

  if (categoria.includes("web")) return [
    "Crearás interfaces web limpias y responsivas",
    "Trabajarás con HTML y estructura moderna",
    "Construirás páginas listas para producción"
  ];

  if (categoria.includes("devops")) return [
    "Implementarás contenedores y flujos de despliegue",
    "Aplicarás integración y entrega continua",
    "Administrarás entornos de forma eficiente"
  ];

  if (categoria.includes("inteligencial")) return [
    "Comprenderás conceptos clave de Machine Learning",
    "Entrenarás modelos básicos con datos reales",
    "Evaluarás resultados con buenas prácticas"
  ];

  if (categoria.includes("ciber")) return [
    "Identificarás vulnerabilidades comunes",
    "Aplicarás prácticas de seguridad responsables",
    "Analizarás casos reales de ciberseguridad"
  ];

  return [
    "Aprenderás conceptos fundamentales del curso",
    "Aplicarás conocimientos en ejercicios prácticos",
    "Obtendrás certificado al completar el curso"
  ];
}

/* ===================================================
   MODAL PREVIEW
=================================================== */
function instalarModalPreview() {
  const overlay = document.getElementById("modal-overlay");
  if (!overlay) return;

  const btn = document.getElementById("btn-cerrar-modal");
  if (btn) btn.onclick = () => overlay.classList.remove("show");

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("show");
  });
}

function abrirPreview(cursoId, estaInscrito) {
  const overlay = document.getElementById("modal-overlay");
  if (!overlay) return;

  const hero = document.getElementById("modal-hero");
  const chip = document.getElementById("modal-chip");
  const title = document.getElementById("modal-title");
  const meta = document.getElementById("modal-meta");
  const bullets = document.getElementById("modal-bullets");
  const desc = document.getElementById("modal-desc");
  const actions = document.getElementById("modal-actions");

  const c = cursosPorId.get(cursoId);
  if (!c) return;

  if (c.imagen && hero) {
    hero.style.backgroundImage = `url('${c.imagen}')`;
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
  }

  if (chip) chip.textContent = c.categoria || "Categoría";
  if (title) title.textContent = c.nombre || "Curso";
  if (meta)
    meta.innerHTML = `<span>⏱ ${c.duracionHoras || 0} h</span><span>📌 ${c.categoria || ""}</span>`;

  if (bullets) {
    const lista = generarAprendizajesPorCurso(c);
    bullets.innerHTML = lista.map(b => `<li>${b}</li>`).join("");
  }

  if (desc)
    desc.textContent = c.descripcionCorta || "Revisa el curso antes de inscribirte.";

  if (actions) {
    actions.innerHTML = "";
    if (!isLoggedIn()) {
      const b = document.createElement("button");
      b.textContent = "Inscribirme";
      b.onclick = () => {
        localStorage.setItem("pendingCourseId", cursoId);
        window.location.href = `login.html?redirect=${encodeURIComponent("index.html")}`;
      };
      actions.appendChild(b);
    } else if (getRol() !== "estudiante") {
      const b = document.createElement("button");
      b.textContent = "Solo estudiante";
      b.disabled = true;
      actions.appendChild(b);
    } else if (estaInscrito) {
      const a = document.createElement("a");
      a.href = `curso.html?cursoId=${cursoId}`;
      a.className = "mini-link";
      a.textContent = "Ver curso";
      actions.appendChild(a);
    } else {
      const b = document.createElement("button");
      b.textContent = "Inscribirme";
      b.onclick = async () => {
        b.disabled = true;
        b.textContent = "Inscribiendo...";
        await inscribirDesdeCatalogo(cursoId, b);
        overlay.classList.remove("show");
      };
      actions.appendChild(b);
    }
  }

  overlay.classList.add("show");
}

function toggleMenu() {
  const menu = document.getElementById("menu");
  if (menu) {
    menu.classList.toggle("show");
  }
}


/* ===================================================
   PAGINACIÓN
=================================================== */
function renderPaginacion() {
  const cont = document.getElementById("paginacion");
  const info = document.getElementById("info-pagina");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  if (!cont) return;

  const total = estadoCursos.totalPages;
  const actual = estadoCursos.pageActual;

  // ✅ texto informativo
  if (info) {
    info.textContent = `Página ${actual} de ${total}`;
  }

  // ✅ botones anterior/siguiente
  if (btnPrev) btnPrev.disabled = actual <= 1;
  if (btnNext) btnNext.disabled = actual >= total;

  // ✅ si solo hay una página → ocultar números
  if (total <= 1) {
    cont.innerHTML = "";
    return;
  }

  // ✅ limpiar SOLO números
  cont.innerHTML = "";

  const maxBotones = 7;

  let inicio = Math.max(actual - 3, 1);
  let fin = Math.min(inicio + maxBotones - 1, total);
  inicio = Math.max(fin - maxBotones + 1, 1);

  // ✅ primera página
  if (inicio > 1) {
    cont.appendChild(crearBotonPagina(1, actual === 1));
    if (inicio > 2) cont.appendChild(crearPuntos());
  }

  // ✅ páginas centrales
  for (let p = inicio; p <= fin; p++) {
    cont.appendChild(crearBotonPagina(p, p === actual));
  }

  // ✅ última página
  if (fin < total) {
    if (fin < total - 1) cont.appendChild(crearPuntos());
    cont.appendChild(crearBotonPagina(total, actual === total));
  }
}

function crearBotonPagina(pagina, activo) {
  const b = document.createElement("button");
  b.textContent = String(pagina);
  b.disabled = activo;
  b.style.minWidth = "38px";
  b.onclick = () => {
    estadoCursos.pageActual = pagina;
    cargarCursos(pagina);
  };
  return b;
}

function crearPuntos() {
  const s = document.createElement("span");
  s.textContent = "...";
  s.style.padding = "0 6px";
  return s;
}
// ✅ GENERAR CERTIFICADO (GLOBAL)
window.generarCertificado = async function (cursoId) {
  try {
    const res = await authFetch(`${API_URL}/api/certificados/generar`, {
      method: "POST",
      body: JSON.stringify({ cursoId })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "No se pudo generar el certificado");
      return;
    }

    // ✅ Descargar PDF
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "certificado.pdf";
    a.click();

    // ✅ Recargar certificados automáticamente
    mostrarToast("Certificado generado correctamente ✅", "success");
    
  } catch (err) {
    mostrarToast("Error: " + err.message, "error");
  }
};
function mostrarToast(mensaje, tipo = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = mensaje;
  toast.className = `toast show ${tipo}`;

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}
window.descargarCertificado = async function (cursoId) {
  try {
    const res = await authFetch(`${API_URL}/api/certificados/generar`, {
      method: "POST",
      body: JSON.stringify({ cursoId })
    });

    if (!res.ok) {
      mostrarToast("Error descargando certificado", "error");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "certificado.pdf";
    a.click();

    mostrarToast("Certificado descargado ✅", "success");

  } catch (err) {
    mostrarToast("Error: " + err.message, "error");
  }
};
