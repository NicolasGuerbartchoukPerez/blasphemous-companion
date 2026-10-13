# Diario de Cvstodia 3.2.0

Nuevo seguimiento de misiones, pensado para seguirlas dentro de la aplicación sin acudir a la wiki.

- Cada misión explica qué hacer en cada paso y marca el **paso actual**. Para cada objeto indica zona, estado, acceso y las reliquias que te faltan para llegar, con botón «Ver en el mapa».
- Lista con progreso y filtros (pendientes, seguidas, en curso, completadas, sin confirmar). Puedes **seguir** misiones para fijarlas arriba con su paso actual, pasar a la anterior o siguiente, navegar con teclado y abrirlas con un enlace directo.
- Desde la lista de objetos y desde el mapa se salta a las misiones que usan cada objeto. La guía externa queda como enlace opcional.
- **Copia de seguridad** del seguimiento y la configuración (en «Personalizar mapa y vista»), para no perderlos al cambiar de navegador o de puerto.
- El buscador espera una pausa breve al escribir y las capas fijas del mapa solo se repintan si cambian: la lista y el mapa responden mucho más rápido.
- El motor de análisis se ha reescrito de forma más legible con resultados idénticos; solo se añade la prueba «etapa posterior» en los objetos que la tienen.
- El preajuste de mapa «Todo» ya no restablece ajustes ajenos al mapa. Se corrigen las instrucciones obsoletas del lector de posición.
- El servidor de desarrollo valida métodos y rutas, añade cabeceras de seguridad y explica los errores de puerto.

Las pistas de ubicación de muchos objetos de misión siguen en inglés (catálogo comunitario) y se muestran etiquetadas como tales.

Descarga el ZIP de Windows x64, descomprímelo y abre DiarioDeCvstodia.exe. Cierra la versión anterior desde su icono junto al reloj antes de abrir esta. El lector de posición y el lanzador no cambian respecto a 3.1.2.

No hay modificaciones del juego, inyección ni escritura de memoria; no se publican guardados ni gráficos originales.
