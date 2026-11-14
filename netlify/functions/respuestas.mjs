// Confirmaciones (RSVP) de la boda, guardadas en Netlify Blobs para poder verlas y
// descargarlas desde el panel de invitados. Netlify Forms sigue recibiendo una copia.
//
// Público (la invitación):
//   POST /.netlify/functions/respuestas  { invitacion, codigo, pases_asignados, nombre, asistencia, asistentes, restricciones, mensaje }
// Panel (cabecera x-panel con la clave de la dirección privada del panel):
//   GET    /.netlify/functions/respuestas          -> { respuestas: [...] }
//   DELETE /.netlify/functions/respuestas?k=clave  -> elimina una respuesta (p. ej. de prueba)
import { getStore } from "@netlify/blobs";

const PANEL = "odzjhdfq";
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const txt = (v, max) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export async function manejar(req, store) {
  const url = new URL(req.url);

  if (req.method === "POST") {
    let d = null;
    try { d = await req.json(); } catch (e) { /* cuerpo inválido */ }
    if (!d) return json({ error: "Datos inválidos" }, 400);
    if (txt(d["bot-field"], 50)) return json({ ok: true });          // trampa para robots
    const registro = {
      fecha: new Date().toISOString(),
      invitacion: txt(d.invitacion, 120),
      codigo: txt(d.codigo, 120),
      pases_asignados: txt(d.pases_asignados, 4),
      nombre: txt(d.nombre, 120),
      asistencia: txt(d.asistencia, 30),
      asistentes: txt(d.asistentes, 4),
      restricciones: txt(d.restricciones, 300),
      mensaje: String(d.mensaje ?? "").trim().slice(0, 1500),
    };
    if (!registro.nombre || !registro.asistencia) return json({ error: "Faltan nombre o asistencia" }, 400);
    const clave = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    await store.setJSON(clave, { clave, ...registro });
    return json({ ok: true });
  }

  if (req.headers.get("x-panel") !== PANEL) return json({ error: "No autorizado" }, 401);

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const datos = await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })));
    const respuestas = datos.filter(Boolean).sort((a, b) => a.fecha.localeCompare(b.fecha));
    return json({ respuestas });
  }

  if (req.method === "DELETE") {
    const k = txt(url.searchParams.get("k"), 60);
    if (!k) return json({ error: "Falta la respuesta" }, 400);
    await store.delete(k);
    return json({ eliminado: k });
  }

  return json({ error: "Método no permitido" }, 405);
}

export default async (req) => manejar(req, getStore({ name: "respuestas", consistency: "strong" }));
