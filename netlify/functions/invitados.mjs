// Lista de invitados de la boda, guardada en Netlify Blobs.
//
// Público (la invitación):
//   GET  /.netlify/functions/invitados?c=carola_marcela_clarissa  -> { n, p }  (solo ese invitado)
//
// Panel de invitados (dirección privada). Si existe ADMIN_PASSWORD en Netlify, se exige en la
// cabecera x-clave; si no existe, el panel funciona sin contraseña.
//   GET    /.netlify/functions/invitados                 -> { invitados: [...] }
//   POST   /.netlify/functions/invitados  { invitados:[{nombre, pases}], reemplazar? }  -> guarda / actualiza
//          reemplazar: true -> además elimina a quien no venga en la lista (sincroniza con el Excel)
//   DELETE /.netlify/functions/invitados?c=codigo        -> elimina un invitado
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

// Debe ser idéntico al de index.html y generador.html
export function normalizarCodigo(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
    .split(/\s+/).filter(w => w && w !== "y" && w !== "e").join("_");
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

const limpiarPases = p => Math.max(1, Math.min(20, parseInt(p, 10) || 1));
const resumen = h => createHash("sha256").update(String(h)).digest();

function claveCorrecta(recibida, esperada) {
  if (!esperada) return false;
  return timingSafeEqual(resumen(recibida || ""), resumen(esperada));
}

export async function manejar(req, store, claveAdmin) {
  const url = new URL(req.url);

  // Consulta pública de un solo invitado
  if (req.method === "GET" && url.searchParams.has("c")) {
    const codigo = normalizarCodigo(url.searchParams.get("c"));
    if (!codigo) return json({ error: "Código vacío" }, 400);
    const d = await store.get(codigo, { type: "json" });
    if (!d) return json({ encontrado: false }, 404);
    return json({ n: d.nombre, p: d.pases });
  }

  // Todo lo demás es para el panel. La contraseña es opcional.
  if (claveAdmin && !claveCorrecta(req.headers.get("x-clave"), claveAdmin)) {
    await new Promise(r => setTimeout(r, 700));
    return json({ error: "Contraseña incorrecta" }, 401);
  }

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const datos = await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })));
    const invitados = datos.filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return json({ invitados });
  }

  if (req.method === "POST") {
    let cuerpo = null;
    try { cuerpo = await req.json(); } catch (e) { /* cuerpo inválido */ }
    const lista = cuerpo && Array.isArray(cuerpo.invitados) ? cuerpo.invitados : null;
    if (!lista || !lista.length) return json({ error: "No llegó ningún invitado" }, 400);
    if (lista.length > 500) return json({ error: "Máximo 500 invitados por envío" }, 400);

    const ahora = new Date().toISOString();
    const resultado = [];
    for (const it of lista) {
      const nombre = String(it && it.nombre || "").trim().replace(/\s+/g, " ").slice(0, 120);
      const codigo = normalizarCodigo(it && it.codigo ? it.codigo : nombre);
      if (!nombre || !codigo) { resultado.push({ nombre, estado: "error" }); continue; }
      const previo = await store.get(codigo, { type: "json" });
      const registro = {
        codigo,
        nombre,
        pases: limpiarPases(it.pases),
        creado: previo && previo.creado ? previo.creado : ahora,
        actualizado: ahora,
      };
      await store.setJSON(codigo, registro);
      resultado.push({ ...registro, estado: previo ? "actualizado" : "nuevo" });
    }
    const eliminados = [];
    if (cuerpo.reemplazar === true) {
      const enLista = new Set(resultado.filter(r => r.codigo).map(r => r.codigo));
      const { blobs } = await store.list();
      for (const b of blobs) {
        if (!enLista.has(b.key)) { await store.delete(b.key); eliminados.push(b.key); }
      }
    }
    return json({ resultado, eliminados });
  }

  if (req.method === "DELETE") {
    const codigo = normalizarCodigo(url.searchParams.get("c"));
    if (!codigo) return json({ error: "Código vacío" }, 400);
    await store.delete(codigo);
    return json({ eliminado: codigo });
  }

  return json({ error: "Método no permitido" }, 405);
}

export default async (req) => {
  const store = getStore({ name: "invitados", consistency: "strong" });
  const clave = (globalThis.Netlify && Netlify.env.get("ADMIN_PASSWORD")) || process.env.ADMIN_PASSWORD || "";
  return manejar(req, store, clave);
};
