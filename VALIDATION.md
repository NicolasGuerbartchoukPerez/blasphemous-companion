# Validación de la release 3.1.0

Comprobaciones realizadas el 12 de octubre de 2026 en Windows 11 x64.

- 46 pruebas automáticas del analizador, mapa, accesos, comunicación, posición, verificación y misiones. Incluyen GUID exacto, puntos de recogida alternativos, objetos transformados, entregas, ausencia de evidencia, NG+, conflictos de identidad de partida, señales antiguas y datos inválidos.
- Compilación de la web autónoma y del lector/lanzador de .NET Framework. En una instalación local de Steam se leyeron inventario, 801 eventos, ranura y referencia de guardado sin ejecutar métodos del juego ni escribir memoria. También se comprobó la respuesta de espera durante la muerte del personaje.
- Carga de guardado local en navegador, 13 misiones, filtros, apertura de detalles, desconexión del progreso en directo y conservación del análisis del archivo. Comprobaciones de interfaz a 390 px y 1280 px; sin desbordamiento horizontal ni errores JavaScript en el recorrido.
- El endpoint nuevo /local/state comparte las restricciones de host, origen y cabecera local de los demás endpoints; sin CORS. Se comprueba el rechazo de accesos sin cabecera y de origen o host ajenos.
- Los datos públicos de verificación solo incluyen ID, sala, GUID y campo de persistencia. Se excluyen guardados, gráficos originales, rutas personales y datos privados del paquete y repositorio.

La posición y el importador empaquetado ya se comprobaron en 3.0.0; se conservan sus límites documentados. La nueva lectura de progreso no garantiza compatibilidad con todas las tiendas, revisiones, mods u ordenadores. No todas las misiones guardan evidencia individual de cada objeto: las incertidumbres restantes se mantienen explícitas.

La release se construye con scripts reproducibles en GitHub Actions. SHA256SUMS.txt corresponde al ZIP publicado por esa compilación.
