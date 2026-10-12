# Diario de Cvstodia 3.1.2

La posesión de un objeto entregado o transformado ya no depende solo del inventario actual: se contrastan registros individuales de recogida y eventos de misión. Se incorpora lectura en directo del inventario y eventos desde el juego local, vinculada a la ranura y al guardado cargado.

- La misión del ruido de Diosdado se comprueba por separado de la llave y la puerta del Traidor.
- Verificación por 129 actores de recogida, que cubren 126 identificadores; prueba visible en los detalles del objeto.
- Reconoce huevos transformados, ofrendas de Altasgracias, dedal, máscaras entregadas, llave de Diosdado, ojos, cáliz y mejoras consumidas cuando existe evidencia.
- Los detalles de objetos y misiones permanecen abiertos cuando llegan nuevos eventos del juego.
- Panel de 13 misiones con estado, pasos y próximo objetivo; filtros y opción de ocultar el panel.
- Evita confundir una ofrenda parcial con un objeto concreto, un camino abierto con una etapa de Redento, estatuas destruidas con arenas superadas y recompensas conservadas en NG+ con misiones repetidas.
- La lectura en directo comprueba identidad de partida y descarta señales antiguas, incompatibles o de otra ranura. Si no se puede leer, vuelve al archivo cargado.

Descarga el ZIP de Windows x64, descomprímelo y abre DiarioDeCvstodia.exe. Cierra la versión anterior desde su icono junto al reloj antes de abrir esta. Carga el archivo de la partida activa; para mantener también las salas actualizadas, conecta la carpeta de guardados en Chrome o Edge.

Se conservan estados sin confirmar cuando el juego no aporta una prueba individual. Las salas, habilidades y dinero se actualizan al guardar. No hay modificaciones del juego, inyección ni escritura de memoria; no se publican guardados ni gráficos originales.
