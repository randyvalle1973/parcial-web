# Biblioteca — Aplicación web

Aplicación de una sola página para administrar libros, préstamos e historial con HTML semántico, CSS y JavaScript nativo.

## Cómo ejecutarla

1. Descarga y descomprime el proyecto.
2. Abre la carpeta `biblioteca_web` en Visual Studio Code.
3. Abre `index.html` en el navegador. También puedes usar la extensión Live Server si la tienes instalada.
4. No requiere `npm`, instalación de dependencias ni conexión a un servidor.

## Archivos

- `index.html`: estructura semántica, navegación, las cuatro vistas y los modales.
- `styles.css`: diseño responsivo, tema claro/oscuro, estados, transiciones y animaciones.
- `app.js`: datos iniciales, reglas de negocio, validación, renderizado del DOM, eventos y persistencia con `localStorage`.

## Funciones

- Catálogo con búsqueda, filtros combinables y orden por título, autor o año.
- Alta, edición y eliminación de libros con validación.
- Préstamos con límite de tres activos, plazo de 14 días y devolución conservando el historial.
- Detección de vencidos y cálculo de retrasos.
- Resumen por género, nombre de usuario y tema persistentes.
- Datos de ejemplo recalculados según la fecha actual.

## Persistencia

Los datos se guardan en `localStorage` bajo la clave `biblioteca-web-v1`. El botón **Restablecer datos** vuelve a los datos de ejemplo.

## Nota

El año máximo permitido en el formulario está fijado en 2026, según el enunciado del parcial. El proyecto no utiliza frameworks ni librerías JavaScript externas.
