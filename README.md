# Hemiciclo 23J

Landing de datos sobre las elecciones generales del 23 de julio de 2023 y el adelanto electoral al 29 de noviembre de 2026. Construida sobre el sistema de diseño **SYX** con el tema `hemiciclo`, gráficos de **Apache ECharts**, ilustración isométrica con el kit **iso-flat** (proyección isométrica real y tres tonos por material con `shade()`) y movimiento de **GSAP** + ScrollTrigger.

## Verla

Abre `index.html` con doble clic. Funciona sin conexión: las librerías y las fuentes van dentro del paquete.

Si tu navegador bloquea algo al abrir desde el disco, sírvela en local:

```bash
npx serve .          # o: python3 -m http.server 8000
```

y abre la dirección que indique (por ejemplo `http://localhost:3000`).

## Contenido

| Ruta | Qué es |
|---|---|
| `index.html` | La página completa, con el CSS del tema SYX y de la app incrustados |
| `vendor/` | ECharts 5.5.1, GSAP 3.12.5 y ScrollTrigger |
| `fonts/` | Big Shoulders Display, Big Shoulders Stencil Display, Public Sans e IBM Plex Mono (woff2, subconjunto latino) con sus licencias |
| `fuente/` | Código de la app para reconstruirla: plantilla HTML, `hemi.scss`, `app.js` y scripts de build |

## Reconstruir

Necesita SYX con el tema `hemiciclo` aplicado (parche `0001-feat-themes-tema-hemiciclo…patch` sobre `github.com/pizarradas/syx`).

```bash
npm i --ignore-scripts ../syx      # --ignore-scripts: ver fricción 1 de syx-fricciones.md
node build.mjs                     # versión con CDN (artifact)
node build-offline.mjs salida/     # esta versión sin conexión
```

`build.mjs` espera la ruta del repo SYX en `/root/syx`; ajústala a tu `C:\GITHUBS\syx`.

## Isometría

- **Hemiciclo en volumen:** 350 escaños sobre once gradas, una losa semicircular, la tribuna y un poste de mayoría «176» que gira hasta su sitio en cada investidura. Los neutros (losa, gradas, tribuna, poste) son variables CSS de la propia ilustración calculadas desde los tokens del tema; los colores de partido son datos.
- **Urna del 29N:** urna transparente con tapa y ranura; los sobres caen y se apilan en bucle mientras la urna está en pantalla.
- Ambas pasan `iso-check.py` con 0 errores. Los avisos que quedan son los colores literales de los partidos (datos, no tema).

## Movimiento reducido

Con `prefers-reduced-motion: reduce` no hay animaciones: el hemiciclo cambia de paso sin transición y los paneles por partido se apilan en rejilla en lugar del recorrido lateral.

## Fuentes de los datos

- Elecciones generales de España de 2023 y 2023 Spanish general election (Wikipedia).
- Finect y Diario de León, 5 de octubre de 2026: calendario del 29N, votación de los decretos de vivienda, encuesta de 40dB y referencia al CIS.
