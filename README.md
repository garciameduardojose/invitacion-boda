# Invitación de boda · Eduardo & María Virginia

Sitio estático publicado en Netlify: https://boda-garciahernandez.netlify.app

- `index.html`: la invitación. Los datos (horas, lugares, vestimenta, regalo, RSVP) están en el bloque `CONFIGURACIÓN` del `<script>`.
- `generador.html`: crea los links por invitado (`/nombre_apellido`) y el archivo `invitados.json`.
- `invitados.json`: lista cifrada de invitados y pases. Se reemplaza completa cada vez desde el generador.
- `_redirects`: hace que `/carola_marcela_clarissa` abra la invitación personalizada.
- Las confirmaciones llegan a **Netlify → Forms → rsvp**.
