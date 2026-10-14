# Validación de la release 3.3.0

Cambios solo en la web y sus modelos (misiones perdidas, panel de jefes, catálogo). El lector de posición y el lanzador de .NET Framework no se han modificado respecto a 3.1.2.

Comprobaciones realizadas el 14 de octubre de 2026 en Linux (no en Windows):

- 98 pruebas automáticas (75 anteriores y 23 nuevas: reglas de pérdida, Final A, jefes y coherencia del catálogo). La coherencia de zonas se contrastó con una mutación del catálogo (falla como debe).
- Prueba diferencial contra 3.1.2 con 3000 guardados sintéticos: ninguna diferencia en objetos, resumen, misiones ni accesos, salvo lo intencionado (misión Final A y elementos declarados perdidos).
- Guardado real del autor ejecutado en la web compilada (jsdom y Chromium): estados de misiones y jefes coherentes con los eventos, sin errores JavaScript; 390 px sin desbordamiento horizontal, filtros con teclado y «Ver en el mapa».
- Las reglas de pérdida se basan en eventos del guardado; la semántica del evento de Tirso se infiere del nombre, la wiki y la confirmación del jugador. Las correcciones de zona se verificaron con la wiki (Candelaria, Cleofás, Isidora); la zona de la Cantiña de la Rosa Azul sigue sin verificar y se muestra como «sin catalogar».
- No se ha probado esta release con el juego ni con el lector integrado. La compilación de Windows la realiza GitHub Actions.

---

## Validación anterior · release 3.2.0

Esta release cambia únicamente la web, el modelo de misiones y el servidor de desarrollo. El lector de posición y el lanzador de .NET Framework no se han modificado respecto a 3.1.2, cuya validación en Windows se conserva más abajo.

Comprobaciones realizadas el 14 de octubre de 2026 en Linux (no en Windows):

- 75 pruebas automáticas (48 anteriores y 27 nuevas: modelo de vista de misiones, copia de seguridad y servidor). Las pruebas nuevas se sometieron a mutaciones para confirmar que detectan regresiones.
- Prueba diferencial del motor y de las misiones contra la versión 3.1.2 con 4500 guardados sintéticos: sin diferencias salvo la prueba «etapa posterior» añadida.
- Comparación del HTML generado de mapa y lista frente a la compilación anterior tras varias interacciones: idéntico salvo los enlaces nuevos a misiones.
- Web compilada ejecutada en jsdom (carga, misiones en 10 densidades de guardado, filtros, seguimiento, copia y restauración) y en Chromium real con el servidor local: persistencia tras recargar, teclado, descarga de la copia, 390 px y 1280 px sin desbordamiento horizontal. Sin errores JavaScript.
- No se ha probado esta release con el juego, el lector integrado ni la política de contenido de otros navegadores. La compilación de Windows la realiza GitHub Actions.

---

## Validación anterior · release 3.1.2

Comprobaciones realizadas el 12 de octubre de 2026 en Windows 11 x64.

- 48 pruebas automáticas del analizador, mapa, accesos, comunicación, posición, verificación y misiones. Incluyen GUID exacto, puntos de recogida alternativos, objetos transformados, entregas, ausencia de evidencia, NG+, conflictos de identidad de partida, señales antiguas y datos inválidos.
- Compilación de la web autónoma y del lector/lanzador de .NET Framework. En una instalación local de Steam se leyeron inventario, 801 eventos, ranura y referencia de guardado sin ejecutar métodos del juego ni escribir memoria. También se comprobó la respuesta de espera durante la muerte del personaje.
- Carga de guardado local en navegador, 13 misiones, filtros, apertura de detalles, desconexión del progreso en directo y conservación del análisis del archivo. Comprobaciones de interfaz a 390 px y 1280 px; sin desbordamiento horizontal ni errores JavaScript en el recorrido.
- El endpoint nuevo /local/state comparte las restricciones de host, origen y cabecera local de los demás endpoints; sin CORS. Se comprueba el rechazo de accesos sin cabecera y de origen o host ajenos.
- Los datos públicos de verificación solo incluyen ID, sala, GUID y campo de persistencia. Se excluyen guardados, gráficos originales, rutas personales y datos privados del paquete y repositorio.

La posición y el importador empaquetado ya se comprobaron en 3.0.0; se conservan sus límites documentados. La nueva lectura de progreso no garantiza compatibilidad con todas las tiendas, revisiones, mods u ordenadores. No todas las misiones guardan evidencia individual de cada objeto: las incertidumbres restantes se mantienen explícitas.

La release se construye con scripts reproducibles en GitHub Actions. SHA256SUMS.txt corresponde al ZIP publicado por esa compilación.
