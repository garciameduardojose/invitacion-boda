# Invitación de boda · Eduardo & María Virginia

Publicada en Netlify: https://boda-garciahernandez.netlify.app (cada cambio en `main` se publica solo).

- `public/index.html`: la invitación. Los datos (horas, lugares, vestimenta, regalo, RSVP) están en el bloque `CONFIGURACIÓN` del `<script>`.
- `public/panel-odzjhdfq.html`: panel privado de invitados (dirección no enlazada). Se sube el Excel (Nombre · Pases · Teléfono) y cada invitado queda guardado; el link `/nombre_apellido` funciona al instante.
- `public/_redirects`: hace que `/carola_marcela_clarissa` abra la invitación.
- `netlify/functions/invitados.mjs`: guarda la lista de invitados en Netlify Blobs. Solo deja consultar un invitado a la vez desde la invitación; listar, guardar o borrar se hace desde el panel. Si algún día se crea `ADMIN_PASSWORD` en Netlify, el panel la pedirá.
- Las confirmaciones llegan a **Netlify → Forms → rsvp**.
