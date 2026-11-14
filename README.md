# Estudio de paracaidismo

Centro de estudio independiente basado en **Curso de Paracaidismo: Manual del Alumno, FESAPADE, primera edición 2025**, de Edy L. T. Montalvan.

- Manual digital de 78 páginas, búsqueda, navegación por módulos, imágenes ampliables, marcadores y páginas estudiadas.
- Repaso de 60 preguntas, filtros por módulo/tema, navegación hacia atrás y adelante, explicación y referencia al manual. Incluye el banco original de 48 preguntas.
- Simulacro con orden aleatorio de preguntas y opciones, temporizador opcional, marcas para revisar y corrección al entregar. Cada pregunta se cuenta una sola vez y exige la selección completa de opciones correctas.
- Progreso, historial de 20 simulacros, repaso de errores, lista de preparación práctica y notas para el instructor.

Los datos se guardan en `localStorage` en este navegador y origen. No hay cuentas ni sincronización entre dispositivos; borrar los datos del navegador elimina el progreso. Se puede exportar una copia JSON desde Mi progreso. El temporizador usa una fecha de finalización absoluta y continúa al abandonar o recargar la página.

El generador usa `crypto.getRandomValues` y Fisher–Yates con muestreo sin sesgo. No repite preguntas dentro de un examen y rechaza las últimas 50 combinaciones completas de preguntas/opciones guardadas en este navegador. Un banco finito no permite garantizar patrones únicos indefinidamente.

## Desarrollo

Requiere Node.js 22 o superior (GitHub Actions utiliza Node.js 22).

```sh
npm ci
npm run dev
```

Abre `http://127.0.0.1:4173`. También se sirve bajo `/curso/` para verificar el funcionamiento en una subcarpeta como GitHub Pages. No abras `index.html` directamente con `file://`: el contenido se carga con `fetch`.

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

El build convierte el Markdown a HTML por página y genera `dist/`. El sitio desplegado no necesita servidor, servicios de pago ni dependencias de terceros en tiempo de ejecución. Las pruebas de navegador cubren escritorio y móvil.

## Publicación

Repositorio: https://github.com/rfunes98/estudio-de-paracaidismo

Destino: https://rfunes98.github.io/estudio-de-paracaidismo/

En **Settings → Pages → Build and deployment → Source**, selecciona **GitHub Actions**. El workflow `.github/workflows/pages.yml` comprueba, genera y publica el sitio al actualizar `main`. También se puede ejecutar desde la pestaña Actions con **Run workflow**.

## Contenido

El PDF y el Markdown originales permanecen en la raíz. Las ilustraciones se encuentran en `curso-paracaidismo-imagenes/`. El documento conserva la autoría, los créditos y los derechos indicados en el manual. Este repositorio no concede una licencia adicional sobre ese material.

Para editar preguntas, utiliza `data/questions-original.json` y `data/questions-extra.json`; `correct` contiene índices de opciones comenzando en cero. Cada pregunta tiene una página fuente y una explicación. `data/catalog.js` define módulos, temas y la lista de preparación práctica.

La web estudia el contenido de la edición 2025, sin presentarlo como normativa actualizada. Los resultados son de práctica; no acreditan habilidades ni sustituyen la instrucción supervisada.
